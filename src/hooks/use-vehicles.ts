import { useData } from '@/hooks/use-data'
import { getAssets } from '@/services/assets'

export function useVehicles() {
  return useData(getAssets)
}
