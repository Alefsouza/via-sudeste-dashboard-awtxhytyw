migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let adminId
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'telemetria@viasudeste.com')
      adminId = record.id
    } catch (_) {
      const newRecord = new Record(users)
      newRecord.setEmail('telemetria@viasudeste.com')
      newRecord.setPassword('Skip@Pass')
      newRecord.setVerified(true)
      newRecord.set('name', 'Administrador')
      app.save(newRecord)
      adminId = newRecord.id
    }

    const profiles = app.findCollectionByNameOrId('user_profiles')
    try {
      app.findFirstRecordByData('user_profiles', 'user_id', adminId)
    } catch (_) {
      const profile = new Record(profiles)
      profile.set('user_id', adminId)
      profile.set('name', 'Administrador')
      profile.set('email', 'telemetria@viasudeste.com')
      profile.set('role', 'admin')
      app.save(profile)
    }
  },
  (app) => {},
)
