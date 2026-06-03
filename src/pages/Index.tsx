import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Car, Route, Users, RefreshCw, AlertTriangle, Activity } from 'lucide-react'

export default function Index() {
  const [assets, setAssets] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [secretsMissing, setSecretsMissing] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [assetsData, driversData, tripsData] = await Promise.all([
        pb.collection('assets').getFullList({ sort: '-created' }),
        pb.collection('drivers').getFullList({ sort: '-created' }),
        pb.collection('trips').getFullList({ sort: '-created' }),
      ])
      setAssets(assetsData)
      setDrivers(driversData)
      setTrips(tripsData)

      try {
        const configs = await pb.collection('admin_config').getFullList()
        const hasEmail = configs.some(
          (c) =>
            c.config_key === 'DATALBUS_EMAIL' &&
            c.config_value !== null &&
            c.config_value !== undefined &&
            c.config_value !== '',
        )
        setSecretsMissing(!hasEmail)
      } catch (_) {
        // Ignoring if standard user cannot fetch admin_config
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

  useRealtime('assets', () => {
    loadData()
  })
  useRealtime('drivers', () => {
    loadData()
  })
  useRealtime('trips', () => {
    loadData()
  })

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await pb.send('/backend/v1/sincronizar-datalbus', { method: 'POST' })
      toast({
        title: 'Sincronização concluída',
        description: `${res.recordsCreated} registros criados, ${res.recordsUpdated} atualizados.`,
      })
      setSecretsMissing(false)
    } catch (err: any) {
      toast({
        title: 'Erro de Sincronização',
        description: err.message || 'Falha ao sincronizar com Datalbus',
        variant: 'destructive',
      })
      if (err.message && err.message.includes('Missing Datalbus credentials')) {
        setSecretsMissing(true)
      }
    } finally {
      setSyncing(false)
    }
  }

  const kpis = useMemo(() => {
    const totalDistance = trips.reduce((acc, t) => acc + (t.distance || 0), 0)
    const activeVehicles = assets.length
    const validScores = trips.map((t) => t.score).filter((s) => typeof s === 'number' && s > 0)
    const avgScore = validScores.length
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length
      : 0

    return { totalDistance, activeVehicles, avgScore }
  }, [assets, trips])

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[50vh]">
        <Activity className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Via Sudeste</h1>
          <p className="text-muted-foreground">Monitoramento da frota em tempo real</p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Datalbus'}
        </Button>
      </div>

      {secretsMissing && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Aviso Crítico</AlertTitle>
          <AlertDescription>
            Credenciais do Datalbus (DATALBUS_EMAIL, DATALBUS_PASSWORD, DATALBUS_TENANCY) não
            encontradas na coleção admin_config. A sincronização falhará. Por favor, adicione estas
            chaves para prosseguir.
          </AlertDescription>
        </Alert>
      )}

      {assets.length === 0 && trips.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Car className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Nenhum dado encontrado</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              Os dados ainda não foram sincronizados. Clique no botão "Sincronizar Datalbus" para
              buscar as informações mais recentes da API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Veículos Cadastrados</CardTitle>
                <Car className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.activeVehicles}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Distância Total (km)</CardTitle>
                <Route className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(kpis.totalDistance / 1000).toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.avgScore.toFixed(1)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Últimos Veículos Sincronizados</CardTitle>
                <CardDescription>Resumo dos dados mais recentes da frota</CardDescription>
              </CardHeader>
              <CardContent>
                {assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum veículo listado.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {assets.slice(0, 5).map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium">
                            {asset.plate || asset.license_plate || 'Sem Placa'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {asset.brand} {asset.model ? `- ${asset.model}` : ''}
                          </p>
                        </div>
                        <div className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                          ID: {asset.asset_id}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Últimas Viagens Registradas</CardTitle>
                <CardDescription>Histórico recente de deslocamento</CardDescription>
              </CardHeader>
              <CardContent>
                {trips.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma viagem listada.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {trips.slice(0, 5).map((trip) => (
                      <div
                        key={trip.id}
                        className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium text-sm">Viagem #{trip.trip_id}</p>
                          <p className="text-xs text-muted-foreground">
                            Distância: {(trip.distance / 1000).toFixed(1)} km
                          </p>
                        </div>
                        <div className="text-sm">
                          Score:{' '}
                          <span
                            className={`font-bold ${trip.score >= 80 ? 'text-green-600' : trip.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}
                          >
                            {trip.score || '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
