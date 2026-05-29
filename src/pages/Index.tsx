import { useEffect, useState, useMemo, useCallback } from 'react'
import { fetchDashboardData } from '@/services/dashboard'
import { useRealtime } from '@/hooks/use-realtime'
import { MapComponent } from '@/components/MapComponent'
import { VehicleSidebar } from '@/components/VehicleSidebar'
import { KPICards } from '@/components/KPICards'
import { FloatingDetailsCard } from '@/components/FloatingDetailsCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'
import { MappedLocation } from '@/types'
import { mapLocationData } from '@/lib/utils/mappers'

export default function OperationalDashboard() {
  const [data, setData] = useState<{ locations: any[]; trips: any[]; alerts: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<MappedLocation | null>(null)

  const loadData = useCallback(async () => {
    try {
      const res = await fetchDashboardData()
      setData(res)
      setError(null)
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [loadData])

  useRealtime('realtime_locations', () => {
    loadData()
  })
  useRealtime('alerts', () => {
    loadData()
  })
  useRealtime('trips', () => {
    loadData()
  })

  const mappedLocations = useMemo(() => {
    if (!data) return []

    // Group by asset to assure only the latest location per vehicle
    const latestByAsset = new Map<string, any>()
    for (const loc of data.locations) {
      const assetId = loc.asset_id || loc.id
      const existing = latestByAsset.get(assetId)
      if (
        !existing ||
        new Date(loc.recorded_at || loc.updated).getTime() >
          new Date(existing.recorded_at || existing.updated).getTime()
      ) {
        latestByAsset.set(assetId, loc)
      }
    }

    return Array.from(latestByAsset.values()).map((loc) => mapLocationData(loc, data.trips))
  }, [data])

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/20">
        <Alert variant="destructive" className="max-w-md shadow-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>
            Não foi possível carregar as informações do painel. Verifique sua conexão.
            <Button onClick={loadData} variant="outline" className="mt-4 w-full text-foreground">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      <div className="w-full md:w-80 lg:w-96 border-r flex flex-col bg-card shrink-0 z-10 shadow-sm">
        <VehicleSidebar
          locations={mappedLocations}
          selectedId={selectedLocation?.id}
          onSelect={setSelectedLocation}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="p-4 border-b bg-card shrink-0 z-10 shadow-sm relative">
          <KPICards
            locations={mappedLocations}
            totalTrips={data?.trips.length || 0}
            totalAlerts={data?.alerts.length || 0}
          />
        </div>
        <div className="flex-1 relative z-0">
          <MapComponent
            locations={mappedLocations}
            selectedLocation={selectedLocation}
            onSelect={setSelectedLocation}
          />
          {selectedLocation && (
            <FloatingDetailsCard
              location={selectedLocation}
              onClose={() => setSelectedLocation(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
