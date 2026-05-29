import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'

const Login = lazy(() => import('@/pages/Login'))
const Index = lazy(() => import('@/pages/Index'))
const Maintenance = lazy(() => import('@/pages/Maintenance'))
const DriverRanking = lazy(() => import('@/pages/DriverRanking'))
const VehicleRanking = lazy(() => import('@/pages/VehicleRanking'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const Fallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
)

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/manutencao" element={<Maintenance />} />
                <Route path="/ranking-motoristas" element={<DriverRanking />} />
                <Route path="/ranking-veiculos" element={<VehicleRanking />} />
                <Route path="/configuracao" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
