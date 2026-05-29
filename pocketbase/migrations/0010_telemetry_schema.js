migrate(
  (app) => {
    // Asset Types
    let assetTypes
    try {
      assetTypes = app.findCollectionByNameOrId('asset_types')
    } catch (_) {
      assetTypes = new Collection({
        name: 'asset_types',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text' },
          { name: 'description', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(assetTypes)
    }

    // Assets Update
    const assets = app.findCollectionByNameOrId('assets')
    if (!assets.fields.getByName('asset_type_id'))
      assets.fields.add(
        new RelationField({ name: 'asset_type_id', collectionId: assetTypes.id, maxSelect: 1 }),
      )
    if (!assets.fields.getByName('fleet_number'))
      assets.fields.add(new TextField({ name: 'fleet_number' }))
    if (!assets.fields.getByName('year')) assets.fields.add(new NumberField({ name: 'year' }))
    if (!assets.fields.getByName('model')) assets.fields.add(new TextField({ name: 'model' }))
    if (!assets.fields.getByName('brand')) assets.fields.add(new TextField({ name: 'brand' }))
    app.save(assets)

    // Devices
    let devices
    try {
      devices = app.findCollectionByNameOrId('devices')
    } catch (_) {
      devices = new Collection({
        name: 'devices',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
          { name: 'device_code', type: 'text' },
          { name: 'device_type', type: 'text' },
          { name: 'installed_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(devices)
    }

    // Drivers Update
    const drivers = app.findCollectionByNameOrId('drivers')
    if (!drivers.fields.getByName('cpf')) drivers.fields.add(new TextField({ name: 'cpf' }))
    if (!drivers.fields.getByName('license_category'))
      drivers.fields.add(new TextField({ name: 'license_category' }))
    if (!drivers.fields.getByName('phone')) drivers.fields.add(new TextField({ name: 'phone' }))
    if (!drivers.fields.getByName('email')) drivers.fields.add(new EmailField({ name: 'email' }))
    if (!drivers.fields.getByName('hired_at'))
      drivers.fields.add(new DateField({ name: 'hired_at' }))
    if (!drivers.fields.getByName('status')) drivers.fields.add(new TextField({ name: 'status' }))
    app.save(drivers)

    // Event Types Update
    const eventTypes = app.findCollectionByNameOrId('event_types')
    if (!eventTypes.fields.getByName('category'))
      eventTypes.fields.add(
        new SelectField({
          name: 'category',
          values: ['alerta', 'evento', 'sumario', 'histograma'],
          maxSelect: 1,
        }),
      )
    if (!eventTypes.fields.getByName('description'))
      eventTypes.fields.add(new TextField({ name: 'description' }))
    if (!eventTypes.fields.getByName('default_weight'))
      eventTypes.fields.add(new NumberField({ name: 'default_weight' }))
    if (!eventTypes.fields.getByName('default_criticality'))
      eventTypes.fields.add(new TextField({ name: 'default_criticality' }))
    eventTypes.addIndex('idx_event_types_event_type_id', true, 'event_type_id', '')
    app.save(eventTypes)

    // Events
    let events
    try {
      events = app.findCollectionByNameOrId('events')
    } catch (_) {
      events = new Collection({
        name: 'events',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
          { name: 'device_id', type: 'relation', collectionId: devices.id, maxSelect: 1 },
          { name: 'driver_id', type: 'relation', collectionId: drivers.id, maxSelect: 1 },
          { name: 'event_type_id', type: 'relation', collectionId: eventTypes.id, maxSelect: 1 },
          { name: 'start_time', type: 'date' },
          { name: 'end_time', type: 'date' },
          { name: 'latitude', type: 'number' },
          { name: 'longitude', type: 'number' },
          { name: 'speed', type: 'number' },
          { name: 'value', type: 'number' },
          { name: 'metadata', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(events)
    }

    // Trips Update
    const trips = app.findCollectionByNameOrId('trips')
    if (
      trips.fields.getByName('driver_id') &&
      trips.fields.getByName('driver_id').type !== 'relation'
    ) {
      trips.fields.removeByName('driver_id')
    }
    if (!trips.fields.getByName('driver_id'))
      trips.fields.add(
        new RelationField({ name: 'driver_id', collectionId: drivers.id, maxSelect: 1 }),
      )

    if (!trips.fields.getByName('start_latitude'))
      trips.fields.add(new NumberField({ name: 'start_latitude' }))
    if (!trips.fields.getByName('start_longitude'))
      trips.fields.add(new NumberField({ name: 'start_longitude' }))
    if (!trips.fields.getByName('end_latitude'))
      trips.fields.add(new NumberField({ name: 'end_latitude' }))
    if (!trips.fields.getByName('end_longitude'))
      trips.fields.add(new NumberField({ name: 'end_longitude' }))
    if (!trips.fields.getByName('distance')) trips.fields.add(new NumberField({ name: 'distance' }))
    if (!trips.fields.getByName('duration')) trips.fields.add(new NumberField({ name: 'duration' }))
    if (!trips.fields.getByName('score')) trips.fields.add(new NumberField({ name: 'score' }))
    app.save(trips)

    // Trip Events Update
    const tripEvents = app.findCollectionByNameOrId('trip_events')
    if (
      tripEvents.fields.getByName('trip_id') &&
      tripEvents.fields.getByName('trip_id').type !== 'relation'
    ) {
      tripEvents.fields.removeByName('trip_id')
    }
    if (!tripEvents.fields.getByName('trip_id'))
      tripEvents.fields.add(
        new RelationField({ name: 'trip_id', collectionId: trips.id, maxSelect: 1 }),
      )
    if (!tripEvents.fields.getByName('event_type_id'))
      tripEvents.fields.add(
        new RelationField({ name: 'event_type_id', collectionId: eventTypes.id, maxSelect: 1 }),
      )
    if (!tripEvents.fields.getByName('start_time'))
      tripEvents.fields.add(new DateField({ name: 'start_time' }))
    if (!tripEvents.fields.getByName('end_time'))
      tripEvents.fields.add(new DateField({ name: 'end_time' }))
    if (!tripEvents.fields.getByName('latitude'))
      tripEvents.fields.add(new NumberField({ name: 'latitude' }))
    if (!tripEvents.fields.getByName('longitude'))
      tripEvents.fields.add(new NumberField({ name: 'longitude' }))
    if (!tripEvents.fields.getByName('speed'))
      tripEvents.fields.add(new NumberField({ name: 'speed' }))
    if (!tripEvents.fields.getByName('value'))
      tripEvents.fields.add(new NumberField({ name: 'value' }))
    app.save(tripEvents)

    // Trip Locations
    try {
      app.findCollectionByNameOrId('trip_locations')
    } catch (_) {
      const tripLocations = new Collection({
        name: 'trip_locations',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'trip_id', type: 'relation', collectionId: trips.id, maxSelect: 1 },
          { name: 'latitude', type: 'number' },
          { name: 'longitude', type: 'number' },
          { name: 'speed', type: 'number' },
          { name: 'heading', type: 'number' },
          { name: 'recorded_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(tripLocations)
    }

    // Realtime Locations
    try {
      app.findCollectionByNameOrId('realtime_locations')
    } catch (_) {
      const realtimeLocations = new Collection({
        name: 'realtime_locations',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
          { name: 'latitude', type: 'number' },
          { name: 'longitude', type: 'number' },
          { name: 'speed', type: 'number' },
          { name: 'heading', type: 'number' },
          { name: 'ignition', type: 'bool' },
          { name: 'recorded_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(realtimeLocations)
    }

    // Driver Scores
    try {
      app.findCollectionByNameOrId('driver_scores')
    } catch (_) {
      const driverScores = new Collection({
        name: 'driver_scores',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'driver_id', type: 'relation', collectionId: drivers.id, maxSelect: 1 },
          { name: 'period_start', type: 'date' },
          { name: 'period_end', type: 'date' },
          { name: 'score', type: 'number' },
          { name: 'trips_count', type: 'number' },
          { name: 'distance_total', type: 'number' },
          { name: 'events_count', type: 'number' },
          { name: 'ranking_position', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(driverScores)
    }

    // Sync State
    try {
      app.findCollectionByNameOrId('sync_state')
    } catch (_) {
      const syncState = new Collection({
        name: 'sync_state',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'endpoint_name', type: 'text' },
          { name: 'last_sync_at', type: 'date' },
          { name: 'last_sync_status', type: 'text' },
          { name: 'records_processed', type: 'number' },
          { name: 'error_message', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_sync_state_endpoint ON sync_state (endpoint_name)'],
      })
      app.save(syncState)
    }

    // Admin Config
    try {
      app.findCollectionByNameOrId('admin_config')
    } catch (_) {
      const adminConfig = new Collection({
        name: 'admin_config',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'config_key', type: 'text' },
          { name: 'config_value', type: 'json' },
          { name: 'updated_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_admin_config_key ON admin_config (config_key)'],
      })
      app.save(adminConfig)
    }

    // User Profiles
    try {
      app.findCollectionByNameOrId('user_profiles')
    } catch (_) {
      const userProfiles = new Collection({
        name: 'user_profiles',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'user_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
          { name: 'name', type: 'text' },
          { name: 'email', type: 'email' },
          { name: 'role', type: 'select', values: ['operador', 'gestor', 'admin'], maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(userProfiles)
    }
  },
  (app) => {
    // rollback omitted for safety
  },
)
