import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle, Inbox } from 'lucide-react'

interface DataStateProps {
  loading: boolean
  error: Error | null
  empty: boolean
  onRetry: () => void
  loadingComponent?: React.ReactNode
  emptyMessage?: string
  children: React.ReactNode
}

export function DataState({
  loading,
  error,
  empty,
  onRetry,
  loadingComponent,
  emptyMessage = 'Nenhum dado encontrado.',
  children,
}: DataStateProps) {
  if (loading) {
    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <div className="space-y-4 w-full">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-red-100 bg-red-50 text-red-600">
        <AlertCircle className="h-10 w-10 mb-4" />
        <p className="font-medium mb-4">Ocorreu um erro ao carregar os dados.</p>
        <Button
          variant="outline"
          onClick={onRetry}
          className="bg-white hover:bg-slate-50 text-slate-800"
        >
          Tentar Novamente
        </Button>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-slate-100 bg-slate-50 text-slate-500">
        <Inbox className="h-10 w-10 mb-4 opacity-50" />
        <p className="font-medium text-slate-600">{emptyMessage}</p>
      </div>
    )
  }

  return <>{children}</>
}
