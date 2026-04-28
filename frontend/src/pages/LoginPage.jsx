import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Shield, Radio } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-aria-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-aria-accent flex items-center justify-center">
            <Radio size={20} className="text-white" />
          </div>
          <div>
            <div className="text-white font-mono font-bold text-xl tracking-widest">ARIA</div>
            <div className="text-aria-muted text-xs font-mono tracking-wider">RESPONSE INTELLIGENCE</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-aria-surface border border-aria-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={13} className="text-aria-accent" />
            <span className="text-xs font-mono text-aria-muted uppercase tracking-wider">Secure Access</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-aria-muted uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-aria-bg border border-aria-border rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-aria-accent transition-colors"
              placeholder="commander@aria.gov"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-aria-muted uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-aria-bg border border-aria-border rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-aria-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-aria-danger text-xs font-mono bg-aria-danger/10 border border-aria-danger/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-aria-accent hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono text-sm py-2 rounded transition-colors"
          >
            {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-4 border border-aria-border rounded-lg p-4 space-y-2">
          <div className="text-aria-muted text-xs font-mono uppercase tracking-wider mb-2">Demo Credentials</div>
          {[
            { role: 'Commander', email: 'commander@aria.gov' },
            { role: 'Analyst', email: 'analyst@aria.gov' },
            { role: 'Field', email: 'field@aria.gov' },
          ].map(({ role, email: e }) => (
            <button
              key={e}
              onClick={() => { setEmail(e); setPassword('aria2026') }}
              className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded hover:bg-aria-border/30 transition-colors"
            >
              <span className="text-xs font-mono text-aria-accent">{role}</span>
              <span className="text-xs font-mono text-aria-muted">{e}</span>
            </button>
          ))}
          <div className="text-aria-muted text-xs font-mono pt-1">password: aria2026</div>
        </div>
      </div>
    </div>
  )
}
