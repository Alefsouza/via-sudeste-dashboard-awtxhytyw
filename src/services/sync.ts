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
  const options: Record<string, unknown> = {
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

export const createSyncLog = async (data: Record<string, unknown>) => {
  const logData = { ...data }
  if (logData.error_message) {
    const errorStr =
      typeof logData.error_message === 'string'
        ? logData.error_message
        : JSON.stringify(logData.error_message)

    if (errorStr.length > 4900) {
      logData.error_message = errorStr.substring(0, 4900) + '...'
    } else {
      logData.error_message = errorStr
    }
  }
  return await pb.collection('sync_logs').create(logData)
}

export const clearSyncLogs = async () => {
  const logs = await pb.collection('sync_logs').getFullList()
  for (const log of logs) {
    await pb.collection('sync_logs').delete(log.id)
  }
}

export const triggerSyncDatalbus = async (
  action: string,
  token: string,
  tenancy_id: string,
  date?: string,
) => {
  try {
    const bodyObj: Record<string, unknown> = { action, token, tenancy_id }
    if (date) bodyObj.date = date
    const body = JSON.stringify(bodyObj)

    const controller = new AbortController()
    // Timeout of 5 minutes to prevent browser fetch hangs during long syncs
    const timeoutId = setTimeout(() => controller.abort(), 300000)

    const result = await pb.send('/backend/v1/sincronizarDatalbus', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      requestKey: null,
    })

    clearTimeout(timeoutId)
    return result
  } catch (error: unknown) {
    console.error('triggerSyncDatalbus error:', error)
    if (error && typeof error === 'object' && 'response' in error) {
      const resp = (error as { response?: { error?: string } }).response
      if (resp && resp.error) {
        ;(error as { message?: string }).message = resp.error
      }
    }
    throw error
  }
}
