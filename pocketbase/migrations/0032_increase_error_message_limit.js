migrate(
  (app) => {
    const syncLogs = app.findCollectionByNameOrId('sync_logs')
    syncLogs.fields.add(
      new TextField({
        name: 'error_message',
        max: 50000,
      }),
    )
    app.save(syncLogs)

    const syncState = app.findCollectionByNameOrId('sync_state')
    syncState.fields.add(
      new TextField({
        name: 'error_message',
        max: 50000,
      }),
    )
    app.save(syncState)
  },
  (app) => {
    const syncLogs = app.findCollectionByNameOrId('sync_logs')
    syncLogs.fields.add(
      new TextField({
        name: 'error_message',
        max: 5000,
      }),
    )
    app.save(syncLogs)

    const syncState = app.findCollectionByNameOrId('sync_state')
    syncState.fields.add(
      new TextField({
        name: 'error_message',
        max: 5000,
      }),
    )
    app.save(syncState)
  },
)
