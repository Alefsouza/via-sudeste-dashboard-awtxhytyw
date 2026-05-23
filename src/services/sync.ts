import pb from '@/lib/pocketbase/client'

export interface SyncLog {
  id: string
  type: string
  status: 'success' | 'error'
  records_count: number
  duration_ms: number
  error_message: string
  created: string
}

export const getSyncLogs = async (typeFilter?: string): Promise<SyncLog[]> => {
  const filter = typeFilter && typeFilter !== 'all_records' ? `type = '${typeFilter}'` : ''
  const records = await pb.collection('sync_logs').getList<any>(1, 10, {
    sort: '-created',
    filter,
  })
  return records.items.map((item) => ({
    id: item.id,
    type: item.type,
    status: item.status,
    records_count: item.records_count,
    duration_ms: item.duration_ms,
    error_message: item.error_message,
    created: item.created,
  }))
}

export const createSyncLog = async (data: Partial<SyncLog>) => {
  return pb.collection('sync_logs').create(data)
}

export const clearSyncLogs = async () => {
  const records = await pb.collection('sync_logs').getFullList()
  for (const record of records) {
    await pb.collection('sync_logs').delete(record.id)
  }
}

export const processSyncData = async (type: string, data: any[]) => {
  for (const item of data) {
    try {
      if (type === 'assets') {
        const statusMap: Record<string, string> = {
          moving: 'moving',
          idle: 'idle',
          maintenance: 'maintenance',
        }
        const status = statusMap[item.status?.toLowerCase()] || 'idle'

        try {
          const existing = await pb.collection('vehicles').getFirstListItem(`plate="${item.plate}"`)
          await pb.collection('vehicles').update(existing.id, { status })
        } catch {
          await pb.collection('vehicles').create({
            plate: item.plate,
            status,
          })
        }
      } else if (type === 'drivers') {
        try {
          await pb.collection('drivers').getFirstListItem(`name="${item.name}"`)
        } catch {
          await pb.collection('drivers').create({
            name: item.name,
            license_number: item.license_category || item.id || 'N/A',
          })
        }
      } else if (type === 'tripEvents') {
        let vehicleRecord
        try {
          if (item.vehicle_id) {
            vehicleRecord = await pb
              .collection('vehicles')
              .getFirstListItem(`plate="${item.vehicle_id}"`)
          }
        } catch {
          // Fallback if not found by plate
        }

        if (!vehicleRecord) {
          const vehicles = await pb.collection('vehicles').getList(1, 1)
          if (vehicles.items.length > 0) {
            vehicleRecord = vehicles.items[0]
          }
        }

        if (vehicleRecord) {
          const severityMap: Record<string, string> = {
            high: 'high',
            medium: 'medium',
            low: 'low',
          }

          let alertType = 'harsh_braking'
          const eventTypeLower = (item.event_type || '').toLowerCase()
          if (eventTypeLower.includes('speed') || eventTypeLower.includes('veloci')) {
            alertType = 'overspeed'
          } else if (eventTypeLower.includes('fuel') || eventTypeLower.includes('combust')) {
            alertType = 'low_fuel'
          }

          await pb.collection('alerts').create({
            vehicle_id: vehicleRecord.id,
            type: alertType,
            severity: severityMap[item.severity?.toLowerCase()] || 'low',
            message: item.description || item.event_type || 'Alerta do sistema',
            resolved: false,
            event_name: item.event_type,
            event_type: item.event_type,
          })
        }
      } else if (type === 'trips') {
        let vehicleRecord
        try {
          if (item.vehicle_id) {
            vehicleRecord = await pb
              .collection('vehicles')
              .getFirstListItem(`plate="${item.vehicle_id}"`)
          }
        } catch {
          /* intentionally ignored */
        }

        if (!vehicleRecord) {
          const vehicles = await pb.collection('vehicles').getList(1, 1)
          if (vehicles.items.length > 0) {
            vehicleRecord = vehicles.items[0]
          }
        }

        if (vehicleRecord) {
          await pb.collection('telemetry_logs').create({
            vehicle_id: vehicleRecord.id,
            speed: item.distance_km
              ? Math.min(item.distance_km, 120)
              : Math.floor(Math.random() * 80),
            fuel_level: Math.floor(Math.random() * 100),
            rpm: Math.floor(Math.random() * 3000) + 1000,
            engine_temp: Math.floor(Math.random() * 40) + 70,
          })
        }
      }
    } catch (e) {
      console.error(`Error processing ${type} item:`, e)
    }
  }
}
