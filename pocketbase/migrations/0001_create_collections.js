migrate(
  (app) => {
    const vehicles = new Collection({
      name: 'vehicles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'plate', type: 'text', required: true },
        { name: 'model', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['moving', 'idle', 'maintenance'],
          required: true,
          maxSelect: 1,
        },
        { name: 'last_latitude', type: 'number' },
        { name: 'last_longitude', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_vehicles_plate ON vehicles (plate)',
        'CREATE INDEX idx_vehicles_status ON vehicles (status)',
      ],
    })
    app.save(vehicles)

    const telemetry_logs = new Collection({
      name: 'telemetry_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'vehicle_id',
          type: 'relation',
          required: true,
          collectionId: vehicles.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'speed', type: 'number' },
        { name: 'fuel_level', type: 'number' },
        { name: 'rpm', type: 'number' },
        { name: 'engine_temp', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_telemetry_vid_created ON telemetry_logs (vehicle_id, created DESC)',
      ],
    })
    app.save(telemetry_logs)

    const alerts = new Collection({
      name: 'alerts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'vehicle_id',
          type: 'relation',
          required: true,
          collectionId: vehicles.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          values: ['overspeed', 'harsh_braking', 'low_fuel'],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'severity',
          type: 'select',
          values: ['low', 'medium', 'high'],
          required: true,
          maxSelect: 1,
        },
        { name: 'message', type: 'text', required: true },
        { name: 'resolved', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_alerts_vid ON alerts (vehicle_id)',
        'CREATE INDEX idx_alerts_severity_resolved ON alerts (severity, resolved)',
      ],
    })
    app.save(alerts)

    const drivers = new Collection({
      name: 'drivers',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'license_number', type: 'text', required: true },
        { name: 'score', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(drivers)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('drivers'))
    app.delete(app.findCollectionByNameOrId('alerts'))
    app.delete(app.findCollectionByNameOrId('telemetry_logs'))
    app.delete(app.findCollectionByNameOrId('vehicles'))
  },
)
