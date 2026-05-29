import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MappedLocation } from '@/types';
import { Activity, AlertTriangle, Route, SignalHigh } from 'lucide-react';

interface Props {
  locations: MappedLocation[];
  totalTrips: number;
  totalAlerts: number;
}

export function KPICards({ locations, totalTrips, totalAlerts }: Props) {
  const inOperationCount = locations.filter(l => l.status === 'operation').length;
  const disconnectedCount = locations.filter(l => l.status === 'disconnected').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Em Operação</CardTitle>
          <Activity className="w-4 h-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inOperationCount}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Desconectados (>12h)</CardTitle>
          <SignalHigh className="w-4 h-4 text-red-500 opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{disconnectedCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Viagens Hoje</CardTitle>
          <Route className="w-4 h-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTrips}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Críticos Hoje</CardTitle>
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAlerts}</div>
        </CardContent>
      </Card>
    </div>
  );
}
