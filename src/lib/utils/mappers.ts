import { MappedLocation } from '@/types'

const TWELVE_HOURS = 12 * 60 * 60 * 1000

export function mapLocationData(loc: any, trips: any[]): MappedLocation {
  const now = new Date().getTime()
  const recordedAt = new Date(loc.recorded_at || loc.updated).getTime()
  const isDisconnected = now - recordedAt > TWELVE_HOURS

  let status: 'operation' | 'stopped' | 'parked' | 'disconnected' = 'operation'
  if (isDisconnected) {
    status = 'disconnected'
  } else if (loc.ignition && loc.speed === 0) {
    status = 'stopped'
  } else if (!loc.ignition) {
    status = 'parked'
  }

  const asset = loc.expand?.asset_id
  const vehicleId = asset?.id

  // Find recent driver from trips collection
  const recentTrip = trips.find((t) => t.vehicle_id === vehicleId || t.asset_id === asset?.asset_id)
  const driverName = recentTrip?.expand?.driver_id?.name || 'Não identificado'

  return {
    id: loc.id,
    latitude: loc.latitude || 0,
    longitude: loc.longitude || 0,
    speed: loc.speed || 0,
    heading: loc.heading || 0,
    ignition: loc.ignition || false,
    recorded_at: loc.recorded_at || loc.updated,
    updated: loc.updated,
    status,
    driverName,
    license_plate: asset?.license_plate || asset?.plate || 'Sem Placa',
    fleet_number: asset?.fleet_number || asset?.asset_id?.toString() || '-',
  }
}
