import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Settings as SettingsIcon } from 'lucide-react'

export default function Settings() {
  const [loading, setLoading] = useState(false)

  const handleSave = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success('Configurações salvas com sucesso!')
    }, 800)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <SettingsIcon className="h-8 w-8 text-slate-500" />
        Configuração
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Notificações e Alertas</CardTitle>
          <CardDescription>Configure como deseja receber os alertas do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Alertas por Email</Label>
              <p className="text-sm text-muted-foreground">Receba um resumo diário dos alertas.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Notificações Push</Label>
              <p className="text-sm text-muted-foreground">
                Alertas de alta severidade em tempo real.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="space-y-2 pt-4 border-t">
            <Label>Email Principal para Contato</Label>
            <Input defaultValue="telemetria@viasudeste.com" />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
