import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, HardDrive } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function VehicleDetails() {
  const { id } = useParams()

  return (
    <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-auto">
      <Button variant="ghost" asChild className="mb-6 -ml-4">
        <Link to="/">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o Painel
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <HardDrive className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Detalhes do Veículo</h1>
          <p className="text-muted-foreground">ID do Registro: {id}</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-12 text-center flex flex-col items-center justify-center">
          <HardDrive className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
          <p className="text-lg font-medium">Módulo em Desenvolvimento</p>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Esta visualização detalhada do veículo será disponibilizada na próxima fase do projeto.
          </p>
          <Button asChild className="mt-8" variant="outline">
            <Link to="/">Retornar</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
