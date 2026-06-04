migrate(
  (app) => {
    const authRule = "@request.auth.id != ''"

    function getOrCreateCollection(name) {
      try {
        return app.findCollectionByNameOrId(name)
      } catch (_) {
        try {
          const titleCase = name.charAt(0).toUpperCase() + name.slice(1)
          return app.findCollectionByNameOrId(titleCase)
        } catch (_) {
          return new Collection({ name: name, type: 'base' })
        }
      }
    }

    function syncCollection(name, fields, indexes) {
      const col = getOrCreateCollection(name)
      col.listRule = authRule
      col.viewRule = authRule
      col.createRule = authRule
      col.updateRule = authRule
      col.deleteRule = authRule

      for (const fDef of fields) {
        let field = col.fields.getByName(fDef.name)
        if (!field) {
          let f
          if (fDef.type === 'text') f = new TextField(fDef)
          else if (fDef.type === 'number') f = new NumberField(fDef)
          else if (fDef.type === 'bool') f = new BoolField(fDef)
          else if (fDef.type === 'email') f = new EmailField(fDef)
          else if (fDef.type === 'url') f = new URLField(fDef)
          else if (fDef.type === 'date') f = new DateField(fDef)
          else if (fDef.type === 'autodate') f = new AutodateField(fDef)
          else if (fDef.type === 'select') f = new SelectField(fDef)
          else if (fDef.type === 'relation') f = new RelationField(fDef)
          else if (fDef.type === 'file') f = new FileField(fDef)
          else if (fDef.type === 'editor') f = new EditorField(fDef)
          else if (fDef.type === 'json') f = new JSONField(fDef)
          else if (fDef.type === 'geoPoint') f = new GeoPointField(fDef)
          else if (fDef.type === 'password') f = new PasswordField(fDef)
          else if (fDef.type === 'vector') f = new VectorField(fDef)

          if (f) col.fields.add(f)
        }
      }

      if (indexes) {
        for (const idx of indexes) {
          const match = idx.match(/INDEX\s+(\w+)\s+ON\s+\w+\s*\(([^)]+)\)/i)
          if (match) {
            const idxName = match[1]
            const isUnique = /UNIQUE\s+INDEX/i.test(idx)
            const columnsStr = match[2]

            if (isUnique) {
              const colName = columnsStr.split(',')[0].trim().split(' ')[0]
              try {
                app
                  .db()
                  .newQuery(
                    `DELETE FROM ${col.name} WHERE id NOT IN (SELECT MIN(id) FROM ${col.name} GROUP BY ${colName}) AND ${colName} IS NOT NULL`,
                  )
                  .execute()
              } catch (_) {}
            }

            col.addIndex(idxName, isUnique, columnsStr, '')
          }
        }
      }

      app.save(col)
      return col
    }

    const garages = syncCollection('garages', [
      { name: 'name', type: 'text', required: true },
      { name: 'short_name', type: 'text', required: true },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ])

    const asset_group_mapping = syncCollection('asset_group_mapping', [
      { name: 'group_raw', type: 'text', required: true },
      { name: 'garage_id', type: 'relation', collectionId: garages.id, maxSelect: 1 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ])

    const assets = syncCollection(
      'assets',
      [
        { name: 'asset_id', type: 'number', required: true },
        { name: 'license_plate', type: 'text' },
        { name: 'asset_group_raw', type: 'text' },
        { name: 'garage_id', type: 'relation', collectionId: garages.id, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      [
        'CREATE UNIQUE INDEX idx_assets_asset_id ON assets (asset_id)',
        'CREATE INDEX idx_assets_garage_id ON assets (garage_id)',
      ],
    )

    const drivers = syncCollection(
      'drivers',
      [
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
      ['CREATE UNIQUE INDEX idx_drivers_driver_id ON drivers (driver_id)'],
    )

    const event_types = syncCollection(
      'event_types',
      [
        { name: 'event_type_id', type: 'number', required: true },
        { name: 'name', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      ['CREATE UNIQUE INDEX idx_event_types_event_type_id ON event_types (event_type_id)'],
    )

    const trips = syncCollection(
      'trips',
      [
        { name: 'trip_id', type: 'number', required: true },
        { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
        { name: 'driver_id', type: 'relation', collectionId: drivers.id, maxSelect: 1 },
        { name: 'start_time', type: 'date' },
        { name: 'end_time', type: 'date' },
        { name: 'distance', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      [
        'CREATE UNIQUE INDEX idx_trips_trip_id ON trips (trip_id)',
        'CREATE INDEX idx_trips_asset_id ON trips (asset_id)',
        'CREATE INDEX idx_trips_driver_id ON trips (driver_id)',
      ],
    )

    const trip_events = syncCollection(
      'trip_events',
      [
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
      [
        'CREATE UNIQUE INDEX idx_trip_events_event_id ON trip_events (event_id)',
        'CREATE INDEX idx_trip_events_trip_id ON trip_events (trip_id)',
        'CREATE INDEX idx_trip_events_asset_id ON trip_events (asset_id)',
        'CREATE INDEX idx_trip_events_event_type_id ON trip_events (event_type_id)',
        'CREATE INDEX idx_trip_events_start_time ON trip_events (start_time DESC)',
        'CREATE INDEX idx_trip_events_asset_start ON trip_events (asset_id, start_time DESC)',
      ],
    )

    const trip_locations = syncCollection(
      'trip_locations',
      [
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
      [
        'CREATE INDEX idx_trip_locations_trip_id ON trip_locations (trip_id)',
        'CREATE INDEX idx_trip_locations_asset_id ON trip_locations (asset_id)',
        'CREATE INDEX idx_trip_locations_recorded_at ON trip_locations (recorded_at DESC)',
        'CREATE INDEX idx_trip_locations_asset_recorded ON trip_locations (asset_id, recorded_at DESC)',
      ],
    )

    const devices = syncCollection('devices', [
      { name: 'device_code', type: 'text' },
      { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ])

    const sync_logs = syncCollection('sync_logs', [
      { name: 'type', type: 'text' },
      { name: 'status', type: 'text' },
      { name: 'records_count', type: 'number' },
      { name: 'error_message', type: 'text' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ])

    const driver_scores = syncCollection('driver_scores', [
      { name: 'driver_id', type: 'relation', collectionId: drivers.id, maxSelect: 1 },
      { name: 'score', type: 'number' },
      { name: 'period_start', type: 'date' },
      { name: 'period_end', type: 'date' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ])

    const asset_scores = syncCollection('asset_scores', [
      { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
      { name: 'score', type: 'number' },
      { name: 'period_start', type: 'date' },
      { name: 'period_end', type: 'date' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ])

    const notifications = syncCollection('notifications', [
      { name: 'title', type: 'text' },
      { name: 'message', type: 'text' },
      { name: 'user_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
      { name: 'read', type: 'bool' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ])

    const geofences = syncCollection('geofences', [
      { name: 'name', type: 'text' },
      { name: 'polygon', type: 'json' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ])

    const asset_geofence_events = syncCollection('asset_geofence_events', [
      { name: 'asset_id', type: 'relation', collectionId: assets.id, maxSelect: 1 },
      { name: 'geofence_id', type: 'relation', collectionId: geofences.id, maxSelect: 1 },
      { name: 'event_type', type: 'text' },
      { name: 'timestamp', type: 'date' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ])

    const ranking_snapshots = syncCollection('ranking_snapshots', [
      { name: 'snapshot_date', type: 'date' },
      { name: 'data', type: 'json' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ])
  },
  (app) => {
    // Safe rollback: we do not drop columns or collections to avoid errors.
  },
)
