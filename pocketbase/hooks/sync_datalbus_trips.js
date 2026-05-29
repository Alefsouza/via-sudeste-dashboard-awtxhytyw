routerAdd(
  'POST',
  '/backend/v1/sync_datalbus_trips',
  (e) => {
    const body = e.requestInfo().body || {}
    let startDate = body.startDate
    let endDate = body.endDate

    let syncStateRecord = null
    try {
      syncStateRecord = $app.findFirstRecordByData('sync_state', 'endpoint_name', 'trips')
    } catch (_) {
      const col = $app.findCollectionByNameOrId('sync_state')
      syncStateRecord = new Record(col)
      syncStateRecord.set('endpoint_name', 'trips')
    }

    if (!startDate) {
      const lastSync = syncStateRecord.getString('last_sync_at')
      if (lastSync) {
        startDate = lastSync.replace(' ', 'T')
        if (!startDate.endsWith('Z')) startDate += 'Z'
      } else {
        const date = new Date()
        date.setHours(date.getHours() - 24)
        startDate = date.toISOString()
      }
    }

    if (!endDate) {
      endDate = new Date().toISOString()
    }

    const baseUrl = $secrets.get('DATALBUS_BASE_URL')
    const token = $secrets.get('DATALBUS_TOKEN') || $secrets.get('DATALBUS_X_TENANCY')
    const tenancy = $secrets.get('DATALBUS_TENANCY')

    if (!baseUrl) {
      throw new BadRequestError('A URL Base da API Datalbus não está configurada.')
    }

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (token) {
      headers['Authorization'] = 'Bearer ' + token
      headers['x-tenancy'] = token
    }
    if (tenancy) {
      headers['tenancy'] = tenancy
    }

    let tripsProcessed = 0
    let eventsProcessed = 0
    let locationsProcessed = 0
    let page = 1
    let hasMore = true

    const sleep = (ms) => {
      const start = Date.now()
      while (Date.now() - start < ms) {}
    }

    const fetchWithRetry = (url) => {
      const backoffs = [2000, 4000, 8000]
      for (let i = 0; i <= backoffs.length; i++) {
        let res
        try {
          res = $http.send({
            url: url,
            method: 'GET',
            headers: headers,
            timeout: 60,
          })
        } catch (err) {
          if (i < backoffs.length) {
            sleep(backoffs[i])
            continue
          }
          throw new Error('Erro de conexão na API: ' + err.message)
        }

        if (res.statusCode === 200 || res.statusCode === 201) {
          return res
        }

        if (res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 404) {
          throw new Error('Erro fatal da API com status ' + res.statusCode)
        }

        if (res.statusCode === 503 && i < backoffs.length) {
          sleep(backoffs[i])
          continue
        }

        if (i < backoffs.length) {
          sleep(backoffs[i])
          continue
        }

        throw new Error('Falha na API Datalbus com status ' + res.statusCode)
      }
    }

    try {
      while (hasMore) {
        const url =
          baseUrl +
          '/trips?start_date=' +
          encodeURIComponent(startDate) +
          '&end_date=' +
          encodeURIComponent(endDate) +
          '&page=' +
          page +
          '&per_page=100'

        let res
        try {
          res = fetchWithRetry(url)
        } catch (err) {
          syncStateRecord.set('last_sync_status', 'error')
          syncStateRecord.set(
            'error_message',
            err.message || 'Erro desconhecido na requisição HTTP',
          )
          $app.save(syncStateRecord)
          throw new InternalServerError('Erro durante a comunicação com o Datalbus: ' + err.message)
        }

        const data = res.json?.data || res.json || []
        const items = Array.isArray(data) ? data : data.items || []

        if (items.length === 0) {
          hasMore = false
          break
        }

        $app.runInTransaction((txApp) => {
          const tripsCol = txApp.findCollectionByNameOrId('trips')
          const eventsCol = txApp.findCollectionByNameOrId('trip_events')
          const locationsCol = txApp.findCollectionByNameOrId('trip_locations')

          for (let i = 0; i < items.length; i++) {
            const trip = items[i]
            const tripId = trip.trip_id || trip.id
            if (!tripId) continue

            let tripRecord = null
            try {
              tripRecord = txApp.findFirstRecordByData('trips', 'trip_id', tripId)
            } catch (_) {
              tripRecord = new Record(tripsCol)
              tripRecord.set('trip_id', tripId)
            }

            if (trip.start_time) tripRecord.set('start_time', trip.start_time)
            if (trip.end_time) tripRecord.set('end_time', trip.end_time)
            if (trip.distance_km != null) tripRecord.set('distance_km', trip.distance_km)
            else if (trip.distance != null) tripRecord.set('distance', trip.distance)

            if (trip.engine_hours != null) tripRecord.set('engine_hours', trip.engine_hours)
            if (trip.fuel_used != null) tripRecord.set('fuel_used', trip.fuel_used)
            if (trip.score != null) tripRecord.set('score', trip.score)

            const vehicleIdentifier = trip.asset_id || trip.vehicle_id
            if (vehicleIdentifier) {
              try {
                const asset = txApp.findFirstRecordByData('assets', 'asset_id', vehicleIdentifier)
                tripRecord.set('vehicle_id', asset.id)
              } catch (_) {
                try {
                  const assetByStr = txApp.findFirstRecordByData(
                    'assets',
                    'vehicle_id',
                    String(vehicleIdentifier),
                  )
                  tripRecord.set('vehicle_id', assetByStr.id)
                } catch (__) {}
              }
            }

            if (trip.driver_id) {
              try {
                const driver = txApp.findFirstRecordByData('drivers', 'driver_id', trip.driver_id)
                tripRecord.set('driver_id', driver.id)
              } catch (_) {}
            }

            txApp.save(tripRecord)
            tripsProcessed++

            const events = trip.events || trip.trip_events || []
            for (let j = 0; j < events.length; j++) {
              const event = events[j]
              const eventId = event.event_id || event.id
              if (!eventId) continue

              let eventRecord = null
              try {
                eventRecord = txApp.findFirstRecordByData('trip_events', 'event_id', eventId)
              } catch (_) {
                eventRecord = new Record(eventsCol)
                eventRecord.set('event_id', eventId)
              }

              eventRecord.set('trip_id', tripRecord.id)
              if (event.event_type) eventRecord.set('event_type', event.event_type)
              if (event.severity) eventRecord.set('severity', event.severity)
              if (event.timestamp) eventRecord.set('timestamp', event.timestamp)
              else if (event.start_time) eventRecord.set('start_time', event.start_time)

              if (event.description) eventRecord.set('description', event.description)
              if (event.latitude != null) eventRecord.set('latitude', event.latitude)
              if (event.longitude != null) eventRecord.set('longitude', event.longitude)
              if (event.speed != null) eventRecord.set('speed', event.speed)
              if (event.value != null) eventRecord.set('value', event.value)

              txApp.save(eventRecord)
              eventsProcessed++
            }

            const locations = trip.locations || trip.path || []
            for (let k = 0; k < locations.length; k++) {
              const loc = locations[k]
              const recordedAt = loc.timestamp || loc.recorded_at || loc.time
              if (!recordedAt) continue

              let locRecord = null
              try {
                const filter =
                  "trip_id = '" +
                  tripRecord.id +
                  "' && recorded_at = '" +
                  recordedAt.replace(/'/g, '') +
                  "'"
                locRecord = txApp.findFirstRecordByFilter('trip_locations', filter)
              } catch (_) {
                locRecord = new Record(locationsCol)
                locRecord.set('trip_id', tripRecord.id)
                locRecord.set('recorded_at', recordedAt)
              }

              if (loc.latitude != null) locRecord.set('latitude', loc.latitude)
              if (loc.longitude != null) locRecord.set('longitude', loc.longitude)
              if (loc.speed != null) locRecord.set('speed', loc.speed)
              if (loc.heading != null) locRecord.set('heading', loc.heading)

              txApp.save(locRecord)
              locationsProcessed++
            }
          }
        })

        const meta = res.json?.meta || {}
        if (meta.current_page && meta.last_page) {
          if (meta.current_page >= meta.last_page) hasMore = false
        } else if (items.length < 100) {
          hasMore = false
        }
        page++
      }

      syncStateRecord.set('last_sync_status', 'success')
      syncStateRecord.set('last_sync_at', new Date().toISOString())
      syncStateRecord.set('records_processed', tripsProcessed)
      syncStateRecord.set('error_message', '')
      $app.save(syncStateRecord)

      return e.json(200, {
        data: {
          trips_processed: tripsProcessed,
          events_processed: eventsProcessed,
          locations_processed: locationsProcessed,
        },
      })
    } catch (err) {
      if (err instanceof BadRequestError || err instanceof InternalServerError) {
        throw err
      }

      syncStateRecord.set('last_sync_status', 'error')
      syncStateRecord.set(
        'error_message',
        err.message || 'Erro desconhecido durante o processamento no banco',
      )
      $app.save(syncStateRecord)
      throw new InternalServerError(
        'Falha na sincronização dos dados: ' + (err.message || 'Erro interno'),
      )
    }
  },
  $apis.requireAuth(),
)
