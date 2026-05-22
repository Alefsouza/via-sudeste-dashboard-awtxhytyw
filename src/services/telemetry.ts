import pb from '@/lib/pocketbase/client'

export interface TelemetryLog {
  id: string
  vehicle_id: string
  speed: number
  fuel_level: number
  rpm: number
  engine_temp: number
  created: string
}

export const getVehicleTelemetry = (vehicleId: string, limit: number = 20) =>
  pb.collection('telemetry_logs').getList<TelemetryLog>(1, limit, {
    filter: `vehicle_id = "${vehicleId}"`,
    sort: '-created',
  })
