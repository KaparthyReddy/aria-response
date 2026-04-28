import { useState, useEffect, createContext, useContext } from 'react'
import { login as apiLogin } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('aria_user')
    const token = localStorage.getItem('aria_token')
    if (stored && token) {
      try { setUser(JSON.parse(stored)) } catch { }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const data = await apiLogin(email, password)
    localStorage.setItem('aria_token', data.access_token)
    localStorage.setItem('aria_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('aria_token')
    localStorage.removeItem('aria_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
