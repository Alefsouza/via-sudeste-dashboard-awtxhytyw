import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Play, Terminal, Database, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

type LogEntry = {
  id: string
  timestamp: Date
  message: string
  type: 'info' | 'success' | 'error'
}

type SyncLog = {
  id: string
  type: string
  status: string
  records_count: number
  duration_ms: number
  created: string
}

export default function SyncDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<SyncLog[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const fetchHistory = async () => {
    try {
      const res = await pb.collection('sync_logs').getList<SyncLog>(1, 5, { sort: '-created' })
      setHistory(res.items)
    } catch (err) {
      console.error('Failed to load history', err)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  useRealtime('sync_logs', () => {
    fetchHistory()
  })

  const addLog = (message: string, type: 'info' | 'success' | 'error') => {
    setLogs((prev) => [...prev, { id: crypto.randomUUID(), timestamp: new Date(), message, type }])
  }

  const handleSync = async () => {
    setIsLoading(true)
    setLogs([])
    const startTime = Date.now()
    let totalInsertedAll = 0
    let hasErrors = false

    const entities = ['assets', 'drivers', 'trips', 'trip_events', 'event_types']

    addLog('[SISTEMA] Iniciando processo de sincronização total...', 'info')

    for (const entity of entities) {
      addLog(`[INICIANDO] Sincronizando ${entity}...`, 'info')
      let currentPage = 1
      let lastPage = 1
      let totalInsertedEntity = 0

      while (currentPage <= lastPage) {
        addLog(
          `[BUSCANDO PÁGINA ${currentPage}/${lastPage > 1 ? lastPage : '?'}] GET /${entity}`,
          'info',
        )

        try {
          const res = await pb.send<{
            success: boolean
            data: unknown[]
            current_page: number
            last_page: number
            count: number
          }>('/backend/v1/datalbus/sync-page', {
            method: 'POST',
            body: JSON.stringify({ entity, page: currentPage }),
            headers: { 'Content-Type': 'application/json' },
          })

          lastPage = res.last_page
          const count = res.count
          totalInsertedEntity += count
          totalInsertedAll += count

          addLog(
            `[RESPOSTA] Página ${currentPage}/${lastPage}, ${count} registros recebidos`,
            'success',
          )
          addLog(`[INSERINDO] INSERT INTO ${entity}...`, 'info')
          addLog(`[SUCESSO] ${count} registros inseridos na coleção ${entity}`, 'success')

          currentPage++
        } catch (err: unknown) {
          hasErrors = true
          let status = 500
          let msg = 'Erro desconhecido'

          if (err && typeof err === 'object') {
            const clientErr = err as {
              status?: number
              response?: { message?: string }
              message?: string
            }
            status = clientErr.status || 500
            msg = clientErr.response?.message || clientErr.message || msg
          }

          addLog(
            `[ERRO] Falha na página ${currentPage} de ${entity} (Status: ${status}): ${msg}`,
            'error',
          )
          // Avança para a próxima página para não quebrar o loop total
          currentPage++
        }
      }

      addLog(
        `[RESULTADO] Total de ${totalInsertedEntity} registros sincronizados no banco para ${entity}`,
        'success',
      )
    }

    const duration = Date.now() - startTime
    addLog(
      `[CONCLUÍDO] Processo finalizado em ${duration}ms com total de ${totalInsertedAll} registros.`,
      'info',
    )

    try {
      await pb.collection('sync_logs').create({
        type: 'all',
        status: hasErrors ? 'error' : 'success',
        records_count: totalInsertedAll,
        duration_ms: duration,
      })
    } catch (err) {
      addLog(`[ERRO] Falha ao salvar histórico no banco.`, 'error')
    }

    setIsLoading(false)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sincronismo Datalbus</h1>
          <p className="text-muted-foreground mt-1">
            Debug e ingestão permissiva de dados da API Datalbus.
          </p>
        </div>
        <Button onClick={handleSync} disabled={isLoading} size="lg" className="w-full md:w-auto">
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Play className="mr-2 h-5 w-5" />
          )}
          {isLoading ? 'Sincronizando...' : 'Sincronizar Ativos (com Debug)'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col h-[600px] shadow-sm border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-t-xl border-b border-zinc-200 dark:border-zinc-800">
            <CardTitle className="flex items-center text-lg">
              <Terminal className="mr-2 h-5 w-5 text-zinc-500" />
              Console de Debug em Tempo Real
            </CardTitle>
            <CardDescription>
              Visualização passo a passo da paginação e inserção de registros.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 bg-zinc-950 text-zinc-300">
            <ScrollArea className="h-full w-full">
              <div className="p-4 font-mono text-sm space-y-1.5">
                {logs.length === 0 ? (
                  <div className="text-zinc-500 italic">
                    Aguardando início do sincronismo... clique no botão acima para iniciar.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={
                        log.type === 'error'
                          ? 'text-red-400'
                          : log.type === 'success'
                            ? 'text-emerald-400'
                            : 'text-zinc-300'
                      }
                    >
                      <span className="text-zinc-500 mr-3">
                        [{format(log.timestamp, 'HH:mm:ss.SSS')}]
                      </span>
                      {log.message}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[600px] shadow-sm border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-t-xl border-b border-zinc-200 dark:border-zinc-800">
            <CardTitle className="flex items-center text-lg">
              <Database className="mr-2 h-5 w-5 text-zinc-500" />
              Histórico Recente
            </CardTitle>
            <CardDescription>Últimas 5 operações de sincronismo no banco.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-4 bg-white dark:bg-zinc-950">
            {history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                <Database className="h-10 w-10 text-zinc-300 dark:text-zinc-800 mb-3" />
                Nenhum histórico encontrado.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 space-y-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {item.status === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-semibold uppercase tracking-wider text-xs">
                          {item.type}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {format(new Date(item.created), 'dd MMM yyyy, HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm border-t border-zinc-100 dark:border-zinc-800 pt-2">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                          Registros
                        </span>
                        <span className="font-semibold">
                          {item.records_count.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                          Duração
                        </span>
                        <span className="font-semibold">
                          {(item.duration_ms / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
