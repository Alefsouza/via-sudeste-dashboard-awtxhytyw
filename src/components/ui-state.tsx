import { AlertCircle, RotateCcw, PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function LoadingState({ skeletonCount = 3 }: { skeletonCount?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erro ao carregar os dados</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-4 mt-2">
        <span>{error.message || 'Ocorreu um erro inesperado.'}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export function EmptyState({ message = 'Nenhum registro encontrado' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg">
      <PackageOpen className="h-12 w-12 mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  )
}
