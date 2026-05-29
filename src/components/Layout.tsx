import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { LayoutDashboard, Wrench, Trophy, Car, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const navigation = [
  { name: 'Painel de Operação', href: '/', icon: LayoutDashboard },
  { name: 'Painel de Manutenção', href: '/manutencao', icon: Wrench },
  { name: 'Ranking de Motoristas', href: '/ranking-motoristas', icon: Trophy },
  { name: 'Ranking de Veículos', href: '/ranking-veiculos', icon: Car },
  { name: 'Configuração', href: '/configuracao', icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const { signOut } = useAuth()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <h1 className="text-xl font-bold text-slate-900">Via Sudeste</h1>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
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
          </SidebarContent>
          <SidebarFooter className="p-2 border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="h-14 border-b bg-white flex items-center px-4 gap-4 md:hidden">
            <SidebarTrigger />
            <h1 className="font-semibold text-lg">Via Sudeste</h1>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
