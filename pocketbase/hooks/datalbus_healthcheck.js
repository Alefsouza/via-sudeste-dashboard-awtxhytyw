routerAdd('GET', '/backend/v1/fetchDatalbusData/healthcheck', (e) => {
  return e.json(200, { status: 'ok' })
})
