migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'user'],
          maxSelect: 1,
        }),
      )
      app.save(users)
    }

    app.db().newQuery("UPDATE users SET role = 'admin' WHERE role IS NULL OR role = ''").execute()

    const syncLogs = new Collection({
      name: 'sync_logs',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['assets', 'drivers', 'trips', 'events', 'all'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['success', 'error'],
          maxSelect: 1,
        },
        { name: 'records_count', type: 'number', required: false },
        { name: 'duration_ms', type: 'number', required: false },
        { name: 'error_message', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(syncLogs)
  },
  (app) => {
    try {
      const syncLogs = app.findCollectionByNameOrId('sync_logs')
      app.delete(syncLogs)
    } catch (_) {}

    try {
      const users = app.findCollectionByNameOrId('users')
      users.fields.removeByName('role')
      app.save(users)
    } catch (_) {}
  },
)
