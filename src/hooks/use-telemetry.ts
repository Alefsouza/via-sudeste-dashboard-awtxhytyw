import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from './use-realtime'

export interface Asset {
  id: string
  asset_type_id?: string
  license_plate?: string
  plate?: string
  fleet_number?: string
  status?: string
  year?: number
  model?: string
  brand?: string
  created: string
  updated: string
}

export interface Driver {
  id: string
  name?: string
  driver_name?: string
  cpf?: string
  license_number?: string
  license_category?: string
  phone?: string
  email?: string
  hired_at?: string
  status?: string
  created: string
  updated: string
}

export interface Trip {
  id: string
  asset_id?: string
  driver_id?: string
  start_time?: string
  end_time?: string
  start_latitude?: number
  start_longitude?: number
  end_latitude?: number
  end_longitude?: number
  distance?: number
  duration?: number
  score?: number
  created: string
  updated: string
  expand?: {
    asset_id?: Asset
    driver_id?: Driver
  }
}

export interface EventType {
  id: string
  name?: string
  category?: string
  description?: string
  default_weight?: number
  default_criticality?: string
}

export interface TelemetryEvent {
  id: string
  asset_id?: string
  device_id?: string
  driver_id?: string
  event_type_id?: string
  start_time: string
  end_time?: string
  latitude?: number
  longitude?: number
  speed?: number
  value?: number
  created: string
  updated: string
  expand?: {
    asset_id?: Asset
    driver_id?: Driver
    event_type_id?: EventType
  }
}

function useCollection<T>(collectionName: string, expand?: string, sort: string = '-created') {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const records = await pb.collection(collectionName).getFullList<T>({
        expand,
        sort,
      })
      setData(records)
      setError(null)
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (!('isAbort' in err) || !(err as { isAbort: boolean }).isAbort) {
          setError(err)
        }
      } else {
        setError(new Error('Um erro desconhecido ocorreu.'))
      }
    } finally {
      setLoading(false)
    }
  }, [collectionName, expand, sort])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtime(collectionName, () => {
    fetchData()
  })

  return { data, loading, error, refetch: fetchData }
}

export const useAssets = () => useCollection<Asset>('assets', 'asset_type_id')
export const useDrivers = () => useCollection<Driver>('drivers')
export const useTrips = () => useCollection<Trip>('trips', 'asset_id,driver_id', '-start_time')
export const useEvents = () =>
  useCollection<TelemetryEvent>(
    'events',
    'asset_id,device_id,driver_id,event_type_id',
    '-start_time',
  )
