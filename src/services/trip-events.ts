import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getEvents = async (): Promise<RecordModel[]> =>
  pb.collection('trip_events').getFullList({ sort: '-timestamp' })
