import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIncidentState } from '../hooks/useIncidentState'
import { useAlerts } from '../hooks/useAlerts'
import { getAssessment } from '../api/client'
import IncidentMap from '../components/IncidentMap'
import ResourcePanel from '../components/ResourcePanel'
import AIBriefing from '../components/AIBriefing'
import AlertFeed from '../components/AlertFeed'
import Scorecard from '../components/Scorecard'
import {
  RefreshCw, Brain, Radio, AlertTriangle,
  MapPin, Clock
} from 'lucide-react'

const SEVERITY_COLOR = (s) => {
  if (s >= 80) return 'text-red-400 border-red-400/30 bg-red-400/5'
  if (s >= 60) return 'text-orange-400 border-orange-400/30 bg-orange-400/5'
  if (s >= 40) return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5'
  return 'text-green-400 border-green-400/30 bg-green-400/5'
}

const TYPE_LABEL = {
  flood: '🌊', earthquake: '🏔', cyclone: '🌀',
  fire: '🔥', landslide: '⛰', industrial: '🏭',
  drought: '☀️', other: '⚠️'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { state, loading, refresh } = useIncidentState()
  const alerts = useAlerts()
  const [reasoning, setReasoning] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('incidents')

  const runAssessment = async () => {
    setAiLoading(true)
    try {
      const data = await getAssessment()
      setReasoning(data)
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  const incidents = state?.incidents || []
  const resources = state?.resources || []

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-aria-border shrink-0">
        <span className="text-xs font-mono text-aria-muted uppercase tracking-wider">
          Operations Dashboard
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={runAssessment}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-aria-accent/20 hover:bg-aria-accent/30 border border-aria-accent/30 text-aria-accent text-xs font-mono rounded transition-colors disabled:opacity-50"
          >
            <Brain size={12} />
            {aiLoading ? 'Running...' : 'Run Assessment'}
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-aria-surface hover:bg-aria-border border border-aria-border text-aria-muted text-xs font-mono rounded transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Body — 3 columns */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left column */}
        <div className="w-72 shrink-0 border-r border-aria-border flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-aria-border shrink-0">
            {['incidents', 'resources'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                  activeTab === tab
                    ? 'text-aria-accent border-b border-aria-accent'
                    : 'text-aria-muted hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'incidents' && (
              loading ? (
                <div className="text-aria-muted text-xs font-mono animate-pulse py-4 text-center">
                  Loading incidents...
                </div>
              ) : incidents.length === 0 ? (
                <div className="text-aria-muted text-xs font-mono py-4 text-center">
                  No active incidents
                </div>
              ) : (
                incidents.map(incident => (
                  <button
                    key={incident.id}
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    className={`w-full text-left border rounded p-2.5 space-y-1.5 transition-colors hover:border-aria-accent/50 ${SEVERITY_COLOR(incident.severity)}`}
                  >
                    <div className="flex items-start gap-1.5">
                      <span className="text-sm">{TYPE_LABEL[incident.disaster_type] || '⚠️'}</span>
                      <span className="text-xs font-mono font-semibold leading-tight">{incident.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono opacity-70">
                      <MapPin size={10} />
                      <span>{incident.district}, {incident.state}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="uppercase opacity-70">{incident.disaster_type}</span>
                      <span className="font-semibold">SEV {incident.severity}</span>
                    </div>
                  </button>
                ))
              )
            )}

            {activeTab === 'resources' && (
              <ResourcePanel resources={resources} />
            )}
          </div>
        </div>

        {/* Centre — map */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-aria-bg">
                <div className="text-aria-muted text-xs font-mono animate-pulse">Loading map...</div>
              </div>
            ) : (
              <IncidentMap
                incidents={incidents}
                resources={resources}
                onIncidentClick={(inc) => navigate(`/incidents/${inc.id}`)}
              />
            )}
          </div>

          {/* Alert feed */}
          <div className="h-28 border-t border-aria-border bg-aria-surface px-4 py-2 overflow-y-auto shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Radio size={11} className="text-aria-accent" />
              <span className="text-xs font-mono text-aria-muted uppercase tracking-wider">Live Feed</span>
            </div>
            <AlertFeed alerts={alerts} />
          </div>
        </div>

        {/* Right column */}
        <div className="w-80 shrink-0 border-l border-aria-border flex flex-col overflow-hidden">
          {/* Scorecard */}
          <div className="p-3 border-b border-aria-border shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={12} className="text-aria-warning" />
              <span className="text-xs font-mono text-aria-muted uppercase tracking-wider">Scorecards</span>
            </div>
            <Scorecard scorecard={state?.scorecard} />
          </div>

          {/* AI Briefing */}
          <div className="flex-1 overflow-y-auto p-3">
            <AIBriefing reasoning={reasoning} loading={aiLoading} />
          </div>
        </div>
      </div>
    </div>
  )
}
