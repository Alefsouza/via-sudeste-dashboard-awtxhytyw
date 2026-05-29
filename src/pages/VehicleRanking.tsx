import { useVehicles } from '@/hooks/use-vehicles'
import { DataState } from '@/components/DataState'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Car } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function VehicleRanking() {
  const vehicles = useVehicles()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <Car className="h-8 w-8 text-blue-500" />
        Ranking de Veículos
      </h1>
      <Card>
        <CardContent className="p-0">
          <DataState
            loading={vehicles.loading}
            error={vehicles.error}
            empty={vehicles.data.length === 0}
            onRetry={vehicles.refetch}
            emptyMessage="Nenhum veículo encontrado."
            loadingComponent={
              <div className="space-y-4 p-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Veículo (Placa)</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.data.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium pl-6">{v.plate}</TableCell>
                      <TableCell>{v.asset_description}</TableCell>
                      <TableCell className="pr-6">
                        <Badge
                          variant={
                            v.status === 'moving'
                              ? 'default'
                              : v.status === 'maintenance'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {v.status === 'moving'
                            ? 'Em Movimento'
                            : v.status === 'maintenance'
                              ? 'Manutenção'
                              : 'Ocioso'}
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
  )
}
