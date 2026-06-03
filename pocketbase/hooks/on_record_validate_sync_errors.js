onRecordValidate(
  (e) => {
    const errMsg = e.record.getString('error_message')

    if (errMsg && errMsg.length > 4900) {
      e.record.set('error_message', errMsg.slice(0, 4900) + '...')
    }

    if (errMsg) {
      // If it's the sync_logs collection, it has the 'type' field
      if (e.record.getString('type') !== '') {
        e.record.set('status', 'error')
      }
      // If it's the sync_state collection, it has the 'endpoint_name' field
      else if (e.record.getString('endpoint_name') !== '') {
        e.record.set('last_sync_status', 'error')
      }
    }

    e.next()
  },
  'sync_logs',
  'sync_state',
)
