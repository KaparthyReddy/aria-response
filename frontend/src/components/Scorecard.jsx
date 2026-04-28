import React from 'react'

function ScoreBar({ value, color }) {
  return (
    <div className="h-1 w-full bg-aria-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  )
}

function ScoreCard({ label, value, color, subtitle }) {
  return (
    <div className="bg-aria-surface border border-aria-border rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-aria-muted text-xs font-mono uppercase tracking-wider">{label}</span>
        <span className="text-lg font-mono font-semibold" style={{ color }}>{value}</span>
      </div>
      <ScoreBar value={value} color={color} />
      {subtitle && <p className="text-aria-muted text-xs font-mono">{subtitle}</p>}
    </div>
  )
}

export default function Scorecard({ scorecard }) {
  if (!scorecard) return (
    <div className="text-aria-muted text-xs font-mono text-center py-4">Loading scores...</div>
  )

  const riskColor = scorecard.overall_risk >= 70 ? '#ef4444' : scorecard.overall_risk >= 40 ? '#f59e0b' : '#10b981'
  const gapColor = scorecard.coverage_gap >= 70 ? '#ef4444' : scorecard.coverage_gap >= 40 ? '#f59e0b' : '#10b981'
  const readinessColor = scorecard.resource_readiness >= 60 ? '#10b981' : scorecard.resource_readiness >= 30 ? '#f59e0b' : '#ef4444'

  return (
    <div className="grid grid-cols-2 gap-2">
      <ScoreCard
        label="Overall Risk"
        value={scorecard.overall_risk}
        color={riskColor}
        subtitle={`${scorecard.critical_incidents} critical`}
      />
      <ScoreCard
        label="Coverage Gap"
        value={scorecard.coverage_gap}
        color={gapColor}
        subtitle="uncovered incidents"
      />
      <ScoreCard
        label="Readiness"
        value={scorecard.resource_readiness}
        color={readinessColor}
        subtitle={`${scorecard.available_resources} available`}
      />
      <div className="bg-aria-surface border border-aria-border rounded p-3 space-y-2">
        <span className="text-aria-muted text-xs font-mono uppercase tracking-wider">Incidents</span>
        <div className="flex items-end gap-1">
          <span className="text-lg font-mono font-semibold text-white">{scorecard.active_incidents}</span>
          <span className="text-aria-muted text-xs font-mono mb-0.5">active</span>
        </div>
        <div className="text-xs font-mono text-aria-muted">
          {scorecard.deployed_resources} resources deployed
        </div>
      </div>
    </div>
  )
}
