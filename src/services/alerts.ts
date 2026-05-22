import pb from '@/lib/pocketbase/client'

export const getRecentAlerts = async (limit = 10) => {
  return await pb.collection('alerts').getList(1, limit, {
    sort: '-created',
    expand: 'vehicle_id',
  })
}
