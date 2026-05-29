routerAdd(
  'POST',
  '/backend/v1/sync_datalbus_catalogs',
  (e) => {
    const baseUrl = $secrets.get('DATALBUS_BASE_URL')
    if (!baseUrl) {
      return e.badRequestError('DATALBUS_BASE_URL secret is not configured.')
    }

    const token = $secrets.get('DATALBUS_TOKEN') || $secrets.get('DATALBUS_X_TENANCY') || ''
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      'X-Tenancy': $secrets.get('DATALBUS_X_TENANCY') || '',
      Tenancy: $secrets.get('DATALBUS_TENANCY') || '',
    }

    const endpoints = [
      { path: '/api/assets', collection: 'assets', uniqueField: 'asset_id' },
      { path: '/api/devices', collection: 'devices', uniqueField: 'device_code' },
      { path: '/api/drivers', collection: 'drivers', uniqueField: 'driver_id' },
      { path: '/api/event_types', collection: 'event_types', uniqueField: 'event_type_id' },
    ]

    function sleep(ms) {
      const start = Date.now()
      while (Date.now() - start < ms) {}
    }

    function updateSyncState(endpointName, status, count, errorMsg) {
      let record
      try {
        record = $app.findFirstRecordByData('sync_state', 'endpoint_name', endpointName)
      } catch (_) {
        const col = $app.findCollectionByNameOrId('sync_state')
        record = new Record(col)
        record.set('endpoint_name', endpointName)
      }

      record.set('last_sync_at', new Date().toISOString())
      record.set('last_sync_status', status)
      record.set('records_processed', count)
      record.set('error_message', errorMsg || '')

      $app.save(record)
    }

    const results = {}

    for (let i = 0; i < endpoints.length; i++) {
      const ep = endpoints[i]
      let page = 1
      let hasMore = true
      let processedCount = 0
      let endpointSuccess = true
      let errorMsg = ''

      while (hasMore) {
        const url = baseUrl.replace(/\/$/, '') + ep.path + '?page=' + page

        let attempt = 0
        let delays = [2000, 4000, 8000]
        let res
        let success = false

        while (attempt <= 3) {
          try {
            res = $http.send({
              url: url,
              method: 'GET',
              headers: headers,
              timeout: 30,
            })

            if (res.statusCode >= 200 && res.statusCode < 300) {
              success = true
              break
            }

            if (res.statusCode === 503) {
              if (attempt < 3) {
                sleep(delays[attempt])
                attempt++
                continue
              } else {
                errorMsg = 'API returned 503 after retries'
                break
              }
            }

            if (res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 404) {
              errorMsg = 'API returned ' + res.statusCode
              break
            }

            errorMsg = 'API returned ' + res.statusCode
            break
          } catch (err) {
            errorMsg = err.message || 'Network Error'
            break
          }
        }

        if (!success) {
          endpointSuccess = false
          break
        }

        let items = []
        if (res.json) {
          if (Array.isArray(res.json)) items = res.json
          else if (Array.isArray(res.json.data)) items = res.json.data
          else if (Array.isArray(res.json.items)) items = res.json.items
        }

        if (!items || items.length === 0) {
          hasMore = false
          break
        }

        const col = $app.findCollectionByNameOrId(ep.collection)
        const fields = col.fields

        for (let j = 0; j < items.length; j++) {
          const item = items[j]
          let record
          let uniqueValue = item[ep.uniqueField]
          if (uniqueValue === undefined || uniqueValue === null) {
            uniqueValue = item.id
          }

          if (uniqueValue !== undefined && uniqueValue !== null) {
            try {
              record = $app.findFirstRecordByData(ep.collection, ep.uniqueField, uniqueValue)
            } catch (_) {
              record = new Record(col)
            }
          } else {
            record = new Record(col)
          }

          for (let key in item) {
            const f = fields.getByName(key)
            if (f && f.type !== 'relation') {
              record.set(key, item[key])
            }
          }

          if (ep.collection === 'assets') {
            if (item.id) record.set('asset_id', item.id)
            if (item.description) record.set('asset_description', item.description)
          } else if (ep.collection === 'drivers') {
            if (item.id) record.set('driver_id', item.id)
            if (item.name) record.set('driver_name', item.name)
          } else if (ep.collection === 'devices') {
            if (item.code) record.set('device_code', item.code)
          } else if (ep.collection === 'event_types') {
            if (item.id) record.set('event_type_id', item.id)
          }

          try {
            $app.save(record)
            processedCount++
          } catch (saveErr) {
            $app.logger().error('Error saving ' + ep.collection, 'error', saveErr.message)
          }
        }

        if (items.length < 50) {
          hasMore = false
        } else {
          page++
        }
      }

      updateSyncState(
        ep.collection,
        endpointSuccess ? 'success' : 'error',
        processedCount,
        errorMsg,
      )
      results[ep.collection] = {
        status: endpointSuccess ? 'success' : 'error',
        processed: processedCount,
        error: errorMsg,
      }
    }

    return e.json(200, { success: true, results })
  },
  $apis.requireAuth(),
)
