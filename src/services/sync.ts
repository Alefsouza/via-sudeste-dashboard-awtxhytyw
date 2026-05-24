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
