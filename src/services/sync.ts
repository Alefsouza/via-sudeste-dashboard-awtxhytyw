import pb from '@/lib/pocketbase/client'

export interface SyncLog {
  id: string
  type: string
  status: 'success' | 'error'
  records_count: number
  duration_ms: number
  error_message: string
  created: string
}

export const getSyncLogs = async (typeFilter?: string): Promise<SyncLog[]> => {
  const filter = typeFilter && typeFilter !== 'all_records' ? `type = '${typeFilter}'` : ''
  const records = await pb.collection('sync_logs').getList<any>(1, 10, {
    sort: '-created',
    filter,
  })
  return records.items.map((item) => ({
    id: item.id,
    type: item.type,
    status: item.status,
    records_count: item.records_count,
    duration_ms: item.duration_ms,
    error_message: item.error_message,
    created: item.created,
  }))
}

export const createSyncLog = async (data: Partial<SyncLog>) => {
  return pb.collection('sync_logs').create(data)
}

export const clearSyncLogs = async () => {
  const records = await pb.collection('sync_logs').getFullList()
  for (const record of records) {
    await pb.collection('sync_logs').delete(record.id)
  }
}
