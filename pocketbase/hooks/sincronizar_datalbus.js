routerAdd(
  'POST',
  '/backend/v1/sincronizarDatalbus',
  (e) => {
    const body = e.requestInfo().body || {}
    const action = body.action
    const token = body.token
    const tenancyId = body.tenancy_id
    const date = body.date

    if (
      !action ||
      !['assets', 'drivers', 'trips', 'tripEvents', 'eventTypes', 'all'].includes(action)
    ) {
      return e.badRequestError(
        'Ação inválida ou ausente. Valores permitidos: assets, drivers, trips, tripEvents, eventTypes, all.',
      )
    }
    if (!token) {
      return e.badRequestError('Token Datalbus ausente.')
    }
    if (!tenancyId) {
      return e.badRequestError('Tenancy ID ausente.')
    }

    let syncDate = date
    if (!syncDate) {
      syncDate = new Date().toISOString().split('T')[0]
    }

    const baseUrl = $secrets.get('DATALBUS_BASE_URL') || 'https://datalbus.com.br:8000/api/v2'

    const sleep = (ms) => {
      const start = Date.now()
      while (Date.now() - start < ms) {
        // blocking sleep for exponential backoff
      }
    }

    const fetchWithRetry = (url) => {
      let attempts = 0
      const delays = [2000, 4000, 8000]

      while (attempts <= delays.length) {
        try {
          const res = $http.send({
            url: url,
            method: 'GET',
            headers: {
              Authorization: 'Bearer ' + token,
              Tenancy: tenancyId,
              'x-tenancy': tenancyId,
              'Content-Type': 'application/json',
            },
            timeout: 60,
          })

          if (res.statusCode === 429 && attempts < delays.length) {
            sleep(delays[attempts])
            attempts++
            continue
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            let errorBody = ''
            let isJson = false
            try {
              if (res.json) {
                errorBody =
                  typeof res.json === 'object' ? JSON.stringify(res.json) : String(res.json)
                isJson = true
              } else if (res.body && res.body.length > 0) {
                errorBody = new TextDecoder().decode(res.body)
                if (
                  errorBody.toLowerCase().includes('<html') ||
                  errorBody.toLowerCase().includes('<!doctype')
                ) {
                  errorBody = errorBody.replace(/<[^>]*>?/gm, ' ')
                  errorBody = errorBody.replace(/\s+/g, ' ').trim()
                }
              }
            } catch (_) {
              errorBody = 'Não foi possível decodificar a resposta do erro.'
            }

            let errMsg = 'Erro na API Datalbus (HTTP ' + res.statusCode + ')'
            if (res.statusCode === 404) {
              errMsg = isJson
                ? 'Resource not found at provider: ' + errorBody
                : 'Resource not found at provider'
            } else if (errorBody) {
              errMsg += ': ' + errorBody
            }

            const err = new Error(errMsg)
            err.statusCode = res.statusCode
            throw err
          }

          if (!res.json) {
            let errorBody = ''
            if (res.body && res.body.length > 0) {
              errorBody = new TextDecoder().decode(res.body)
              if (
                errorBody.toLowerCase().includes('<html') ||
                errorBody.toLowerCase().includes('<!doctype')
              ) {
                errorBody = errorBody.replace(/<[^>]*>?/gm, ' ')
                errorBody = errorBody.replace(/\s+/g, ' ').trim()
              }
            }
            throw new Error(
              'Resposta inválida do Datalbus (não é JSON). Conteúdo: ' +
                errorBody.substring(0, 500),
            )
          }

          return res.json
        } catch (err) {
          if (
            attempts < delays.length &&
            (err.statusCode === 429 || (err.message && err.message.includes('429')))
          ) {
            sleep(delays[attempts])
            attempts++
            continue
          }
          throw err
        }
      }
      throw new Error('Muitas tentativas falhas na API Datalbus.')
    }

    const syncData = (collectionName, uniqueField, data, mapper) => {
      const collection = $app.findCollectionByNameOrId(collectionName)
      let count = 0

      const items = Array.isArray(data) ? data : data.data || []
      const chunkSize = 500

      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize)

        $app.runInTransaction((txApp) => {
          for (const item of chunk) {
            const uniqueValue = item[uniqueField] || item.id
            if (uniqueValue === undefined || uniqueValue === null || uniqueValue === '') continue

            let record
            try {
              record = txApp.findFirstRecordByData(collectionName, uniqueField, String(uniqueValue))
            } catch (_) {
              record = new Record(collection)
              record.set(uniqueField, Number(uniqueValue) || String(uniqueValue))
            }

            const mapped = mapper(item, txApp)
            for (const [k, v] of Object.entries(mapped)) {
              if (v !== undefined && v !== null) {
                record.set(k, v)
              } else if (v === null) {
                record.set(k, '')
              }
            }

            try {
              txApp.save(record)
              count++
            } catch (errSave) {
              $app
                .logger()
                .error(
                  'Falha ao salvar registro',
                  'collection',
                  collectionName,
                  'error',
                  String(errSave),
                  'item_id',
                  String(uniqueValue),
                )
            }
          }
        })
      }

      return count
    }

    let totalSynced = 0
    const startMs = Date.now()

    try {
      if (action === 'assets' || action === 'all') {
        const data = fetchWithRetry(baseUrl + '/assets')
        totalSynced += syncData('assets', 'asset_id', data, (item) => ({
          asset_id: Number(item.asset_id || item.id),
          asset_description: item.asset_description || item.description || '',
          manufacturer_descr: item.manufacturer_descr || item.manufacturer || '',
          license_plate: item.license_plate || item.plate || '',
          active: item.active !== undefined ? Boolean(item.active) : true,
          created_at: item.created_at || null,
          updated_at: item.updated_at || null,
          plate: item.plate || item.placa || '',
          status: item.status || '',
        }))
      }

      if (action === 'drivers' || action === 'all') {
        const data = fetchWithRetry(baseUrl + '/drivers')
        totalSynced += syncData('drivers', 'driver_id', data, (item) => ({
          driver_id: Number(item.driver_id || item.id),
          driver_name: item.driver_name || item.name || '',
          group_desc: item.group_desc || '',
          worker_id: Number(item.worker_id) || null,
          card_id: item.card_id || '',
        }))
      }

      let warnings = []

      if (action === 'trips' || action === 'all') {
        try {
          const data = fetchWithRetry(baseUrl + '/trips?date=' + encodeURIComponent(syncDate))
          totalSynced += syncData('trips', 'trip_id', data, (item, txApp) => {
            return {
              trip_id: Number(item.trip_id || item.id),
              drive_id: Number(item.drive_id) || null,
              asset_id: Number(item.asset_id) || null,
              engine_hours: Number(item.engine_hours) || null,
              date: item.date || null,
              end_drive: item.end_drive || null,
              mileage: Number(item.mileage) || null,
              drive_duration: item.drive_duration || '',
              total_mileage: Number(item.total_mileage) || null,
              fuel_used: Number(item.fuel_used) || null,
              start_latitude: Number(item.start_latitude) || null,
              start_longitude: Number(item.start_longitude) || null,
              end_latitude: Number(item.end_latitude) || null,
              end_longitude: Number(item.end_longitude) || null,
              log_gps_processed:
                item.log_gps_processed !== undefined ? Boolean(item.log_gps_processed) : null,
              created_at: item.created_at || null,
              updated_at: item.updated_at || null,
              line_name: item.line_name || '',
              start_time: item.start_time || item.inicio || '',
              end_time: item.end_time || item.fim || '',
              distance_km:
                item.distance_km != null
                  ? item.distance_km
                  : item.distancia_km != null
                    ? item.distancia_km
                    : 0,
            }
          })
        } catch (err) {
          if (err.statusCode === 404) {
            $app.logger().info('Nenhuma viagem encontrada para a data', 'date', syncDate)
            warnings.push('Viagens não encontradas para a data especificada (404).')
          } else {
            throw err
          }
        }
      }

      if (action === 'tripEvents' || action === 'all') {
        try {
          const data = fetchWithRetry(baseUrl + '/trip-events?date=' + encodeURIComponent(syncDate))
          totalSynced += syncData('trip_events', 'event_id', data, (item, txApp) => {
            return {
              event_id: Number(item.event_id || item.id),
              trip_id: Number(item.trip_id) || null,
              asset_id: Number(item.asset_id) || null,
              driver_name: item.driver_name || '',
              group_desc: item.group_desc || '',
              worker_id: Number(item.worker_id) || null,
              event_type: item.event_type || item.tipo_evento || '',
              severity: item.severity || 'baixa',
              timestamp: item.timestamp || item.data_hora || null,
              description: item.description || item.descricao || '',
              mileage: Number(item.mileage) || null,
              fuel_used: Number(item.fuel_used) || null,
              idle_duration: Number(item.idle_duration) || null,
            }
          })
        } catch (err) {
          if (err.statusCode === 404) {
            $app.logger().info('Nenhum evento encontrado para a data', 'date', syncDate)
            warnings.push('Eventos não encontrados para a data especificada (404).')
          } else {
            throw err
          }
        }
      }

      if (action === 'eventTypes' || action === 'all') {
        try {
          const data = fetchWithRetry(baseUrl + '/events-schema?per_page=100')
          totalSynced += syncData('event_types', 'event_type_id', data, (item) => ({
            event_type_id: Number(item.event_type_id || item.id),
            name: item.name || '',
            type: item.type || '',
          }))
        } catch (err) {
          if (err.statusCode === 404) {
            warnings.push('Esquema de eventos não encontrado (404).')
          } else {
            throw err
          }
        }
      }

      const durationMs = Date.now() - startMs

      try {
        const logCol = $app.findCollectionByNameOrId('sync_logs')
        const logRecord = new Record(logCol)
        logRecord.set('type', action === 'tripEvents' ? 'events' : action)
        logRecord.set('status', 'success')
        logRecord.set('records_count', totalSynced)
        logRecord.set('duration_ms', durationMs)
        $app.save(logRecord)
      } catch (eLog) {
        $app.logger().error('Failed to save sync log', 'error', String(eLog))
      }

      const responseData = {
        success: true,
        action: action,
        records_synced: totalSynced,
        duration_ms: durationMs,
        timestamp: new Date().toISOString(),
      }

      if (warnings.length > 0) {
        responseData.message = warnings.join(' ')
      }

      return e.json(200, responseData)
    } catch (err) {
      const durationMs = Date.now() - startMs
      let errorMsg = err.message || String(err)

      if (errorMsg.length > 4900) {
        errorMsg = errorMsg.substring(0, 4900) + '...'
      }

      try {
        const logCol = $app.findCollectionByNameOrId('sync_logs')
        const logRecord = new Record(logCol)
        logRecord.set('type', action === 'tripEvents' ? 'events' : action)
        logRecord.set('status', 'error')
        logRecord.set('records_count', totalSynced)
        logRecord.set('duration_ms', durationMs)
        logRecord.set('error_message', errorMsg)
        $app.save(logRecord)
      } catch (eLog) {
        $app.logger().error('Failed to save sync log', 'error', String(eLog))
      }

      const statusCode = err.statusCode === 404 ? 404 : 500

      return e.json(statusCode, {
        success: false,
        error: 'Falha na sincronização: ' + errorMsg,
        statusCode: statusCode,
      })
    }
  },
  $apis.requireAuth(),
)
