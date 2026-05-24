migrate(
  (app) => {
    const assets = new Collection({
      name: 'assets',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'vehicle_id', type: 'text', required: true },
        { name: 'plate', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'last_update', type: 'autodate', onCreate: true, onUpdate: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_assets_vehicle_id ON assets (vehicle_id)'],
    })
    app.save(assets)

    const drivers = new Collection({
      name: 'drivers_datalbus',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'driver_id', type: 'text', required: true },
        { name: 'name', type: 'text' },
        { name: 'license_category', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_drivers_datalbus_driver_id ON drivers_datalbus (driver_id)',
      ],
    })
    app.save(drivers)

    const trips = new Collection({
      name: 'trips',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'trip_id', type: 'text', required: true },
        { name: 'vehicle_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
        { name: 'start_time', type: 'date' },
        { name: 'end_time', type: 'date' },
        { name: 'distance_km', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_trips_trip_id ON trips (trip_id)'],
    })
    app.save(trips)

    const tripEvents = new Collection({
      name: 'trip_events',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'event_id', type: 'text', required: true },
        { name: 'trip_id', type: 'relation', collectionId: trips.id, maxSelect: 1 },
        { name: 'vehicle_id', type: 'text' },
        { name: 'event_type', type: 'text' },
        { name: 'severity', type: 'select', values: ['alta', 'média', 'baixa'], maxSelect: 1 },
        { name: 'timestamp', type: 'date' },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_trip_events_event_id ON trip_events (event_id)',
        'CREATE INDEX idx_trip_events_vehicle_id ON trip_events (vehicle_id)',
      ],
    })
    app.save(tripEvents)
  },
  (app) => {
    try {
      const tripEvents = app.findCollectionByNameOrId('trip_events')
      app.delete(tripEvents)
    } catch (_) {}

    try {
      const trips = app.findCollectionByNameOrId('trips')
      app.delete(trips)
    } catch (_) {}

    try {
      const drivers = app.findCollectionByNameOrId('drivers_datalbus')
      app.delete(drivers)
    } catch (_) {}

    try {
      const assets = app.findCollectionByNameOrId('assets')
      app.delete(assets)
    } catch (_) {}
  },
)
