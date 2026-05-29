import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface MaintenanceEvent extends RecordModel {
  start_time: string
  end_time?: string
  latitude?: number
  longitude?: number
  speed?: number
  value?: number
  metadata?: any
  expand?: {
    asset_id?: RecordModel
    driver_id?: RecordModel
    event_type_id?: RecordModel
  }
}

const buildFilter = (options: {
  startDate: Date
  endDate: Date
  assetId?: string
  eventTypeId?: string
  criticality?: string
}) => {
  const { startDate, endDate, assetId, eventTypeId, criticality } = options
  const filters: string[] = []

  filters.push(`(event_type_id.category = 'alerta' || event_type_id.category = 'evento')`)

  const startStr = startDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
  const endStr = endDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
  filters.push(`start_time >= '${startStr}'`)
  filters.push(`start_time <= '${endStr}'`)

  if (assetId && assetId !== 'all') filters.push(`asset_id = '${assetId}'`)
  if (eventTypeId && eventTypeId !== 'all') filters.push(`event_type_id = '${eventTypeId}'`)
  if (criticality && criticality !== 'all')
    filters.push(`event_type_id.default_criticality = '${criticality}'`)

  return filters.join(' && ')
}

export const getMaintenanceEvents = async (options: {
  startDate: Date
  endDate: Date
  page?: number
  perPage?: number
  assetId?: string
  eventTypeId?: string
  criticality?: string
}) => {
  const { page = 1, perPage = 20 } = options
  const filter = buildFilter(options)

  return pb.collection('events').getList<MaintenanceEvent>(page, perPage, {
    filter,
    sort: '-start_time',
    expand: 'asset_id,driver_id,event_type_id',
  })
}

export const getMaintenanceKPIs = async (options: {
  startDate: Date
  endDate: Date
  assetId?: string
  eventTypeId?: string
  criticality?: string
}) => {
  const filter = buildFilter(options)
  return pb.collection('events').getFullList<MaintenanceEvent>({
    filter,
    fields: 'id,expand.event_type_id.category,expand.asset_id.license_plate,expand.asset_id.id',
    expand: 'event_type_id,asset_id',
    requestKey: null,
  })
}

export const getEventTypesForMaintenance = async () => {
  return pb.collection('event_types').getFullList({
    filter: `category = 'alerta' || category = 'evento'`,
    sort: 'name',
    requestKey: null,
  })
}

export const getAssetsForMaintenance = async () => {
  return pb.collection('assets').getFullList({
    sort: 'license_plate',
    requestKey: null,
  })
}
