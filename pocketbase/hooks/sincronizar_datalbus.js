routerAdd(
  'POST',
  '/backend/v1/sincronizarDatalbus',
  (e) => {
    const body = e.requestInfo().body || {}
    const action = body.action
    const token = body.token
    const tenancyId = body.tenancy_id

    if (!action || !['assets', 'drivers', 'trips', 'tripEvents', 'all'].includes(action)) {
      return e.badRequestError(
        'Ação inválida ou ausente. Valores permitidos: assets, drivers, trips, tripEvents, all.',
      )
    }
    if (!token) {
      return e.badRequestError('Token Datalbus ausente.')
    }
    if (!tenancyId) {
      return e.badRequestError('Tenancy ID ausente.')
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
            try {
              errorBody = JSON.stringify(res.json || res.body)
            } catch (_) {}
            throw new Error('Erro na API Datalbus (HTTP ' + res.statusCode + '): ' + errorBody)
          }

          return res.json
        } catch (err) {
          if (attempts < delays.length && err.message && err.message.includes('429')) {
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
            const uniqueValue = item[uniqueField]
            if (uniqueValue === undefined || uniqueValue === null || uniqueValue === '') continue

            let record
            try {
              record = txApp.findFirstRecordByData(collectionName, uniqueField, String(uniqueValue))
            } catch (_) {
              record = new Record(collection)
              record.set(uniqueField, String(uniqueValue))
            }

            const mapped = mapper(item, txApp)
            for (const [k, v] of Object.entries(mapped)) {
              if (v !== undefined) {
                if (v === null) {
                  record.set(k, '')
                } else if (k === 'distance_km') {
                  record.set(k, Number(v) || 0)
                } else {
                  record.set(k, v)
                }
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
        totalSynced += syncData('assets', 'vehicle_id', data, (item) => ({
          plate: item.plate || item.placa || '',
          status: item.status || '',
        }))
      }

      if (action === 'drivers' || action === 'all') {
        const data = fetchWithRetry(baseUrl + '/drivers')
        totalSynced += syncData('drivers_datalbus', 'driver_id', data, (item) => ({
          name: item.name || item.nome || '',
          license_category: item.license_category || item.categoria_cnh || '',
          status: item.status || '',
        }))
      }

      if (action === 'trips' || action === 'all') {
        const data = fetchWithRetry(baseUrl + '/trips')
        totalSynced += syncData('trips', 'trip_id', data, (item, txApp) => {
          let vehicleRel = null
          if (item.vehicle_id) {
            try {
              const vRecord = txApp.findFirstRecordByData(
                'assets',
                'vehicle_id',
                String(item.vehicle_id),
              )
              vehicleRel = vRecord.id
            } catch (_) {}
          }
          return {
            vehicle_id: vehicleRel,
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
      }

      if (action === 'tripEvents' || action === 'all') {
        const data = fetchWithRetry(baseUrl + '/trip-events')
        totalSynced += syncData('trip_events', 'event_id', data, (item, txApp) => {
          let tripRel = null
          if (item.trip_id) {
            try {
              const tRecord = txApp.findFirstRecordByData('trips', 'trip_id', String(item.trip_id))
              tripRel = tRecord.id
            } catch (_) {}
          }

          let severity = 'baixa'
          const inSev = String(item.severity || '').toLowerCase()
          if (inSev === 'alta' || inSev === 'high') severity = 'alta'
          else if (inSev === 'média' || inSev === 'media' || inSev === 'medium') severity = 'média'

          return {
            trip_id: tripRel,
            vehicle_id: String(item.vehicle_id || ''),
            event_type: item.event_type || item.tipo_evento || '',
            severity: severity,
            timestamp: item.timestamp || item.data_hora || '',
            description: item.description || item.descricao || '',
          }
        })
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

      return e.json(200, {
        success: true,
        action: action,
        records_synced: totalSynced,
        duration_ms: durationMs,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      const durationMs = Date.now() - startMs
      const errorMsg = err.message || String(err)

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

      return e.json(500, {
        success: false,
        error: 'Falha na sincronização: ' + errorMsg,
        statusCode: 500,
      })
    }
  },
  $apis.requireAuth(),
)
