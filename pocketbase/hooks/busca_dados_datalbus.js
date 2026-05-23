routerAdd(
  'POST',
  '/backend/v1/buscaDadosDatalbus',
  (e) => {
    const body = e.requestInfo().body || {}
    const token = body.token
    const tenancy_id = body.tenancy_id
    const action = body.action
    const filters = body.filters || {}

    // Ensure start_date and end_date are picked from body if not in filters
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

    const endpoints = {
      assets: baseUrl + '/assets',
      drivers: baseUrl + '/drivers',
      trips: baseUrl + '/trips',
      tripEvents: baseUrl + '/events',
    }

    const url = endpoints[action]
    if (!url) {
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
      while (Date.now() - start < ms) {
        // delay loop
      }
    }

    const delays = [0, 2000, 4000, 8000]
    const maxAttempts = 4
    let attempt = 0

    let success = false
    let res
    let lastStatusCode = 500
    let lastErrorMsg = ''

    while (attempt < maxAttempts) {
      const elapsed = Date.now() - globalStart
      if (elapsed >= 30000) {
        return e.json(408, {
          success: false,
          error: 'Tempo limite da requisição excedido (30s)',
          statusCode: 408,
          action: action,
        })
      }

      if (delays[attempt] > 0) {
        wait(delays[attempt])
      }

      const elapsedAfterWait = Date.now() - globalStart
      if (elapsedAfterWait >= 30000) {
        return e.json(408, {
          success: false,
          error: 'Tempo limite da requisição excedido (30s)',
          statusCode: 408,
          action: action,
        })
      }

      try {
        const remainingTime = Math.max(1, 30 - Math.floor(elapsedAfterWait / 1000))

        let finalUrl = url
        if (filters && Object.keys(filters).length > 0) {
          const queryParams = []
          for (const key in filters) {
            queryParams.push(encodeURIComponent(key) + '=' + encodeURIComponent(filters[key]))
          }
          finalUrl += '?' + queryParams.join('&')
        }

        res = $http.send({
          url: finalUrl,
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + token,
            Accept: 'application/json',
            'X-Tenancy': tenancy_id,
          },
          timeout: remainingTime,
        })

        lastStatusCode = res.statusCode

        if (res.statusCode === 200) {
          success = true
          break
        } else if (res.statusCode === 429) {
          lastErrorMsg = 'Muitas requisições (Rate Limit)'
          attempt++
          continue
        } else if (res.statusCode === 401) {
          return e.json(401, {
            success: false,
            error: 'Token expirado ou inválido',
            statusCode: 401,
            action: action,
          })
        } else {
          let extErrorMsg = 'Erro na API externa: ' + res.statusCode
          try {
            if (res.json && res.json.message) {
              extErrorMsg = res.json.message
            } else if (res.json && res.json.error) {
              extErrorMsg = res.json.error
            } else if (res.json && res.json.errors) {
              extErrorMsg = JSON.stringify(res.json.errors)
            }
          } catch (err) {}

          return e.json(res.statusCode, {
            success: false,
            error: extErrorMsg,
            statusCode: res.statusCode,
            action: action,
          })
        }
      } catch (err) {
        return e.json(500, {
          success: false,
          error: 'Falha de comunicação com o servidor externo',
          statusCode: 500,
          action: action,
        })
      }
    }

    if (!success) {
      return e.json(lastStatusCode, {
        success: false,
        error: lastErrorMsg,
        statusCode: lastStatusCode,
        action: action,
      })
    }

    let rawData = []
    try {
      const parsed = res.json
      if (Array.isArray(parsed)) {
        rawData = parsed
      } else if (parsed && Array.isArray(parsed.data)) {
        rawData = parsed.data
      } else if (parsed && typeof parsed === 'object') {
        rawData = [parsed]
      }
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao processar a resposta da API',
        statusCode: 500,
        action: action,
      })
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
          event_type: item.event_type,
          severity: item.severity,
          timestamp: item.timestamp,
          description: item.description,
        }
      }
      normalizedData.push(obj)
    }

    if (filters && Object.keys(filters).length > 0) {
      normalizedData = normalizedData.filter((item) => {
        for (const key in filters) {
          if (key === 'start_date' || key === 'end_date') continue
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
