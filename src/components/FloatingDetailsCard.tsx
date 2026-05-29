import { MappedLocation } from '@/types'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Navigation } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  location: MappedLocation
  onClose: () => void
}

export function FloatingDetailsCard({ location, onClose }: Props) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[320px] shadow-2xl animate-fade-in-up">
      <Card className="border-2">
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <CardTitle className="text-base font-bold">Placa: {location.license_plate}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full -mr-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2 text-sm">
          <div className="flex justify-between border-b pb-1">
            <span className="text-muted-foreground">Motorista:</span>
            <span
              className="font-medium text-right truncate max-w-[150px]"
              title={location.driverName}
            >
              {location.driverName}
            </span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-muted-foreground">Velocidade:</span>
            <span className="font-medium">{Math.round(location.speed)} km/h</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium capitalize">
              {location.status === 'operation' && 'Movimento'}
              {location.status === 'stopped' && 'Parado (Ligado)'}
              {location.status === 'parked' && 'Estacionado'}
              {location.status === 'disconnected' && 'Desconectado'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Última att:</span>
            <span className="font-medium">
              {new Date(location.recorded_at).toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button asChild className="w-full shadow-sm" size="sm">
            <Link to={`/vehicles/${location.id}`}>
              <Navigation className="w-4 h-4 mr-2" />
              Ver Detalhes do Veículo
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
