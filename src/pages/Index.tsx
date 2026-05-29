import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAssets, useDrivers, useTrips, useEvents } from '@/hooks/use-telemetry'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui-state'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { LogOut, Truck, Users, Route, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function AssetsTab() {
  const { data, loading, error, refetch } = useAssets()

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (loading) return <LoadingState skeletonCount={5} />
  if (!data.length) return <EmptyState message="Nenhum veículo encontrado" />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((asset) => (
        <Card key={asset.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              {asset.license_plate || asset.plate || 'Sem Placa'}
              <Badge variant={asset.status === 'ativo' ? 'default' : 'secondary'}>
                {asset.status || 'Desconhecido'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Frota: {asset.fleet_number || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">
              Modelo: {asset.model || '-'} - {asset.brand || '-'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DriversTab() {
  const { data, loading, error, refetch } = useDrivers()

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (loading) return <LoadingState skeletonCount={5} />
  if (!data.length) return <EmptyState message="Nenhum motorista encontrado" />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((driver) => (
        <Card key={driver.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {driver.name || driver.driver_name || 'Sem nome'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">CNH: {driver.license_number || 'N/A'}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Status: <Badge variant="outline">{driver.status || 'Ativo'}</Badge>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TripsTab() {
  const { data, loading, error, refetch } = useTrips()

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (loading) return <LoadingState skeletonCount={5} />
  if (!data.length) return <EmptyState message="Nenhuma viagem encontrada" />

  return (
    <div className="space-y-4">
      {data.map((trip) => (
        <Card key={trip.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">
                Veículo:{' '}
                {trip.expand?.asset_id?.license_plate ||
                  trip.expand?.asset_id?.plate ||
                  'Desconhecido'}
              </p>
              <p className="text-sm text-muted-foreground">
                Motorista: {trip.expand?.driver_id?.name || 'Desconhecido'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">
                {trip.distance ? `${trip.distance.toFixed(1)} km` : '-'}
              </p>
              <p className="text-sm text-muted-foreground">Score: {trip.score || '-'}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EventsTab() {
  const { data, loading, error, refetch } = useEvents()

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (loading) return <LoadingState skeletonCount={5} />
  if (!data.length) return <EmptyState message="Nenhum evento encontrado" />

  return (
    <div className="space-y-4">
      {data.map((event) => (
        <Card key={event.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {event.expand?.event_type_id?.name || 'Evento Desconhecido'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Veículo:{' '}
                {event.expand?.asset_id?.license_plate || event.expand?.asset_id?.plate || '-'} |
                Motorista: {event.expand?.driver_id?.name || '-'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{event.speed ? `${event.speed} km/h` : '-'}</p>
              <p className="text-sm text-muted-foreground">
                {event.start_time ? new Date(event.start_time).toLocaleString('pt-BR') : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function Index() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Route className="h-6 w-6 text-primary" />
            Via Sudeste Dashboard
          </h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="assets" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto">
            <TabsTrigger value="assets" className="flex gap-2 py-3">
              <Truck className="h-4 w-4" /> Veículos
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex gap-2 py-3">
              <Users className="h-4 w-4" /> Motoristas
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex gap-2 py-3">
              <Route className="h-4 w-4" /> Viagens
            </TabsTrigger>
            <TabsTrigger value="events" className="flex gap-2 py-3">
              <AlertTriangle className="h-4 w-4" /> Eventos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets">
            <AssetsTab />
          </TabsContent>
          <TabsContent value="drivers">
            <DriversTab />
          </TabsContent>
          <TabsContent value="trips">
            <TripsTab />
          </TabsContent>
          <TabsContent value="events">
            <EventsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
