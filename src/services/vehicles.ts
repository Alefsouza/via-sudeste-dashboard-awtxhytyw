import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getVehicles = async () => {
  return await pb.collection('vehicles').getFullList({ sort: '-updated' })
}

export const getVehicle = async (id: string) => {
  return await pb.collection('vehicles').getOne(id)
}

export const getVehicleTelemetry = async (vehicleId: string, limit = 10) => {
  return await pb.collection('telemetry_logs').getList(1, limit, {
    filter: `vehicle_id = "${vehicleId}"`,
    sort: '-created',
  })
}

export const getVehicleAlerts = async (vehicleId: string) => {
  return await pb.collection('alerts').getFullList({
    filter: `vehicle_id = "${vehicleId}"`,
    sort: '-created',
  })
}
