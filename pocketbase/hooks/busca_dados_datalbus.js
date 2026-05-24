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

    // Provide default date as specified in requirements
    if (!filters.date && !filters.start_date && !filters.end_date) {
      filters.date = '2026-05-23'
      filters.start_date = '2026-05-23'
      filters.end_date = '2026-05-23'
    }

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

    const sleep = (ms) => {
      const start = Date.now()
      while (Date.now() - start < ms) {
        // blocking sleep
      }
    }

    const fetchDatalbus = (path, extraFilters = {}) => {
      let finalUrl = baseUrl + path
      const allFilters = Object.assign({}, filters, extraFilters)

      // Do not send start_date and end_date directly if unsupported, use date instead if needed
      if (path === '/trips' || path.includes('/events')) {
        delete allFilters.start_date
        delete allFilters.end_date
      }

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

        if (delays[attempt] > 0) sleep(delays[attempt])

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
            const errorDetail = res.json?.message || res.json?.error || `HTTP_${res.statusCode}`
            throw new Error(errorDetail)
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
      throw new Error(
        lastRes ? `HTTP_${lastRes.statusCode} - falha de conexão após tentativas` : 'NETWORK_ERROR',
      )
    }

    const extractData = (parsed) => {
      if (!parsed) return []
      if (Array.isArray(parsed)) return parsed
      if (Array.isArray(parsed.data)) return parsed.data
      if (typeof parsed === 'object') {
        if (parsed.message || parsed.error) {
          return []
        }
        return [parsed]
      }
      return []
    }

    let rawData = []

    try {
      if (action === 'tripEvents') {
        // To fetch events correctly from Datalbus, we must first fetch trips
        // and then fetch events for each trip (/trips/{id}/events).

        let tripsData = []
        let startStr = filters.start_date || filters.date
        let endStr = filters.end_date || filters.date

        if (startStr && endStr) {
          const start = new Date(startStr)
          const end = new Date(endStr)
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0]
              try {
                const tripsRes = fetchDatalbus('/trips', { per_page: 100, date: dateStr })
                tripsData = tripsData.concat(extractData(tripsRes))
              } catch (e) {
                // ignore daily failures to allow partial data
              }
            }
          }
        } else {
          const tripsRes = fetchDatalbus('/trips', { per_page: 100 })
          tripsData = extractData(tripsRes)
        }

        let allEvents = []
        for (const trip of tripsData) {
          if (trip && trip.id) {
            try {
              const eventsRes = fetchDatalbus(`/trips/${trip.id}/events`, { per_page: 100 })
              const eventsData = extractData(eventsRes)

              // Validation step for expected schema
              const validEvents = eventsData.filter(
                (e) =>
                  e &&
                  typeof e === 'object' &&
                  (e.id || e.event_type || e.description || e.event_type_description),
              )

              // Ensure we associate the event with its vehicle if missing
              const eventsWithVehicle = validEvents.map((e) =>
                Object.assign({}, e, {
                  vehicle_id: e.vehicle_id || trip.vehicle_id,
                }),
              )
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
          error: `Erro ao processar a resposta da API ou falha de conectividade: ${err.message}`,
          statusCode: 500,
          action,
        })
      }
    }

    let normalizedData = rawData

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
