import pb from '@/lib/pocketbase/client'

export async function fetchDashboardData() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startOfDayIso = startOfDay.toISOString().replace('T', ' ').substring(0, 19)

  const [locations, trips, alerts] = await Promise.all([
    pb.collection('realtime_locations').getFullList({
      expand: 'asset_id',
      sort: '-recorded_at',
    }),
    pb.collection('trips').getFullList({
      filter: `start_time >= "${startOfDayIso}"`,
      expand: 'driver_id,vehicle_id',
    }),
    pb.collection('alerts').getFullList({
      filter: `created >= "${startOfDayIso}" && severity = "high"`,
    }),
  ])

  return { locations, trips, alerts }
}
