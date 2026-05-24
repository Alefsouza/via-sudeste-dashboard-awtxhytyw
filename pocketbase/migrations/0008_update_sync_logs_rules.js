migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('sync_logs')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != ''"
    col.deleteRule = "@request.auth.id != ''"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('sync_logs')
    col.listRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    col.viewRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    col.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    col.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    col.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(col)
  },
)
