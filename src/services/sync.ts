import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface SyncLog extends RecordModel {
  type: string
  status: string
  records_count: number
  duration_ms: number
  error_message?: string
}

export const getSyncLogs = async (filterType = 'all_records', limit = 100) => {
  const options: Record<string, any> = {
    sort: '-created',
  }

  if (filterType && filterType !== 'all_records') {
    options.filter = `type = '${filterType}'`
  }

  return await pb
    .collection('sync_logs')
    .getList<SyncLog>(1, limit, options)
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

export const processSyncData = async (action?: string, data?: any) => {
  try {
    const body = action || data ? JSON.stringify({ action, data }) : undefined
    const headers = body ? { 'Content-Type': 'application/json' } : undefined

    // Create an AbortController for a 5-minute timeout to prevent browser fetch hangs
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000)

    const result = await pb.send('/backend/v1/fetch_datalbus_data', {
      method: 'POST',
      body,
      headers,
      signal: controller.signal,
      requestKey: null,
    })

    clearTimeout(timeoutId)
    return result
  } catch (error) {
    console.error('processSyncData error:', error)
    throw error
  }
}
