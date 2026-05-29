import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Activity, MapPin, Truck } from 'lucide-react'

export default function Index() {
  const [stats, setStats] = useState({ trips: 0, events: 0, locations: 0 })

  const loadStats = async () => {
    try {
      const [tripsData, eventsData, locationsData] = await Promise.all([
        pb.collection('trips').getList(1, 1),
        pb.collection('trip_events').getList(1, 1),
        pb.collection('trip_locations').getList(1, 1),
      ])

      setStats({
        trips: tripsData.totalItems,
        events: eventsData.totalItems,
        locations: locationsData.totalItems,
      })
    } catch (err) {
      console.error('Failed to load initial stats', err)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  useRealtime('trips', () => loadStats())
  useRealtime('trip_events', () => loadStats())
  useRealtime('trip_locations', () => loadStats())

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Operações</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do volume de dados processados em tempo real.
          </p>
        </div>
        <Link to="/admin/sync">
          <Button variant="default">Sincronização Datalbus</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viagens Processadas</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.trips.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground mt-1">Viagens únicas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos de Telemetria</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.events.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground mt-1">Alertas e ocorrências geradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontos de Coordenada</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.locations.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground mt-1">Posições geográficas armazenadas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
