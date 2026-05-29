import { useData } from '@/hooks/use-data'
import { getDrivers } from '@/services/drivers'

export function useDrivers() {
  return useData(getDrivers)
}
