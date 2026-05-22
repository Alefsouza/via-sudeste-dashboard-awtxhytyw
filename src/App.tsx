import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'

import Login from '@/pages/Login'
import Index from '@/pages/Index'
import Vehicles from '@/pages/Vehicles'
import VehicleDetail from '@/pages/VehicleDetail'
import Drivers from '@/pages/Drivers'
import SyncDashboard from '@/pages/SyncDashboard'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/frota" element={<Vehicles />} />
              <Route path="/frota/:id" element={<VehicleDetail />} />
              <Route path="/motoristas" element={<Drivers />} />
              <Route path="/sincronismo" element={<SyncDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
