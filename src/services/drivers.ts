import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getDrivers = async (): Promise<RecordModel[]> =>
  pb.collection('drivers').getFullList({ sort: '-score' })
