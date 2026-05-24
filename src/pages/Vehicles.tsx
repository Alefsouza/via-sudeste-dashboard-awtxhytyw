import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Input } from '@/components/ui/input'
import { getVehicles } from '@/services/vehicles'
import useRealtime from '@/hooks/use-realtime'
import { RecordModel } from 'pocketbase'
import { Search, MapPin, Loader2, Info } from 'lucide-react'
import { getSyncLogs } from '@/services/sync'

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<RecordModel[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      const [res, syncLogs] = await Promise.all([getVehicles(), getSyncLogs()])
      setVehicles(res)
      if (syncLogs.length > 0) {
        setLastSync(new Date(syncLogs[0].created).toLocaleString())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('vehicles', () => {
    loadData()
  })
  useRealtime('sync_logs', () => {
    loadData()
  })

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase()),
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'moving':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">
            Em Trânsito
          </Badge>
        )
      case 'idle':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">
            Ocioso
          </Badge>
        )
      case 'maintenance':
        return (
          <Badge
            variant="destructive"
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
          >
            Manutenção
          </Badge>
        )
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Frota</h1>
            {lastSync && (
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-xs font-normal text-muted-foreground border-muted-foreground/20"
              >
                <Info className="w-3 h-3 mr-1" />
                Atualizado: {lastSync}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Gerenciamento e status de todos os veículos.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar placa ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="animate-fade-in shadow-elevation border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[120px]">Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Garagem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Última Posição</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum dado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow
                    key={vehicle.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => navigate(`/frota/${vehicle.id}`)}
                  >
                    <TableCell className="font-mono-num font-medium text-primary group-hover:underline underline-offset-4">
                      {vehicle.plate}
                    </TableCell>
                    <TableCell>{vehicle.model || '-'}</TableCell>
                    <TableCell>{vehicle.garage || '-'}</TableCell>
                    <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {vehicle.last_latitude ? (
                        <div className="flex items-center text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {vehicle.last_latitude.toFixed(4)}, {vehicle.last_longitude.toFixed(4)}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        Detalhes &rarr;
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
