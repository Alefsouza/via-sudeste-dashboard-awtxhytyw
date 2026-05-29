import { useState, useCallback, useEffect } from 'react'

export function useData<T>(fetcher: () => Promise<T[]>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetcher()
      setData(res)
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
