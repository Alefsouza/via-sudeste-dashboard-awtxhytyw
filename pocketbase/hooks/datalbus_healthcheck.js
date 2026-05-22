routerAdd('POST', '/backend/v1/healthcheckDatalbus', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token
  const tenancy_id = body.tenancy_id

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
