import { useEffect, useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Activity, Terminal, History, Play, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { fetchDatalbusAction, checkDatalbusHealth } from '@/services/datalbus'
import { createSyncLog, getSyncLogs, SyncLog } from '@/services/sync'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'

type LogEntry = { ts: string; text: string; type: 'info' | 'success' | 'error' }

export default function SyncDashboard() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [lastSync, setLastSync] = useState<string>('N/A')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [history, setHistory] = useState<SyncLog[]>([])
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({})

  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    testConnection()
    loadHistory()
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const testConnection = async () => {
    try {
      const res = await checkDatalbusHealth()
      setIsOnline(res?.success || false)
    } catch {
      setIsOnline(false)
    }
  }

  const loadHistory = async () => {
    const data = await getSyncLogs('all_records', 5)
    setHistory(data)
    if (data.length > 0) {
      setLastSync(new Date(data[0].created).toLocaleString())
    }

    const counts: Record<string, number> = {}
    try {
      const assets = await pb.collection('assets').getList(1, 1)
      const drivers = await pb.collection('drivers_datalbus').getList(1, 1)
      const trips = await pb.collection('trips').getList(1, 1)
      const events = await pb.collection('trip_events').getList(1, 1)
      counts.assets = assets.totalItems
      counts.drivers = drivers.totalItems
      counts.trips = trips.totalItems
      counts.events = events.totalItems
      counts.all = assets.totalItems + drivers.totalItems + trips.totalItems + events.totalItems
    } catch (e) {
      /* ignore */
    }
    setCollectionCounts(counts)
  }

  const addLog = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs((prev) => {
      const newLogs = [...prev, { ts: new Date().toLocaleTimeString(), text, type }]
      return newLogs.slice(-100)
    })
  }

  const clearLogs = () => setLogs([])

  const validateItem = (type: string, item: any) => {
    if (type === 'assets') {
      if (!item.id && !item.vehicle_id) return 'vehicle_id'
      if (!item.plate) return 'plate'
      if (!item.status) return 'status'
      if (!item.last_update) return 'last_update'
    } else if (type === 'drivers') {
      if (!item.id && !item.driver_id) return 'driver_id'
      if (!item.name) return 'name'
      if (!item.license_category) return 'license_category'
      if (!item.status) return 'status'
    } else if (type === 'trips') {
      if (!item.id && !item.trip_id) return 'trip_id'
      if (!item.vehicle_id) return 'vehicle_id'
      if (!item.start_time) return 'start_time'
      if (!item.end_time) return 'end_time'
      if (item.distance_km === undefined) return 'distance_km'
    } else if (type === 'events') {
      if (!item.id && !item.event_id) return 'event_id'
      if (!item.trip_id) return 'trip_id'
      if (!item.vehicle_id) return 'vehicle_id'
      if (!item.event_type) return 'event_type'
      if (!item.severity) return 'severity'
      if (!item.timestamp) return 'timestamp'
    }
    return null
  }

  const upsertItem = async (type: string, item: any) => {
    let collectionName = ''
    let uniqueField = ''
    let uniqueValue = ''
    let payload: any = {}

    if (type === 'assets') {
      collectionName = 'assets'
      uniqueField = 'vehicle_id'
      uniqueValue = String(item.id || item.vehicle_id)
      payload = {
        vehicle_id: uniqueValue,
        plate: item.plate,
        status: item.status,
        last_update: item.last_update,
      }
    } else if (type === 'drivers') {
      collectionName = 'drivers_datalbus'
      uniqueField = 'driver_id'
      uniqueValue = String(item.id || item.driver_id)
      payload = {
        driver_id: uniqueValue,
        name: item.name,
        license_category: item.license_category,
        status: item.status,
      }
    } else if (type === 'trips') {
      collectionName = 'trips'
      uniqueField = 'trip_id'
      uniqueValue = String(item.id || item.trip_id)

      let vehicleRel = null
      try {
        const v = await pb.collection('assets').getFirstListItem(`vehicle_id="${item.vehicle_id}"`)
        vehicleRel = v.id
      } catch {
        /* ignore */
      }

      payload = {
        trip_id: uniqueValue,
        vehicle_id: vehicleRel,
        start_time: item.start_time,
        end_time: item.end_time,
        distance_km: item.distance_km,
      }
    } else if (type === 'events') {
      collectionName = 'trip_events'
      uniqueField = 'event_id'
      uniqueValue = String(item.id || item.event_id)

      let tripRel = null
      try {
        const t = await pb.collection('trips').getFirstListItem(`trip_id="${item.trip_id}"`)
        tripRel = t.id
      } catch {
        /* ignore */
      }

      let severity = String(item.severity).toLowerCase()
      if (!['alta', 'média', 'baixa'].includes(severity)) severity = 'média'

      payload = {
        event_id: uniqueValue,
        trip_id: tripRel,
        vehicle_id: String(item.vehicle_id),
        event_type: item.event_type,
        severity,
        timestamp: item.timestamp,
        description: item.description || '',
      }
    }

    try {
      const existing = await pb
        .collection(collectionName)
        .getFirstListItem(`${uniqueField}="${uniqueValue}"`)
      await pb.collection(collectionName).update(existing.id, payload)
    } catch (e: any) {
      if (e.status === 404) {
        await pb.collection(collectionName).create(payload)
      } else {
        throw e
      }
    }
  }

  const runSyncInternal = async (type: string) => {
    const startTime = Date.now()
    let successCount = 0
    let hasError = false

    addLog(`[INICIANDO] Sincronização de ${type}...`, 'info')

    try {
      addLog(`[BUSCANDO] Obtendo dados da API Datalbus (${type})...`, 'info')
      const apiAction = type === 'events' ? 'tripEvents' : type
      const res = await fetchDatalbusAction(apiAction, {})
      const data = res.data || []
      addLog(`[RESPOSTA] ${data.length} registros recebidos.`, 'success')

      addLog(`[VALIDANDO] Validando campos obrigatórios...`, 'info')
      const validData = []
      for (const item of data) {
        const errorField = validateItem(type, item)
        if (errorField) {
          addLog(
            `[ERRO] Campo obrigatório ausente: ${errorField} no registro ${
              item.id ||
              item.vehicle_id ||
              item.driver_id ||
              item.trip_id ||
              item.event_id ||
              'desconhecido'
            }`,
            'error',
          )
          hasError = true
        } else {
          validData.push(item)
        }
      }

      addLog(`[INSERINDO] Atualizando banco de dados Skip Cloud...`, 'info')
      for (const item of validData) {
        try {
          await upsertItem(type, item)
          successCount++
        } catch (dbError: any) {
          addLog(`[ERRO] Falha no banco: ${dbError.message}`, 'error')
          hasError = true
        }
      }

      addLog(`[SUCESSO] ${successCount} registros salvos no banco.`, 'success')

      addLog(`[VERIFICANDO] Contando registros no banco de dados...`, 'info')
      const map: Record<string, string> = {
        assets: 'assets',
        drivers: 'drivers_datalbus',
        trips: 'trips',
        events: 'trip_events',
      }
      const countRes = await pb.collection(map[type]).getList(1, 1)
      addLog(`[RESULTADO] Total de registros na coleção: ${countRes.totalItems}.`, 'success')

      await createSyncLog({
        type: type,
        status: hasError ? 'error' : 'success',
        records_count: successCount,
        duration_ms: Date.now() - startTime,
      })
    } catch (error: any) {
      const msg = error?.response?.error || error.message || 'Erro desconhecido'
      const status = error?.status || 'API'
      addLog(`[ERRO] Status ${status}, ${msg}`, 'error')
      await createSyncLog({
        type: type,
        status: 'error',
        records_count: successCount,
        duration_ms: Date.now() - startTime,
        error_message: msg,
      })
    }
  }

  const handleSync = async (type: string) => {
    setLoading(true)
    if (type === 'all') {
      addLog('[INICIANDO] Sincronização completa...', 'info')
      await runSyncInternal('assets')
      await runSyncInternal('drivers')
      await runSyncInternal('trips')
      await runSyncInternal('events')
      addLog('[SUCESSO] Sincronização completa finalizada.', 'success')
      await createSyncLog({
        type: 'all',
        status: 'success',
        records_count: 0,
        duration_ms: 0,
      })
    } else {
      await runSyncInternal(type)
    }
    setLoading(false)
    loadHistory()
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sincronismo Datalbus — Debug</h1>
          <p className="text-muted-foreground mt-1">
            Controle e monitoramento do processo de sincronização de dados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Status */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Status da Conexão
            </CardTitle>
            <CardDescription>Visão em tempo real da comunicação com a API Datalbus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg border">
              <div
                className={cn(
                  'h-4 w-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)]',
                  isOnline === null
                    ? 'bg-gray-400 animate-pulse'
                    : isOnline
                      ? 'bg-green-500 shadow-green-500/50'
                      : 'bg-red-500 shadow-red-500/50',
                )}
              />
              <div className="flex flex-col">
                <span className="font-semibold text-lg leading-tight">
                  {isOnline === null ? 'Verificando...' : isOnline ? 'Online' : 'Offline'}
                </span>
                <span className="text-sm text-muted-foreground">Status do Serviço</span>
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Último sincronismo</span>
              <span className="text-sm text-muted-foreground">{lastSync}</span>
            </div>

            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={testConnection}
              disabled={loading}
            >
              Testar Conexão
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Controles */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Controles de Sincronização
            </CardTitle>
            <CardDescription>
              Execute rotinas granulares ou gerais com log passo a passo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start shadow-sm"
                disabled={loading}
                onClick={() => handleSync('assets')}
              >
                <Play className="mr-2 h-4 w-4 text-blue-500" />
                Sincronizar Ativos
              </Button>
              <Button
                variant="outline"
                className="justify-start shadow-sm"
                disabled={loading}
                onClick={() => handleSync('drivers')}
              >
                <Play className="mr-2 h-4 w-4 text-blue-500" />
                Sincronizar Motoristas
              </Button>
              <Button
                variant="outline"
                className="justify-start shadow-sm"
                disabled={loading}
                onClick={() => handleSync('trips')}
              >
                <Play className="mr-2 h-4 w-4 text-blue-500" />
                Sincronizar Viagens
              </Button>
              <Button
                variant="outline"
                className="justify-start shadow-sm"
                disabled={loading}
                onClick={() => handleSync('events')}
              >
                <Play className="mr-2 h-4 w-4 text-blue-500" />
                Sincronizar Eventos
              </Button>
              <Button
                variant="default"
                className="sm:col-span-2 shadow-sm"
                disabled={loading}
                onClick={() => handleSync('all')}
              >
                <Play className="mr-2 h-4 w-4" />
                Sincronizar Tudo (com Debug)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Log */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Real-time Debug Log
              </CardTitle>
              <CardDescription>
                Acompanhamento detalhado das requisições e validações
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLogs}
              disabled={loading || logs.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Log
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-[#0D1117] text-gray-300 p-4 rounded-xl font-mono text-sm h-80 overflow-y-auto shadow-inner border border-gray-800">
              {logs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-600 italic">
                  Nenhum log disponível. Inicie um sincronismo.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((log, index) => (
                    <div key={index} className="flex gap-3 leading-relaxed">
                      <span className="text-gray-500 shrink-0 w-20">[{log.ts}]</span>
                      <span
                        className={cn('flex-1 break-words', {
                          'text-blue-400': log.type === 'info',
                          'text-emerald-400': log.type === 'success',
                          'text-rose-400 font-semibold': log.type === 'error',
                        })}
                      >
                        {log.text}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} className="h-1" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Historico */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico & Resultados
            </CardTitle>
            <CardDescription>Resumo das últimas 5 execuções de sincronismo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Inseridos/Atualizados</TableHead>
                    <TableHead className="text-right">Registros no Banco</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium capitalize">
                          {log.type === 'all' ? 'Tudo' : log.type}
                        </TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge
                              variant="default"
                              className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Sucesso
                            </Badge>
                          ) : (
                            <Badge
                              variant="destructive"
                              className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Erro
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {log.type === 'all' ? '-' : log.records_count}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {collectionCounts[log.type] ?? '-'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {log.duration_ms} ms
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
