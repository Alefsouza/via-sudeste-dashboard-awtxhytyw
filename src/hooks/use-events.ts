import { useData } from '@/hooks/use-data'
import { getEvents } from '@/services/trip-events'

export function useEvents() {
  return useData(getEvents)
}
