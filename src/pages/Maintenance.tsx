import { useVehicles } from '@/hooks/use-vehicles'
import { DataState } from '@/components/DataState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Maintenance() {
  const vehicles = useVehicles()
  const maintenanceVehicles = vehicles.data.filter((v) => v.status === 'maintenance')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Painel de Manutenção</h1>
      <DataState
        loading={vehicles.loading}
        error={vehicles.error}
        empty={maintenanceVehicles.length === 0}
        onRetry={vehicles.refetch}
        emptyMessage="Nenhum veículo em manutenção no momento."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {maintenanceVehicles.map((v) => (
            <Card key={v.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">{v.plate}</CardTitle>
                <Badge variant="destructive">Manutenção</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-500 space-y-1">
                  <p>
                    <span className="font-semibold text-slate-700">ID do Veículo:</span>{' '}
                    {v.vehicle_id}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Descrição:</span>{' '}
                    {v.asset_description || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DataState>
    </div>
  )
}
