import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDrivers } from '@/services/drivers'
import { RecordModel } from 'pocketbase'
import { Loader2, Award, FileText } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export default function Drivers() {
  const [drivers, setDrivers] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    getDrivers()
      .then(setDrivers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('drivers', () => {
    loadData()
  })

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Motoristas</h1>
        <p className="text-muted-foreground mt-1">Classificação e performance da equipe.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {drivers.map((driver, index) => {
          const score = driver.score || 0
          let progressColor = 'bg-primary'
          if (score >= 90) progressColor = 'bg-emerald-500'
          else if (score < 70) progressColor = 'bg-destructive'

          return (
            <Card
              key={driver.id}
              className="animate-fade-in-up overflow-hidden group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-0 pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/thumbnail?seed=${driver.id}`}
                      />
                      <AvatarFallback>{driver.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {driver.name}
                      </CardTitle>
                      <div className="flex items-center text-xs text-muted-foreground mt-1 font-mono-num">
                        <FileText className="h-3 w-3 mr-1" /> CNH: {driver.license_number}
                      </div>
                    </div>
                  </div>
                  {index < 3 && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-primary/20 shadow-sm"
                    >
                      <Award className="h-3 w-3 mr-1" /> Top {index + 1}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Score de Segurança</span>
                    <span className="font-bold font-mono-num">{score}/100</span>
                  </div>
                  <Progress value={score} className="h-2" indicatorClassName={progressColor} />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">CNH</p>
                    <p className="font-mono-num font-medium text-sm">
                      {driver.license_number || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Score</p>
                    <p className="font-mono-num font-medium text-sm">{score}/100</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
