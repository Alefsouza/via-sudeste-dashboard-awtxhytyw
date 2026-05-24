routerAdd('OPTIONS', '/backend/v1/sincronizarDatabusCompleto', (e) => {
  e.response.header().set('Access-Control-Allow-Origin', '*')
  e.response.header().set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  e.response.header().set('Access-Control-Allow-Headers', 'authorization, apikey, content-type')
  return e.noContent(204)
})

routerAdd(
  'POST',
  '/backend/v1/sincronizarDatabusCompleto',
  (e) => {
    const startTime = Date.now()
    const baseUrl = $secrets.get('DATALBUS_BASE_URL') || 'https://datalbus.com.br:8000/api/v2'

    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (err) {}

    const action = body.action
    const token = body.token
    const tenancyId = body.tenancy_id

    if (!action || !['assets', 'drivers', 'trips', 'events', 'all'].includes(action)) {
      return e.json(400, { success: false, error: 'Ação inválida ou ausente.', statusCode: 400 })
    }
    if (!token) {
      return e.json(400, { success: false, error: 'Token ausente.', statusCode: 400 })
    }
    if (!tenancyId) {
      return e.json(400, { success: false, error: 'Tenancy ID ausente.', statusCode: 400 })
    }

    const defaultHeaders = {
      Authorization: `Bearer ${token}`,
      'x-tenancy': tenancyId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const sleep = (ms) => {
      const s = Date.now()
      while (Date.now() - s < ms) {}
    }

    const fetchWithRetry = (endpoint) => {
      let attempt = 0
      const delays = [2000, 4000, 8000]
      while (attempt <= 3) {
        try {
          const url = baseUrl.replace(/\/$/, '') + endpoint
          const reqOpts = { url, method: 'GET', headers: defaultHeaders, timeout: 60 }

          const res = $http.send(reqOpts)

          if (res.statusCode >= 200 && res.statusCode < 300) {
            return res.json
          }

          if (res.statusCode === 429) {
            if (attempt < 3) {
              sleep(delays[attempt])
              attempt++
              continue
            }
            throw new Error(`Too Many Requests (429)`)
          }

          throw new Error(`HTTP ${res.statusCode}`)
        } catch (err) {
          if (attempt === 3 || !err.message.includes('429')) {
            throw err
          }
          sleep(delays[attempt])
          attempt++
        }
      }
    }

    const fetchAllPages = (path) => {
      let allData = []
      let currentEndpoint = path + (path.includes('?') ? '&' : '?') + 'per_page=100'

      while (currentEndpoint) {
        const data = fetchWithRetry(currentEndpoint)
        const items = data?.data || data || []

        if (Array.isArray(items)) {
          allData = allData.concat(items)
        } else {
          break
        }

        const nextPageUrl = data?.links?.next || data?.meta?.next_page_url || data?.next_page_url
        if (nextPageUrl) {
          const urlMatch = nextPageUrl.match(/^https?:\/\/[^\/]+(\/.*)$/)
          if (urlMatch) {
            const fullPath = urlMatch[1]
            const apiPrefix = '/api/v2'
            const idx = fullPath.indexOf(apiPrefix)
            if (idx !== -1) {
              currentEndpoint = fullPath.substring(idx + apiPrefix.length)
            } else {
              currentEndpoint = fullPath
            }
          } else {
            currentEndpoint = nextPageUrl
          }
        } else {
          if (items.length < 100) {
            currentEndpoint = null
          } else {
            const qMark = currentEndpoint.indexOf('?')
            let basePath = currentEndpoint
            let query = ''
            if (qMark !== -1) {
              basePath = currentEndpoint.substring(0, qMark)
              query = currentEndpoint.substring(qMark + 1)
            }
            const params = {}
            query.split('&').forEach((pair) => {
              const [k, v] = pair.split('=')
              if (k) params[k] = v || ''
            })
            let page = parseInt(params.page || '1', 10)
            params.page = page + 1
            currentEndpoint =
              basePath +
              '?' +
              Object.entries(params)
                .map(([k, v]) => `${k}=${v}`)
                .join('&')
          }
        }
      }
      return allData
    }

    let recordsSynced = 0

    const normalizeDate = (isoStr) => {
      if (!isoStr) return null
      try {
        const d = new Date(isoStr)
        if (isNaN(d.getTime())) return null
        return d.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      } catch (e) {
        return null
      }
    }

    try {
      if (action === 'assets' || action === 'all') {
        const items = fetchAllPages('/assets')
        const col = $app.findCollectionByNameOrId('assets')
        $app.runInTransaction((txApp) => {
          for (const item of items) {
            const key = item.asset_id
            if (key === undefined || key === null) continue
            let record
            try {
              record = txApp.findFirstRecordByData('assets', 'asset_id', key)
            } catch (_) {
              record = new Record(col)
              record.set('asset_id', key)
            }
            record.set('asset_description', item.asset_description ?? null)
            record.set('manufacturer_descr', item.manufacturer_descr ?? null)
            record.set('license_plate', item.license_plate ?? null)
            record.set(
              'active',
              item.active !== undefined && item.active !== null ? Boolean(item.active) : null,
            )
            record.set('created_at', normalizeDate(item.created_at))
            record.set('updated_at', normalizeDate(item.updated_at))
            txApp.saveNoValidate(record)
            recordsSynced++
          }
        })
      }

      if (action === 'drivers' || action === 'all') {
        const items = fetchAllPages('/drivers')
        const col = $app.findCollectionByNameOrId('drivers')
        $app.runInTransaction((txApp) => {
          for (const item of items) {
            const key = item.driver_id
            if (key === undefined || key === null) continue
            let record
            try {
              record = txApp.findFirstRecordByData('drivers', 'driver_id', key)
            } catch (_) {
              record = new Record(col)
              record.set('driver_id', key)
            }
            record.set('driver_name', item.driver_name ?? null)
            record.set('group_desc', item.group_desc ?? null)
            record.set('worker_id', item.worker_id ?? null)
            record.set('card_id', item.card_id ?? null)
            txApp.saveNoValidate(record)
            recordsSynced++
          }
        })
      }

      if (action === 'trips' || action === 'all') {
        const items = fetchAllPages('/trips')
        const col = $app.findCollectionByNameOrId('trips')
        $app.runInTransaction((txApp) => {
          for (const item of items) {
            const key = item.trip_id
            if (key === undefined || key === null) continue
            let record
            try {
              record = txApp.findFirstRecordByData('trips', 'trip_id', key)
            } catch (_) {
              record = new Record(col)
              record.set('trip_id', key)
            }
            record.set('drive_id', item.drive_id ?? null)
            record.set('asset_id', item.asset_id ?? null)
            record.set('engine_hours', item.engine_hours ?? null)
            record.set('date', normalizeDate(item.date))
            record.set('end_drive', normalizeDate(item.end_drive))
            record.set('mileage', item.mileage ?? null)
            record.set('drive_duration', item.drive_duration ?? null)
            record.set('total_mileage', item.total_mileage ?? null)
            record.set('fuel_used', item.fuel_used ?? null)
            record.set('start_latitude', item.start_latitude ?? null)
            record.set('start_longitude', item.start_longitude ?? null)
            record.set('end_latitude', item.end_latitude ?? null)
            record.set('end_longitude', item.end_longitude ?? null)
            record.set(
              'log_gps_processed',
              item.log_gps_processed !== undefined && item.log_gps_processed !== null
                ? Boolean(item.log_gps_processed)
                : null,
            )
            record.set('created_at', normalizeDate(item.created_at))
            record.set('updated_at', normalizeDate(item.updated_at))
            record.set('line_name', item.line_name ?? null)
            txApp.saveNoValidate(record)
            recordsSynced++
          }
        })
      }

      if (action === 'events' || action === 'all') {
        const items = fetchAllPages('/events')
        const col = $app.findCollectionByNameOrId('trip_events')
        $app.runInTransaction((txApp) => {
          for (const item of items) {
            const key = item.event_id
            if (key === undefined || key === null) continue
            let record
            try {
              record = txApp.findFirstRecordByData('trip_events', 'event_id', key)
            } catch (_) {
              record = new Record(col)
              record.set('event_id', key)
            }
            record.set('trip_id', item.trip_id ?? null)
            record.set('asset_id', item.asset_id ?? null)
            record.set('driver_name', item.driver_name ?? null)
            record.set('group_desc', item.group_desc ?? null)
            record.set('worker_id', item.worker_id ?? null)
            record.set('event_type', item.event_type ?? null)
            record.set('severity', item.severity ?? null)
            record.set('timestamp', normalizeDate(item.timestamp))
            record.set('description', item.description ?? null)
            record.set('mileage', item.mileage ?? null)
            record.set('fuel_used', item.fuel_used ?? null)
            record.set('idle_duration', item.idle_duration ?? null)
            txApp.saveNoValidate(record)
            recordsSynced++
          }
        })
      }

      const duration = Date.now() - startTime

      return e.json(200, {
        success: true,
        action: action,
        records_synced: recordsSynced,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      $app.logger().error('Erro na sincronização Datalbus', 'error', err.message, 'action', action)
      return e.json(500, {
        success: false,
        error: 'Ocorreu um erro ao tentar processar a sincronização: ' + err.message,
        statusCode: 500,
      })
    }
  },
  $apis.requireAuth(),
  $apis.bodyLimit(100 * 1024 * 1024),
)
