import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  Bell,
  Search,
  LayoutDashboard,
  Truck,
  Users,
  AlertTriangle,
  FileBarChart,
  LogOut,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useEffect, useState } from 'react'
import { getRecentAlerts } from '@/services/alerts'
import useRealtime from '@/hooks/use-realtime'

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [unresolvedAlerts, setUnresolvedAlerts] = useState(0)

  const loadAlertsCount = async () => {
    try {
      const res = await getRecentAlerts(50)
      setUnresolvedAlerts(res.items.filter((a) => !a.resolved).length)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadAlertsCount()
  }, [])

  useRealtime('alerts', () => {
    loadAlertsCount()
  })

  const navigation = [
    { name: 'Painel Geral', href: '/', icon: LayoutDashboard },
    { name: 'Frota', href: '/frota', icon: Truck },
    { name: 'Motoristas', href: '/motoristas', icon: Users },
  ]

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="flex h-16 items-center justify-center border-b px-4">
          <div className="flex items-center gap-2 font-bold text-primary w-full overflow-hidden">
            <Truck className="h-6 w-6 shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">Via Sudeste</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/' && location.pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                      <Link to={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-background z-10">
          <div className="flex items-center gap-4 flex-1">
            <SidebarTrigger />
            <div className="w-full max-w-sm relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar placa..."
                className="w-full pl-9 bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer hover:bg-muted p-2 rounded-full transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unresolvedAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-destructive animate-pulse-ring" />
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all">
                  <AvatarImage src={`https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`} />
                  <AvatarFallback>{user?.name?.substring(0, 2) || 'AD'}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium">{user?.name}</div>
                <div className="px-2 pb-1.5 text-xs text-muted-foreground">{user?.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-muted/20">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
