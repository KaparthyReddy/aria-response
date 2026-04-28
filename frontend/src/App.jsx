import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import IncidentDetail from './pages/IncidentDetail'
import CopilotChat from './pages/CopilotChat'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-aria-bg">
      <div className="text-aria-accent font-mono text-sm animate-pulse">ARIA INITIALIZING...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="copilot" element={<CopilotChat />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
