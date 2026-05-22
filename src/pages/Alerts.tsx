import { useEffect, useState } from 'react'
import { getAlerts, Alert, resolveAlert } from '@/services/alerts'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const data = await getAlerts()
      setAlerts(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('alerts', () => loadData())

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id)
      toast({
        title: 'Alerta resolvido',
        description: 'O alerta foi marcado como resolvido com sucesso.',
      })
      loadData()
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Não foi possível resolver o alerta.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up p-2">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
          <p className="text-muted-foreground">Gerenciamento de eventos de telemetria.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Alertas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-20" />
              Nenhum alerta registrado no sistema.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border transition-colors',
                  alert.resolved
                    ? 'bg-card/30 border-border/50 opacity-70'
                    : 'bg-card border-border',
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-2 rounded-full',
                      alert.severity === 'high'
                        ? 'bg-destructive/10 text-destructive'
                        : alert.severity === 'medium'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-primary/10 text-primary',
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        'h-5 w-5',
                        alert.severity === 'high' && !alert.resolved && 'animate-pulse',
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono bg-background">
                        {alert.expand?.vehicle_id?.plate}
                      </Badge>
                      <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                        {alert.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className={cn('text-sm', !alert.resolved && 'font-medium text-foreground')}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />{' '}
                      {new Date(alert.created).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                {!alert.resolved && (
                  <Button variant="secondary" size="sm" onClick={() => handleResolve(alert.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Resolvido
                  </Button>
                )}
                {alert.resolved && (
                  <span className="text-xs font-medium text-emerald-500 flex items-center gap-1 px-3">
                    <CheckCircle2 className="h-3 w-3" /> Resolvido
                  </span>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
