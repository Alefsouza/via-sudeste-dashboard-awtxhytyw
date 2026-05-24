import { useState, useEffect, useCallback, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Database,
  Users,
  MapPin,
  AlertTriangle,
  Play,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { checkDatalbusHealth } from '@/services/datalbus'
import {
  getSyncLogs,
  createSyncLog,
  clearSyncLogs,
  triggerSyncDatalbus,
  SyncLog,
} from '@/services/sync'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import type { RecordModel } from 'pocketbase'

export interface AssetRecord extends RecordModel {
  vehicle_id: string
  plate: string
  status: string
  last_update: string
}

export interface DriverRecord extends RecordModel {
  driver_id: string
  name: string
  license_category: string
  status: string
}

export interface TripRecord extends RecordModel {
  trip_id: string
  vehicle_id: string
  start_time: string
  end_time: string
  distance_km: number
}

export interface TripEventRecord extends RecordModel {
  event_id: string
  trip_id: string
  vehicle_id: string
  event_type: string
  severity: string
  timestamp: string
}

export default function SyncDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [nextSyncIn, setNextSyncIn] = useState<number>(300)

  const [logs, setLogs] = useState<SyncLog[]>([])
  const [logFilter, setLogFilter] = useState('all_records')
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({})

  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [drivers, setDrivers] = useState<DriverRecord[]>([])
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [events, setEvents] = useState<TripEventRecord[]>([])

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const loadLogs = useCallback(async () => {
    try {
      const items = await getSyncLogs(logFilter)
      setLogs(items)
      if (items.length > 0 && logFilter === 'all_records') {
        const lastSuccess = items.find((i) => i.status === 'success')
        if (lastSuccess) setLastSync(new Date(lastSuccess.created))
      }
    } catch (e) {
      console.error(e)
    }
  }, [logFilter])

  const loadData = useCallback(async () => {
    try {
      const [assetsRes, driversRes, tripsRes, eventsRes] = await Promise.all([
        pb.collection('assets').getList<AssetRecord>(1, 20, { sort: '-updated' }),
        pb.collection('drivers_datalbus').getList<DriverRecord>(1, 20, { sort: '-updated' }),
        pb.collection('trips').getList<TripRecord>(1, 20, { sort: '-updated' }),
        pb.collection('trip_events').getList<TripEventRecord>(1, 20, { sort: '-updated' }),
      ])
      setAssets(assetsRes.items)
      setDrivers(driversRes.items)
      setTrips(tripsRes.items)
      setEvents(eventsRes.items)
    } catch (e) {
      console.error('Failed to load datalbus records:', e)
    }
  }, [])

  useEffect(() => {
    loadLogs()
    loadData()
  }, [loadLogs, loadData])

  useRealtime('sync_logs', () => loadLogs())
  useRealtime('assets', () => loadData())
  useRealtime('drivers_datalbus', () => loadData())
  useRealtime('trips', () => loadData())
  useRealtime('trip_events', () => loadData())

  const checkHealth = useCallback(async () => {
    setStatus('checking')
    try {
      await checkDatalbusHealth()
      setStatus('online')
    } catch {
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const timer = setInterval(() => {
      setNextSyncIn((prev) => {
        if (prev <= 1) {
          checkHealth()
          return 300
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [checkHealth])

  const handleSync = async (type: 'assets' | 'drivers' | 'trips' | 'events' | 'all') => {
    if (debounceRef.current) return
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
    }, 300)

    setIsSyncing((prev) => ({ ...prev, [type]: true }))
    toast({
      title: 'Sincronizando...',
      description: `Iniciando sincronização de ${type === 'all' ? 'todos os dados' : type}.`,
    })

    const start = Date.now()
    try {
      let totalRecords = 0

      const authRes = await pb.send('/backend/v1/autenticacao_datalbus', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const token = authRes.token
      const tenancy_id = authRes.tenancy_id

      if (!token || !tenancy_id) {
        throw new Error('Token Datalbus ausente ou credenciais inválidas.')
      }

      if (type === 'all') {
        const types = ['assets', 'drivers', 'trips', 'tripEvents']
        for (const t of types) {
          const res = await triggerSyncDatalbus(t, token, tenancy_id)
          totalRecords += res?.records_count || res?.data?.length || 0
        }
      } else {
        const actionMap: any = { events: 'tripEvents' }
        const mappedAction = actionMap[type] || type
        const res = await triggerSyncDatalbus(mappedAction, token, tenancy_id)
        totalRecords = res?.records_count || res?.data?.length || 0
      }

      const duration_ms = Date.now() - start
      await createSyncLog({
        type,
        status: 'success',
        records_count: totalRecords,
        duration_ms,
      })

      loadData()

      toast({
        title: 'Sincronizado com sucesso.',
        description: `Operação concluída. ${totalRecords} registros reportados.`,
        variant: 'default',
      })
    } catch (e: any) {
      const duration_ms = Date.now() - start

      const isNetworkError =
        !e?.response && (e?.message?.includes('Failed to fetch') || e?.status === 0 || e?.isAbort)

      const errorMessage = isNetworkError
        ? 'Erro de conexão com o servidor. Verifique sua internet ou tente novamente mais tarde.'
        : e?.response?.data?.error ||
          e?.response?.error ||
          e?.response?.message ||
          e?.message ||
          'Erro desconhecido'

      try {
        await createSyncLog({
          type,
          status: 'error',
          records_count: 0,
          duration_ms,
          error_message: errorMessage,
        })
      } catch (logErr) {
        console.error('Falha ao salvar log de erro', logErr)
      }

      toast({
        title: isNetworkError
          ? 'Servidor Inacessível'
          : type === 'events'
            ? 'Erro ao sincronizar eventos.'
            : 'Erro ao sincronizar. Tente novamente.',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSyncing((prev) => ({ ...prev, [type]: false }))
    }
  }

  const handleClearLogs = async () => {
    try {
      await clearSyncLogs()
      toast({ title: 'Histórico limpo com sucesso.' })
      loadLogs()
    } catch (e) {
      toast({ title: 'Erro ao limpar histórico.', variant: 'destructive' })
    }
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const syncButtons = [
    { id: 'assets', label: 'Sincronizar Ativos', icon: Database },
    { id: 'drivers', label: 'Sincronizar Motoristas', icon: Users },
    { id: 'trips', label: 'Sincronizar Viagens', icon: MapPin },
    { id: 'events', label: 'Sincronizar Eventos', icon: AlertTriangle },
  ] as const

  const isAnySyncing = Object.values(isSyncing).some(Boolean)

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sincronismo Datalbus</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie a integração com a API Datalbus e sincronize os dados manualmente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col lg:col-span-1 shadow-sm border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                {status === 'checking' && (
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {status === 'online' && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-200"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                    Online
                  </Badge>
                )}
                {status === 'offline' && (
                  <Badge
                    variant="outline"
                    className="bg-destructive/10 text-destructive border-destructive/20"
                  >
                    <span className="h-2 w-2 rounded-full bg-destructive mr-2" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>

            {status === 'offline' && (
              <p className="text-sm text-destructive font-medium -mt-2">
                API indisponível. Verifique a conexão ou tente novamente.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 p-3 bg-muted/40 rounded-lg">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Último sucesso
                </span>
                <span className="text-sm font-medium">
                  {lastSync ? format(lastSync, 'dd/MM HH:mm') : 'Nunca'}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3 bg-muted/40 rounded-lg">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Próximo em
                </span>
                <span className="text-sm font-medium">{formatTime(nextSyncIn)}</span>
              </div>
            </div>

            <div className="mt-auto pt-4">
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={checkHealth}
                disabled={status === 'checking'}
                aria-label="Testar Conexão"
              >
                {status === 'checking' ? 'Testando...' : 'Testar Conexão'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:col-span-2 shadow-sm border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Play className="h-5 w-5 text-primary" />
              Sincronismo Manual
            </CardTitle>
            <CardDescription>
              Dispare a sincronização manual para atualizar os registros locais imediatamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {syncButtons.map((btn) => (
                <Button
                  key={btn.id}
                  variant="secondary"
                  className="h-11 justify-start shadow-sm"
                  onClick={() => handleSync(btn.id)}
                  disabled={isAnySyncing}
                  aria-label={btn.label}
                >
                  {isSyncing[btn.id] ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <btn.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  )}
                  {btn.label}
                </Button>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t">
              <Button
                className="w-full h-11 sm:w-auto shadow-sm"
                onClick={() => handleSync('all')}
                disabled={isAnySyncing}
                aria-label="Sincronizar Tudo"
              >
                {isSyncing['all'] ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sincronizar Tudo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="w-full mt-4">
        <TabsList className="w-full flex overflow-x-auto h-auto p-1 bg-muted/50 mb-4 justify-start rounded-lg">
          <TabsTrigger value="logs" className="shrink-0 px-4 py-2">
            Histórico
          </TabsTrigger>
          <TabsTrigger value="assets" className="shrink-0 px-4 py-2">
            Ativos ({assets.length})
          </TabsTrigger>
          <TabsTrigger value="drivers" className="shrink-0 px-4 py-2">
            Motoristas ({drivers.length})
          </TabsTrigger>
          <TabsTrigger value="trips" className="shrink-0 px-4 py-2">
            Viagens ({trips.length})
          </TabsTrigger>
          <TabsTrigger value="events" className="shrink-0 px-4 py-2">
            Eventos ({events.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-0">
          <Card className="shadow-sm border-muted">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  Histórico de Sincronismo
                </CardTitle>
                <CardDescription>Últimos registros de sincronização efetuados</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={logFilter} onValueChange={setLogFilter}>
                  <SelectTrigger className="w-full sm:w-[190px] h-10">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_records">Todos os registros</SelectItem>
                    <SelectItem value="assets">Ativos</SelectItem>
                    <SelectItem value="drivers">Motoristas</SelectItem>
                    <SelectItem value="trips">Viagens</SelectItem>
                    <SelectItem value="events">Eventos</SelectItem>
                    <SelectItem value="all">Sincronização Completa</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearLogs}
                  title="Limpar histórico"
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full whitespace-nowrap rounded-b-xl border-t">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[180px]">Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Registros</TableHead>
                      <TableHead className="text-right">Duração</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum registro encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium text-muted-foreground">
                            {format(new Date(log.created), 'dd/MM/yyyy HH:mm:ss')}
                          </TableCell>
                          <TableCell className="capitalize">
                            {log.type === 'all' ? 'Completo (Tudo)' : log.type}
                          </TableCell>
                          <TableCell>
                            {log.status === 'success' ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                                <CheckCircle2 className="h-4 w-4" /> Sucesso
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-1.5 text-destructive text-sm font-medium"
                                title={log.error_message}
                              >
                                <XCircle className="h-4 w-4" /> Erro
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {log.records_count}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {(log.duration_ms / 1000).toFixed(2)}s
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assets.map((asset) => (
              <Card key={asset.id} className="shadow-sm border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex justify-between items-center">
                    {asset.plate || 'Sem Placa'}
                    <Badge
                      variant={asset.status?.toLowerCase() === 'moving' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {asset.status || 'N/A'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="flex justify-between py-1">
                    <span className="text-muted-foreground">Veículo ID:</span>
                    <span className="font-medium">{asset.vehicle_id}</span>
                  </p>
                  <p className="flex justify-between py-1 border-t">
                    <span className="text-muted-foreground">Atualizado em:</span>
                    <span className="font-medium">
                      {asset.last_update
                        ? format(new Date(asset.last_update), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </span>
                  </p>
                </CardContent>
              </Card>
            ))}
            {assets.length === 0 && (
              <p className="text-muted-foreground col-span-full mt-4 text-center">
                Nenhum ativo sincronizado recentemente.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="drivers" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {drivers.map((driver) => (
              <Card key={driver.id} className="shadow-sm border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate" title={driver.name}>
                    {driver.name || 'Sem Nome'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="flex justify-between py-1">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-medium">{driver.driver_id}</span>
                  </p>
                  <p className="flex justify-between py-1 border-t">
                    <span className="text-muted-foreground">CNH:</span>
                    <span className="font-medium">{driver.license_category || '-'}</span>
                  </p>
                  <p className="flex justify-between py-1 border-t">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">{driver.status || '-'}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
            {drivers.length === 0 && (
              <p className="text-muted-foreground col-span-full mt-4 text-center">
                Nenhum motorista sincronizado recentemente.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trips" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trips.map((trip) => (
              <Card key={trip.id} className="shadow-sm border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">Viagem #{trip.trip_id}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="flex justify-between py-1">
                    <span className="text-muted-foreground">Veículo ID:</span>
                    <span className="font-medium">{trip.vehicle_id || '-'}</span>
                  </p>
                  <p className="flex justify-between py-1 border-t">
                    <span className="text-muted-foreground">Início:</span>
                    <span className="font-medium">
                      {trip.start_time ? format(new Date(trip.start_time), 'dd/MM HH:mm') : '-'}
                    </span>
                  </p>
                  <p className="flex justify-between py-1 border-t">
                    <span className="text-muted-foreground">Fim:</span>
                    <span className="font-medium">
                      {trip.end_time ? format(new Date(trip.end_time), 'dd/MM HH:mm') : '-'}
                    </span>
                  </p>
                  <p className="flex justify-between py-1 border-t">
                    <span className="text-muted-foreground">Distância:</span>
                    <span className="font-medium">{trip.distance_km || 0} km</span>
                  </p>
                </CardContent>
              </Card>
            ))}
            {trips.length === 0 && (
              <p className="text-muted-foreground col-span-full mt-4 text-center">
                Nenhuma viagem sincronizada recentemente.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {events.map((evt) => (
              <Card key={evt.id} className="shadow-sm border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex justify-between items-center truncate gap-2">
                    <span className="truncate">{evt.event_type || 'Evento'}</span>
                    <Badge
                      variant={
                        evt.severity?.toLowerCase() === 'alta'
                          ? 'destructive'
                          : evt.severity?.toLowerCase() === 'média'
                            ? 'default'
                            : 'secondary'
                      }
                      className="capitalize shrink-0"
                    >
                      {evt.severity || 'N/A'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="flex justify-between py-1">
                    <span className="text-muted-foreground">Evento ID:</span>
                    <span className="font-medium truncate ml-2" title={evt.event_id}>
                      {evt.event_id}
                    </span>
                  </p>
                  <p className="flex justify-between py-1 border-t">
                    <span className="text-muted-foreground">Veículo ID:</span>
                    <span className="font-medium truncate ml-2">{evt.vehicle_id || '-'}</span>
                  </p>
                  <p className="flex justify-between py-1 border-t">
                    <span className="text-muted-foreground">Data/Hora:</span>
                    <span className="font-medium">
                      {evt.timestamp ? format(new Date(evt.timestamp), 'dd/MM HH:mm') : '-'}
                    </span>
                  </p>
                </CardContent>
              </Card>
            ))}
            {events.length === 0 && (
              <p className="text-muted-foreground col-span-full mt-4 text-center">
                Nenhum evento sincronizado recentemente.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
