import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getAssets = async (): Promise<RecordModel[]> =>
  pb.collection('assets').getFullList({ sort: '-created' })
