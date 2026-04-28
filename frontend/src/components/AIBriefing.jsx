import React, { useState } from 'react'
import { Brain, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Target } from 'lucide-react'

const PRIORITY_COLOR = {
  critical: 'text-red-400 border-red-400/30 bg-red-400/10',
  high: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  low: 'text-green-400 border-green-400/30 bg-green-400/10',
}

export default function AIBriefing({ reasoning, loading }) {
  const [expanded, setExpanded] = useState(true)

  if (loading) return (
    <div className="flex items-center gap-2 text-aria-muted text-xs font-mono py-4 px-3">
      <Brain size={13} className="animate-pulse text-aria-accent" />
      AI reasoning in progress...
    </div>
  )

  if (!reasoning) return (
    <div className="text-aria-muted text-xs font-mono px-3 py-4">
      No assessment available. Run assessment from the dashboard.
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 text-left"
      >
        <Brain size={13} className="text-aria-accent shrink-0" />
        <span className="text-xs font-mono text-aria-accent uppercase tracking-wider flex-1">
          AI Assessment
        </span>
        <span className="text-xs font-mono text-aria-muted">
          {reasoning.confidence}% conf.
        </span>
        {expanded ? <ChevronUp size={12} className="text-aria-muted" /> : <ChevronDown size={12} className="text-aria-muted" />}
      </button>

      {expanded && (
        <div className="space-y-4">
          {/* Summary */}
          <p className="text-xs font-mono text-gray-300 leading-relaxed border-l-2 border-aria-accent/40 pl-3">
            {reasoning.assessment_summary}
          </p>

          {/* Key Risks */}
          {reasoning.key_risks?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={11} className="text-aria-warning" />
                <span className="text-aria-warning text-xs font-mono uppercase tracking-wider">Key Risks</span>
              </div>
              <ul className="space-y-1">
                {reasoning.key_risks.map((risk, i) => (
                  <li key={i} className="text-xs font-mono text-gray-400 flex gap-2">
                    <span className="text-aria-muted shrink-0">—</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {reasoning.recommendations?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Target size={11} className="text-aria-accent" />
                <span className="text-aria-accent text-xs font-mono uppercase tracking-wider">Recommendations</span>
              </div>
              <div className="space-y-2">
                {reasoning.recommendations.map((rec) => (
                  <div key={rec.action_id} className="border border-aria-border rounded p-2 space-y-1">
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded border shrink-0 ${PRIORITY_COLOR[rec.priority]}`}>
                        {rec.priority}
                      </span>
                      <span className="text-xs font-mono text-white">{rec.action}</span>
                    </div>
                    <p className="text-xs font-mono text-aria-muted pl-0">{rec.rationale}</p>
                    {rec.estimated_impact && (
                      <p className="text-xs font-mono text-aria-success/80">→ {rec.estimated_impact}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projected Outcome */}
          {reasoning.projected_outcome && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle size={11} className="text-aria-success" />
                <span className="text-aria-success text-xs font-mono uppercase tracking-wider">Projected Outcome</span>
              </div>
              <p className="text-xs font-mono text-gray-400 leading-relaxed">
                {reasoning.projected_outcome}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
