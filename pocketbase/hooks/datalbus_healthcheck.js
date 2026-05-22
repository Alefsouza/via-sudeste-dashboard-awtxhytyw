routerAdd('POST', '/backend/v1/datalbus_healthcheck', (e) => {
  const body = e.requestInfo().body || {}
  let token = body.token
  let tenancy_id = body.tenancy_id

  if (!token || !tenancy_id) {
    return e.json(400, {
      success: false,
      status: 'offline',
      datalbus: false,
      error: 'Parâmetros token e tenancy_id são obrigatórios.',
      statusCode: 400,
      timestamp: new Date().toISOString(),
    })
  }

  if (token === 'auto' || token === 'dummy') {
    try {
      const cache = $app.findFirstRecordByData('integration_cache', 'key', 'datalbus_token')
      const val = cache.get('value')
      if (val && val.token) {
        token = val.token
        if (val.tenancy_id) tenancy_id = val.tenancy_id
      }
    } catch (err) {
      // Continue and fallback to token if not found
    }
  }

  try {
    let baseUrl = $secrets.get('DATALBUS_BASE_URL')
    if (!baseUrl) {
      baseUrl = 'https://datalbus.com.br:8000/api/v2'
    }

    const res = $http.send({
      url: baseUrl + '/assets',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 30,
    })

    if (res.statusCode === 200) {
      return e.json(200, {
        success: true,
        status: 'online',
        datalbus: true,
        tenancy_id: tenancy_id,
        timestamp: new Date().toISOString(),
      })
    }

    if (res.statusCode === 401) {
      return e.json(401, {
        success: false,
        status: 'offline',
        datalbus: false,
        error: 'token inválido',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      })
    }

    return e.json(503, {
      success: false,
      status: 'offline',
      datalbus: false,
      error: 'API indisponível',
      statusCode: 503,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return e.json(503, {
      success: false,
      status: 'offline',
      datalbus: false,
      error: 'API indisponível',
      statusCode: 503,
      timestamp: new Date().toISOString(),
    })
  }
})
