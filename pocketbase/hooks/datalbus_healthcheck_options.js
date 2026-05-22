routerAdd('OPTIONS', '/backend/v1/datalbus_healthcheck', (e) => {
  e.response.header().set('Access-Control-Allow-Origin', '*')
  e.response.header().set('Access-Control-Allow-Methods', 'GET, POST')
  e.response.header().set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return e.noContent(204)
})
