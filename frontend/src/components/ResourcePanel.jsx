import React from 'react'
import { Truck, Users, Helicopter, Package, Home, Stethoscope } from 'lucide-react'

const TYPE_ICON = {
  rescue_team: Users,
  medical_unit: Stethoscope,
  vehicle: Truck,
  helicopter: Helicopter,
  supplies: Package,
  shelter: Home,
}

const STATUS_COLOR = {
  available: 'text-aria-success border-aria-success/30 bg-aria-success/10',
  deployed: 'text-aria-warning border-aria-warning/30 bg-aria-warning/10',
  unavailable: 'text-aria-muted border-aria-border bg-aria-border/20',
}

export default function ResourcePanel({ resources = [] }) {
  const byType = resources.reduce((acc, r) => {
    acc[r.resource_type] = acc[r.resource_type] || []
    acc[r.resource_type].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      {Object.entries(byType).map(([type, items]) => {
        const Icon = TYPE_ICON[type] || Package
        const available = items.filter(r => r.status === 'available').length
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={12} className="text-aria-muted" />
              <span className="text-aria-muted text-xs font-mono uppercase tracking-wider">
                {type.replace('_', ' ')}
              </span>
              <span className="ml-auto text-xs font-mono text-aria-muted">
                <span className="text-aria-success">{available}</span>/{items.length}
              </span>
            </div>
            <div className="space-y-1">
              {items.map(r => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded border text-xs font-mono ${STATUS_COLOR[r.status]}`}
                >
                  <span className="truncate pr-2">{r.name}</span>
                  <span className="uppercase text-xs shrink-0">{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {resources.length === 0 && (
        <div className="text-aria-muted text-xs font-mono text-center py-4">
          No resources registered
        </div>
      )}
    </div>
  )
}
