migrate(
  (app) => {
    // 1. event_types (New Collection)
    const eventTypes = new Collection({
      name: 'event_types',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'event_type_id', type: 'number', required: true },
        { name: 'name', type: 'text' },
        { name: 'type', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_event_types_event_type_id ON event_types (event_type_id)'],
    })
    app.save(eventTypes)

    // 2. assets
    const assets = app.findCollectionByNameOrId('assets')
    assets.listRule = "@request.auth.id != ''"
    assets.viewRule = "@request.auth.id != ''"
    assets.createRule = "@request.auth.id != ''"
    assets.updateRule = "@request.auth.id != ''"
    assets.deleteRule = "@request.auth.id != ''"

    if (!assets.fields.getByName('asset_id'))
      assets.fields.add(new NumberField({ name: 'asset_id', required: true }))
    if (!assets.fields.getByName('asset_description'))
      assets.fields.add(new TextField({ name: 'asset_description' }))
    if (!assets.fields.getByName('manufacturer_descr'))
      assets.fields.add(new TextField({ name: 'manufacturer_descr' }))
    if (!assets.fields.getByName('license_plate'))
      assets.fields.add(new TextField({ name: 'license_plate' }))
    if (!assets.fields.getByName('active')) assets.fields.add(new BoolField({ name: 'active' }))

    app.save(assets) // Save to create the new columns before raw SQL migration

    app
      .db()
      .newQuery(
        `UPDATE assets SET asset_id = CAST(vehicle_id AS INTEGER) WHERE vehicle_id IS NOT NULL AND vehicle_id != ''`,
      )
      .execute()
    app
      .db()
      .newQuery(
        `UPDATE assets SET asset_id = ABS(RANDOM()) % 100000000 WHERE asset_id = 0 OR asset_id IS NULL`,
      )
      .execute()
    app
      .db()
      .newQuery(`
    DELETE FROM assets WHERE id NOT IN (
      SELECT MIN(id) FROM assets GROUP BY asset_id
    )
  `)
      .execute()

    assets.addIndex('idx_assets_asset_id', true, 'asset_id', '')
    app.save(assets)

    // 3. drivers
    const drivers = app.findCollectionByNameOrId('drivers')
    drivers.listRule = "@request.auth.id != ''"
    drivers.viewRule = "@request.auth.id != ''"
    drivers.createRule = "@request.auth.id != ''"
    drivers.updateRule = "@request.auth.id != ''"
    drivers.deleteRule = "@request.auth.id != ''"

    if (!drivers.fields.getByName('driver_id'))
      drivers.fields.add(new NumberField({ name: 'driver_id', required: true }))
    if (!drivers.fields.getByName('driver_name'))
      drivers.fields.add(new TextField({ name: 'driver_name' }))
    if (!drivers.fields.getByName('group_desc'))
      drivers.fields.add(new TextField({ name: 'group_desc' }))
    if (!drivers.fields.getByName('worker_id'))
      drivers.fields.add(new NumberField({ name: 'worker_id' }))
    if (!drivers.fields.getByName('card_id')) drivers.fields.add(new TextField({ name: 'card_id' }))

    app.save(drivers)

    app
      .db()
      .newQuery(
        `UPDATE drivers SET driver_id = ABS(RANDOM()) % 100000000 WHERE driver_id = 0 OR driver_id IS NULL`,
      )
      .execute()
    app
      .db()
      .newQuery(`
    DELETE FROM drivers WHERE id NOT IN (
      SELECT MIN(id) FROM drivers GROUP BY driver_id
    )
  `)
      .execute()

    drivers.addIndex('idx_drivers_driver_id', true, 'driver_id', '')
    app.save(drivers)

    // 4. trips
    const trips = app.findCollectionByNameOrId('trips')
    trips.listRule = "@request.auth.id != ''"
    trips.viewRule = "@request.auth.id != ''"
    trips.createRule = "@request.auth.id != ''"
    trips.updateRule = "@request.auth.id != ''"
    trips.deleteRule = "@request.auth.id != ''"

    if (!trips.fields.getByName('drive_id')) trips.fields.add(new NumberField({ name: 'drive_id' }))
    if (!trips.fields.getByName('asset_id')) trips.fields.add(new NumberField({ name: 'asset_id' }))
    if (!trips.fields.getByName('engine_hours'))
      trips.fields.add(new NumberField({ name: 'engine_hours' }))
    if (!trips.fields.getByName('date')) trips.fields.add(new DateField({ name: 'date' }))
    if (!trips.fields.getByName('end_drive')) trips.fields.add(new DateField({ name: 'end_drive' }))
    if (!trips.fields.getByName('mileage')) trips.fields.add(new NumberField({ name: 'mileage' }))
    if (!trips.fields.getByName('drive_duration'))
      trips.fields.add(new TextField({ name: 'drive_duration' }))
    if (!trips.fields.getByName('total_mileage'))
      trips.fields.add(new NumberField({ name: 'total_mileage' }))
    if (!trips.fields.getByName('fuel_used'))
      trips.fields.add(new NumberField({ name: 'fuel_used' }))
    if (!trips.fields.getByName('start_latitude'))
      trips.fields.add(new NumberField({ name: 'start_latitude' }))
    if (!trips.fields.getByName('start_longitude'))
      trips.fields.add(new NumberField({ name: 'start_longitude' }))
    if (!trips.fields.getByName('end_latitude'))
      trips.fields.add(new NumberField({ name: 'end_latitude' }))
    if (!trips.fields.getByName('end_longitude'))
      trips.fields.add(new NumberField({ name: 'end_longitude' }))
    if (!trips.fields.getByName('log_gps_processed'))
      trips.fields.add(new BoolField({ name: 'log_gps_processed' }))
    if (!trips.fields.getByName('created_at'))
      trips.fields.add(new AutodateField({ name: 'created_at', onCreate: true, onUpdate: false }))
    if (!trips.fields.getByName('updated_at'))
      trips.fields.add(new AutodateField({ name: 'updated_at', onCreate: true, onUpdate: true }))
    if (!trips.fields.getByName('line_name')) trips.fields.add(new TextField({ name: 'line_name' }))

    trips.addIndex('idx_trips_asset_id', false, 'asset_id', '')
    trips.addIndex('idx_trips_trip_id', true, 'trip_id', '')
    app.save(trips)

    // 5. trip_events
    const tripEvents = app.findCollectionByNameOrId('trip_events')
    tripEvents.listRule = "@request.auth.id != ''"
    tripEvents.viewRule = "@request.auth.id != ''"
    tripEvents.createRule = "@request.auth.id != ''"
    tripEvents.updateRule = "@request.auth.id != ''"
    tripEvents.deleteRule = "@request.auth.id != ''"

    // Replace severity 'select' with 'text' to avoid restrictive validations and allow unmapped api values
    const severityField = tripEvents.fields.getByName('severity')
    if (severityField && severityField.type === 'select') {
      tripEvents.fields.removeByName('severity')
      tripEvents.fields.add(new TextField({ name: 'severity' }))
    }

    if (!tripEvents.fields.getByName('asset_id'))
      tripEvents.fields.add(new NumberField({ name: 'asset_id' }))
    if (!tripEvents.fields.getByName('driver_name'))
      tripEvents.fields.add(new TextField({ name: 'driver_name' }))
    if (!tripEvents.fields.getByName('group_desc'))
      tripEvents.fields.add(new TextField({ name: 'group_desc' }))
    if (!tripEvents.fields.getByName('worker_id'))
      tripEvents.fields.add(new NumberField({ name: 'worker_id' }))
    if (!tripEvents.fields.getByName('mileage'))
      tripEvents.fields.add(new NumberField({ name: 'mileage' }))
    if (!tripEvents.fields.getByName('fuel_used'))
      tripEvents.fields.add(new NumberField({ name: 'fuel_used' }))
    if (!tripEvents.fields.getByName('idle_duration'))
      tripEvents.fields.add(new NumberField({ name: 'idle_duration' }))

    tripEvents.addIndex('idx_trip_events_asset_id', false, 'asset_id', '')
    tripEvents.addIndex('idx_trip_events_trip_id', false, 'trip_id', '')
    app.save(tripEvents)
  },
  (app) => {
    const eventTypes = app.findCollectionByNameOrId('event_types')
    if (eventTypes) {
      app.delete(eventTypes)
    }
  },
)
