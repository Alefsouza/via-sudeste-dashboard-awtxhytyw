import { useVehicles } from '@/hooks/use-vehicles'
import { useEvents } from '@/hooks/use-events'
import { DataState } from '@/components/DataState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function Index() {
  const vehicles = useVehicles()
  const events = useEvents()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Painel de Operação</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status da Frota</CardTitle>
          </CardHeader>
          <CardContent>
            <DataState
              loading={vehicles.loading}
              error={vehicles.error}
              empty={vehicles.data.length === 0}
              onRetry={vehicles.refetch}
              emptyMessage="Nenhum veículo encontrado."
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                  <span className="font-medium text-slate-700">Em movimento</span>
                  <Badge variant="default">
                    {vehicles.data.filter((v) => v.status === 'moving').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                  <span className="font-medium text-slate-700">Ociosos</span>
                  <Badge variant="secondary">
                    {vehicles.data.filter((v) => v.status === 'idle').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                  <span className="font-medium text-slate-700">Em manutenção</span>
                  <Badge variant="destructive">
                    {vehicles.data.filter((v) => v.status === 'maintenance').length}
                  </Badge>
                </div>
              </div>
            </DataState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos Eventos</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <DataState
              loading={events.loading}
              error={events.error}
              empty={events.data.length === 0}
              onRetry={events.refetch}
              emptyMessage="Nenhum evento registrado."
              loadingComponent={
                <div className="space-y-3 px-6">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              }
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Veículo</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead className="pr-6">Severidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.data.slice(0, 5).map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="pl-6 font-medium">{event.vehicle_id}</TableCell>
                        <TableCell>{event.event_type}</TableCell>
                        <TableCell className="pr-6">
                          <Badge
                            variant={
                              event.severity === 'alta'
                                ? 'destructive'
                                : event.severity === 'média'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {event.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DataState>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
