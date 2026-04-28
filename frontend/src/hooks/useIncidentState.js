import { useState, useEffect, useCallback } from 'react'
import { getState } from '../api/client'

export function useIncidentState(pollInterval = 15000) {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await getState()
      setState(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, pollInterval)
    return () => clearInterval(interval)
  }, [refresh, pollInterval])

  return { state, loading, error, refresh }
}
