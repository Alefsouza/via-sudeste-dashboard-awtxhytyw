migrate(
  (app) => {
    // 1. Seed Admin User
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'telemetria@viasudeste.com')
    } catch (_) {
      const admin = new Record(users)
      admin.setEmail('telemetria@viasudeste.com')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Admin Via Sudeste')
      app.save(admin)
    }

    // 2. Seed Vehicles
    const vehiclesCol = app.findCollectionByNameOrId('vehicles')
    const vehicleData = [
      {
        plate: 'BRA2E19',
        model: 'Scania R450',
        status: 'moving',
        last_latitude: -23.5505,
        last_longitude: -46.6333,
      },
      {
        plate: 'KXP4H22',
        model: 'Volvo FH 540',
        status: 'idle',
        last_latitude: -22.9068,
        last_longitude: -43.1729,
      },
      {
        plate: 'JHG1A11',
        model: 'Mercedes-Benz Actros',
        status: 'maintenance',
        last_latitude: -19.9167,
        last_longitude: -43.9345,
      },
    ]

    const vehicleIds = {}
    for (const v of vehicleData) {
      try {
        const existing = app.findFirstRecordByData('vehicles', 'plate', v.plate)
        vehicleIds[v.plate] = existing.id
      } catch (_) {
        const record = new Record(vehiclesCol)
        record.set('plate', v.plate)
        record.set('model', v.model)
        record.set('status', v.status)
        record.set('last_latitude', v.last_latitude)
        record.set('last_longitude', v.last_longitude)
        app.save(record)
        vehicleIds[v.plate] = record.id
      }
    }

    // 3. Seed Telemetry Logs
    const telemetryCol = app.findCollectionByNameOrId('telemetry_logs')
    const telemetryData = [
      { plate: 'BRA2E19', speed: 85, fuel_level: 45, rpm: 1200, engine_temp: 85 },
      { plate: 'BRA2E19', speed: 88, fuel_level: 44, rpm: 1250, engine_temp: 86 },
      { plate: 'BRA2E19', speed: 110, fuel_level: 43, rpm: 1800, engine_temp: 90 }, // Overspeed incident
      { plate: 'KXP4H22', speed: 0, fuel_level: 80, rpm: 0, engine_temp: 40 },
      { plate: 'KXP4H22', speed: 0, fuel_level: 80, rpm: 0, engine_temp: 39 },
      { plate: 'JHG1A11', speed: 0, fuel_level: 15, rpm: 0, engine_temp: 25 },
    ]

    for (const t of telemetryData) {
      const record = new Record(telemetryCol)
      record.set('vehicle_id', vehicleIds[t.plate])
      record.set('speed', t.speed)
      record.set('fuel_level', t.fuel_level)
      record.set('rpm', t.rpm)
      record.set('engine_temp', t.engine_temp)
      app.save(record)
    }

    // 4. Seed Alerts
    const alertsCol = app.findCollectionByNameOrId('alerts')
    try {
      app.findFirstRecordByData('alerts', 'message', 'Excesso de velocidade detectado: 110km/h')
    } catch (_) {
      const alert = new Record(alertsCol)
      alert.set('vehicle_id', vehicleIds['BRA2E19'])
      alert.set('type', 'overspeed')
      alert.set('severity', 'high')
      alert.set('message', 'Excesso de velocidade detectado: 110km/h')
      alert.set('resolved', false)
      app.save(alert)
    }

    // 5. Seed Drivers
    const driversCol = app.findCollectionByNameOrId('drivers')
    const driversData = [
      { name: 'João Silva', license_number: '123456789', score: 95 },
      { name: 'Maria Santos', license_number: '987654321', score: 82 },
      { name: 'Carlos Oliveira', license_number: '456789123', score: 68 },
    ]

    for (const d of driversData) {
      try {
        app.findFirstRecordByData('drivers', 'license_number', d.license_number)
      } catch (_) {
        const record = new Record(driversCol)
        record.set('name', d.name)
        record.set('license_number', d.license_number)
        record.set('score', d.score)
        app.save(record)
      }
    }
  },
  (app) => {
    // Revert logic is generally empty for complex seeds unless needed
  },
)
