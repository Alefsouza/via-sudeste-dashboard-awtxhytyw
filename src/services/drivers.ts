import pb from '@/lib/pocketbase/client'

export const getDrivers = async () => {
  return await pb.collection('drivers').getFullList({ sort: '-score' })
}
