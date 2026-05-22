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

  let finalFilters = { ...filters }

  Object.keys(finalFilters).forEach((key) => {
    if (finalFilters[key] === undefined || finalFilters[key] === null || finalFilters[key] === '') {
      delete finalFilters[key]
    }
  })

  if (
    (action === 'trips' || action === 'tripEvents' || action === 'events') &&
    Object.keys(finalFilters).length === 0
  ) {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    finalFilters = {
      start_date: `${dateStr}T00:00:00`,
      end_date: `${dateStr}T23:59:59`,
    }
  }

  const makeRequest = async (endpoint: string, currentToken: string, currentTenancy: string) => {
    const payload: Record<string, any> = {
      token: currentToken,
      tenancy_id: currentTenancy,
      action,
    }

    if (Object.keys(finalFilters).length > 0) {
      payload.filters = finalFilters
    }

    return pb.send(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let res
  try {
    res = await makeRequest(
      '/backend/v1/buscaDadosDatalbus',
      tokenCache!.token,
      tokenCache!.tenancy_id,
    )
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      await authenticateDatalbus()
      try {
        res = await makeRequest(
          '/backend/v1/buscaDadosDatalbus',
          tokenCache!.token,
          tokenCache!.tenancy_id,
        )
      } catch (retryErr: any) {
        if (retryErr?.status === 404) {
          try {
            res = await makeRequest(
              '/backend/v1/busca_dados_datalbus',
              tokenCache!.token,
              tokenCache!.tenancy_id,
            )
          } catch (fbErr: any) {
            if (fbErr?.status === 400)
              throw new Error('Parâmetros ausentes ou inválidos. Verifique os filtros de data.')
            throw fbErr
          }
        } else if (retryErr?.status === 400) {
          throw new Error('Parâmetros ausentes ou inválidos. Verifique os filtros de data.')
        } else {
          throw retryErr
        }
      }
    } else if (err?.status === 404) {
      try {
        res = await makeRequest(
          '/backend/v1/busca_dados_datalbus',
          tokenCache!.token,
          tokenCache!.tenancy_id,
        )
      } catch (fallbackErr: any) {
        if (fallbackErr?.status === 400)
          throw new Error('Parâmetros ausentes ou inválidos. Verifique os filtros de data.')
        throw fallbackErr
      }
    } else if (err?.status === 400) {
      throw new Error('Parâmetros ausentes ou inválidos. Verifique os filtros de data.')
    } else {
      throw err
    }
  }

  return res
}

export const checkDatalbusHealth = async () => {
  if (!tokenCache) {
    await authenticateDatalbus()
  }

  let payload = {
    token: tokenCache!.token,
    tenancy_id: tokenCache!.tenancy_id,
  }

  try {
    const res = await pb.send('/backend/v1/datalbus_healthcheck', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })
    return res
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      await authenticateDatalbus()
      payload = {
        token: tokenCache!.token,
        tenancy_id: tokenCache!.tenancy_id,
      }
      return pb.send('/backend/v1/datalbus_healthcheck', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      })
    }
    throw err
  }
}
