routerAdd(
  'POST',
  '/backend/v1/sincronizar-datalbus',
  (e) => {
    const syncLogCol = $app.findCollectionByNameOrId('sync_logs')
    const syncLog = new Record(syncLogCol)
    syncLog.set('type', 'all')
    syncLog.set('status', 'error') // Default to error until properly completed
    syncLog.set('duration_ms', 0)
    $app.save(syncLog)
    const startTime = Date.now()

    try {
      const getConfig = (key) => {
        try {
          const record = $app.findFirstRecordByData('admin_config', 'config_key', key)
          const val = record.get('config_value')
          if (val && typeof val === 'object' && typeof val.value !== 'undefined') return val.value
          if (typeof val === 'string') return val
          return null
        } catch (_) {
          return $secrets.get(key) || null
        }
      }

      const email = getConfig('DATALBUS_EMAIL')
      const password = getConfig('DATALBUS_PASSWORD')
      const tenancy = getConfig('DATALBUS_TENANCY')
      const baseUrl = getConfig('DATALBUS_BASE_URL') || 'https://api.datalbus.com/v2'

      if (!email || !password || !tenancy) {
        syncLog.set('error_message', 'Missing Datalbus credentials in admin_config')
        syncLog.set('duration_ms', Date.now() - startTime)
        $app.save(syncLog)
        return e.badRequestError('Missing Datalbus credentials in admin_config.')
      }

      const authRes = $http.send({
        url: `${baseUrl}/auth/login`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenancy }),
        timeout: 15,
      })

      if (authRes.statusCode >= 400) {
        let msg = 'Unknown auth error'
        try {
          msg = JSON.stringify(authRes.json || authRes.body)
        } catch (_) {}
        throw new Error(`Datalbus Auth Error: ${authRes.statusCode} - ${msg}`)
      }

      const token = authRes.json?.token || authRes.json?.access_token
      if (!token) {
        throw new Error('No token returned from Datalbus auth.')
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenancy': tenancy,
      }

      let recordsCreated = 0
      let recordsUpdated = 0

      const saveItems = (collectionName, idField, items, mapFn) => {
        const col = $app.findCollectionByNameOrId(collectionName)
        for (const item of items) {
          try {
            let rec
            try {
              rec = $app.findFirstRecordByData(collectionName, idField, item[idField])
            } catch (_) {
              rec = new Record(col)
            }
            const isNew = !rec.id
            mapFn(rec, item)
            $app.save(rec)
            if (isNew) recordsCreated++
            else recordsUpdated++
          } catch (err) {
            $app
              .logger()
              .error(`Error saving ${collectionName}`, 'error', err.message, 'item', item)
          }
        }
      }

      const fetchAndSave = (endpoint, collectionName, idField, mapFn) => {
        const res = $http.send({
          url: `${baseUrl}${endpoint}`,
          method: 'GET',
          headers,
          timeout: 30,
        })
        if (res.statusCode === 200 && res.json?.data) {
          saveItems(collectionName, idField, res.json.data, mapFn)
        } else {
          $app.logger().warn(`Failed to fetch ${endpoint}`, 'status', res.statusCode)
        }
      }

      fetchAndSave('/assets', 'assets', 'asset_id', (rec, item) => {
        rec.set('asset_id', item.asset_id)
        rec.set('plate', item.license_plate || '')
        rec.set('license_plate', item.license_plate || '')
        rec.set('brand', item.manufacturer_descr || '')
        rec.set('model', item.asset_description || '')
        rec.set('manufacturer_descr', item.manufacturer_descr || '')
        rec.set('asset_description', item.asset_description || '')
      })

      fetchAndSave('/drivers', 'drivers', 'driver_id', (rec, item) => {
        rec.set('driver_id', item.driver_id)
        rec.set('name', item.driver_name || '')
        rec.set('driver_name', item.driver_name || '')
        rec.set('worker_id', item.worker_id || 0)
        rec.set('cpf', item.cpf || '')
        rec.set('license_number', item.license_number || '')
      })

      fetchAndSave('/trips', 'trips', 'trip_id', (rec, item) => {
        rec.set('trip_id', item.trip_id)
        rec.set('drive_id', item.drive_id || 0)
        rec.set('asset_id', item.asset_id || 0)
        rec.set('distance', item.distance || 0)
        rec.set('duration', item.duration || 0)
        rec.set('score', item.score || 0)
        rec.set('fuel_used', item.fuel_used || 0)

        try {
          if (item.asset_id) {
            const asset = $app.findFirstRecordByData('assets', 'asset_id', item.asset_id)
            rec.set('vehicle_id', asset.id)
          }
        } catch (_) {}
      })

      syncLog.set('status', 'success')
      syncLog.set('records_created', recordsCreated)
      syncLog.set('records_updated', recordsUpdated)
      syncLog.set('records_count', recordsCreated + recordsUpdated)
      syncLog.set('duration_ms', Date.now() - startTime)
      $app.save(syncLog)

      return e.json(200, { success: true, recordsCreated, recordsUpdated })
    } catch (err) {
      syncLog.set('status', 'error')
      syncLog.set('error_message', err.message)
      syncLog.set('duration_ms', Date.now() - startTime)
      $app.save(syncLog)
      return e.badRequestError(err.message)
    }
  },
  $apis.requireAuth(),
)
