import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import {
  LayoutDashboard, MessageSquare, LogOut,
  Radio, Shield, Menu, X
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/copilot', icon: MessageSquare, label: 'Copilot' },
  ]

  return (
    <div className="flex h-screen bg-aria-bg overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} transition-all duration-200 flex flex-col bg-aria-surface border-r border-aria-border shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 border-b border-aria-border">
          <div className="w-7 h-7 rounded bg-aria-accent flex items-center justify-center shrink-0">
            <Radio size={14} className="text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-white font-mono font-semibold text-sm tracking-widest">ARIA</span>
          )}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="ml-auto text-aria-muted hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-1 px-2">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2 rounded text-xs font-mono transition-colors ${
                  isActive
                    ? 'bg-aria-accent/20 text-aria-accent'
                    : 'text-aria-muted hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={15} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-aria-border p-3">
          {sidebarOpen && (
            <div className="mb-2">
              <div className="text-white text-xs font-mono truncate">{user?.full_name}</div>
              <div className="text-aria-muted text-xs uppercase tracking-wider">{user?.role}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-aria-muted hover:text-aria-danger text-xs font-mono transition-colors w-full"
          >
            <LogOut size={13} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-10 border-b border-aria-border flex items-center px-4 gap-3 shrink-0">
          <Shield size={12} className="text-aria-accent" />
          <span className="text-aria-muted text-xs font-mono">
            ADAPTIVE RESPONSE INTELLIGENCE AGENCY
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-aria-success text-xs font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-aria-success animate-pulse inline-block" />
              LIVE
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
