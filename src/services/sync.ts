import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getSyncLogs = async (limit = 1) => {
  return await pb
    .collection('sync_logs')
    .getList<RecordModel>(1, limit, {
      sort: '-created',
    })
    .then((res) => res.items)
}

export const createSyncLog = async (data: Record<string, any>) => {
  return await pb.collection('sync_logs').create(data)
}

export const clearSyncLogs = async () => {
  const logs = await pb.collection('sync_logs').getFullList()
  for (const log of logs) {
    await pb.collection('sync_logs').delete(log.id)
  }
}

export const processSyncData = async () => {
  try {
    return await pb.send('/backend/v1/fetch_datalbus_data', { method: 'POST' })
  } catch (error) {
    console.error(error)
    throw error
  }
}
