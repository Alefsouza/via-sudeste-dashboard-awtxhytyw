import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getVehicles } from '@/services/vehicles'
import { getRecentAlerts } from '@/services/alerts'
import { getDrivers } from '@/services/drivers'
import useRealtime from '@/hooks/use-realtime'
import { Activity, AlertTriangle, Droplet, Navigation, Truck } from 'lucide-react'
import { RecordModel } from 'pocketbase'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Index() {
  const [vehicles, setVehicles] = useState<RecordModel[]>([])
  const [alerts, setAlerts] = useState<RecordModel[]>([])
  const [avgScore, setAvgScore] = useState(0)

  const loadData = async () => {
    try {
      const [vRes, aRes, dRes] = await Promise.all([
        getVehicles(),
        getRecentAlerts(15),
        getDrivers(),
      ])
      setVehicles(vRes)
      setAlerts(aRes.items)

      if (dRes.length > 0) {
        const total = dRes.reduce((acc, curr) => acc + (curr.score || 0), 0)
        setAvgScore(Math.round(total / dRes.length))
      }
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('vehicles', () => {
    loadData()
  })
  useRealtime('alerts', () => {
    loadData()
  })

  const activeVehicles = vehicles.filter((v) => v.status === 'moving').length
  const criticalAlerts = alerts.filter((a) => !a.resolved && a.severity === 'high').length

  const statusData = useMemo(() => {
    const moving = vehicles.filter((v) => v.status === 'moving').length
    const idle = vehicles.filter((v) => v.status === 'idle').length
    const maintenance = vehicles.filter((v) => v.status === 'maintenance').length
    return [
      { name: 'Em Trânsito', value: moving, color: 'var(--color-moving)' },
      { name: 'Ocioso', value: idle, color: 'var(--color-idle)' },
      { name: 'Manutenção', value: maintenance, color: 'var(--color-maintenance)' },
    ].filter((d) => d.value > 0)
  }, [vehicles])

  const chartConfig = {
    moving: { label: 'Em Trânsito', color: 'hsl(var(--chart-2))' },
    idle: { label: 'Ocioso', color: 'hsl(var(--chart-4))' },
    maintenance: { label: 'Manutenção', color: 'hsl(var(--chart-3))' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Geral</h1>
        <p className="text-muted-foreground mt-1">Visão em tempo real da operação logística.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className="hover:border-primary/50 transition-colors animate-fade-in-up"
          style={{ animationDelay: '0ms' }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veículos Ativos</CardTitle>
            <Navigation className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-num">
              {activeVehicles}{' '}
              <span className="text-sm font-normal text-muted-foreground">/ {vehicles.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Frota atual em movimento</p>
          </CardContent>
        </Card>
        <Card
          className="hover:border-destructive/50 transition-colors animate-fade-in-up"
          style={{ animationDelay: '100ms' }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${criticalAlerts > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-num text-destructive">
              {criticalAlerts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Não resolvidos</p>
          </CardContent>
        </Card>
        <Card
          className="hover:border-primary/50 transition-colors animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consumo Médio</CardTitle>
            <Droplet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-num">
              28.4 <span className="text-sm font-normal text-muted-foreground">L/100km</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Média das últimas 24h</p>
          </CardContent>
        </Card>
        <Card
          className="hover:border-primary/50 transition-colors animate-fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontuação da Frota</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-num text-emerald-500">
              {avgScore} <span className="text-sm font-normal text-muted-foreground">/ 100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Índice de segurança</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
        {/* Mock Map */}
        <Card className="md:col-span-3 lg:col-span-5 flex flex-col animate-fade-in">
          <CardHeader>
            <CardTitle>Mapa em Tempo Real</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 px-6 pb-6">
            <div className="relative w-full h-[400px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
              <div className="absolute inset-0 bg-grid-pattern" />
              {/* Very rough mock positioning based on Brazil coords approx Lat -23 Lng -46 */}
              {vehicles.map((v) => {
                if (!v.last_latitude) return null
                // Normalize to a local bounding box roughly around SP/RJ for visualization
                const latOffset = (v.last_latitude + 23) * -15 + 50
                const lngOffset = (v.last_longitude + 46) * 15 + 50
                const isMoving = v.status === 'moving'

                return (
                  <div
                    key={v.id}
                    className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear group"
                    style={{
                      top: `${Math.max(10, Math.min(90, latOffset))}%`,
                      left: `${Math.max(10, Math.min(90, lngOffset))}%`,
                    }}
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${isMoving ? 'bg-primary' : 'bg-muted-foreground'} z-10`}
                    />
                    {isMoving && (
                      <div className="absolute w-8 h-8 bg-primary/30 rounded-full animate-ping" />
                    )}

                    <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 bg-popover text-xs px-2 py-1 rounded border shadow-lg whitespace-nowrap pointer-events-none transition-opacity z-20">
                      {v.plate}
                    </div>
                  </div>
                )
              })}
              <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur text-xs px-3 py-2 rounded-md border">
                <span className="font-semibold text-primary">Modo Simulação</span> - Posições
                relativas
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Alerts & Chart */}
        <div className="md:col-span-3 lg:col-span-2 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status da Frota</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center pb-2">
              {statusData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="text-muted-foreground text-sm">Sem dados</div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-3 bg-muted/30 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Alertas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[200px]">
              {alerts.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum alerta recente.
                </div>
              ) : (
                <div className="flex flex-col divide-y">
                  {alerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 text-sm hover:bg-muted/50 transition-colors flex flex-col gap-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium line-clamp-1 flex-1">{alert.message}</span>
                        {alert.severity === 'high' && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                            ALTO
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono-num">
                          {alert.expand?.vehicle_id?.plate || 'Desconhecido'}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(alert.created), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
