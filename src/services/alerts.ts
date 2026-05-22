import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getRecentAlerts = async (limit = 10) => {
  return await pb.collection('alerts').getList<RecordModel>(1, limit, {
    sort: '-created',
    expand: 'vehicle_id',
  })
}

export const getAllDashboardAlerts = async () => {
  // Fetch a larger pool of alerts for accurate dashboard metrics
  return await pb.collection('alerts').getList<RecordModel>(1, 500, {
    sort: '-created',
    expand: 'vehicle_id',
  })
}
