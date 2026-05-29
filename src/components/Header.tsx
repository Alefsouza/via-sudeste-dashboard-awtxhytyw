import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Bus, LogOut } from 'lucide-react'

export function Header() {
  const { signOut, user } = useAuth()

  return (
    <header className="border-b bg-card h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 shadow-sm z-50 relative">
      <div className="flex items-center gap-2">
        <Bus className="w-5 h-5 text-primary" />
        <Link to="/" className="font-semibold text-lg">
          Via Sudeste
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground hidden sm:inline-block">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </header>
  )
}
