migrate(
  (app) => {
    // Seed admin user
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'telemetria@viasudeste.com')
    } catch (_) {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const record = new Record(users)
      record.setEmail('telemetria@viasudeste.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Admin')
      record.set('role', 'admin')
      app.save(record)
    }

    // Seed drivers
    const driversData = [
      {
        name: 'João Silva',
        license_number: '12345678901',
        score: 95,
        driver_id: 1,
        driver_name: 'João Silva',
      },
      {
        name: 'Maria Souza',
        license_number: '10987654321',
        score: 88,
        driver_id: 2,
        driver_name: 'Maria Souza',
      },
      {
        name: 'Carlos Oliveira',
        license_number: '56789012345',
        score: 72,
        driver_id: 3,
        driver_name: 'Carlos Oliveira',
      },
    ]

    const driversCol = app.findCollectionByNameOrId('drivers')
    for (const d of driversData) {
      try {
        app.findFirstRecordByData('drivers', 'driver_id', d.driver_id)
      } catch (_) {
        const record = new Record(driversCol)
        record.set('name', d.name)
        record.set('license_number', d.license_number)
        record.set('score', d.score)
        record.set('driver_id', d.driver_id)
        record.set('driver_name', d.driver_name)
        app.save(record)
      }
    }

    // Seed assets (vehicles)
    const assetsData = [
      {
        vehicle_id: 'V-001',
        plate: 'ABC-1234',
        status: 'moving',
        active: true,
        asset_id: 1,
        asset_description: 'Ônibus Urbano',
      },
      {
        vehicle_id: 'V-002',
        plate: 'DEF-5678',
        status: 'idle',
        active: true,
        asset_id: 2,
        asset_description: 'Micro-ônibus',
      },
      {
        vehicle_id: 'V-003',
        plate: 'GHI-9012',
        status: 'maintenance',
        active: true,
        asset_id: 3,
        asset_description: 'Ônibus Articulado',
      },
      {
        vehicle_id: 'V-004',
        plate: 'JKL-3456',
        status: 'moving',
        active: true,
        asset_id: 4,
        asset_description: 'Ônibus Urbano',
      },
      {
        vehicle_id: 'V-005',
        plate: 'MNO-7890',
        status: 'idle',
        active: true,
        asset_id: 5,
        asset_description: 'Van',
      },
    ]

    const assetsCol = app.findCollectionByNameOrId('assets')
    for (const a of assetsData) {
      try {
        app.findFirstRecordByData('assets', 'vehicle_id', a.vehicle_id)
      } catch (_) {
        const record = new Record(assetsCol)
        record.set('vehicle_id', a.vehicle_id)
        record.set('plate', a.plate)
        record.set('status', a.status)
        record.set('active', a.active)
        record.set('asset_id', a.asset_id)
        record.set('asset_description', a.asset_description)
        app.save(record)
      }
    }

    // Seed trip_events
    const eventsData = [
      {
        event_id: 1,
        vehicle_id: 'V-001',
        event_type: 'Frenagem Brusca',
        severity: 'alta',
        timestamp: '2026-05-20 10:00:00.000Z',
        description: 'Frenagem brusca detectada na Av. Paulista',
        driver_name: 'João Silva',
      },
      {
        event_id: 2,
        vehicle_id: 'V-002',
        event_type: 'Excesso de Velocidade',
        severity: 'média',
        timestamp: '2026-05-20 10:15:00.000Z',
        description: 'Velocidade acima do limite em via local',
        driver_name: 'Maria Souza',
      },
      {
        event_id: 3,
        vehicle_id: 'V-003',
        event_type: 'Falha no Motor',
        severity: 'alta',
        timestamp: '2026-05-20 11:00:00.000Z',
        description: 'Alerta de temperatura do motor',
        driver_name: 'Carlos Oliveira',
      },
      {
        event_id: 4,
        vehicle_id: 'V-004',
        event_type: 'Curva Acentuada',
        severity: 'baixa',
        timestamp: '2026-05-20 11:30:00.000Z',
        description: 'Curva acentuada',
        driver_name: 'João Silva',
      },
      {
        event_id: 5,
        vehicle_id: 'V-001',
        event_type: 'Ociosidade',
        severity: 'baixa',
        timestamp: '2026-05-20 12:00:00.000Z',
        description: 'Motor ocioso por mais de 10 min',
        driver_name: 'Maria Souza',
      },
      {
        event_id: 6,
        vehicle_id: 'V-005',
        event_type: 'Porta Aberta em Movimento',
        severity: 'alta',
        timestamp: '2026-05-20 13:00:00.000Z',
        description: 'Porta do passageiro aberta com veículo a 10km/h',
        driver_name: 'Carlos Oliveira',
      },
      {
        event_id: 7,
        vehicle_id: 'V-002',
        event_type: 'Excesso de Velocidade',
        severity: 'média',
        timestamp: '2026-05-20 14:00:00.000Z',
        description: '80km/h em via de 60km/h',
        driver_name: 'João Silva',
      },
      {
        event_id: 8,
        vehicle_id: 'V-003',
        event_type: 'Frenagem Brusca',
        severity: 'alta',
        timestamp: '2026-05-20 14:30:00.000Z',
        description: 'Desaceleração rápida',
        driver_name: 'Maria Souza',
      },
      {
        event_id: 9,
        vehicle_id: 'V-004',
        event_type: 'Aceleração Brusca',
        severity: 'média',
        timestamp: '2026-05-20 15:00:00.000Z',
        description: 'Aceleração repentina',
        driver_name: 'Carlos Oliveira',
      },
      {
        event_id: 10,
        vehicle_id: 'V-001',
        event_type: 'Pânico',
        severity: 'alta',
        timestamp: '2026-05-20 16:00:00.000Z',
        description: 'Botão de pânico acionado',
        driver_name: 'João Silva',
      },
    ]

    const eventsCol = app.findCollectionByNameOrId('trip_events')
    for (const e of eventsData) {
      try {
        app.findFirstRecordByData('trip_events', 'event_id', e.event_id)
      } catch (_) {
        const record = new Record(eventsCol)
        record.set('event_id', e.event_id)
        record.set('vehicle_id', e.vehicle_id)
        record.set('event_type', e.event_type)
        record.set('severity', e.severity)
        record.set('timestamp', e.timestamp)
        record.set('description', e.description)
        record.set('driver_name', e.driver_name)
        app.save(record)
      }
    }
  },
  (app) => {
    // Down migration ignored for seeding
  },
)
