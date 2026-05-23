routerAdd(
  'POST',
  '/backend/v1/busca_dados_datalbus',
  (e) => {
    const body = e.requestInfo().body || {}
    const token = body.token
    const tenancy_id = body.tenancy_id
    const action = body.action
    const filters = body.filters || {}

    // Ensure date, start_date and end_date are picked from body if not in filters
    if (body.date && !filters.date) filters.date = body.date
    if (body.start_date && !filters.start_date) filters.start_date = body.start_date
    if (body.end_date && !filters.end_date) filters.end_date = body.end_date

    if (!token || !tenancy_id || !action) {
      return e.json(400, {
        success: false,
        error: 'Campos obrigatórios ausentes: token, tenancy_id ou action',
        statusCode: 400,
        action: action || 'unknown',
      })
    }

    let baseUrl = $secrets.get('DATALBUS_BASE_URL') || 'https://datalbus.com.br:8000/api/v2'
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    const validActions = ['assets', 'drivers', 'trips', 'tripEvents']
    if (!validActions.includes(action)) {
      return e.json(400, {
        success: false,
        error: 'Ação inválida. Ações permitidas: assets, drivers, trips, tripEvents',
        statusCode: 400,
        action: action,
      })
    }

    const globalStart = Date.now()

    const wait = (ms) => {
      const start = Date.now()
      while (Date.now() - start < ms) {}
    }

    const fetchDatalbus = (path, extraFilters = {}) => {
      let finalUrl = baseUrl + path
      const allFilters = { ...filters, ...extraFilters }
      if (Object.keys(allFilters).length > 0) {
        const queryParams = []
        for (const key in allFilters) {
          queryParams.push(encodeURIComponent(key) + '=' + encodeURIComponent(allFilters[key]))
        }
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryParams.join('&')
      }

      const delays = [0, 2000, 4000]
      let attempt = 0
      let lastRes = null

      while (attempt < 3) {
        const elapsed = Date.now() - globalStart
        if (elapsed >= 55000) {
          throw new Error('TIMEOUT')
        }

        if (delays[attempt] > 0) wait(delays[attempt])

        try {
          const res = $http.send({
            url: finalUrl,
            method: 'GET',
            headers: {
              Authorization: 'Bearer ' + token,
              Accept: 'application/json',
              'X-Tenancy': tenancy_id,
            },
            timeout: 15,
          })

          lastRes = res
          if (res.statusCode === 200) {
            return res.json
          } else if (res.statusCode === 429) {
            attempt++
            continue
          } else if (res.statusCode === 401) {
            throw new Error('UNAUTHORIZED')
          } else if (res.statusCode === 404) {
            throw new Error('NOT_FOUND')
          } else {
            throw new Error(`HTTP_${res.statusCode}`)
          }
        } catch (err) {
          if (
            err.message === 'TIMEOUT' ||
            err.message === 'UNAUTHORIZED' ||
            err.message === 'NOT_FOUND'
          ) {
            throw err
          }
          attempt++
        }
      }
      throw new Error(lastRes ? `HTTP_${lastRes.statusCode}` : 'NETWORK_ERROR')
    }

    const extractData = (parsed) => {
      if (!parsed) return []
      if (Array.isArray(parsed)) return parsed
      if (Array.isArray(parsed.data)) return parsed.data
      if (typeof parsed === 'object') return [parsed]
      return []
    }

    let rawData = []

    try {
      if (action === 'tripEvents') {
        // To fetch events correctly from Datalbus, we must first fetch trips
        // and then fetch events for each trip (/trips/{id}/events).
        const tripsRes = fetchDatalbus('/trips', { per_page: 100 })
        const tripsData = extractData(tripsRes)

        let allEvents = []
        for (const trip of tripsData) {
          if (trip && trip.id) {
            try {
              const eventsRes = fetchDatalbus(`/trips/${trip.id}/events`, { per_page: 100 })
              const eventsData = extractData(eventsRes)
              // Ensure we associate the event with its vehicle if missing
              const eventsWithVehicle = eventsData.map((e) => ({
                ...e,
                vehicle_id: e.vehicle_id || trip.vehicle_id,
              }))
              allEvents = allEvents.concat(eventsWithVehicle)
            } catch (err) {
              // Ignore individual trip fetch errors to allow partial sync
            }
          }
        }
        rawData = allEvents
      } else {
        const endpointMap = {
          assets: '/assets',
          drivers: '/drivers',
          trips: '/trips',
        }
        const parsed = fetchDatalbus(endpointMap[action], { per_page: 100 })
        rawData = extractData(parsed)
      }
    } catch (err) {
      if (err.message === 'TIMEOUT') {
        return e.json(408, {
          success: false,
          error: 'Tempo limite da requisição excedido',
          statusCode: 408,
          action,
        })
      } else if (err.message === 'UNAUTHORIZED') {
        return e.json(401, {
          success: false,
          error: 'Token expirado ou inválido',
          statusCode: 401,
          action,
        })
      } else if (err.message === 'NOT_FOUND') {
        return e.json(404, {
          success: false,
          error: 'Rota externa não encontrada no provedor (404)',
          statusCode: 404,
          action,
        })
      } else {
        return e.json(500, {
          success: false,
          error: 'Erro ao processar a resposta da API ou falha de conectividade',
          statusCode: 500,
          action,
        })
      }
    }

    let normalizedData = []
    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i]
      let obj = {}

      if (action === 'assets') {
        obj = {
          id: item.id,
          vehicle_id: item.vehicle_id,
          plate: item.plate,
          status: item.status,
          last_update: item.last_update,
        }
      } else if (action === 'drivers') {
        obj = {
          id: item.id,
          name: item.name,
          license_category: item.license_category,
          status: item.status,
        }
      } else if (action === 'trips') {
        obj = {
          id: item.id,
          vehicle_id: item.vehicle_id,
          start_time: item.start_time,
          end_time: item.end_time,
          distance_km: item.distance_km,
        }
      } else if (action === 'tripEvents') {
        obj = {
          id: item.id,
          vehicle_id: item.vehicle_id,
          event_type: item.event_type || item.event_type_description,
          severity: item.severity || 'low',
          timestamp: item.timestamp || item.event_time,
          description: item.description || item.event_type_description,
          latitude: item.latitude,
          longitude: item.longitude,
        }
      }
      normalizedData.push(obj)
    }

    if (filters && Object.keys(filters).length > 0) {
      normalizedData = normalizedData.filter((item) => {
        for (const key in filters) {
          if (key === 'start_date' || key === 'end_date' || key === 'date') continue
          if (item[key] !== filters[key]) {
            return false
          }
        }
        return true
      })
    }

    return e.json(200, {
      success: true,
      action: action,
      count: normalizedData.length,
      data: normalizedData,
      tenancy_id: tenancy_id,
      timestamp: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
