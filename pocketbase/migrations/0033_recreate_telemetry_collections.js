migrate(
  (app) => {
    const toDelete = [
      'trip_events',
      'trip_locations',
      'events',
      'alerts',
      'telemetry_logs',
      'trips',
      'driver_scores',
      'asset_scores',
      'ranking_snapshots',
      'notifications',
      'asset_geofence_events',
      'geofences',
      'devices',
      'assets',
      'drivers',
      'event_types',
      'garages',
      'asset_group_mapping',
      'sync_logs',
    ]

    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }

    const authRule = "@request.auth.id != ''"

    const garages = new Collection({
      name: 'garages',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'short_name', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(garages)

    const asset_group_mapping = new Collection({
      name: 'asset_group_mapping',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'group_raw', type: 'text', required: true },
        { name: 'garage_id', type: 'relation', collectionId: garages.id, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(asset_group_mapping)

    const assets = new Collection({
      name: 'assets',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'asset_id', type: 'number', required: true },
        { name: 'license_plate', type: 'text' },
        { name: 'asset_group_raw', type: 'text' },
        { name: 'garage_id', type: 'relation', collectionId: garages.id, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_assets_asset_id ON assets (asset_id)',
        'CREATE INDEX idx_assets_garage_id ON assets (garage_id)',
      ],
    })
    app.save(assets)

    const drivers = new Collection({
      name: 'drivers',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'driver_id', type: 'number', required: true },
        { name: 'internal_id', type: 'number' },
        { name: 'name', type: 'text' },
        { name: 'group_desc', type: 'text' },
        { name: 'cargo', type: 'text' },
        { name: 'garagem', type: 'text' },
        { name: 'is_reserva', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_drivers_driver_id ON drivers (driver_id)'],
    })
    app.save(drivers)

    const event_types = new Collection({
      name: 'event_types',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'event_type_id', type: 'number', required: true },
        { name: 'name', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_event_types_event_type_id ON event_types (event_type_id)'],
    })
    app.save(event_types)

    const trips = new Collection({
      name: 'trips',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'trip_id', type: 'number', required: true },
        { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
        { name: 'driver_id', type: 'relation', collectionId: drivers.id, maxSelect: 1 },
        { name: 'start_time', type: 'date' },
        { name: 'end_time', type: 'date' },
        { name: 'distance', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_trips_trip_id ON trips (trip_id)',
        'CREATE INDEX idx_trips_asset_id ON trips (asset_id)',
        'CREATE INDEX idx_trips_driver_id ON trips (driver_id)',
      ],
    })
    app.save(trips)

    const trip_events = new Collection({
      name: 'trip_events',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'event_id', type: 'number', required: true },
        { name: 'trip_id', type: 'relation', collectionId: trips.id, maxSelect: 1 },
        { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
        { name: 'driver_id', type: 'relation', collectionId: drivers.id, maxSelect: 1 },
        { name: 'event_type_id', type: 'relation', collectionId: event_types.id, maxSelect: 1 },
        { name: 'start_time', type: 'date' },
        { name: 'end_time', type: 'date' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'speed', type: 'number' },
        { name: 'value', type: 'number' },
        { name: 'severity', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_trip_events_event_id ON trip_events (event_id)',
        'CREATE INDEX idx_trip_events_trip_id ON trip_events (trip_id)',
        'CREATE INDEX idx_trip_events_asset_id ON trip_events (asset_id)',
        'CREATE INDEX idx_trip_events_event_type_id ON trip_events (event_type_id)',
        'CREATE INDEX idx_trip_events_start_time ON trip_events (start_time DESC)',
        'CREATE INDEX idx_trip_events_asset_start ON trip_events (asset_id, start_time DESC)',
      ],
    })
    app.save(trip_events)

    const trip_locations = new Collection({
      name: 'trip_locations',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'trip_id', type: 'relation', collectionId: trips.id, maxSelect: 1 },
        { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
        { name: 'recorded_at', type: 'date' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'speed', type: 'number' },
        { name: 'heading', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_trip_locations_trip_id ON trip_locations (trip_id)',
        'CREATE INDEX idx_trip_locations_asset_id ON trip_locations (asset_id)',
        'CREATE INDEX idx_trip_locations_recorded_at ON trip_locations (recorded_at DESC)',
        'CREATE INDEX idx_trip_locations_asset_recorded ON trip_locations (asset_id, recorded_at DESC)',
      ],
    })
    app.save(trip_locations)

    const devices = new Collection({
      name: 'devices',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'device_code', type: 'text' },
        { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(devices)

    const sync_logs = new Collection({
      name: 'sync_logs',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'type', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'records_count', type: 'number' },
        { name: 'error_message', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(sync_logs)

    const driver_scores = new Collection({
      name: 'driver_scores',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'driver_id', type: 'relation', collectionId: drivers.id, maxSelect: 1 },
        { name: 'score', type: 'number' },
        { name: 'period_start', type: 'date' },
        { name: 'period_end', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(driver_scores)

    const asset_scores = new Collection({
      name: 'asset_scores',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
        { name: 'score', type: 'number' },
        { name: 'period_start', type: 'date' },
        { name: 'period_end', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(asset_scores)

    const notifications = new Collection({
      name: 'notifications',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'title', type: 'text' },
        { name: 'message', type: 'text' },
        { name: 'user_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'read', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(notifications)

    const geofences = new Collection({
      name: 'geofences',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'name', type: 'text' },
        { name: 'polygon', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(geofences)

    const asset_geofence_events = new Collection({
      name: 'asset_geofence_events',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
        { name: 'geofence_id', type: 'relation', collectionId: geofences.id, maxSelect: 1 },
        { name: 'event_type', type: 'text' },
        { name: 'timestamp', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(asset_geofence_events)

    const ranking_snapshots = new Collection({
      name: 'ranking_snapshots',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: 'snapshot_date', type: 'date' },
        { name: 'data', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(ranking_snapshots)
  },
  (app) => {
    const toDelete = [
      'ranking_snapshots',
      'asset_geofence_events',
      'geofences',
      'notifications',
      'asset_scores',
      'driver_scores',
      'sync_logs',
      'devices',
      'trip_locations',
      'trip_events',
      'trips',
      'event_types',
      'drivers',
      'assets',
      'asset_group_mapping',
      'garages',
    ]

    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
