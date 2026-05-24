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

export const fetchDatalbusAction = async (
  action: string,
  filters: Record<string, unknown> = {},
) => {
  if (!tokenCache) {
    await authenticateDatalbus()
  }

  let finalFilters = { ...filters }

  Object.keys(finalFilters).forEach((key) => {
    if (finalFilters[key] === undefined || finalFilters[key] === null || finalFilters[key] === '') {
      delete finalFilters[key]
    }
  })

  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const defaultDateStr = `${year}-${month}-${day}`

  let dateVal = finalFilters.date || finalFilters.start_date || defaultDateStr
  if (typeof dateVal === 'string') {
    dateVal = dateVal.split('T')[0].split(' ')[0]
  }

  let startDateVal = finalFilters.start_date || dateVal
  if (typeof startDateVal === 'string') {
    startDateVal = startDateVal.split('T')[0].split(' ')[0]
  }

  let endDateVal = finalFilters.end_date || dateVal
  if (typeof endDateVal === 'string') {
    endDateVal = endDateVal.split('T')[0].split(' ')[0]
  }

  delete finalFilters.date

  finalFilters.start_date = startDateVal
  finalFilters.end_date = endDateVal

  const makeRequest = async (endpoint: string, currentToken: string, currentTenancy: string) => {
    const payload: Record<string, any> = {
      token: currentToken,
      tenancy_id: currentTenancy,
      action,
      date: dateVal,
      filters: finalFilters,
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
      '/backend/v1/busca_dados_datalbus',
      tokenCache!.token,
      tokenCache!.tenancy_id,
    )
  } catch (error: unknown) {
    const err = error as { status?: number; response?: { error?: string } }
    if (err?.status === 401 || err?.status === 403) {
      await authenticateDatalbus()
      try {
        res = await makeRequest(
          '/backend/v1/busca_dados_datalbus',
          tokenCache!.token,
          tokenCache!.tenancy_id,
        )
      } catch (retryError: unknown) {
        const retryErr = retryError as { status?: number; response?: { error?: string } }
        if (retryErr?.status === 400) {
          throw new Error(
            retryErr?.response?.error ||
              'Parâmetros ausentes ou inválidos. Verifique os filtros de data.',
          )
        }
        throw retryErr
      }
    } else if (err?.status === 400) {
      throw new Error(
        err?.response?.error || 'Parâmetros ausentes ou inválidos. Verifique os filtros de data.',
      )
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
  } catch (error: unknown) {
    const err = error as { status?: number }
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
