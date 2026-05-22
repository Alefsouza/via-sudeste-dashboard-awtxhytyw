migrate(
  (app) => {
    const vehicles = app.findCollectionByNameOrId('vehicles')
    if (!vehicles.fields.getByName('garage')) {
      vehicles.fields.add(
        new SelectField({
          name: 'garage',
          values: ['Cursino', 'Sapopemba', 'Imirim'],
          maxSelect: 1,
        }),
      )
    }
    app.save(vehicles)

    const alerts = app.findCollectionByNameOrId('alerts')
    if (!alerts.fields.getByName('event_name')) {
      alerts.fields.add(new TextField({ name: 'event_name' }))
      alerts.fields.add(new TextField({ name: 'event_type' }))
      alerts.fields.add(new TextField({ name: 'dtc_code' }))
      alerts.fields.add(new TextField({ name: 'dtc_description' }))
    }
    app.save(alerts)

    const driverCol = app.findCollectionByNameOrId('drivers')
    const driversToSeed = [
      { name: 'Carlos Oliveira', license_number: '456789123', score: 68 },
      { name: 'Ana Silva', license_number: '555666777', score: 92 },
      { name: 'Mariana Santos', license_number: '888999000', score: 88 },
    ]
    for (const d of driversToSeed) {
      try {
        app.findFirstRecordByData('drivers', 'license_number', d.license_number)
      } catch (_) {
        const record = new Record(driverCol)
        record.set('name', d.name)
        record.set('license_number', d.license_number)
        record.set('score', d.score)
        app.save(record)
      }
    }

    const vData = [
      { plate: 'PLA-0001', model: 'Mercedes-Benz O500U', garage: 'Cursino' },
      { plate: 'PLA-0002', model: 'Mercedes-Benz O500U', garage: 'Sapopemba' },
      { plate: 'PLA-0003', model: 'CAIO Apache VIP', garage: 'Imirim' },
    ]
    const vehicleIds = {}
    for (const v of vData) {
      try {
        const existing = app.findFirstRecordByData('vehicles', 'plate', v.plate)
        existing.set('garage', v.garage)
        app.save(existing)
        vehicleIds[v.plate] = existing.id
      } catch (_) {
        const record = new Record(vehicles)
        record.set('plate', v.plate)
        record.set('model', v.model)
        record.set('status', 'moving')
        record.set('garage', v.garage)
        app.save(record)
        vehicleIds[v.plate] = record.id
      }
    }

    const alertData = [
      {
        plate: 'PLA-0001',
        type: 'event',
        name: 'Porta Aberta',
        evType: 'Informativo',
        dtc_code: '',
        dtc_desc: '',
      },
      {
        plate: 'PLA-0002',
        type: 'event',
        name: 'Aceleração Excessiva',
        evType: 'Alerta',
        dtc_code: '',
        dtc_desc: '',
      },
      {
        plate: 'PLA-0003',
        type: 'event',
        name: 'Nível de Óleo Baixo',
        evType: 'Crítico',
        dtc_code: '',
        dtc_desc: '',
      },
      {
        plate: 'PLA-0003',
        type: 'event',
        name: 'Limite de Marcha Lenta',
        evType: 'Alerta',
        dtc_code: '',
        dtc_desc: '',
      },
      {
        plate: 'PLA-0001',
        type: 'dtc',
        name: 'DTC',
        evType: 'Crítico',
        dtc_code: 'P001',
        dtc_desc: 'Sincronização não pode ser iniciada',
      },
      {
        plate: 'PLA-0002',
        type: 'dtc',
        name: 'DTC',
        evType: 'Alerta',
        dtc_code: 'P002',
        dtc_desc: 'Mensagem CAN inválida',
      },
      {
        plate: 'PLA-0003',
        type: 'dtc',
        name: 'DTC',
        evType: 'Crítico',
        dtc_code: 'P003',
        dtc_desc: 'Sensor de óleo com circuito aberto',
      },
    ]
    for (const a of alertData) {
      if (!vehicleIds[a.plate]) continue
      try {
        app.findFirstRecordByFilter(
          'alerts',
          'vehicle_id = {:v} && event_name = {:n} && dtc_code = {:c}',
          {
            v: vehicleIds[a.plate],
            n: a.name,
            c: a.dtc_code,
          },
        )
      } catch (_) {
        const record = new Record(alerts)
        record.set('vehicle_id', vehicleIds[a.plate])
        record.set('event_name', a.name)
        record.set('event_type', a.evType)
        record.set(
          'severity',
          a.evType === 'Crítico' ? 'high' : a.evType === 'Alerta' ? 'medium' : 'low',
        )
        if (a.type === 'dtc') {
          record.set('dtc_code', a.dtc_code)
          record.set('dtc_description', a.dtc_desc)
        }
        app.save(record)
      }
    }
  },
  (app) => {},
)
