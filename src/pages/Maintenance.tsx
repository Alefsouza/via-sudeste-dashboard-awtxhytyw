import React, { useState, useEffect } from 'react'
import { subDays, differenceInSeconds, format } from 'date-fns'
import {
  Download,
  AlertTriangle,
  FileText,
  Truck,
  MapPin,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { DatePickerWithRange } from '@/components/date-range-picker'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination'
import { useToast } from '@/hooks/use-toast'

import {
  getMaintenanceEvents,
  getMaintenanceKPIs,
  getEventTypesForMaintenance,
  getAssetsForMaintenance,
  type MaintenanceEvent,
} from '@/services/maintenance'

export default function Maintenance() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })

  const [filters, setFilters] = useState({ assetId: 'all', eventTypeId: 'all', criticality: 'all' })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [events, setEvents] = useState<MaintenanceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [kpiTotal, setKpiTotal] = useState(0)
  const [kpiCategoryData, setKpiCategoryData] = useState<{ name: string; value: number }[]>([])
  const [kpiTopVehicle, setKpiTopVehicle] = useState<{ plate: string; count: number } | null>(null)
  const [kpisLoading, setKpisLoading] = useState(true)

  const [assets, setAssets] = useState<any[]>([])
  const [eventTypes, setEventTypes] = useState<any[]>([])

  const [selectedEvent, setSelectedEvent] = useState<MaintenanceEvent | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    getAssetsForMaintenance().then(setAssets).catch(console.error)
    getEventTypesForMaintenance().then(setEventTypes).catch(console.error)
  }, [])

  const fetchData = async () => {
    if (!dateRange?.from || !dateRange?.to) return
    setLoading(true)
    setError(false)
    try {
      const res = await getMaintenanceEvents({
        startDate: dateRange.from,
        endDate: dateRange.to,
        page,
        perPage: 20,
        assetId: filters.assetId,
        eventTypeId: filters.eventTypeId,
        criticality: filters.criticality,
      })
      setEvents(res.items)
      setTotalPages(res.totalPages || 1)
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchKPIs = async () => {
    if (!dateRange?.from || !dateRange?.to) return
    setKpisLoading(true)
    try {
      const kpisData = await getMaintenanceKPIs({
        startDate: dateRange.from,
        endDate: dateRange.to,
        assetId: filters.assetId,
        eventTypeId: filters.eventTypeId,
        criticality: filters.criticality,
      })

      setKpiTotal(kpisData.length)

      const cats: Record<string, number> = {}
      const vehicles: Record<string, { plate: string; count: number }> = {}

      kpisData.forEach((ev) => {
        const cat = ev.expand?.event_type_id?.category || 'Desconhecido'
        cats[cat] = (cats[cat] || 0) + 1

        if (ev.expand?.asset_id) {
          const aid = ev.expand.asset_id.id
          if (!vehicles[aid]) {
            vehicles[aid] = { plate: ev.expand.asset_id.license_plate || 'Desconhecido', count: 0 }
          }
          vehicles[aid].count += 1
        }
      })

      setKpiCategoryData(Object.entries(cats).map(([name, value]) => ({ name, value })))

      let topV = null
      let maxCount = 0
      for (const v of Object.values(vehicles)) {
        if (v.count > maxCount) {
          maxCount = v.count
          topV = v
        }
      }
      setKpiTopVehicle(topV)
    } catch (e) {
      console.error(e)
    } finally {
      setKpisLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [dateRange, filters])

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, page])

  useEffect(() => {
    fetchKPIs()
  }, [dateRange, filters])

  const exportToCSV = async () => {
    if (!dateRange?.from || !dateRange?.to) return
    try {
      toast({ title: 'Exportando...', description: 'Aguarde a geração do arquivo.' })
      const { items } = await getMaintenanceEvents({
        startDate: dateRange.from,
        endDate: dateRange.to,
        assetId: filters.assetId,
        eventTypeId: filters.eventTypeId,
        criticality: filters.criticality,
        perPage: 5000,
        page: 1,
      })

      const csvContent = [
        [
          'Data/Hora',
          'Veículo',
          'Motorista',
          'Tipo de Evento',
          'Velocidade (km/h)',
          'Duração (s)',
          'Latitude',
          'Longitude',
          'Criticidade',
        ].join(','),
        ...items.map((ev) => {
          const startTime = new Date(ev.start_time).toLocaleString('pt-BR')
          const vehicle = ev.expand?.asset_id?.license_plate || 'N/A'
          const driver = ev.expand?.driver_id?.name || 'N/A'
          const eventType = ev.expand?.event_type_id?.name || 'N/A'
          const speed = ev.speed || 0

          let duration = 0
          if (ev.end_time) {
            duration = differenceInSeconds(new Date(ev.end_time), new Date(ev.start_time))
          }

          const lat = ev.latitude || ''
          const lon = ev.longitude || ''
          const crit = ev.expand?.event_type_id?.default_criticality || 'N/A'

          return `"${startTime}","${vehicle}","${driver}","${eventType}",${speed},${duration},${lat},${lon},"${crit}"`
        }),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `manutencao-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao exportar dados.', variant: 'destructive' })
    }
  }

  const getCriticalityBadge = (crit: string) => {
    const c = crit.toLowerCase()
    if (c === 'alta') return <Badge variant="destructive">Alta</Badge>
    if (c === 'média' || c === 'media')
      return (
        <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
          Média
        </Badge>
      )
    return <Badge variant="secondary">{crit}</Badge>
  }

  const chartConfig = {
    value: { label: 'Alertas', color: 'hsl(var(--primary))' },
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Manutenção</h1>
          <p className="text-muted-foreground">Monitore alertas mecânicos e operacionais.</p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          className="shrink-0"
          disabled={loading || !events.length}
        >
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Período</label>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Veículo</label>
            <Select
              value={filters.assetId}
              onValueChange={(v) => setFilters((f) => ({ ...f, assetId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.license_plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Evento</label>
            <Select
              value={filters.eventTypeId}
              onValueChange={(v) => setFilters((f) => ({ ...f, eventTypeId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {eventTypes.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Criticidade</label>
            <Select
              value={filters.criticality}
              onValueChange={(v) => setFilters((f) => ({ ...f, criticality: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{kpiTotal}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Veículo com Mais Alertas</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{kpiTopVehicle?.plate || '-'}</div>
                <p className="text-xs text-muted-foreground">
                  {kpiTopVehicle ? `${kpiTopVehicle.count} alertas neste período` : 'Sem dados'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alertas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[80px]">
            {kpisLoading ? (
              <Skeleton className="h-full w-full" />
            ) : kpiCategoryData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kpiCategoryData}
                    layout="vertical"
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" hide width={80} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground flex h-full items-center">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Eventos</CardTitle>
          <CardDescription>Lista detalhada de ocorrências no período.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Erro ao carregar dados</h3>
              <p className="text-muted-foreground mb-4">
                Ocorreu um problema de comunicação com o servidor.
              </p>
              <Button onClick={fetchData} variant="outline">
                <RefreshCcw className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mb-4 opacity-50" />
              <p>Nenhum alerta encontrado para o período selecionado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Velocidade</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Criticidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((ev) => {
                      let duration = 0
                      if (ev.end_time) {
                        duration = differenceInSeconds(
                          new Date(ev.end_time),
                          new Date(ev.start_time),
                        )
                      }
                      const crit = ev.expand?.event_type_id?.default_criticality || '-'

                      return (
                        <TableRow
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <TableCell className="whitespace-nowrap">
                            {new Date(ev.start_time).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {ev.expand?.asset_id?.license_plate || '-'}
                          </TableCell>
                          <TableCell>{ev.expand?.driver_id?.name || '-'}</TableCell>
                          <TableCell>{ev.expand?.event_type_id?.name || '-'}</TableCell>
                          <TableCell>{ev.speed ? `${ev.speed} km/h` : '-'}</TableCell>
                          <TableCell>{duration > 0 ? `${duration}s` : '-'}</TableCell>
                          <TableCell>{getCriticalityBadge(crit)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-sm px-4">
                      Página {page} de {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className={
                        page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Evento</SheetTitle>
            <SheetDescription>Informações completas do alerta gerado.</SheetDescription>
          </SheetHeader>
          {selectedEvent && (
            <div className="space-y-6 py-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Data/Hora Inicial</p>
                  <p className="font-medium">
                    {new Date(selectedEvent.start_time).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data/Hora Final</p>
                  <p className="font-medium">
                    {selectedEvent.end_time
                      ? new Date(selectedEvent.end_time).toLocaleString('pt-BR')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Veículo (Placa)</p>
                  <p className="font-medium">
                    {selectedEvent.expand?.asset_id?.license_plate || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Motorista</p>
                  <p className="font-medium">{selectedEvent.expand?.driver_id?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo de Evento</p>
                  <p className="font-medium">{selectedEvent.expand?.event_type_id?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criticidade</p>
                  <p className="font-medium">
                    {selectedEvent.expand?.event_type_id?.default_criticality || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Velocidade</p>
                  <p className="font-medium">
                    {selectedEvent.speed ? `${selectedEvent.speed} km/h` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Relatado</p>
                  <p className="font-medium">{selectedEvent.value || '-'}</p>
                </div>
              </div>

              {selectedEvent.latitude && selectedEvent.longitude ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm border-b pb-2">Localização</h4>
                  <div className="bg-muted p-3 rounded-md flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div className="text-sm font-mono">
                      <p>Lat: {selectedEvent.latitude}</p>
                      <p>Lon: {selectedEvent.longitude}</p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={`https://www.google.com/maps?q=${selectedEvent.latitude},${selectedEvent.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Ver no Mapa
                      </a>
                    </Button>
                  </div>
                </div>
              ) : null}

              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm border-b pb-2">Metadados</h4>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
