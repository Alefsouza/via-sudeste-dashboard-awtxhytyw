import pb from '@/lib/pocketbase/client'

let tokenCache: { token: string; tenancy_id: string } | null = null

export const authenticateDatalbus = async () => {
  const res = await pb.send('/backend/v1/autenticacao_datalbus', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  })
  if (res?.success && res?.token && res?.tenancy_id) {
    tokenCache = { token: res.token, tenancy_id: res.tenancy_id }
    return tokenCache
  }
  throw new Error('Invalid authentication response')
}

export const fetchDatalbusAction = async (action: string, filters: any = {}) => {
  if (!tokenCache) {
    await authenticateDatalbus()
  }

  const payload = {
    token: tokenCache!.token,
    tenancy_id: tokenCache!.tenancy_id,
    action,
    filters,
  }

  try {
    const res = await pb.send('/backend/v1/busca_dados_datalbus', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })
    return res
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      await authenticateDatalbus()
      const res = await pb.send('/backend/v1/busca_dados_datalbus', {
        method: 'POST',
        body: JSON.stringify({
          token: tokenCache!.token,
          tenancy_id: tokenCache!.tenancy_id,
          action,
          filters,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      return res
    }

    if (err?.status === 404) {
      const resFallback = await pb.send('/backend/v1/buscaDadosDatalbus', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      })
      return resFallback
    }

    throw err
  }
}

export const checkDatalbusHealth = async () => {
  try {
    const res = await pb.send('/backend/v1/datalbus_healthcheck', {
      method: 'GET',
    })
    return res
  } catch (e: any) {
    if (e?.status === 404 || e?.status === 405) {
      return pb.send('/backend/v1/datalbus_healthcheck', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    }
    throw e
  }
}
