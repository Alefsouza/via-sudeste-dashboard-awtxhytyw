import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Activity } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('telemetria@viasudeste.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      toast({
        title: 'Erro de autenticação',
        description: 'Credenciais inválidas. Verifique seu email e senha.',
        variant: 'destructive',
      })
      setIsLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-lg animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <Activity className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Via Sudeste</CardTitle>
          <CardDescription>Acesse o painel de monitoramento da frota</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Administrativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="telemetria@viasudeste.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
