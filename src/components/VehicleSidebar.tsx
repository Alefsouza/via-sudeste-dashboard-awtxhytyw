import { useState, useMemo } from 'react'
import { MappedLocation } from '@/types'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  locations: MappedLocation[]
  selectedId?: string
  onSelect: (loc: MappedLocation) => void
}

export function VehicleSidebar({ locations, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated')

  const filtered = useMemo(() => {
    return locations
      .filter((l) => {
        if (statusFilter !== 'all' && l.status !== statusFilter) return false
        if (!search) return true
        const q = search.toLowerCase()
        return l.license_plate.toLowerCase().includes(q) || l.fleet_number.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        if (sortBy === 'plate') return a.license_plate.localeCompare(b.license_plate)
        return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      })
  }, [locations, search, statusFilter, sortBy])

  const getStatusColor = (status: string) => {
    if (status === 'operation') return 'bg-green-500'
    if (status === 'stopped') return 'bg-yellow-500'
    if (status === 'parked') return 'bg-gray-400'
    return 'bg-red-500'
  }

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border space-y-4">
        <h2 className="font-semibold text-lg">Frota</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar placa ou frota..."
            className="pl-8 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="operation">Em Movimento</SelectItem>
              <SelectItem value="stopped">Parado (Ligado)</SelectItem>
              <SelectItem value="parked">Estacionado</SelectItem>
              <SelectItem value="disconnected">Desconectado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="flex-1 bg-background">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recentes</SelectItem>
              <SelectItem value="plate">Placa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum veículo encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filtered.map((loc) => (
              <button
                key={loc.id}
                onClick={() => onSelect(loc)}
                className={cn(
                  'w-full text-left p-3 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors flex items-start gap-3',
                  selectedId === loc.id &&
                    'bg-sidebar-accent border-l-4 border-primary text-sidebar-accent-foreground',
                )}
              >
                <div
                  className={cn('w-3 h-3 rounded-full mt-1 shrink-0', getStatusColor(loc.status))}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium truncate">{loc.license_plate}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(loc.speed)} km/h
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mb-1">
                    Frota: {loc.fleet_number} • Mot: {loc.driverName}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Há{' '}
                    {formatDistanceToNow(new Date(loc.recorded_at), {
                      addSuffix: false,
                      locale: ptBR,
                    })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
