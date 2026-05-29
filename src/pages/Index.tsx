import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LogOut, RefreshCw } from 'lucide-react'

export default function Index() {
  const { isAuthenticated, signIn, signOut, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState('telemetria@viasudeste.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [loadingSync, setLoadingSync] = useState(false)
  const [syncStates, setSyncStates] = useState<any[]>([])

  const fetchSyncStates = async () => {
    try {
      const records = await pb.collection('sync_state').getFullList({ sort: '-updated' })
      setSyncStates(records)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchSyncStates()
    }
  }, [isAuthenticated])

  useRealtime('sync_state', () => {
    if (isAuthenticated) {
      fetchSyncStates()
    }
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    const { error } = await signIn(email, password)
    setIsLoggingIn(false)
    if (error) {
      toast({ title: 'Login Failed', description: error.message, variant: 'destructive' })
    }
  }

  const handleSync = async () => {
    try {
      setLoadingSync(true)
      await pb.send('/backend/v1/sync_datalbus_catalogs', { method: 'POST' })
      toast({ title: 'Sync completed', description: 'Catalogs have been synced successfully.' })
    } catch (err: any) {
      toast({
        title: 'Sync failed',
        description: err.message || 'An error occurred during sync',
        variant: 'destructive',
      })
    } finally {
      setLoadingSync(false)
    }
  }

  if (authLoading)
    return <div className="flex h-screen items-center justify-center">Loading...</div>

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? 'Logging in...' : 'Log in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Via Sudeste Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage and sync your Datalbus catalogs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSync} disabled={loadingSync}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingSync ? 'animate-spin' : ''}`} />
            {loadingSync ? 'Syncing...' : 'Trigger Sync'}
          </Button>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Synchronization Status</CardTitle>
          <CardDescription>Real-time status of the Datalbus integration endpoints.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Last Sync At</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncStates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No sync records found. Trigger a sync to populate this table.
                    </TableCell>
                  </TableRow>
                ) : (
                  syncStates.map((state) => (
                    <TableRow key={state.id}>
                      <TableCell className="font-medium capitalize">
                        {state.endpoint_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={state.last_sync_status === 'success' ? 'default' : 'destructive'}
                        >
                          {state.last_sync_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{state.records_processed}</TableCell>
                      <TableCell>
                        {state.last_sync_at ? new Date(state.last_sync_at).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell
                        className="text-red-500 max-w-[200px] truncate"
                        title={state.error_message}
                      >
                        {state.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
