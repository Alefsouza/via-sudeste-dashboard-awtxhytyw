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
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { AlertTriangle, Info, Activity, Truck, Users, LayoutDashboard } from 'lucide-react'

import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-10 text-[#d1d5db] w-full">
    <img
      src="https://img.usecurling.com/p/120/120?q=empty%20box&color=blue"
      alt="Empty"
      className="w-24 h-24 mb-4 opacity-70"
    />
    <p className="text-[14px] font-normal">Nenhum dado para este período. Tente outro filtro.</p>
  </div>
)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c263d]/90 backdrop-blur-md border border-white/20 p-3 rounded-lg shadow-xl text-[#ffffff]">
        <p className="text-[14px] font-semibold mb-1">{label}</p>
        <p className="text-[12px] text-[#e67e22]">
          Valor: <span className="font-bold">{payload[0].value}</span>
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

const getMonday = (d: Date) => {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(copy.setDate(diff))
}

export default function Index() {
  const initialMonday = getMonday(new Date())
  const initialSunday = new Date(initialMonday)
  initialSunday.setDate(initialMonday.getDate() + 6)

  const [filters, setFilters] = useState({
    startDate: initialMonday.toISOString().split('T')[0],
    endDate: initialSunday.toISOString().split('T')[0],
    garage: 'Todos',
  })

  const [debouncedFilters, setDebouncedFilters] = useState(filters)

  const [vehicles, setVehicles] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [telemetry, setTelemetry] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedDtc, setSelectedDtc] = useState<any>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters)
    }, 300)
    return () => clearTimeout(handler)
  }, [filters])

  const fetchData = async (currentFilters: any) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { startDate, endDate } = currentFilters

      const startStr = startDate ? `${startDate} 00:00:00` : ''
      const endStr = endDate ? `${endDate} 23:59:59` : ''

      let dateFilter = ''
      if (startStr && endStr) {
        dateFilter = `created >= "${startStr}" && created <= "${endStr}"`
      }

      const alertsFilter = dateFilter ? `resolved = false && ${dateFilter}` : `resolved = false`

      const [v, a, d, t] = await Promise.all([
        pb.collection('vehicles').getFullList({ sort: '-updated' }),
        pb
          .collection('alerts')
          .getFullList({ filter: alertsFilter, expand: 'vehicle_id', sort: '-created' }),
        pb.collection('drivers').getFullList(),
        pb
          .collection('telemetry_logs')
          .getList(1, 500, { filter: dateFilter, sort: '-created', expand: 'vehicle_id' }),
      ])

      setVehicles(v)
      setAlerts(a)
      setDrivers(d)
      setTelemetry(t.items)
    } catch (err: any) {
      console.error(err)
      setErrorMsg('Erro ao buscar dados do servidor. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(debouncedFilters)
  }, [debouncedFilters])

  useRealtime('vehicles', () => fetchData(debouncedFilters))
  useRealtime('alerts', () => fetchData(debouncedFilters))
  useRealtime('drivers', () => fetchData(debouncedFilters))
  useRealtime('telemetry_logs', () => fetchData(debouncedFilters))

  const options = useMemo(() => {
    const garages = Array.from(
      new Set(vehicles.map((v: any) => v.garage).filter(Boolean)),
    ) as string[]
    return { garages: garages.sort() }
  }, [vehicles])

  const filteredVehicles = useMemo(() => {
    if (debouncedFilters.garage === 'Todos') return vehicles
    return vehicles.filter((v: any) => v.garage === debouncedFilters.garage)
  }, [vehicles, debouncedFilters.garage])

  const filteredAlerts = useMemo(() => {
    if (debouncedFilters.garage === 'Todos') return alerts
    return alerts.filter((a: any) => a.expand?.vehicle_id?.garage === debouncedFilters.garage)
  }, [alerts, debouncedFilters.garage])

  const filteredTelemetry = useMemo(() => {
    if (debouncedFilters.garage === 'Todos') return telemetry
    return telemetry.filter((t: any) => t.expand?.vehicle_id?.garage === debouncedFilters.garage)
  }, [telemetry, debouncedFilters.garage])

  const kpis = useMemo(() => {
    let fleetStatus = 'Normal'
    let fleetStatusColor = 'text-[#10b981]'
    if (filteredAlerts.length > filteredVehicles.length * 0.5) {
      fleetStatus = 'Crítico'
      fleetStatusColor = 'text-[#ef4444]'
    } else if (filteredAlerts.length > 0) {
      fleetStatus = 'Atenção'
      fleetStatusColor = 'text-[#f59e0b]'
    }

    const garageCounts: Record<string, number> = {}
    filteredVehicles.forEach((v: any) => {
      const g = v.garage || 'Desconhecida'
      garageCounts[g] = (garageCounts[g] || 0) + 1
    })
    const sortedGarages = Object.entries(garageCounts).sort((a, b) => b[1] - a[1])
    const garagePercents =
      sortedGarages
        .slice(0, 3)
        .map(
          ([k, v]) => `${k.substring(0, 3)}: ${Math.round((v / filteredVehicles.length) * 100)}%`,
        )
        .join(' | ') || 'Nenhum'

    return {
      carros: filteredVehicles.length,
      motoristas: drivers.length,
      eventos: filteredAlerts.length,
      variacao: '-',
      frotaStatus: fleetStatus,
      frotaColor: fleetStatusColor,
      garageSummary: garagePercents,
    }
  }, [filteredVehicles, drivers, filteredAlerts])

  const telemetryData = useMemo(() => {
    const stats: Record<string, { speedSum: number; count: number; plate: string }> = {}
    filteredTelemetry.forEach((log: any) => {
      const vid = log.vehicle_id
      if (!stats[vid]) {
        stats[vid] = {
          speedSum: 0,
          count: 0,
          plate: log.expand?.vehicle_id?.plate || 'Desconhecido',
        }
      }
      stats[vid].speedSum += log.speed || 0
      stats[vid].count += 1
    })
    return Object.values(stats)
      .map((s) => ({ name: s.plate, count: Math.round(s.speedSum / s.count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredTelemetry])

  const garageData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredVehicles.forEach((v: any) => {
      const g = v.garage || 'Desconhecida'
      counts[g] = (counts[g] || 0) + 1
    })
    const colors = ['#e67e22', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6']
    return Object.entries(counts)
      .map(([name, value], i) => ({
        name,
        value,
        fill: colors[i % colors.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredVehicles])

  const topVehicles = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredAlerts.forEach((a: any) => {
      const vid = a.vehicle_id
      counts[vid] = (counts[vid] || 0) + 1
    })
    return Object.entries(counts)
      .map(([vid, count]) => {
        const v = filteredVehicles.find((v: any) => v.id === vid)
        return {
          plate: v?.plate || 'Desconhecido',
          count,
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [filteredAlerts, filteredVehicles])

  const dtcs = useMemo(() => {
    return filteredAlerts.map((a: any) => {
      let status = 'Informativo'
      if (a.severity === 'high') status = 'Crítico'
      else if (a.severity === 'medium') status = 'Alerta'

      return {
        id: a.id,
        desc: a.message || a.event_name || a.type || 'Desconhecido',
        plate: a.expand?.vehicle_id?.plate || 'Desconhecido',
        severity: a.severity || 'low',
        date: new Date(a.created).toLocaleString(),
        status,
      }
    })
  }, [filteredAlerts])

  if (loading && vehicles.length === 0) {
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

  if (errorMsg && vehicles.length === 0) {
    return (
      <div className="bg-[#1c263d] text-[#ffffff] min-h-[calc(100vh-4rem)] -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 animate-fade-in-200 flex flex-col items-center justify-center text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-[#ef4444]" />
        <h2 className="text-[18px] font-semibold text-[#ffffff]">{errorMsg}</h2>
        <Button
          onClick={() => fetchData(debouncedFilters)}
          variant="outline"
          className="border-[#e67e22] text-[#e67e22] hover:bg-[#e67e22]/10 transition-colors duration-300"
        >
          Tentar Novamente
        </Button>
      </div>
    )
  }

  const kpiCards = [
    {
      title: 'Qtd Carros',
      value: kpis.carros,
      icon: Truck,
      subtitle: 'Frota conectada (filtrada)',
    },
    {
      title: 'Qtd Motoristas',
      value: kpis.motoristas,
      icon: Users,
      subtitle: 'Total de motoristas',
    },
    {
      title: 'Alertas Ativos',
      value: kpis.eventos,
      icon: AlertTriangle,
      subtitle: 'Não resolvidos no período',
    },
    {
      title: '% Variação',
      value: kpis.variacao,
      icon: Info,
      subtitle: 'Vs. período anterior',
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
    <div
      className={`bg-[#1c263d] text-[#ffffff] min-h-[calc(100vh-4rem)] -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 animate-fade-in-200 flex flex-col gap-[24px] transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
    >
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
                  {options.garages.map((g) => (
                    <SelectItem
                      key={g}
                      value={g}
                      className="hover:bg-white/10 transition-colors duration-300"
                    >
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        {kpiCards.map((card, i) => (
          <Card key={i} className={`${glassCardClass} flex flex-col`}>
            <CardContent className="p-[20px] flex flex-row items-center gap-4">
              <div
                className={`p-3 rounded-xl bg-white/5 border border-white/10 ${card.customColor || 'text-[#e67e22]'}`}
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
              Velocidade Média (km/h) - Top 5
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center p-[20px]">
            {telemetryData.length > 0 ? (
              <ChartContainer
                config={{ value: { label: 'Velocidade', color: '#e67e22' } }}
                className="h-[250px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={telemetryData}
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
                    {topVehicles.map((v, i) => (
                      <TableRow
                        key={v.plate + i}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors duration-300"
                      >
                        <TableCell className="text-[14px] font-normal text-[#ffffff] py-3 pl-0">
                          {v.plate}
                        </TableCell>
                        <TableCell className="text-[14px] font-normal text-[#ffffff] text-right py-3">
                          {v.count}
                        </TableCell>
                        <TableCell
                          className={`text-[14px] font-normal py-3 pr-0 text-right text-[#d1d5db]`}
                        >
                          -
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

      <Card className={`${glassCardClass}`}>
        <CardHeader className="p-[20px] pb-4 border-b border-white/10">
          <CardTitle className="text-[18px] font-semibold text-[#ffffff] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#e67e22]" /> Alertas Ativos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-[20px]">
          {dtcs.length > 0 ? (
            <div className="overflow-x-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10 hover:bg-transparent">
                    <TableHead className="text-[12px] font-normal text-[#d1d5db] h-auto pb-3 pl-0">
                      Veículo
                    </TableHead>
                    <TableHead className="text-[12px] font-normal text-[#d1d5db] h-auto pb-3">
                      Descrição da Falha
                    </TableHead>
                    <TableHead className="text-[12px] font-normal text-[#d1d5db] text-right h-auto pb-3">
                      Data
                    </TableHead>
                    <TableHead className="text-[12px] font-normal text-[#d1d5db] text-center h-auto pb-3 pr-0">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dtcs.map((d) => (
                    <TableRow
                      key={d.id}
                      className="border-b border-white/5 hover:bg-white/10 transition-colors duration-300 cursor-pointer"
                      onClick={() => setSelectedDtc(d)}
                    >
                      <TableCell className="text-[14px] font-bold text-[#ffffff] py-3 pl-0">
                        {d.plate}
                      </TableCell>
                      <TableCell className="text-[14px] font-normal text-[#ffffff] py-3">
                        {d.desc}
                      </TableCell>
                      <TableCell className="text-[14px] font-normal text-[#d1d5db] text-right py-3">
                        {d.date}
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
        <DialogContent className="bg-[#1c263d]/95 backdrop-blur-xl border-white/10 text-[#ffffff] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[28px] font-bold text-[#ffffff]">
              <AlertTriangle className="w-6 h-6 text-[#e67e22]" />
              Detalhes da Falha
            </DialogTitle>
            <DialogDescription className="text-[12px] font-normal text-[#d1d5db]">
              Análise técnica do alerta reportado.
            </DialogDescription>
          </DialogHeader>
          {selectedDtc && (
            <div className="space-y-4 pt-2">
              <div className="p-[20px] rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div>
                  <span className="text-[12px] font-normal text-[#d1d5db] uppercase tracking-wider block mb-1">
                    Veículo
                  </span>
                  <p className="font-semibold text-[18px] leading-tight text-[#ffffff]">
                    {selectedDtc.plate}
                  </p>
                </div>
                <div>
                  <span className="text-[12px] font-normal text-[#d1d5db] uppercase tracking-wider block mb-1">
                    Descrição
                  </span>
                  <p className="font-semibold text-[16px] leading-tight text-[#ffffff]">
                    {selectedDtc.desc}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <span className="text-[12px] font-normal text-[#d1d5db] uppercase tracking-wider block mb-1">
                      Data do Alerta
                    </span>
                    <p className="text-[14px] font-bold text-[#d1d5db] leading-none">
                      {selectedDtc.date}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
