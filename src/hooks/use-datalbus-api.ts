import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'

export type DatalbusAction = 'assets' | 'drivers' | 'trips' | 'tripEvents'

export interface Asset {
  id: string | number
  vehicle_id: string | number
  plate: string
  status: string
  last_update: string
}

export interface Driver {
  id: string | number
  name: string
  license_category: string
  status: string
}

export interface Trip {
  id: string | number
  vehicle_id: string | number
  start_time: string
  end_time: string
  distance_km: number
}

export interface TripEvent {
  id: string | number
  event_type: string
  severity: string
  timestamp: string
  description: string
}

export type DatalbusData<T extends DatalbusAction> = T extends 'assets'
  ? Asset[]
  : T extends 'drivers'
    ? Driver[]
    : T extends 'trips'
      ? Trip[]
      : T extends 'tripEvents'
        ? TripEvent[]
        : never

export function useDatalbusApi<T extends DatalbusAction>(
  action: T,
  filters?: Record<string, unknown>,
) {
  const [data, setData] = useState<DatalbusData<T>>([] as unknown as DatalbusData<T>)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [auth, setAuth] = useState<{ token: string; tenancy_id: string } | null>(null)
  const authRef = useRef(auth)

  useEffect(() => {
    authRef.current = auth
  }, [auth])

  const filtersKey = JSON.stringify(filters || {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => filters || {}, [filtersKey])

  const authenticate = useCallback(async () => {
    try {
      const res = await pb.send('/backend/v1/autenticacao_datalbus', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      if (res && res.success && res.token && res.tenancy_id) {
        const newAuth = { token: res.token, tenancy_id: res.tenancy_id }
        setAuth(newAuth)
        return newAuth
      }

      throw new Error('Invalid response')
    } catch (err: unknown) {
      setError('Falha na autenticação. Verifique credenciais.')
      setLoading(false)
      return null
    }
  }, [])

  const fetchData = useCallback(
    async (
      currentToken: string,
      currentTenancyId: string,
      currentAction: T,
      currentFilters: Record<string, unknown>,
      isRetry = false,
    ) => {
      setLoading(true)
      setError(null)
      try {
        const res = await pb.send('/backend/v1/buscaDadosDatalbus', {
          method: 'POST',
          body: JSON.stringify({
            token: currentToken,
            tenancy_id: currentTenancyId,
            action: currentAction,
            filters: currentFilters,
          }),
          headers: { 'Content-Type': 'application/json' },
        })

        if (res && res.success && Array.isArray(res.data)) {
          setData(res.data as DatalbusData<T>)
        } else {
          throw new Error(res.error || 'Unknown error')
        }
      } catch (err: unknown) {
        const isUnauthorized =
          err instanceof ClientResponseError
            ? err.status === 401
            : err &&
              typeof err === 'object' &&
              'status' in err &&
              (err as Record<string, unknown>).status === 401

        if (isUnauthorized && !isRetry) {
          const newAuth = await authenticate()
          if (newAuth) {
            await fetchData(newAuth.token, newAuth.tenancy_id, currentAction, currentFilters, true)
          }
        } else {
          setError('Erro ao buscar dados. Tente novamente.')
        }
      } finally {
        setLoading(false)
      }
    },
    [authenticate],
  )

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      let currentAuth = authRef.current
      if (!currentAuth) {
        setLoading(true)
        currentAuth = await authenticate()
        if (!currentAuth || !isMounted) return
      }
      await fetchData(currentAuth.token, currentAuth.tenancy_id, action, stableFilters)
    }

    run()

    return () => {
      isMounted = false
    }
  }, [action, stableFilters, authenticate, fetchData])

  const refetch = useCallback(async () => {
    let currentAuth = authRef.current
    if (!currentAuth) {
      setLoading(true)
      currentAuth = await authenticate()
      if (!currentAuth) return
    }
    await fetchData(currentAuth.token, currentAuth.tenancy_id, action, stableFilters)
  }, [action, stableFilters, authenticate, fetchData])

  return { data, loading, error, refetch }
}
