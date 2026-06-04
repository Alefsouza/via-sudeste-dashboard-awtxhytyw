migrate(
  (app) => {
    const garagesCol = app.findCollectionByNameOrId('garages')
    const mappingCol = app.findCollectionByNameOrId('asset_group_mapping')

    const garagesToSeed = [
      { name: 'Garagem Cursino', short_name: 'Cursino' },
      { name: 'Garagem Sapopemba', short_name: 'Sapopemba' },
      { name: 'Garagem Guaiana', short_name: 'Guaiana' },
    ]

    const garageIds = {}

    for (let i = 0; i < garagesToSeed.length; i++) {
      const g = garagesToSeed[i]
      let rec
      try {
        rec = app.findFirstRecordByData('garages', 'name', g.name)
      } catch (_) {
        rec = new Record(garagesCol)
        rec.set('name', g.name)
        rec.set('short_name', g.short_name)
        app.save(rec)
      }
      garageIds[g.short_name] = rec.id
    }

    const mappingsToSeed = [
      { group_raw: 'Cursino', garage_id: garageIds['Cursino'] },
      { group_raw: 'Sapopemba', garage_id: garageIds['Sapopemba'] },
      { group_raw: 'Guaiana', garage_id: garageIds['Guaiana'] },
      { group_raw: 'Caminhão', garage_id: null },
      { group_raw: 'GP3', garage_id: null },
    ]

    for (let i = 0; i < mappingsToSeed.length; i++) {
      const m = mappingsToSeed[i]
      let rec
      try {
        rec = app.findFirstRecordByData('asset_group_mapping', 'group_raw', m.group_raw)
      } catch (_) {
        rec = new Record(mappingCol)
        rec.set('group_raw', m.group_raw)
        if (m.garage_id) {
          rec.set('garage_id', m.garage_id)
        }
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      app.db().newQuery('DELETE FROM asset_group_mapping').execute()
      app.db().newQuery('DELETE FROM garages').execute()
    } catch (_) {}
  },
)
