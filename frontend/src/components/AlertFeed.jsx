import React from 'react'
import { Radio } from 'lucide-react'

export default function AlertFeed({ alerts = [] }) {
  return (
    <div className="space-y-1">
      {alerts.length === 0 && (
        <div className="flex items-center gap-2 text-aria-muted text-xs font-mono py-2">
          <Radio size={11} className="animate-pulse" />
          Monitoring for alerts...
        </div>
      )}
      {alerts.map(alert => (
        <div key={alert.id} className="flex gap-2 text-xs font-mono">
          <span className="text-aria-muted shrink-0">{alert.time}</span>
          <span className="text-gray-300">{alert.message}</span>
        </div>
      ))}
    </div>
  )
}
