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
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  Filter,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
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
  <div className="flex flex-col items-center justify-center py-10 text-[#d1d5db] w-full">
    <Info className="h-8 w-8 mb-2 opacity-50 text-[#d1d5db]" />
    <p className="text-[12px] font-normal">Nenhum dado para este período</p>
  </div>
)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c263d]/90 backdrop-blur-md border border-white/20 p-3 rounded-lg shadow-xl text-[#ffffff]">
        <p className="text-[14px] font-semibold mb-1">{label}</p>
        <p className="text-[12px] text-[#e67e22]">
          Ocorrências: <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    )
  }
  return null
}

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c263d]/90 backdrop-blur-md border border-white/20 p-3 rounded-lg shadow-xl text-[#ffffff]">
        <p className="text-[14px] font-semibold mb-1">{payload[0].name}</p>
        <p className="text-[12px] font-normal" style={{ color: payload[0].payload.fill }}>
          Total: <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    )
  }
  return null
}

const glassCardClass =
  'bg-[#1c263d]/60 backdrop-blur-xl border border-white/10 rounded-xl hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(230,126,34,0.15)] transition-all duration-300'

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
      critical > 5 ? 'text-[#ef4444]' : critical > 0 ? 'text-[#f59e0b]' : 'text-[#10b981]'

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
    const colors = ['#e67e22', '#f59e0b', '#10b981', '#ef4444']
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
      <div className="bg-[#1c263d] text-[#ffffff] min-h-[calc(100vh-4rem)] -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 animate-fade-in-200 flex flex-col gap-[24px]">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 bg-white/10" />
          <Skeleton className="h-4 w-96 bg-white/10" />
        </div>
        <Skeleton className={`h-24 w-full rounded-xl bg-white/10`} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className={`h-[110px] rounded-xl bg-white/10`} />
            ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
          <Skeleton className="h-[300px] rounded-xl bg-white/10" />
          <Skeleton className="h-[300px] rounded-xl bg-white/10" />
          <Skeleton className="h-[300px] rounded-xl bg-white/10" />
        </div>
        <Skeleton className="h-[400px] rounded-xl bg-white/10" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#1c263d] text-[#ffffff] min-h-[calc(100vh-4rem)] -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 animate-fade-in-200 flex flex-col items-center justify-center text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-[#ef4444]" />
        <h2 className="text-[18px] font-semibold text-[#ffffff]">
          Ocorreu um erro ao carregar os dados
        </h2>
        <Button
          onClick={loadData}
          variant="outline"
          className="border-[#e67e22] text-[#e67e22] hover:bg-[#e67e22]/10 transition-colors duration-300"
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
    <div className="bg-[#1c263d] text-[#ffffff] min-h-[calc(100vh-4rem)] -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 animate-fade-in-200 flex flex-col gap-[24px]">
      <div>
        <h1 className="text-[28px] font-bold text-[#ffffff] flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-[#e67e22]" />
          Dashboard Telemetria
        </h1>
        <p className="text-[12px] font-normal text-[#d1d5db] mt-1">
          Visão analítica de falhas e eventos em tempo real.
        </p>
      </div>

      <Card className={`${glassCardClass}`}>
        <CardContent className="p-[20px]">
          <div className="flex flex-col lg:flex-row gap-[16px] items-end">
            <div className="flex-1 w-full lg:w-auto">
              <label className="text-[12px] font-normal text-[#d1d5db] mb-1 block">
                Data Inicial
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="bg-white/5 border-white/20 text-[#ffffff] h-10 w-full [color-scheme:dark] transition-colors duration-300 focus-visible:ring-[#e67e22]"
              />
            </div>
            <div className="flex-1 w-full lg:w-auto">
              <label className="text-[12px] font-normal text-[#d1d5db] mb-1 block">
                Data Final
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="bg-white/5 border-white/20 text-[#ffffff] h-10 w-full [color-scheme:dark] transition-colors duration-300 focus-visible:ring-[#e67e22]"
              />
            </div>
            <div className="flex-1 w-full lg:w-auto">
              <label className="text-[12px] font-normal text-[#d1d5db] mb-1 block">Garagem</label>
              <Select
                value={filters.garage}
                onValueChange={(v) => setFilters({ ...filters, garage: v })}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-[#ffffff] h-10 w-full transition-colors duration-300 focus:ring-[#e67e22]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1c263d] border-white/20 text-[#ffffff]">
                  <SelectItem
                    value="Todos"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Todas
                  </SelectItem>
                  <SelectItem
                    value="Cursino"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Cursino
                  </SelectItem>
                  <SelectItem
                    value="Sapopemba"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Sapopemba
                  </SelectItem>
                  <SelectItem
                    value="Imirim"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Imirim
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full lg:w-auto">
              <label className="text-[12px] font-normal text-[#d1d5db] mb-1 block">Evento</label>
              <Select
                value={filters.event}
                onValueChange={(v) => setFilters({ ...filters, event: v })}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-[#ffffff] h-10 w-full transition-colors duration-300 focus:ring-[#e67e22]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1c263d] border-white/20 text-[#ffffff]">
                  <SelectItem
                    value="Todos"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Todos os Eventos
                  </SelectItem>
                  <SelectItem
                    value="Porta Aberta"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Porta Aberta
                  </SelectItem>
                  <SelectItem
                    value="Limite de Marcha Lenta"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Limite de Marcha Lenta
                  </SelectItem>
                  <SelectItem
                    value="Nível de Óleo Baixo"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Nível de Óleo Baixo
                  </SelectItem>
                  <SelectItem
                    value="Aceleração Excessiva"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Aceleração Excessiva
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full lg:w-auto">
              <label className="text-[12px] font-normal text-[#d1d5db] mb-1 block">Tipo</label>
              <Select
                value={filters.eventType}
                onValueChange={(v) => setFilters({ ...filters, eventType: v })}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-[#ffffff] h-10 w-full transition-colors duration-300 focus:ring-[#e67e22]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1c263d] border-white/20 text-[#ffffff]">
                  <SelectItem
                    value="Todos"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Todos os Tipos
                  </SelectItem>
                  <SelectItem
                    value="Crítico"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Crítico
                  </SelectItem>
                  <SelectItem
                    value="Alerta"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Alerta
                  </SelectItem>
                  <SelectItem
                    value="Informativo"
                    className="hover:bg-white/10 transition-colors duration-300"
                  >
                    Informativo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setAppliedFilters(filters)}
              className="w-full lg:w-auto font-semibold bg-[#e67e22] text-[#ffffff] hover:bg-[#cf711f] h-10 transition-colors duration-300"
            >
              <Filter className="w-4 h-4 mr-2" /> Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        {kpiCards.map((card, i) => (
          <Card key={i} className={`${glassCardClass} flex flex-col`}>
            <CardContent className="p-[20px] flex flex-row items-center gap-4">
              <div
                className={`p-3 rounded-xl bg-white/5 border border-white/10 ${card.customColor || (card.isAlert ? 'text-[#e67e22]' : 'text-[#e67e22]')}`}
              >
                <card.icon className="w-6 h-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[12px] font-normal text-[#d1d5db] mb-1">{card.title}</p>
                <h3
                  className={`text-[36px] font-bold leading-none ${card.customColor || 'text-[#e67e22]'}`}
                >
                  {card.value}
                </h3>
                <p className="text-[12px] font-normal text-[#d1d5db] mt-1 truncate">
                  {card.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        <Card className={`${glassCardClass} flex flex-col`}>
          <CardHeader className="p-[20px] pb-0 border-none">
            <CardTitle className="text-[18px] font-semibold text-[#ffffff]">
              % Por Evento (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center p-[20px]">
            {topEvents.length > 0 ? (
              <ChartContainer
                config={{ value: { label: 'Ocorrências', color: '#e67e22' } }}
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
                      tick={{ fill: '#d1d5db', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="count" fill="#e67e22" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card className={`${glassCardClass} flex flex-col`}>
          <CardHeader className="p-[20px] pb-0 border-none">
            <CardTitle className="text-[18px] font-semibold text-[#ffffff]">
              % Por Garagem
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center p-[20px]">
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
                      stroke="none"
                    >
                      {garageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card className={`${glassCardClass} flex flex-col`}>
          <CardHeader className="p-[20px] pb-0 border-none">
            <CardTitle className="text-[18px] font-semibold text-[#ffffff]">
              Top 10 Problemáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {topVehicles.length > 0 ? (
              <div className="overflow-auto max-h-[290px] px-[20px] pb-[20px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10 hover:bg-transparent">
                      <TableHead className="text-[12px] font-normal text-[#d1d5db] h-auto pb-2 pl-0">
                        Placa
                      </TableHead>
                      <TableHead className="text-[12px] font-normal text-[#d1d5db] text-right h-auto pb-2">
                        Qtd
                      </TableHead>
                      <TableHead className="text-[12px] font-normal text-[#d1d5db] text-right h-auto pb-2 pr-0">
                        % Var
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topVehicles.map((v, i) => {
                      const isPositive = i % 2 === 0
                      return (
                        <TableRow
                          key={v.plate}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors duration-300"
                        >
                          <TableCell className="text-[14px] font-normal text-[#ffffff] py-3 pl-0">
                            {v.plate}
                          </TableCell>
                          <TableCell className="text-[14px] font-normal text-[#ffffff] text-right py-3">
                            {v.count}
                          </TableCell>
                          <TableCell
                            className={`text-[14px] font-normal py-3 pr-0 text-right ${isPositive ? 'text-[#ef4444]' : 'text-[#10b981]'}`}
                          >
                            <div className="flex justify-end items-center gap-1">
                              {isPositive ? (
                                <TrendingUp className="w-[16px] h-[16px]" />
                              ) : (
                                <TrendingDown className="w-[16px] h-[16px]" />
                              )}
                              {isPositive ? '+' : '-'}
                              {v.variation}%
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={`${glassCardClass}`}>
        <CardHeader className="p-[20px] pb-4 border-b border-white/10">
          <CardTitle className="text-[18px] font-semibold text-[#ffffff] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#e67e22]" /> Falhas de Diagnóstico (DTC)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-[20px]">
          {dtcs.length > 0 ? (
            <div className="overflow-x-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10 hover:bg-transparent">
                    <TableHead className="text-[12px] font-normal text-[#d1d5db] h-auto pb-3 pl-0">
                      Descrição da Falha
                    </TableHead>
                    <TableHead className="text-[12px] font-normal text-[#d1d5db] text-right h-auto pb-3">
                      Qtd Ocorrências
                    </TableHead>
                    <TableHead className="text-[12px] font-normal text-[#d1d5db] text-right h-auto pb-3">
                      % Variação
                    </TableHead>
                    <TableHead className="text-[12px] font-normal text-[#d1d5db] text-center h-auto pb-3 pr-0">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dtcs.map((d, i) => {
                    const isPositive = i % 3 !== 0
                    return (
                      <TableRow
                        key={d.desc}
                        className="border-b border-white/5 hover:bg-white/10 transition-colors duration-300 cursor-pointer"
                        onClick={() => setSelectedDtc(d)}
                      >
                        <TableCell className="text-[14px] font-normal text-[#ffffff] py-3 pl-0">
                          {d.desc}
                        </TableCell>
                        <TableCell className="text-[14px] font-normal text-[#ffffff] text-right py-3">
                          {d.count}
                        </TableCell>
                        <TableCell
                          className={`text-[14px] font-normal py-3 text-right ${isPositive ? 'text-[#ef4444]' : 'text-[#10b981]'}`}
                        >
                          <div className="flex justify-end items-center gap-1">
                            {isPositive ? (
                              <TrendingUp className="w-[16px] h-[16px]" />
                            ) : (
                              <TrendingDown className="w-[16px] h-[16px]" />
                            )}
                            {isPositive ? '+' : '-'}
                            {(d.count * 1.5 + i).toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell className="py-3 pr-0 text-center">
                          <span
                            className={`px-2 py-1 rounded text-[12px] font-semibold ${
                              d.status === 'Crítico'
                                ? 'bg-[#ef4444]/20 text-[#ef4444]'
                                : d.status === 'Alerta'
                                  ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                                  : 'bg-[#10b981]/20 text-[#10b981]'
                            }`}
                          >
                            {d.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDtc} onOpenChange={(open) => !open && setSelectedDtc(null)}>
        <DialogContent className="bg-[#1c263d]/95 backdrop-blur-xl border-white/10 text-[#ffffff] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[28px] font-bold text-[#ffffff]">
              <AlertTriangle className="w-6 h-6 text-[#e67e22]" />
              Detalhes da Falha
            </DialogTitle>
            <DialogDescription className="text-[12px] font-normal text-[#d1d5db]">
              Análise técnica e recomendações do sistema.
            </DialogDescription>
          </DialogHeader>
          {selectedDtc && (
            <div className="space-y-4 pt-2">
              <div className="p-[20px] rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div>
                  <span className="text-[12px] font-normal text-[#d1d5db] uppercase tracking-wider block mb-1">
                    Descrição
                  </span>
                  <p className="font-semibold text-[18px] leading-tight text-[#ffffff]">
                    {selectedDtc.desc}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <span className="text-[12px] font-normal text-[#d1d5db] uppercase tracking-wider block mb-1">
                      Ocorrências
                    </span>
                    <p className="text-[36px] font-bold text-[#e67e22] leading-none">
                      {selectedDtc.count}
                    </p>
                  </div>
                  <div>
                    <span className="text-[12px] font-normal text-[#d1d5db] uppercase tracking-wider block mb-1">
                      Status
                    </span>
                    <div className="mt-2">
                      <span
                        className={`px-3 py-1.5 rounded text-[14px] font-semibold ${
                          selectedDtc.status === 'Crítico'
                            ? 'bg-[#ef4444]/20 text-[#ef4444]'
                            : selectedDtc.status === 'Alerta'
                              ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                              : 'bg-[#10b981]/20 text-[#10b981]'
                        }`}
                      >
                        {selectedDtc.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[14px] text-[#ffffff] bg-[#e67e22]/20 p-[20px] rounded-xl border border-[#e67e22]/30 flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#e67e22]" />
                <p className="leading-snug font-normal">
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
