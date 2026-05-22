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
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  Activity,
  Truck,
  Users,
  LayoutDashboard,
} from 'lucide-react'

import pb from '@/lib/pocketbase/client'

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
    event: 'Todos',
    eventType: 'Todos',
  })

  const [debouncedFilters, setDebouncedFilters] = useState(filters)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedDtc, setSelectedDtc] = useState<any>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters)
    }, 300)
    return () => clearTimeout(handler)
  }, [filters])

  useEffect(() => {
    fetchData(debouncedFilters)
  }, [debouncedFilters])

  const sanitize = (str: any) => {
    if (typeof str !== 'string') return str
    return str.replace(/[&<>'"]/g, (tag) => {
      const charsToReplace: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      }
      return charsToReplace[tag] || tag
    })
  }

  const deepSanitize = (obj: any): any => {
    if (typeof obj === 'string') return sanitize(obj)
    if (Array.isArray(obj)) return obj.map(deepSanitize)
    if (obj && typeof obj === 'object') {
      const newObj: any = {}
      for (const [k, v] of Object.entries(obj)) {
        newObj[k] = deepSanitize(v)
      }
      return newObj
    }
    return obj
  }

  const fetchData = async (currentFilters: any, isRetry = false) => {
    setLoading(true)
    if (!isRetry) setErrorMsg('')

    if (!isRetry) {
      try {
        const healthAbort = new AbortController()
        const healthTimeout = setTimeout(() => healthAbort.abort(), 10000)
        const healthRes = await pb.send('/backend/v1/datalbus_healthcheck', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: healthAbort.signal as any,
        })
        clearTimeout(healthTimeout)
        if (
          !healthRes ||
          (!healthRes.success && healthRes.status !== 'ok' && healthRes.datalbus !== 'ok')
        ) {
          throw new Error('HEALTH_FAILED')
        }
      } catch (e: any) {
        if (e.isAbort || e.name === 'AbortError') {
          setErrorMsg('Conexão lenta. Verifique sua internet.')
        } else {
          setErrorMsg('Conexão com API indisponível. Tente novamente em alguns minutos.')
        }
        setLoading(false)
        return
      }
    }

    const cacheKey = `datalbus_data_${JSON.stringify(currentFilters)}`
    const cachedStr = localStorage.getItem(cacheKey)
    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr)
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          setData(cached.data)
          setLoading(false)
          return
        }
      } catch {
        /* intentionally ignored */
      }
    }

    const payload = {
      start_date: currentFilters.startDate,
      end_date: currentFilters.endDate,
      garage: currentFilters.garage,
      event: currentFilters.event,
      eventType: currentFilters.eventType,
    }

    const fetchAbort = new AbortController()
    const fetchTimeout = setTimeout(() => fetchAbort.abort(), 10000)

    try {
      const res = await pb.send('/backend/v1/fetchDatalbusData', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        signal: fetchAbort.signal as any,
      })
      clearTimeout(fetchTimeout)

      if (
        res.success &&
        res.data &&
        Array.isArray(res.data.assets) &&
        Array.isArray(res.data.tripEvents)
      ) {
        const finalData = deepSanitize(res.data)
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            timestamp: Date.now(),
            data: finalData,
          }),
        )
        setData(finalData)
      } else {
        setErrorMsg(res.error || 'Erro desconhecido. Use o Bug Scanner para diagnosticar.')
      }
    } catch (err: any) {
      clearTimeout(fetchTimeout)
      if (err.isAbort || err.name === 'AbortError') {
        if (!isRetry) {
          setErrorMsg('Conexão lenta. Aguarde...')
          setTimeout(() => fetchData(currentFilters, true), 3000)
          return
        } else {
          setErrorMsg('Conexão lenta. Verifique sua internet.')
        }
      } else {
        const status = err.status || 500
        if (status === 401) {
          setErrorMsg('Credenciais inválidas. Verifique as variáveis de ambiente no Secrets.')
        } else if (status === 400) {
          setErrorMsg('Parâmetros obrigatórios faltando. Selecione datas válidas.')
        } else if (status === 503) {
          setErrorMsg('Serviço Datalbus indisponível. Tente novamente em alguns minutos.')
        } else {
          setErrorMsg('Erro desconhecido. Use o Bug Scanner para diagnosticar.')
        }
      }
    }

    setLoading(false)
  }

  const options = useMemo(() => {
    if (!data) return { garages: [], events: [], eventTypes: [] }
    const garages = Array.from(
      new Set((data.assets || []).map((a: any) => a.asset_group).filter(Boolean)),
    ) as string[]
    const events = Array.from(
      new Set((data.tripEvents || []).map((e: any) => e.event_type_description).filter(Boolean)),
    ) as string[]
    const eventTypes = Array.from(
      new Set((data.tripEvents || []).map((e: any) => String(e.event_type_id)).filter(Boolean)),
    ) as string[]
    return { garages: garages.sort(), events: events.sort(), eventTypes: eventTypes.sort() }
  }, [data])

  const filteredAssets = useMemo(() => {
    if (!data) return []
    let assets = data.assets || []
    if (debouncedFilters.garage !== 'Todos') {
      assets = assets.filter((a: any) => a.asset_group === debouncedFilters.garage)
    }
    return assets
  }, [data, debouncedFilters.garage])

  const filteredTripEvents = useMemo(() => {
    if (!data) return []
    let events = data.tripEvents || []
    if (debouncedFilters.garage !== 'Todos') {
      const validAssetIds = new Set(filteredAssets.map((a: any) => a.id))
      events = events.filter((e: any) => validAssetIds.has(e.asset_id))
    }
    if (debouncedFilters.event !== 'Todos') {
      events = events.filter((e: any) => e.event_type_description === debouncedFilters.event)
    }
    if (debouncedFilters.eventType !== 'Todos') {
      events = events.filter(
        (e: any) => String(e.event_type_id) === String(debouncedFilters.eventType),
      )
    }
    return events
  }, [data, filteredAssets, debouncedFilters])

  const filteredPrevTripEvents = useMemo(() => {
    if (!data) return []
    let events = data.prevTripEvents || []
    if (debouncedFilters.garage !== 'Todos') {
      const validAssetIds = new Set(filteredAssets.map((a: any) => a.id))
      events = events.filter((e: any) => validAssetIds.has(e.asset_id))
    }
    if (debouncedFilters.event !== 'Todos') {
      events = events.filter((e: any) => e.event_type_description === debouncedFilters.event)
    }
    if (debouncedFilters.eventType !== 'Todos') {
      events = events.filter(
        (e: any) => String(e.event_type_id) === String(debouncedFilters.eventType),
      )
    }
    return events
  }, [data, filteredAssets, debouncedFilters])

  const variationPercent = useMemo(() => {
    const curr = filteredTripEvents.length
    const prev = filteredPrevTripEvents.length
    if (prev > 0) return ((curr - prev) / prev) * 100
    if (curr > 0) return 100
    return 0
  }, [filteredTripEvents, filteredPrevTripEvents])

  const kpis = useMemo(() => {
    let fleetStatus = 'Normal'
    let fleetStatusColor = 'text-[#10b981]'
    if (variationPercent > 10) {
      fleetStatus = 'Crítico'
      fleetStatusColor = 'text-[#ef4444]'
    } else if (variationPercent >= -10 && variationPercent <= 10) {
      fleetStatus = 'Atenção'
      fleetStatusColor = 'text-[#f59e0b]'
    }

    const garageCounts: Record<string, number> = {}
    let totalForGarage = 0
    const assetGroupMap: Record<string, string> = {}
    ;(data?.assets || []).forEach((a: any) => {
      if (a.id) assetGroupMap[a.id] = a.asset_group || 'Desconhecida'
    })

    filteredTripEvents.forEach((e: any) => {
      const g = e.asset_id && assetGroupMap[e.asset_id] ? assetGroupMap[e.asset_id] : 'Desconhecida'
      garageCounts[g] = (garageCounts[g] || 0) + 1
      totalForGarage++
    })

    const sortedGarages = Object.entries(garageCounts).sort((a, b) => b[1] - a[1])
    const garagePercents =
      sortedGarages
        .slice(0, 3)
        .map(([k, v]) => `${k.substring(0, 3)}: ${Math.round((v / totalForGarage) * 100)}%`)
        .join(' | ') || 'Nenhum'

    return {
      carros: data ? filteredAssets.length : 0,
      motoristas: data ? data.drivers.length : 0,
      eventos: filteredTripEvents.length,
      variacao: (variationPercent > 0 ? '+' : '') + variationPercent.toFixed(1) + '%',
      frotaStatus: fleetStatus,
      frotaColor: fleetStatusColor,
      garageSummary: garagePercents,
    }
  }, [data, filteredAssets, filteredTripEvents, variationPercent])

  const topEvents = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredTripEvents.forEach((e: any) => {
      const desc = e.event_type_description || 'Desconhecido'
      counts[desc] = (counts[desc] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredTripEvents])

  const garageData = useMemo(() => {
    const counts: Record<string, number> = {}
    const assetGroupMap: Record<string, string> = {}
    ;(data?.assets || []).forEach((a: any) => {
      if (a.id) assetGroupMap[a.id] = a.asset_group || 'Desconhecida'
    })
    filteredTripEvents.forEach((e: any) => {
      const g = e.asset_id && assetGroupMap[e.asset_id] ? assetGroupMap[e.asset_id] : 'Desconhecida'
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
  }, [data, filteredTripEvents])

  const topVehicles = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredTripEvents.forEach((e: any) => {
      if (e.asset_id) counts[e.asset_id] = (counts[e.asset_id] || 0) + 1
    })
    const prevCounts: Record<string, number> = {}
    filteredPrevTripEvents.forEach((e: any) => {
      if (e.asset_id) prevCounts[e.asset_id] = (prevCounts[e.asset_id] || 0) + 1
    })
    const assetMap: Record<string, string> = {}
    ;(data?.assets || []).forEach((a: any) => {
      if (a.id) assetMap[a.id] = a.license_plate
    })

    return Object.entries(counts)
      .map(([id, count]) => {
        const prevCount = prevCounts[id] || 0
        let variation = 0
        if (prevCount > 0) variation = ((count - prevCount) / prevCount) * 100
        else if (count > 0) variation = 100

        return {
          plate: assetMap[id] || 'Sem Placa',
          count,
          variation: variation.toFixed(1),
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [data, filteredTripEvents, filteredPrevTripEvents])

  const dtcs = useMemo(() => {
    const currentCounts: Record<string, number> = {}
    filteredTripEvents.forEach((e: any) => {
      const desc = e.event_type_description || 'Desconhecido'
      currentCounts[desc] = (currentCounts[desc] || 0) + 1
    })

    const prevCounts: Record<string, number> = {}
    filteredPrevTripEvents.forEach((e: any) => {
      const desc = e.event_type_description || 'Desconhecido'
      prevCounts[desc] = (prevCounts[desc] || 0) + 1
    })

    return Object.entries(currentCounts)
      .map(([desc, count]) => {
        const prevCount = prevCounts[desc] || 0
        let variation = 0
        if (prevCount > 0) variation = ((count - prevCount) / prevCount) * 100
        else if (count > 0) variation = 100

        let status = 'Informativo'
        if (count > 100) status = 'Crítico'
        else if (count > 0) status = 'Alerta'

        return {
          desc,
          count,
          variation: variation,
          status,
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [filteredTripEvents, filteredPrevTripEvents])

  if (loading && !data) {
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

  if (errorMsg && !data) {
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
      title: 'Qtd Eventos',
      value: kpis.eventos,
      icon: AlertTriangle,
      subtitle: 'Total no período filtrado',
    },
    {
      title: '% Variação',
      value: kpis.variacao,
      icon: kpis.variacao.startsWith('-') ? TrendingDown : TrendingUp,
      subtitle: 'Vs. período anterior',
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
                  {options.events.map((ev) => (
                    <SelectItem
                      key={ev}
                      value={ev}
                      className="hover:bg-white/10 transition-colors duration-300"
                    >
                      {ev}
                    </SelectItem>
                  ))}
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
                  {options.eventTypes.map((et) => (
                    <SelectItem
                      key={et}
                      value={et}
                      className="hover:bg-white/10 transition-colors duration-300"
                    >
                      Tipo {et}
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
                className={`p-3 rounded-xl bg-white/5 border border-white/10 ${card.customColor || (card.isAlert ? (card.value.startsWith('-') ? 'text-[#10b981]' : 'text-[#ef4444]') : 'text-[#e67e22]')}`}
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
                      const isPositive = parseFloat(v.variation) > 0
                      return (
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
                            className={`text-[14px] font-normal py-3 pr-0 text-right ${isPositive ? 'text-[#ef4444]' : 'text-[#10b981]'}`}
                          >
                            <div className="flex justify-end items-center gap-1">
                              {isPositive ? (
                                <TrendingUp className="w-[16px] h-[16px]" />
                              ) : (
                                <TrendingDown className="w-[16px] h-[16px]" />
                              )}
                              {isPositive ? '+' : '-'}
                              {Math.abs(parseFloat(v.variation)).toFixed(1)}%
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
                  {dtcs.map((d) => {
                    const isPositive = d.variation > 0
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
                            {Math.abs(d.variation).toFixed(1)}%
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
