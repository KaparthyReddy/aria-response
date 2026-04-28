import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCopilotFields, submitCopilotIntake } from '../api/client'
import {
  MessageSquare, Send, CheckCircle, Loader,
  AlertTriangle, Target, Brain, ArrowRight
} from 'lucide-react'

const PRIORITY_COLOR = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-green-400',
}

export default function CopilotChat() {
  const navigate = useNavigate()
  const [fields, setFields] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [report, setReport] = useState(null)
  const [done, setDone] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    getCopilotFields()
      .then(f => {
        setFields(f)
        setMessages([
          {
            role: 'aria',
            text: "ARIA Copilot online. I'll guide you through incident intake. Let's start:",
          },
          { role: 'aria', text: f[0]?.question || 'What is the incident title?' }
        ])
      })
      .catch(() => {
        setMessages([{
          role: 'aria',
          text: 'Copilot ready. What is the incident title?'
        }])
      })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (role, text, meta = null) => {
    setMessages(prev => [...prev, { role, text, meta, id: Date.now() + Math.random() }])
  }

  const handleSend = async (value) => {
    const text = (value || input).trim()
    if (!text || done) return
    setInput('')

    const field = fields[currentFieldIndex]
    if (!field) return

    addMessage('user', text)

    const newAnswers = { ...answers, [field.key]: field.input_type === 'number' ? Number(text) : text }
    setAnswers(newAnswers)

    const nextIndex = currentFieldIndex + 1

    if (nextIndex < fields.length) {
      setCurrentFieldIndex(nextIndex)
      setTimeout(() => addMessage('aria', fields[nextIndex].question), 400)
    } else {
      setCurrentFieldIndex(fields.length)
      addMessage('aria', 'All information collected. Running full AI assessment...')
      setSubmitting(true)

      try {
        const payload = {
          title: newAnswers.title || 'Untitled Incident',
          disaster_type: newAnswers.disaster_type || 'other',
          severity: Number(newAnswers.severity) || 50,
          location_name: newAnswers.location_name || 'Unknown',
          district: newAnswers.district || 'Unknown',
          state: newAnswers.state || 'Unknown',
          description: newAnswers.description || '',
          affected_population: newAnswers.affected_population
            ? Number(newAnswers.affected_population)
            : null,
        }

        const result = await submitCopilotIntake(payload)
        setReport(result)
        setDone(true)
        addMessage('aria', 'Assessment complete. Report generated below.', { type: 'report', data: result })
      } catch (e) {
        addMessage('aria', `Submission failed: ${e.response?.data?.detail || e.message}`)
      } finally {
        setSubmitting(false)
      }
    }
  }

  const currentField = fields[currentFieldIndex]
  const progress = fields.length > 0 ? (currentFieldIndex / fields.length) * 100 : 0

  return (
    <div className="h-full flex">
      {/* Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Progress */}
        <div className="px-4 py-2 border-b border-aria-border shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-aria-muted uppercase tracking-wider">
              Incident Intake
            </span>
            <span className="text-xs font-mono text-aria-muted">
              {Math.min(currentFieldIndex, fields.length)}/{fields.length} fields
            </span>
          </div>
          <div className="h-1 bg-aria-border rounded-full overflow-hidden">
            <div
              className="h-full bg-aria-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg ${msg.role === 'user' ? 'order-2' : ''}`}>
                {msg.role === 'aria' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Brain size={11} className="text-aria-accent" />
                    <span className="text-xs font-mono text-aria-accent">ARIA</span>
                  </div>
                )}
                <div className={`rounded-lg px-3 py-2 text-xs font-mono ${
                  msg.role === 'user'
                    ? 'bg-aria-accent/20 border border-aria-accent/30 text-white'
                    : 'bg-aria-surface border border-aria-border text-gray-300'
                }`}>
                  {msg.text}
                </div>

                {/* Report card */}
                {msg.meta?.type === 'report' && msg.meta.data && (
                  <ReportCard report={msg.meta.data} onNavigate={() => navigate(`/incidents/${msg.meta.data.incident.id}`)} />
                )}
              </div>
            </div>
          ))}

          {submitting && (
            <div className="flex justify-start">
              <div className="bg-aria-surface border border-aria-border rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader size={12} className="animate-spin text-aria-accent" />
                <span className="text-xs font-mono text-aria-muted">Processing...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-aria-border p-4 shrink-0">
          {/* Option chips */}
          {!done && currentField?.input_type === 'select' && currentField.options && (
            <div className="flex flex-wrap gap-2 mb-3">
              {currentField.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleSend(opt)}
                  className="px-2 py-1 bg-aria-surface border border-aria-border hover:border-aria-accent text-xs font-mono text-aria-muted hover:text-aria-accent rounded transition-colors capitalize"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={e => { e.preventDefault(); handleSend() }} className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={done || submitting}
              placeholder={done ? 'Report complete' : currentField?.label ? `Enter ${currentField.label.toLowerCase()}...` : ''}
              className="flex-1 bg-aria-bg border border-aria-border rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-aria-accent transition-colors placeholder-aria-muted disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={done || submitting || !input.trim()}
              className="px-3 py-2 bg-aria-accent hover:bg-blue-500 disabled:opacity-40 text-white rounded transition-colors"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar — field progress */}
      <div className="w-52 border-l border-aria-border bg-aria-surface p-3 overflow-y-auto shrink-0">
        <div className="text-aria-muted text-xs font-mono uppercase tracking-wider mb-3">Fields</div>
        <div className="space-y-1.5">
          {fields.map((field, i) => {
            const answered = i < currentFieldIndex
            const current = i === currentFieldIndex
            return (
              <div key={field.key} className={`flex items-center gap-2 text-xs font-mono px-2 py-1.5 rounded ${
                current ? 'bg-aria-accent/10 text-aria-accent' :
                answered ? 'text-aria-success' : 'text-aria-muted'
              }`}>
                {answered ? (
                  <CheckCircle size={11} className="shrink-0" />
                ) : current ? (
                  <ArrowRight size={11} className="shrink-0" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full border border-aria-border shrink-0" />
                )}
                <span className="truncate">{field.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ReportCard({ report, onNavigate }) {
  const { incident, reasoning, briefing } = report
  return (
    <div className="mt-3 border border-aria-accent/30 bg-aria-accent/5 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle size={13} className="text-aria-success" />
          <span className="text-xs font-mono text-aria-success uppercase tracking-wider">Incident Created</span>
        </div>
        <button
          onClick={onNavigate}
          className="text-xs font-mono text-aria-accent hover:underline flex items-center gap-1"
        >
          View Detail <ArrowRight size={11} />
        </button>
      </div>

      <div>
        <div className="text-white text-xs font-mono font-semibold">{incident.title}</div>
        <div className="text-aria-muted text-xs font-mono">
          {incident.district}, {incident.state} · SEV {incident.severity}
        </div>
      </div>

      {reasoning && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Brain size={11} className="text-aria-accent" />
            <span className="text-xs font-mono text-aria-accent uppercase tracking-wider">Assessment</span>
          </div>
          <p className="text-xs font-mono text-gray-300 leading-relaxed">
            {reasoning.assessment_summary}
          </p>

          {reasoning.recommendations?.slice(0, 2).map(rec => (
            <div key={rec.action_id} className="flex items-start gap-2">
              <Target size={10} className={`mt-0.5 shrink-0 ${PRIORITY_COLOR[rec.priority] || 'text-aria-muted'}`} />
              <span className="text-xs font-mono text-gray-400">{rec.action}</span>
            </div>
          ))}
        </div>
      )}

      {briefing && (
        <div className="space-y-1 border-t border-aria-border pt-3">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-aria-warning" />
            <span className="text-xs font-mono text-aria-warning uppercase tracking-wider">Outlook</span>
          </div>
          <p className="text-xs font-mono text-gray-400">{briefing.outlook}</p>
        </div>
      )}
    </div>
  )
}
