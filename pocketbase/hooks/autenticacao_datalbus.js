routerAdd('POST', '/backend/v1/autenticacaoDatalbus', (e) => {
  if (e.response && typeof e.response.header === 'function') {
    e.response.header().set('Access-Control-Allow-Origin', '*')
    e.response.header().set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    e.response.header().set('Access-Control-Allow-Headers', 'Content-Type')
  }

  const body = e.requestInfo().body || {}
  const email = body.email
  const password = body.password

  if (!email || !password) {
    return e.json(401, {
      success: false,
      error: 'Credenciais inválidas',
      statusCode: 401,
    })
  }

  try {
    const res = $http.send({
      url: 'https://datalbus.com.br:8000/api/v2/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
      timeout: 30,
    })

    if (res.statusCode === 200) {
      const data = res.json || {}
      if (data.token && data.user && data.user.tenancy && data.user.tenancy.length > 0) {
        return e.json(200, {
          success: true,
          token: data.token,
          tenancy_id: String(data.user.tenancy[0]),
          user_id: data.user.id || 0,
          email: data.user.email || email,
        })
      } else {
        return e.json(500, {
          success: false,
          error: 'Erro desconhecido no processamento',
          statusCode: 500,
        })
      }
    } else if (res.statusCode === 401) {
      return e.json(401, {
        success: false,
        error: 'Credenciais inválidas',
        statusCode: 401,
      })
    } else {
      return e.json(500, {
        success: false,
        error: 'Servidor Datalbus indisponível',
        statusCode: 500,
      })
    }
  } catch (err) {
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('timeout') || msg.includes('deadline')) {
      return e.json(408, {
        success: false,
        error: 'Timeout na autenticação',
        statusCode: 408,
      })
    }
    return e.json(500, {
      success: false,
      error: 'Servidor Datalbus indisponível',
      statusCode: 500,
    })
  }
})
