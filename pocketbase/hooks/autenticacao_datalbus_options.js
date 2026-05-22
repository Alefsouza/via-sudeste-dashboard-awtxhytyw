routerAdd('OPTIONS', '/backend/v1/autenticacao_datalbus', (e) => {
  if (e.response && typeof e.response.header === 'function') {
    e.response.header().set('Access-Control-Allow-Origin', '*')
    e.response.header().set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    e.response.header().set('Access-Control-Allow-Headers', 'Content-Type')
  }
  return e.noContent(204)
})
