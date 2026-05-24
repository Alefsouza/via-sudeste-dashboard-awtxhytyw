migrate(
  (app) => {
    // 1. New Event Types Collection
    const eventTypes = new Collection({
      name: 'event_types',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'event_type_id', type: 'number', required: false },
        { name: 'name', type: 'text', required: false },
        { name: 'type', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_event_types_event_type_id ON event_types (event_type_id)'],
    })
    app.save(eventTypes)

    const ensureField = (col, fieldDef) => {
      const existing = col.fields.getByName(fieldDef.name)
      if (!existing) {
        if (fieldDef.type === 'number') col.fields.add(new NumberField(fieldDef))
        else if (fieldDef.type === 'text') col.fields.add(new TextField(fieldDef))
        else if (fieldDef.type === 'bool') col.fields.add(new BoolField(fieldDef))
        else if (fieldDef.type === 'date') col.fields.add(new DateField(fieldDef))
      } else {
        existing.required = false
      }
    }

    const updateRules = (col) => {
      col.listRule = "@request.auth.id != ''"
      col.viewRule = "@request.auth.id != ''"
      col.createRule = "@request.auth.id != ''"
      col.updateRule = "@request.auth.id != ''"
      col.deleteRule = "@request.auth.id != ''"

      for (const f of col.fields) {
        if (f.name !== 'id' && f.name !== 'created' && f.name !== 'updated') {
          f.required = false
        }
      }
    }

    const renameFieldToOld = (col, fieldName, indexName) => {
      const field = col.fields.getByName(fieldName)
      if (field && field.type !== 'number') {
        if (indexName) col.removeIndex(indexName)
        field.name = fieldName + '_old'
        app.save(col)
      }
    }

    // 2. assets
    const assets = app.findCollectionByNameOrId('assets')
    updateRules(assets)
    ensureField(assets, { name: 'asset_id', type: 'number', required: false })
    ensureField(assets, { name: 'asset_description', type: 'text', required: false })
    ensureField(assets, { name: 'manufacturer_descr', type: 'text', required: false })
    ensureField(assets, { name: 'license_plate', type: 'text', required: false })
    ensureField(assets, { name: 'active', type: 'bool', required: false })
    ensureField(assets, { name: 'created_at', type: 'date', required: false })
    ensureField(assets, { name: 'updated_at', type: 'date', required: false })
    app.save(assets)

    app
      .db()
      .newQuery(
        'DELETE FROM assets WHERE id NOT IN (SELECT MIN(id) FROM assets GROUP BY asset_id) AND asset_id IS NOT NULL',
      )
      .execute()
    assets.addIndex('idx_assets_asset_id', true, 'asset_id', '')
    app.save(assets)

    // 3. drivers
    const drivers = app.findCollectionByNameOrId('drivers')
    updateRules(drivers)
    ensureField(drivers, { name: 'driver_id', type: 'number', required: false })
    ensureField(drivers, { name: 'driver_name', type: 'text', required: false })
    ensureField(drivers, { name: 'group_desc', type: 'text', required: false })
    ensureField(drivers, { name: 'worker_id', type: 'number', required: false })
    ensureField(drivers, { name: 'card_id', type: 'text', required: false })
    app.save(drivers)

    app
      .db()
      .newQuery(
        'DELETE FROM drivers WHERE id NOT IN (SELECT MIN(id) FROM drivers GROUP BY driver_id) AND driver_id IS NOT NULL',
      )
      .execute()
    drivers.addIndex('idx_drivers_driver_id', true, 'driver_id', '')
    app.save(drivers)

    // 4. trips
    const trips = app.findCollectionByNameOrId('trips')
    renameFieldToOld(trips, 'trip_id', 'idx_trips_trip_id')
    updateRules(trips)

    ensureField(trips, { name: 'trip_id', type: 'number', required: false })
    ensureField(trips, { name: 'drive_id', type: 'number', required: false })
    ensureField(trips, { name: 'asset_id', type: 'number', required: false })
    ensureField(trips, { name: 'engine_hours', type: 'number', required: false })
    ensureField(trips, { name: 'date', type: 'date', required: false })
    ensureField(trips, { name: 'end_drive', type: 'date', required: false })
    ensureField(trips, { name: 'mileage', type: 'number', required: false })
    ensureField(trips, { name: 'drive_duration', type: 'text', required: false })
    ensureField(trips, { name: 'total_mileage', type: 'number', required: false })
    ensureField(trips, { name: 'fuel_used', type: 'number', required: false })
    ensureField(trips, { name: 'start_latitude', type: 'number', required: false })
    ensureField(trips, { name: 'start_longitude', type: 'number', required: false })
    ensureField(trips, { name: 'end_latitude', type: 'number', required: false })
    ensureField(trips, { name: 'end_longitude', type: 'number', required: false })
    ensureField(trips, { name: 'log_gps_processed', type: 'bool', required: false })
    ensureField(trips, { name: 'created_at', type: 'date', required: false })
    ensureField(trips, { name: 'updated_at', type: 'date', required: false })
    ensureField(trips, { name: 'line_name', type: 'text', required: false })
    app.save(trips)

    app
      .db()
      .newQuery(
        'DELETE FROM trips WHERE id NOT IN (SELECT MIN(id) FROM trips GROUP BY trip_id) AND trip_id IS NOT NULL',
      )
      .execute()
    trips.addIndex('idx_trips_trip_id', true, 'trip_id', '')
    trips.addIndex('idx_trips_asset_id', false, 'asset_id', '')
    app.save(trips)

    // 5. trip_events
    const tripEvents = app.findCollectionByNameOrId('trip_events')
    renameFieldToOld(tripEvents, 'event_id', 'idx_trip_events_event_id')
    renameFieldToOld(tripEvents, 'trip_id')
    updateRules(tripEvents)

    ensureField(tripEvents, { name: 'event_id', type: 'number', required: false })
    ensureField(tripEvents, { name: 'trip_id', type: 'number', required: false })
    ensureField(tripEvents, { name: 'asset_id', type: 'number', required: false })
    ensureField(tripEvents, { name: 'driver_name', type: 'text', required: false })
    ensureField(tripEvents, { name: 'group_desc', type: 'text', required: false })
    ensureField(tripEvents, { name: 'worker_id', type: 'number', required: false })
    ensureField(tripEvents, { name: 'event_type', type: 'text', required: false })
    ensureField(tripEvents, { name: 'severity', type: 'text', required: false })
    ensureField(tripEvents, { name: 'timestamp', type: 'date', required: false })
    ensureField(tripEvents, { name: 'description', type: 'text', required: false })
    ensureField(tripEvents, { name: 'mileage', type: 'number', required: false })
    ensureField(tripEvents, { name: 'fuel_used', type: 'number', required: false })
    ensureField(tripEvents, { name: 'idle_duration', type: 'number', required: false })
    app.save(tripEvents)

    app
      .db()
      .newQuery(
        'DELETE FROM trip_events WHERE id NOT IN (SELECT MIN(id) FROM trip_events GROUP BY event_id) AND event_id IS NOT NULL',
      )
      .execute()
    tripEvents.addIndex('idx_trip_events_event_id', true, 'event_id', '')
    tripEvents.addIndex('idx_trip_events_asset_id', false, 'asset_id', '')
    tripEvents.addIndex('idx_trip_events_trip_id', false, 'trip_id', '')
    app.save(tripEvents)
  },
  (app) => {
    const eventTypes = app.findCollectionByNameOrId('event_types')
    app.delete(eventTypes)
  },
)
