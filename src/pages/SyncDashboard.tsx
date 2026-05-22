import { useState, useEffect, useCallback, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { 
  RefreshCw, CheckCircle2, XCircle, Clock, Trash2, 
  Database, Users, MapPin, AlertTriangle, Play, Activity 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { checkDatalbusHealth, fetchDatalbusAction } from '@/services/datalbus'
import { getSyncLogs, createSyncLog, clearSyncLogs, SyncLog } from '@/services/sync'
import { useRealtime } from '@/hooks/use-realtime'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

export default function SyncDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [nextSyncIn, setNextSyncIn] = useState<number>(300)
  
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [logFilter, setLogFilter] = useState('all_records')
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({})
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const loadLogs = useCallback(async () => {
    try {
      const items = await getSyncLogs(logFilter)
      setLogs(items)
      if (items.length > 0 && logFilter === 'all_records') {
        setLastSync(new Date(items[0].created))
      }
    } catch (e) {
      console.error(e)
    }
  }, [logFilter])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useRealtime('sync_logs', () => {
    loadLogs()
  })

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
      setNextSyncIn(prev => {
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

    setIsSyncing(prev => ({ ...prev, [type]: true }))
    toast({ title: 'Sincronizando...', description: `Iniciando sincronização de ${type === 'all' ? 'todos os dados' : type}.` })
    
    const start = Date.now()
    try {
      let totalRecords = 0
      if (type === 'all') {
        const types = ['assets', 'drivers', 'trips', 'tripEvents']
        for (const t of types) {
          const res = await fetchDatalbusAction(t)
          if (res?.data && Array.isArray(res.data)) {
            totalRecords += res.data.length
          }
        }
      } else {
        const actionMap: any = { events: 'tripEvents' }
        const res = await fetchDatalbusAction(actionMap[type] || type)
        if (res?.data && Array.isArray(res.data)) {
          totalRecords = res.data.length
        }
      }
      
      const duration_ms = Date.now() - start
      await createSyncLog({
        type,
        status: 'success',
        records_count: totalRecords,
        duration_ms,
      })

      toast({ 
        title: 'Sincronizado com sucesso.',
        description: `${totalRecords} registros importados.`,
        variant: 'default'
      })
    } catch (e: any) {
      const duration_ms = Date.now() - start
      await createSyncLog({
        type,
        status: 'error',
        records_count: 0,
        duration_ms,
        error_message: e.message || 'Erro desconhecido'
      })
      toast({ 
        title: 'Erro ao sincronizar. Tente novamente.',
        description: e.message,
        variant: 'destructive'
      })
    } finally {
      setIsSyncing(prev => ({ ...prev, [type]: false }))
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
        <p className="text-muted-foreground mt-1">Gerencie a integração com a API Datalbus e sincronize os dados manualmente.</p>
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
                {status === 'checking' && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                {status === 'online' && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                    Online
                  </Badge>
                )}
                {status === 'offline' && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <span className="h-2 w-2 rounded-full bg-destructive mr-2" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>

            {status === 'offline' && (
              <p className="text-sm text-destructive font-medium -mt-2">API indisponível. Verifique a conexão ou tente novamente.</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 p-3 bg-muted/40 rounded-lg">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Último sincronismo
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

      <Card className="shadow-sm border-muted">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Histórico de Sincronismo
            </CardTitle>
            <CardDescription>Últimos 10 registros de sincronização</CardDescription>
          </CardHeader>
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
            <Button variant="ghost" size="icon" onClick={handleClearLogs} title="Limpar histórico" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive">
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
                          <div className="flex items-center gap-1.5 text-destructive text-sm font-medium" title={log.error_message}>
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
    </div>
  )
}
