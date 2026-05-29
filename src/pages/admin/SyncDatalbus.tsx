import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SyncDatalbus() {
  const [loading, setLoading] = useState(false)
  const [syncState, setSyncState] = useState<any>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { toast } = useToast()

  const loadSyncState = async () => {
    try {
      const record = await pb.collection('sync_state').getFirstListItem(`endpoint_name="trips"`)
      setSyncState(record)
    } catch (err) {
      console.log('Nenhum estado de sincronização anterior encontrado.')
    }
  }

  useEffect(() => {
    loadSyncState()
  }, [])

  const handleSync = async () => {
    setLoading(true)
    try {
      const body: Record<string, string> = {}
      if (startDate) body.startDate = new Date(startDate).toISOString()
      if (endDate) body.endDate = new Date(endDate).toISOString()

      const res = await pb.send('/backend/v1/sync_datalbus_trips', {
        method: 'POST',
        body: body,
      })

      toast({
        title: 'Sincronização concluída com sucesso!',
        description: `Viagens: ${res.data.trips_processed} | Eventos: ${res.data.events_processed} | Localizações: ${res.data.locations_processed}`,
      })
      loadSyncState()
    } catch (err: any) {
      toast({
        title: 'Erro na sincronização',
        description:
          err.response?.message || err.message || 'Verifique os logs para mais detalhes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Administração Datalbus</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sincronizar Dados Operacionais</CardTitle>
          <CardDescription>
            Execute a ingestão manual de viagens, eventos e trilhas via Datalbus API. Se não
            informadas, o sistema usará as datas baseadas na última execução.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Data Inicial (Opcional)</Label>
              <Input
                id="start"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Data Final (Opcional)</Label>
              <Input
                id="end"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t">
            <Button onClick={handleSync} disabled={loading} size="lg">
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-5 w-5" />
              )}
              Iniciar Sincronização
            </Button>

            {syncState && (
              <div className="text-sm bg-muted p-4 rounded-lg flex flex-col items-start sm:items-end w-full sm:w-auto">
                <span className="text-muted-foreground font-semibold mb-1">Última Execução</span>
                <p>{new Date(syncState.last_sync_at).toLocaleString('pt-BR')}</p>
                <p>
                  Status:
                  <span
                    className={`ml-2 font-medium ${syncState.last_sync_status === 'error' ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {syncState.last_sync_status.toUpperCase()}
                  </span>
                </p>
                {syncState.records_processed !== undefined && (
                  <p>
                    Registros Processados:{' '}
                    <span className="font-medium">{syncState.records_processed}</span>
                  </p>
                )}
                {syncState.error_message && (
                  <p className="text-red-600 mt-2 max-w-sm break-words">
                    {syncState.error_message}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
