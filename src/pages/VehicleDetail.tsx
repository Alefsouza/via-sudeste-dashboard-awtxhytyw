import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getVehicle, getVehicleTelemetry, getVehicleAlerts } from '@/services/vehicles'
import useRealtime from '@/hooks/use-realtime'
import { RecordModel } from 'pocketbase'
import { ArrowLeft, Loader2, Gauge, Thermometer, Battery, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<RecordModel | null>(null)
  const [telemetry, setTelemetry] = useState<RecordModel[]>([])
  const [alerts, setAlerts] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!id) return
    try {
      const [vRes, tRes, aRes] = await Promise.all([
        getVehicle(id),
        getVehicleTelemetry(id, 20),
        getVehicleAlerts(id),
      ])
      setVehicle(vRes)
      // Reverse telemetry for chronological charting left-to-right
      setTelemetry(tRes.items.reverse())
      setAlerts(aRes)
    } catch {
      /* intentionally ignored */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])
  useRealtime('vehicles', (e) => {
    if (e.record.id === id) loadData()
  })
  useRealtime('telemetry_logs', () => {
    loadData()
  })
  useRealtime('alerts', () => {
    loadData()
  })

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!vehicle) {
    return <div className="text-center mt-20">Veículo não encontrado.</div>
  }

  const latestTelemetry = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null
  const currentSpeed = latestTelemetry?.speed || 0
  const currentFuel = latestTelemetry?.fuel_level || 0
  const currentTemp = latestTelemetry?.engine_temp || 0
  const currentRpm = latestTelemetry?.rpm || 0

  const chartData = telemetry.map((t) => ({
    time: format(new Date(t.created), 'HH:mm:ss'),
    speed: t.speed,
    rpm: t.rpm,
    temp: t.engine_temp,
  }))

  const rpmChartConfig = { rpm: { label: 'RPM', color: 'hsl(var(--chart-4))' } }
  const speedChartConfig = { speed: { label: 'Velocidade (km/h)', color: 'hsl(var(--chart-1))' } }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/frota')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono-num flex items-center gap-3">
            {vehicle.plate}
            {vehicle.status === 'moving' && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                Em Trânsito
              </Badge>
            )}
            {vehicle.status === 'idle' && (
              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Ocioso</Badge>
            )}
            {vehicle.status === 'maintenance' && (
              <Badge
                variant="destructive"
                className="bg-destructive/10 text-destructive border-destructive/20"
              >
                Manutenção
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">{vehicle.model || 'Modelo não especificado'}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Speedometer card */}
        <Card className="bg-gradient-to-br from-card to-card/50 shadow-elevation animate-fade-in-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex justify-between">
              Velocidade Atual <Gauge className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4">
            <div className="relative flex items-center justify-center h-24 w-48 overflow-hidden">
              {/* Pure CSS half-circle gauge trick */}
              <div className="absolute top-0 w-48 h-48 rounded-full border-[12px] border-muted" />
              <div
                className="absolute top-0 w-48 h-48 rounded-full border-[12px] border-primary border-b-transparent border-r-transparent origin-center transition-transform duration-1000 ease-out"
                style={{ transform: `rotate(${(currentSpeed / 160) * 180 - 45}deg)` }}
              />
              <div className="absolute bottom-0 text-3xl font-bold font-mono-num tracking-tighter">
                {currentSpeed}{' '}
                <span className="text-sm font-normal text-muted-foreground">km/h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fuel level card */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex justify-between">
              Nível de Combustível <Battery className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono-num mb-4">{currentFuel}%</div>
            <Progress
              value={currentFuel}
              className="h-2"
              indicatorClassName={currentFuel < 20 ? 'bg-destructive' : 'bg-emerald-500'}
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {currentFuel < 20 ? 'Abastecimento necessário' : 'Nível normal'}
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex justify-between">
              Temperatura Motor <Thermometer className="h-4 w-4 text-destructive" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono-num mb-2">
              {currentTemp} <span className="text-lg">°C</span>
            </div>
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-emerald-500 to-destructive rounded-full relative">
              <div
                className="absolute h-3 w-1 bg-foreground -top-0.5 rounded-full transition-all duration-500"
                style={{ left: `${Math.min(100, Math.max(0, (currentTemp / 120) * 100))}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex justify-between">
              Giro do Motor (RPM) <Activity className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono-num">{currentRpm}</div>
            <p className="text-xs text-muted-foreground mt-1">Rotações por minuto</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="animate-fade-in shadow-elevation border-slate-800">
          <CardHeader>
            <CardTitle>Velocidade Recente</CardTitle>
            <CardDescription>Últimas marcações de telemetria</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={speedChartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    minTickGap={30}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="speed"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSpeed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="animate-fade-in shadow-elevation border-slate-800">
          <CardHeader>
            <CardTitle>Histórico de RPM</CardTitle>
            <CardDescription>Esforço do motor no mesmo período</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={rpmChartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    minTickGap={30}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="rpm"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>Histórico de Alertas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum alerta registrado para este veículo.
            </div>
          ) : (
            <div className="divide-y border-t">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{a.message}</span>
                      {a.severity === 'high' && <Badge variant="destructive">Alta</Badge>}
                      {a.severity === 'medium' && (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">
                          Média
                        </Badge>
                      )}
                      {a.severity === 'low' && <Badge variant="outline">Baixa</Badge>}
                    </div>
                    <span className="text-sm text-muted-foreground font-mono-num">
                      {format(new Date(a.created), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  <div>
                    {a.resolved ? (
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                        Resolvido
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted">
                        Pendente
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
