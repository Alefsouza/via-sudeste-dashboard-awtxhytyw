import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Activity, AlertTriangle } from 'lucide-react'

export default function Index() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">Conectado ao Servidor</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Acesso Rápido</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acesse o Painel de Manutenção no menu lateral para visualizar os alertas de
              telemetria.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
