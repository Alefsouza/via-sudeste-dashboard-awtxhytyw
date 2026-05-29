import { useDrivers } from '@/hooks/use-drivers'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Trophy } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function DriverRanking() {
  const drivers = useDrivers()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <Trophy className="h-8 w-8 text-yellow-500" />
        Ranking de Motoristas
      </h1>
      <Card>
        <CardContent className="p-0">
          <DataState
            loading={drivers.loading}
            error={drivers.error}
            empty={drivers.data.length === 0}
            onRetry={drivers.refetch}
            emptyMessage="Nenhum motorista encontrado."
            loadingComponent={
              <div className="space-y-4 p-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 pl-6">Pos</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>CNH</TableHead>
                    <TableHead className="text-right pr-6">Pontuação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.data.map((d, idx) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium pl-6">{idx + 1}º</TableCell>
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={`https://img.usecurling.com/ppl/thumbnail?gender=${idx % 2 === 0 ? 'male' : 'female'}&seed=${d.driver_id || d.id}`}
                          />
                          <AvatarFallback>{d.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {d.name}
                      </TableCell>
                      <TableCell>{d.license_number}</TableCell>
                      <TableCell className="text-right font-bold text-lg pr-6">{d.score}</TableCell>
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
