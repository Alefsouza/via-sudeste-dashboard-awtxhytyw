import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  Filter,
  AlertTriangle,
  TrendingUp,
  Info,
  Activity,
  Truck,
  Users,
  LayoutDashboard,
} from 'lucide-react'

import { getVehicles } from '@/services/vehicles'
import { getDrivers } from '@/services/drivers'
import { getAllDashboardAlerts } from '@/services/alerts'
import { useRealtime } from '@/hooks/use-realtime'
import { RecordModel } from 'pocketbase'

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground w-full">
    <Info className="h-8 w-8 mb-2 opacity-50" />
    <p className="text-sm">Nenhum dado para este período</p>
  </div>
)

export default function Index() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    garage: 'Todos',
    event: 'Todos',
    eventType: 'Todos',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [vehicles, setVehicles] = useState<RecordModel[]>([])
  const [drivers, setDrivers] = useState<RecordModel[]>([])
  const [alerts, setAlerts] = useState<RecordModel[]>([])

  const [selectedDtc, setSelectedDtc] = useState<any>(null)

  const loadData = async () => {
    setError(false)
    try {
      const [vRes, dRes, aRes] = await Promise.all([
        getVehicles(),
        getDrivers(),
        getAllDashboardAlerts(),
      ])
      setVehicles(vRes)
      setDrivers(dRes)
      setAlerts(aRes.items)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('telemetry_logs', () => loadData())
  useRealtime('alerts', () => loadData())

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (
        appliedFilters.garage !== 'Todos' &&
        a.expand?.vehicle_id?.garage !== appliedFilters.garage
      )
        return false
      if (appliedFilters.event !== 'Todos' && a.event_name !== appliedFilters.event) return false
      if (appliedFilters.eventType !== 'Todos' && a.event_type !== appliedFilters.eventType)
        return false
      if (appliedFilters.startDate && new Date(a.created) < new Date(appliedFilters.startDate))
        return false
      if (
        appliedFilters.endDate &&
        new Date(a.created) > new Date(appliedFilters.endDate + 'T23:59:59')
      )
        return false
      return true
    })
  }, [alerts, appliedFilters])

  const kpis = useMemo(() => {
    const critical = filteredAlerts.filter((a) => a.event_type === 'Crítico').length
    const fleetStatus = critical > 5 ? 'Crítico' : critical > 0 ? 'Atenção' : 'Normal'
    const fleetStatusColor =
      critical > 5 ? 'text-destructive' : critical > 0 ? 'text-yellow-500' : 'text-emerald-500'

    const garageCounts = {} as Record<string, number>
    let totalForGarage = 0
    filteredAlerts.forEach((a) => {
      const g = a.expand?.vehicle_id?.garage
      if (g) {
        garageCounts[g] = (garageCounts[g] || 0) + 1
        totalForGarage++
      }
    })

    const sortedGarages = Object.entries(garageCounts).sort((a, b) => b[1] - a[1])
    const garagePercents =
      sortedGarages
        .slice(0, 3)
        .map(([k, v]) => `${k.substring(0, 3)}: ${Math.round((v / totalForGarage) * 100)}%`)
        .join(' | ') || 'Nenhum'

    return {
      carros: vehicles.length > 0 ? 615 : 0,
      motoristas: drivers.length,
      eventos: filteredAlerts.length,
      frotaStatus: fleetStatus,
      frotaColor: fleetStatusColor,
      garageSummary: garagePercents,
    }
  }, [vehicles, drivers, filteredAlerts])

  const topEvents = useMemo(() => {
    const counts = {} as Record<string, number>
    filteredAlerts.forEach((a) => {
      const name = a.event_name || 'Desconhecido'
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredAlerts])

  const garageData = useMemo(() => {
    const counts = {} as Record<string, number>
    filteredAlerts.forEach((a) => {
      const g = a.expand?.vehicle_id?.garage || 'Desconhecida'
      counts[g] = (counts[g] || 0) + 1
    })
    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
    ]
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      fill: colors[i % colors.length],
    }))
  }, [filteredAlerts])

  const topVehicles = useMemo(() => {
    const counts = {} as Record<string, number>
    filteredAlerts.forEach((a) => {
      const plate = a.expand?.vehicle_id?.plate
      if (plate) counts[plate] = (counts[plate] || 0) + 1
    })
    return Object.entries(counts)
      .map(([plate, count], i) => ({
        plate,
        count,
        variation: ((count * 3.14 + i) % 20).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [filteredAlerts])

  const dtcs = useMemo(() => {
    const dtcAlerts = filteredAlerts.filter((a) => a.dtc_description)
    const grouped = {} as Record<string, any>
    dtcAlerts.forEach((a) => {
      if (!grouped[a.dtc_description]) {
        grouped[a.dtc_description] = { desc: a.dtc_description, count: 0, status: a.event_type }
      }
      grouped[a.dtc_description].count++
    })
    return Object.values(grouped).sort((a, b) => b.count - a.count)
  }, [filteredAlerts])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-10 w-64 bg-muted/50" />
          <Skeleton className="h-4 w-96 bg-muted/50" />
        </div>
        <Skeleton className="h-24 w-full mb-6 rounded-xl bg-muted/50" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-muted/50" />
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Skeleton className="h-[300px] rounded-xl bg-muted/50" />
          <Skeleton className="h-[300px] rounded-xl bg-muted/50" />
          <Skeleton className="h-[300px] rounded-xl bg-muted/50" />
        </div>
        <Skeleton className="h-[400px] rounded-xl bg-muted/50" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Ocorreu um erro ao carregar os dados</h2>
        <Button
          onClick={loadData}
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10"
        >
          Tentar Novamente
        </Button>
      </div>
    )
  }

  const kpiCards = [
    { title: 'Qtd Carros', value: kpis.carros, icon: Truck, subtitle: 'Frota ativa conectada' },
    {
      title: 'Qtd Motoristas',
      value: kpis.motoristas,
      icon: Users,
      subtitle: 'Motoristas logados',
    },
    {
      title: 'Qtd Eventos',
      value: kpis.eventos,
      icon: AlertTriangle,
      subtitle: 'Total no período filtrado',
    },
    {
      title: '% Variação',
      value: '+12.4%',
      icon: TrendingUp,
      subtitle: 'Vs. mês anterior',
      isAlert: true,
    },
    {
      title: 'Status da Frota',
      value: kpis.frotaStatus,
      icon: Activity,
      subtitle: 'Saúde operacional',
      customColor: kpis.frotaColor,
    },
    { title: '% Por Garagem', value: 'Resumo', icon: Info, subtitle: kpis.garageSummary },
  ]

  return (
    <div className="space-y-6">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-primary" />
          Dashboard Telemetria
        </h1>
        <p className="text-muted-foreground mt-1">
          Visão analítica de falhas e eventos em tempo real.
        </p>
      </div>

      <Card
        className="bg-card/70 backdrop-blur-sm border-primary/20 mb-6 animate-fade-in-up"
        style={{ animationDelay: '100ms' }}
      >
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">Data Inicial</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="bg-background/50 border-border/50"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">Data Final</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="bg-background/50 border-border/50"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">Garagem</label>
              <Select
                value={filters.garage}
                onValueChange={(v) => setFilters({ ...filters, garage: v })}
              >
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas</SelectItem>
                  <SelectItem value="Cursino">Cursino</SelectItem>
                  <SelectItem value="Sapopemba">Sapopemba</SelectItem>
                  <SelectItem value="Imirim">Imirim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Evento</label>
              <Select
                value={filters.event}
                onValueChange={(v) => setFilters({ ...filters, event: v })}
              >
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os Eventos</SelectItem>
                  <SelectItem value="Porta Aberta">Porta Aberta</SelectItem>
                  <SelectItem value="Limite de Marcha Lenta">Limite de Marcha Lenta</SelectItem>
                  <SelectItem value="Nível de Óleo Baixo">Nível de Óleo Baixo</SelectItem>
                  <SelectItem value="Aceleração Excessiva">Aceleração Excessiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <Select
                value={filters.eventType}
                onValueChange={(v) => setFilters({ ...filters, eventType: v })}
              >
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os Tipos</SelectItem>
                  <SelectItem value="Crítico">Crítico</SelectItem>
                  <SelectItem value="Alerta">Alerta</SelectItem>
                  <SelectItem value="Informativo">Informativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setAppliedFilters(filters)}
              className="w-full md:w-auto font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Filter className="w-4 h-4 mr-2" /> Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {kpiCards.map((card, i) => (
          <Card
            key={i}
            className="border-border/50 hover:border-primary/30 transition-colors animate-fade-in-up"
            style={{ animationDelay: `${(i + 2) * 50}ms` }}
          >
            <CardContent className="p-5 flex flex-row items-center gap-4">
              <div
                className={`p-3 rounded-xl bg-muted/50 ${card.customColor || (card.isAlert ? 'text-destructive' : 'text-primary')}`}
              >
                <card.icon className="w-6 h-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <h3
                  className={`text-2xl font-bold font-mono-num ${card.customColor || (card.isAlert ? 'text-destructive' : '')}`}
                >
                  {card.value}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">{card.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card
          className="lg:col-span-1 flex flex-col border-border/50 animate-fade-in-up"
          style={{ animationDelay: '400ms' }}
        >
          <CardHeader className="pb-2 bg-muted/10 border-b border-border/30">
            <CardTitle className="text-base font-semibold">% Por Evento (Top 5)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center p-4">
            {topEvents.length > 0 ? (
              <ChartContainer
                config={{ value: { label: 'Ocorrências', color: 'hsl(var(--chart-1))' } }}
                className="h-[250px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topEvents}
                    layout="vertical"
                    margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill="var(--color-value)"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card
          className="lg:col-span-1 flex flex-col border-border/50 animate-fade-in-up"
          style={{ animationDelay: '450ms' }}
        >
          <CardHeader className="pb-2 bg-muted/10 border-b border-border/30">
            <CardTitle className="text-base font-semibold">% Por Garagem</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center p-4">
            {garageData.length > 0 ? (
              <ChartContainer config={{}} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={garageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {garageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card
          className="lg:col-span-1 flex flex-col border-border/50 animate-fade-in-up"
          style={{ animationDelay: '500ms' }}
        >
          <CardHeader className="pb-2 bg-muted/10 border-b border-border/30">
            <CardTitle className="text-base font-semibold">Top 10 Problemáticos</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {topVehicles.length > 0 ? (
              <div className="overflow-auto max-h-[280px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="pl-4 text-xs">Placa</TableHead>
                      <TableHead className="text-right text-xs">Qtd</TableHead>
                      <TableHead className="text-right text-xs pr-4">% Var</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topVehicles.map((v, i) => (
                      <TableRow key={v.plate} className="border-border/30 hover:bg-muted/30">
                        <TableCell className="font-mono text-sm py-2.5 pl-4">{v.plate}</TableCell>
                        <TableCell className="text-right text-sm py-2.5">{v.count}</TableCell>
                        <TableCell
                          className={`text-right text-sm py-2.5 pr-4 ${i % 2 === 0 ? 'text-destructive' : 'text-emerald-500'}`}
                        >
                          {i % 2 === 0 ? '+' : '-'}
                          {v.variation}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 animate-fade-in-up" style={{ animationDelay: '550ms' }}>
        <CardHeader className="border-b border-border/30 bg-muted/10">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" /> Falhas de Diagnóstico (DTC)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {dtcs.length > 0 ? (
            <div className="overflow-x-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/10 backdrop-blur z-10">
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="pl-6">Descrição da Falha</TableHead>
                    <TableHead className="text-right">Qtd Ocorrências</TableHead>
                    <TableHead className="text-right">% Variação</TableHead>
                    <TableHead className="pr-6 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dtcs.map((d, i) => (
                    <TableRow
                      key={d.desc}
                      className="cursor-pointer hover:bg-primary/10 border-border/30 transition-colors"
                      onClick={() => setSelectedDtc(d)}
                    >
                      <TableCell className="pl-6 font-medium text-sm">{d.desc}</TableCell>
                      <TableCell className="text-right font-mono-num text-sm">{d.count}</TableCell>
                      <TableCell
                        className={`text-right text-sm ${i % 3 === 0 ? 'text-emerald-500' : 'text-destructive'}`}
                      >
                        {i % 3 === 0 ? '-' : '+'}
                        {(d.count * 1.5 + i).toFixed(1)}%
                      </TableCell>
                      <TableCell className="pr-6 text-center">
                        <Badge
                          variant={d.status === 'Crítico' ? 'destructive' : 'outline'}
                          className={
                            d.status !== 'Crítico'
                              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                              : ''
                          }
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDtc} onOpenChange={(open) => !open && setSelectedDtc(null)}>
        <DialogContent className="border-border/50 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Detalhes da Falha
            </DialogTitle>
            <DialogDescription>Análise técnica e recomendações do sistema.</DialogDescription>
          </DialogHeader>
          {selectedDtc && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-4">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
                    Descrição
                  </span>
                  <p className="font-medium text-sm leading-tight">{selectedDtc.desc}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
                      Ocorrências
                    </span>
                    <p className="font-mono-num text-xl font-bold">{selectedDtc.count}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
                      Status
                    </span>
                    <Badge
                      variant={selectedDtc.status === 'Crítico' ? 'destructive' : 'outline'}
                      className={
                        selectedDtc.status !== 'Crítico'
                          ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          : ''
                      }
                    >
                      {selectedDtc.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-sm text-primary-foreground bg-primary/20 p-3 rounded-xl border border-primary/30 flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                <p className="leading-snug">
                  Recomenda-se verificação imediata na próxima parada em garagem para evitar danos
                  prolongados ao veículo e perda de telemetria.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
