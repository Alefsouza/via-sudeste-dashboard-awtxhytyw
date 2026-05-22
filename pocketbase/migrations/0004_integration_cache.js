migrate(
  (app) => {
    const collection = new Collection({
      name: 'integration_cache',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'json', maxSize: 5242880 },
        { name: 'expires_at', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_integration_cache_key ON integration_cache (key)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('integration_cache')
    app.delete(collection)
  },
)
