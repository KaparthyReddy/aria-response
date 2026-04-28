import { useState, useEffect } from 'react'

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export function useAlerts() {
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('aria_token')
    if (!token) return

    const url = `${BASE}/stream/alerts`
    let es

    try {
      es = new EventSource(url)

      es.onmessage = (e) => {
        if (e.data === 'ping') return
        setAlerts(prev => [{
          id: Date.now(),
          message: e.data,
          time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 20))
      }

      es.onerror = () => {
        es.close()
      }
    } catch (err) {
      console.warn('SSE not available:', err)
    }

    return () => es?.close()
  }, [])

  return alerts
}
