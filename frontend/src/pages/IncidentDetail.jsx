import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getIncident, getResources, updateIncidentStatus,
  deployResource, releaseResource, queryAI
} from '../api/client'
import { useAuth } from '../hooks/useAuth.jsx'
import AIBriefing from '../components/AIBriefing'
import {
  ArrowLeft, MapPin, Clock, Users, Send,
  CheckCircle, AlertCircle, Eye, Loader
} from 'lucide-react'

const STATUS_OPTIONS = ['active', 'contained', 'monitoring', 'resolved']
const STATUS_COLOR = {
  active: 'text-red-400',
  contained: 'text-yellow-400',
  resolved: 'text-green-400',
  monitoring: 'text-blue-400',
}

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [incident, setIncident] = useState(null)
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [querying, setQuerying] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const canEdit = user?.role === 'analyst' || user?.role === 'commander'

  useEffect(() => {
    Promise.all([getIncident(id), getResources()])
      .then(([inc, res]) => {
        setIncident(inc)
        setResources(res)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (status) => {
    if (!canEdit) return
    setStatusUpdating(true)
    try {
      const updated = await updateIncidentStatus(id, status)
      setIncident(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleDeploy = async (resourceId) => {
    try {
      await deployResource(resourceId, id)
      const res = await getResources()
      setResources(res)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRelease = async (resourceId) => {
    try {
      await releaseResource(resourceId)
      const res = await getResources()
      setResources(res)
    } catch (e) {
      console.error(e)
    }
  }

  const handleQuery = async (e) => {
    e.preventDefault()
    if (!question.trim()) return
    setQuerying(true)
    try {
      const data = await queryAI(question)
      setAnswer(data)
    } catch (e) {
      console.error(e)
    } finally {
      setQuerying(false)
    }
  }

  const assignedResources = resources.filter(r => r.assigned_incident_id === id)
  const availableResources = resources.filter(r => r.status === 'available')

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-aria-muted text-xs font-mono animate-pulse">Loading incident...</div>
    </div>
  )

  if (!incident) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-aria-danger text-xs font-mono">Incident not found</div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-aria-muted hover:text-white transition-colors mt-0.5"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-mono font-semibold text-base">{incident.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-xs font-mono text-aria-muted">
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {incident.location_name}, {incident.district}, {incident.state}
              </span>
              <span className="uppercase">{incident.disaster_type}</span>
              <span className={`uppercase font-semibold ${STATUS_COLOR[incident.status]}`}>
                {incident.status}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-white">{incident.severity}</div>
            <div className="text-aria-muted text-xs font-mono">severity</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">

          {/* Left — details + status */}
          <div className="col-span-2 space-y-4">

            {/* Description */}
            <div className="bg-aria-surface border border-aria-border rounded-lg p-4">
              <div className="text-aria-muted text-xs font-mono uppercase tracking-wider mb-2">Situation Report</div>
              <p className="text-gray-300 text-sm font-mono leading-relaxed">{incident.description}</p>
              {incident.affected_population && (
                <div className="flex items-center gap-2 mt-3 text-xs font-mono text-aria-muted">
                  <Users size={11} />
                  <span>{incident.affected_population.toLocaleString()} people affected</span>
                </div>
              )}
            </div>

            {/* Status update */}
            {canEdit && (
              <div className="bg-aria-surface border border-aria-border rounded-lg p-4">
                <div className="text-aria-muted text-xs font-mono uppercase tracking-wider mb-3">Update Status</div>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={statusUpdating || incident.status === s}
                      className={`px-3 py-1.5 rounded border text-xs font-mono uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        incident.status === s
                          ? 'bg-aria-accent/20 border-aria-accent text-aria-accent'
                          : 'border-aria-border text-aria-muted hover:border-aria-accent/50 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Query */}
            <div className="bg-aria-surface border border-aria-border rounded-lg p-4">
              <div className="text-aria-muted text-xs font-mono uppercase tracking-wider mb-3">Ask AI</div>
              <form onSubmit={handleQuery} className="flex gap-2">
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="What resources are needed here?"
                  className="flex-1 bg-aria-bg border border-aria-border rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-aria-accent transition-colors placeholder-aria-muted"
                />
                <button
                  type="submit"
                  disabled={querying || !question.trim()}
                  className="px-3 py-2 bg-aria-accent hover:bg-blue-500 disabled:opacity-50 text-white rounded transition-colors"
                >
                  {querying ? <Loader size={13} className="animate-spin" /> : <Send size={13} />}
                </button>
              </form>

              {answer && (
                <div className="mt-3 space-y-2">
                  <p className="text-gray-300 text-xs font-mono leading-relaxed border-l-2 border-aria-accent/40 pl-3">
                    {answer.answer}
                  </p>
                  {answer.supporting_points?.length > 0 && (
                    <ul className="space-y-1 pl-3">
                      {answer.supporting_points.map((p, i) => (
                        <li key={i} className="text-aria-muted text-xs font-mono flex gap-2">
                          <span>—</span><span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="text-aria-muted text-xs font-mono">
                    Confidence: {answer.confidence}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right — resources */}
          <div className="space-y-4">
            {/* Assigned */}
            <div className="bg-aria-surface border border-aria-border rounded-lg p-4">
              <div className="text-aria-muted text-xs font-mono uppercase tracking-wider mb-3">
                Assigned Resources ({assignedResources.length})
              </div>
              {assignedResources.length === 0 ? (
                <div className="text-aria-muted text-xs font-mono">None assigned</div>
              ) : (
                <div className="space-y-2">
                  {assignedResources.map(r => (
                    <div key={r.id} className="border border-aria-warning/30 bg-aria-warning/5 rounded p-2">
                      <div className="text-yellow-400 text-xs font-mono font-semibold truncate">{r.name}</div>
                      <div className="text-aria-muted text-xs font-mono">{r.resource_type}</div>
                      {canEdit && (
                        <button
                          onClick={() => handleRelease(r.id)}
                          className="text-xs font-mono text-aria-muted hover:text-aria-danger transition-colors mt-1"
                        >
                          Release
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Deploy */}
            {canEdit && availableResources.length > 0 && (
              <div className="bg-aria-surface border border-aria-border rounded-lg p-4">
                <div className="text-aria-muted text-xs font-mono uppercase tracking-wider mb-3">
                  Deploy Resource
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableResources.map(r => (
                    <div key={r.id} className="flex items-center justify-between border border-aria-border rounded p-2">
                      <div>
                        <div className="text-white text-xs font-mono truncate max-w-32">{r.name}</div>
                        <div className="text-aria-muted text-xs font-mono">{r.resource_type}</div>
                      </div>
                      <button
                        onClick={() => handleDeploy(r.id)}
                        className="text-xs font-mono text-aria-accent hover:text-blue-300 transition-colors shrink-0"
                      >
                        Deploy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
