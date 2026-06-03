migrate(
  (app) => {
    // Purge any existing mock or corrupted records from the domains
    const collectionsToPurge = ['assets', 'drivers', 'trips', 'trip_events', 'driver_scores']
    for (const colName of collectionsToPurge) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        app.truncateCollection(col)
      } catch (_) {
        // Collection might not exist, skip safely
      }
    }

    // Ensure admin user exists and has correct password & role
    const usersCol = app.findCollectionByNameOrId('users')
    try {
      const admin = app.findAuthRecordByEmail('users', 'telemetria@viasudeste.com')
      admin.setPassword('Skip@Pass')
      admin.set('role', 'admin')
      admin.setVerified(true)
      app.save(admin)
    } catch (_) {
      const admin = new Record(usersCol)
      admin.setEmail('telemetria@viasudeste.com')
      admin.setPassword('Skip@Pass')
      admin.set('name', 'Admin Via Sudeste')
      admin.set('role', 'admin')
      admin.setVerified(true)
      app.save(admin)
    }
  },
  (app) => {
    // Irreversible operation (purge), no logical down
  },
)
