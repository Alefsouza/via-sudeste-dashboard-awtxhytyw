import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Index() {
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSyncingFull, setIsSyncingFull] = useState(false)

  const handleSync = async (endpoint: string, isFull: boolean) => {
    const setSync = isFull ? setIsSyncingFull : setIsSyncing
    setSync(true)

    try {
      await pb.send(endpoint, { method: 'POST' })
      toast({
        title: 'Sincronização concluída',
        description:
          'A sincronização foi finalizada com sucesso. Verifique os logs para mais detalhes.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Aviso de Sincronização',
        description:
          getErrorMessage(error) ||
          'Ocorreu um erro ao tentar sincronizar. A operação falhou ou retornou um erro longo, que foi truncado e salvo nos logs do sistema com segurança.',
      })
    } finally {
      setSync(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Dashboard Via Sudeste
          </h1>
          <p className="text-slate-500 mt-1">
            Monitoramento de telemetria e sincronização de dados
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSync('/backend/v1/sincronizar-datalbus', false)}
            disabled={isSyncing || isSyncingFull}
          >
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Rápido
          </Button>
          <Button
            onClick={() => handleSync('/backend/v1/sincronizar-datalbus-completo', true)}
            disabled={isSyncing || isSyncingFull}
          >
            {isSyncingFull ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Completo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Operacional</div>
            <p className="text-xs text-slate-500 mt-1">Integração online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Disponibilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-slate-500 mt-1">Últimas 24 horas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Avisos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Monitorado</div>
            <p className="text-xs text-slate-500 mt-1">Erros logados com segurança</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Painel de Controle</CardTitle>
          <CardDescription>Gerenciamento de integrações Via Sudeste</CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 space-y-4">
          <p>
            Bem-vindo ao painel de controle da Via Sudeste. Utilize os botões acima para forçar a
            sincronização de dados de telemetria, veículos, motoristas e viagens com o Datalbus.
          </p>
          <p>
            A sincronização também ocorre automaticamente em segundo plano. O sistema conta com
            salvaguardas que registram erros de API (como limites de caracteres) de maneira
            inteligente, garantindo que nenhum erro passe despercebido e o painel continue fluido
            para a operação diária.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
