export type LocationStatus = 'operation' | 'stopped' | 'parked' | 'disconnected'

export interface MappedLocation {
  id: string
  latitude: number
  longitude: number
  speed: number
  heading: number
  ignition: boolean
  recorded_at: string
  updated: string
  status: LocationStatus
  driverName: string
  license_plate: string
  fleet_number: string
}
