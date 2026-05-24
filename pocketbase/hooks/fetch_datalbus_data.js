routerAdd('OPTIONS', '/backend/v1/fetch_datalbus_data', (e) => {
  e.response.header().set('Access-Control-Allow-Origin', '*')
  e.response.header().set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  e.response.header().set('Access-Control-Allow-Headers', 'authorization, apikey, content-type')
  return e.noContent(204)
})

routerAdd(
  'POST',
  '/backend/v1/fetch_datalbus_data',
  (e) => {
    const startTime = Date.now()

    const baseUrl = $secrets.get('DATALBUS_BASE_URL')
    const email = $secrets.get('DATALBUS_EMAIL')
    const password = $secrets.get('DATALBUS_PASSWORD')
    const tenancy = $secrets.get('DATALBUS_TENANCY')
    const xTenancy = $secrets.get('DATALBUS_X_TENANCY')

    if (!baseUrl || !email || !password || !tenancy || !xTenancy) {
      $app
        .logger()
        .error(
          'Datalbus integration missing secrets',
          'endpoint',
          '/backend/v1/fetch_datalbus_data',
          'statusCode',
          503,
        )
      return e.json(503, {
        success: false,
        error: 'Serviço Datalbus indisponível (configuração pendente)',
        code: 'SERVICE_UNAVAILABLE',
      })
    }

    const body = e.requestInfo().body || {}

    // Payload validation for sync processing
    if (body.action && Array.isArray(body.data)) {
      $app
        .logger()
        .info('Processing sync payload', 'action', body.action, 'count', body.data.length)

      let processed = 0
      let errors = 0

      try {
        if (body.action === 'assets' || body.action === 'vehicles') {
          const col = $app.findCollectionByNameOrId('vehicles')
          $app.runInTransaction((txApp) => {
            for (const item of body.data) {
              try {
                const identifier = item.plate || item.id || item.vehicle_id
                if (!identifier) continue

                const plate = item.plate ? String(item.plate).trim() : `UNK-${identifier}`

                let record
                try {
                  record = txApp.findFirstRecordByData('vehicles', 'plate', plate)
                } catch (_) {
                  record = new Record(col)
                  record.set('plate', plate)
                }

                if (item.status) {
                  const s = String(item.status).toLowerCase()
                  if (s.includes('mov') || s.includes('run')) record.set('status', 'moving')
                  else if (s.includes('main') || s.includes('manut'))
                    record.set('status', 'maintenance')
                  else record.set('status', 'idle')
                }

                if (item.model) record.set('model', item.model)
                if (item.garage) record.set('garage', item.garage)

                txApp.save(record)
                processed++
              } catch (err) {
                errors++
              }
            }
          })
        } else if (body.action === 'drivers') {
          const col = $app.findCollectionByNameOrId('drivers')
          $app.runInTransaction((txApp) => {
            for (const item of body.data) {
              try {
                const license = item.license_number || item.cpf || item.id?.toString()
                if (!license) continue

                let record
                try {
                  record = txApp.findFirstRecordByData('drivers', 'license_number', license)
                } catch (_) {
                  record = new Record(col)
                  record.set('license_number', license)
                }

                if (item.name) record.set('name', item.name)
                if (item.score !== undefined) record.set('score', Number(item.score))

                txApp.save(record)
                processed++
              } catch (err) {
                errors++
              }
            }
          })
        } else {
          // Acknowledge other types without failing
          processed = body.data.length
        }

        return e.json(200, { success: true, processed, errors })
      } catch (err) {
        $app.logger().error('Sync processing error', 'action', body.action, 'error', err.message)
        return e.json(500, {
          success: false,
          error: 'Erro ao processar dados',
          code: 'PROCESSING_ERROR',
        })
      }
    }

    // Default to today if dates are not provided (e.g. from sync dashboard action payload)
    const todayStr = new Date().toISOString().split('T')[0]
    const startDate = body.start_date || todayStr
    const endDate = body.end_date || todayStr

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return e.json(400, {
        success: false,
        error: 'Formato de data inválido (esperado YYYY-MM-DD)',
        code: 'INVALID_DATE_FORMAT',
      })
    }

    if (start > end) {
      return e.json(400, {
        success: false,
        error: 'Data inicial não pode ser maior que data final',
        code: 'INVALID_DATE_RANGE',
      })
    }

    const MAX_DAYS = 15
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > MAX_DAYS) {
      return e.json(400, {
        success: false,
        error: `Período máximo permitido é de ${MAX_DAYS} dias.`,
        code: 'MAX_PERIOD_EXCEEDED',
      })
    }

    const sleep = (ms) => {
      const s = Date.now()
      while (Date.now() - s < ms) {}
    }

    const fetchWithRetry = (endpoint, method, headers, reqBody = null) => {
      let attempt = 0
      while (attempt <= 3) {
        try {
          const url = baseUrl.replace(/\/$/, '') + endpoint
          const reqOpts = { url, method, headers, timeout: 30 }
          if (reqBody) {
            reqOpts.body = JSON.stringify(reqBody)
          }

          const res = $http.send(reqOpts)

          if (res.statusCode >= 200 && res.statusCode < 300) {
            return { status: res.statusCode, data: res.json }
          }

          if (res.statusCode === 429 || res.statusCode >= 500) {
            throw new Error(`HTTP ${res.statusCode}`)
          } else {
            return { status: res.statusCode, data: res.json }
          }
        } catch (err) {
          if (attempt === 3) {
            $app
              .logger()
              .warn('Datalbus API retries exhausted', 'endpoint', endpoint, 'error', err.message)
            return { status: 503, data: null, error: err.message }
          }
          attempt++
          const sleepMs = Math.pow(2, attempt) * 1000
          sleep(sleepMs)
        }
      }
    }

    try {
      // 1. Auth Flow
      let token = ''
      try {
        const cacheRecord = $app.findFirstRecordByData('integration_cache', 'key', 'datalbus_token')
        const expStr = cacheRecord.getString('expires_at')
        if (expStr && new Date(expStr).getTime() > Date.now()) {
          token = cacheRecord.getString('value')
        }
      } catch (_) {}

      if (!token) {
        const loginRes = fetchWithRetry(
          '/login',
          'POST',
          {
            'Content-Type': 'application/json',
            tenancy: tenancy,
          },
          { email, password },
        )

        if (loginRes.status === 401) {
          $app
            .logger()
            .error(
              'Invalid datalbus credentials',
              'endpoint',
              '/backend/v1/fetch_datalbus_data',
              'statusCode',
              401,
            )
          return e.json(401, {
            success: false,
            error: 'Credenciais inválidas',
            code: 'INVALID_CREDENTIALS',
          })
        }

        if (loginRes.status !== 200 || !loginRes.data || !loginRes.data.token) {
          $app
            .logger()
            .error(
              'Datalbus login failed',
              'endpoint',
              '/backend/v1/fetch_datalbus_data',
              'status',
              loginRes.status,
              'statusCode',
              503,
            )
          return e.json(503, {
            success: false,
            error: 'Serviço Datalbus indisponível',
            code: 'SERVICE_UNAVAILABLE',
          })
        }

        token = loginRes.data.token
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

        try {
          const cacheRecord = $app.findFirstRecordByData(
            'integration_cache',
            'key',
            'datalbus_token',
          )
          cacheRecord.set('value', token)
          cacheRecord.set('expires_at', expiresAt)
          $app.save(cacheRecord)
        } catch (_) {
          try {
            const col = $app.findCollectionByNameOrId('integration_cache')
            const newRecord = new Record(col)
            newRecord.set('key', 'datalbus_token')
            newRecord.set('value', token)
            newRecord.set('expires_at', expiresAt)
            $app.save(newRecord)
          } catch (errCache) {
            $app.logger().warn('Failed to save datalbus_token cache', 'error', errCache.message)
          }
        }
      }

      const defaultHeaders = {
        Authorization: `Bearer ${token}`,
        'x-tenancy': xTenancy,
        'Content-Type': 'application/json',
      }

      const fetchAllPages = (endpoint, queryParams = '') => {
        let allData = []
        let page = 1
        while (true) {
          const sep = endpoint.includes('?') || queryParams.includes('?') ? '&' : '?'
          const res = fetchWithRetry(
            `${endpoint}${sep}page=${page}&${queryParams}`,
            'GET',
            defaultHeaders,
          )

          if (res.status === 401) throw new Error('DATALBUS_UNAUTHORIZED')
          if (res.status !== 200) throw new Error(`DATALBUS_API_ERROR:${res.status}`)

          const items = res.data?.data || res.data || []
          if (!Array.isArray(items)) break

          allData = allData.concat(items)

          const perPage = res.data?.meta?.per_page || 100
          if (items.length < perPage) break
          page++
          if (page > 100) break // safe-guard max 100 pages
        }
        return allData
      }

      // Assets
      const assetsRes = fetchWithRetry('/assets?per_page=all', 'GET', defaultHeaders)
      if (assetsRes.status === 401) throw new Error('DATALBUS_UNAUTHORIZED')
      if (assetsRes.status !== 200) throw new Error(`DATALBUS_API_ERROR:${assetsRes.status}`)

      let rawAssets = []
      if (assetsRes.data) {
        rawAssets = Array.isArray(assetsRes.data.data)
          ? assetsRes.data.data
          : Array.isArray(assetsRes.data)
            ? assetsRes.data
            : []
      }

      // Drivers
      const rawDrivers = fetchAllPages('/drivers', 'per_page=100')

      // Trips for Date Range
      let rawTrips = []
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const dailyTrips = fetchAllPages('/trips', `date=${dateStr}&per_page=100`)
        rawTrips = rawTrips.concat(dailyTrips)
      }

      // Trip Events
      let rawTripEvents = []
      for (const trip of rawTrips) {
        if (trip && typeof trip === 'object' && trip.id) {
          const events = fetchAllPages(`/trips/${trip.id}/events`, 'per_page=100')
          rawTripEvents = rawTripEvents.concat(events)
        }
      }

      // Events Schema
      let rawEventsSchema = []
      let schemaCached = false
      try {
        const cacheRecord = $app.findFirstRecordByData(
          'integration_cache',
          'key',
          'datalbus_schema',
        )
        const expStr = cacheRecord.getString('expires_at')
        if (expStr && new Date(expStr).getTime() > Date.now()) {
          const val = cacheRecord.getString('value')
          if (val) {
            rawEventsSchema = JSON.parse(val)
            schemaCached = true
          }
        }
      } catch (_) {}

      if (!schemaCached) {
        const schemaRes = fetchWithRetry('/events-schema?per_page=100', 'GET', defaultHeaders)
        if (schemaRes.status === 401) throw new Error('DATALBUS_UNAUTHORIZED')
        if (schemaRes.status === 200 && schemaRes.data) {
          rawEventsSchema = Array.isArray(schemaRes.data.data)
            ? schemaRes.data.data
            : Array.isArray(schemaRes.data)
              ? schemaRes.data
              : []

          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          try {
            const cacheRecord = $app.findFirstRecordByData(
              'integration_cache',
              'key',
              'datalbus_schema',
            )
            cacheRecord.set('value', JSON.stringify(rawEventsSchema))
            cacheRecord.set('expires_at', expiresAt)
            $app.save(cacheRecord)
          } catch (_) {
            try {
              const col = $app.findCollectionByNameOrId('integration_cache')
              const newRecord = new Record(col)
              newRecord.set('key', 'datalbus_schema')
              newRecord.set('value', JSON.stringify(rawEventsSchema))
              newRecord.set('expires_at', expiresAt)
              $app.save(newRecord)
            } catch (errCache) {
              $app.logger().warn('Failed to save datalbus_schema cache', 'error', errCache.message)
            }
          }
        }
      }

      // Normalizations
      const normalizeDate = (isoStr) => {
        if (!isoStr) return null
        try {
          const d = new Date(isoStr)
          if (isNaN(d.getTime())) return isoStr
          const spTime = new Date(d.getTime() - 3 * 60 * 60 * 1000)
          const yyyy = spTime.getUTCFullYear()
          const mm = String(spTime.getUTCMonth() + 1).padStart(2, '0')
          const dd = String(spTime.getUTCDate()).padStart(2, '0')
          const hh = String(spTime.getUTCHours()).padStart(2, '0')
          const min = String(spTime.getUTCMinutes()).padStart(2, '0')
          const ss = String(spTime.getUTCSeconds()).padStart(2, '0')
          return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-03:00`
        } catch (e) {
          return isoStr
        }
      }

      const assets = rawAssets
        .map((a) => {
          if (!a || typeof a !== 'object') return null
          return Object.assign({}, a, {
            asset_id: a.asset_id ? parseInt(a.asset_id, 10) : null,
            license_plate: a.license_plate === null ? '' : a.license_plate,
          })
        })
        .filter(Boolean)

      const drivers = rawDrivers
        .map((d) => {
          if (!d || typeof d !== 'object') return null
          return Object.assign({}, d)
        })
        .filter(Boolean)

      const trips = rawTrips
        .map((t) => {
          if (!t || typeof t !== 'object') return null
          return Object.assign({}, t, {
            start_time: normalizeDate(t.start_time),
            end_time: normalizeDate(t.end_time),
          })
        })
        .filter(Boolean)

      const tripEvents = rawTripEvents
        .map((e) => {
          if (!e || typeof e !== 'object') return null
          return Object.assign({}, e, {
            latitude: e.latitude ? parseFloat(e.latitude) : null,
            longitude: e.longitude ? parseFloat(e.longitude) : null,
            event_time: normalizeDate(e.event_time),
          })
        })
        .filter(Boolean)

      const eventsByDesc = {}
      for (const e of tripEvents) {
        const desc = e.event_type_description || 'Unknown'
        eventsByDesc[desc] = (eventsByDesc[desc] || 0) + 1
      }

      const eventsByGarage = {}
      const assetGroupMap = {}
      for (const a of assets) {
        if (a.id) assetGroupMap[a.id] = a.asset_group || 'Unknown'
      }
      for (const e of tripEvents) {
        const garage =
          e.asset_id && assetGroupMap[e.asset_id] ? assetGroupMap[e.asset_id] : 'Unknown'
        eventsByGarage[garage] = (eventsByGarage[garage] || 0) + 1
      }

      // Previous period variation
      let prevTripEvents = []
      try {
        const prevEnd = new Date(start)
        prevEnd.setDate(prevEnd.getDate() - 1)
        const prevStart = new Date(prevEnd)
        prevStart.setDate(prevStart.getDate() - diffDays)

        let rawPrevTrips = []
        for (let d = new Date(prevStart); d <= prevEnd; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          const dailyTrips = fetchAllPages('/trips', `date=${dateStr}&per_page=100`)
          rawPrevTrips = rawPrevTrips.concat(dailyTrips)
        }

        for (const trip of rawPrevTrips) {
          if (trip && typeof trip === 'object' && trip.id) {
            const events = fetchAllPages(`/trips/${trip.id}/events`, 'per_page=100')
            prevTripEvents = prevTripEvents.concat(events)
          }
        }
      } catch (errPrev) {
        $app.logger().warn('Failed to fetch previous period data', 'error', errPrev.message)
      }

      const prevTripEventsNormalized = prevTripEvents
        .map((e) => {
          if (!e || typeof e !== 'object') return null
          return Object.assign({}, e, {
            latitude: e.latitude ? parseFloat(e.latitude) : null,
            longitude: e.longitude ? parseFloat(e.longitude) : null,
            event_time: normalizeDate(e.event_time),
          })
        })
        .filter(Boolean)

      const currTotal = tripEvents.length
      const prevTotal = prevTripEventsNormalized.length
      let eventsVariationPercent = 0
      if (prevTotal > 0) {
        eventsVariationPercent = ((currTotal - prevTotal) / prevTotal) * 100
      } else if (currTotal > 0) {
        eventsVariationPercent = 100
      }

      const prevEventsByDesc = {}
      for (const e of prevTripEventsNormalized) {
        const desc = e.event_type_description || 'Unknown'
        prevEventsByDesc[desc] = (prevEventsByDesc[desc] || 0) + 1
      }

      const duration = Date.now() - startTime
      $app
        .logger()
        .info(
          'Datalbus fetch success',
          'endpoint',
          '/backend/v1/fetch_datalbus_data',
          'durationMs',
          duration,
          'startDate',
          startDate,
          'endDate',
          endDate,
        )

      return e.json(200, {
        success: true,
        data: {
          assets,
          drivers,
          trips,
          tripEvents,
          prevTripEvents: prevTripEventsNormalized,
          eventsSchema: rawEventsSchema,
          aggregations: {
            eventsByDescription: eventsByDesc,
            eventsByGarage,
            eventsVariationPercent,
            prevEventsByDesc,
          },
        },
        timestamp: new Date().toISOString(),
        period: { start: startDate, end: endDate },
      })
    } catch (err) {
      const duration = Date.now() - startTime

      if (err.message && err.message.startsWith('DATALBUS_UNAUTHORIZED')) {
        $app
          .logger()
          .error(
            'Datalbus token expired during fetch',
            'endpoint',
            '/backend/v1/fetch_datalbus_data',
            'durationMs',
            duration,
            'statusCode',
            401,
          )
        return e.json(401, {
          success: false,
          error: 'Credenciais inválidas ou expiradas',
          code: 'INVALID_CREDENTIALS',
        })
      }

      if (err.message && err.message.startsWith('DATALBUS_API_ERROR')) {
        $app
          .logger()
          .error(
            'Datalbus API failure',
            'endpoint',
            '/backend/v1/fetch_datalbus_data',
            'error',
            err.message,
            'durationMs',
            duration,
            'statusCode',
            503,
          )
        return e.json(503, {
          success: false,
          error: 'Serviço Datalbus indisponível',
          code: 'SERVICE_UNAVAILABLE',
        })
      }

      $app
        .logger()
        .error(
          'Datalbus fetch error',
          'endpoint',
          '/backend/v1/fetch_datalbus_data',
          'error',
          err.message,
          'stack',
          err.stack || '',
          'durationMs',
          duration,
          'statusCode',
          500,
        )
      return e.json(500, {
        success: false,
        error: 'Erro interno no processamento',
        code: 'INTERNAL_ERROR',
      })
    }
  },
  $apis.requireAuth(),
  $apis.bodyLimit(100 * 1024 * 1024),
)
