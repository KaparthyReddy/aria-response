import React from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const SEVERITY_COLOR = (s) => {
  if (s >= 80) return '#ef4444'
  if (s >= 60) return '#f59e0b'
  if (s >= 40) return '#3b82f6'
  return '#10b981'
}

const STATUS_LABEL = {
  active: { label: 'ACTIVE', color: 'text-red-400' },
  contained: { label: 'CONTAINED', color: 'text-yellow-400' },
  resolved: { label: 'RESOLVED', color: 'text-green-400' },
  monitoring: { label: 'MONITORING', color: 'text-blue-400' },
}

export default function IncidentMap({ incidents = [], resources = [], onIncidentClick }) {
  const center = [20.5937, 78.9629]

  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution=""
      />

      {incidents.map(incident => (
        <CircleMarker
          key={incident.id}
          center={[incident.latitude, incident.longitude]}
          radius={8 + incident.severity / 20}
          pathOptions={{
            color: SEVERITY_COLOR(incident.severity),
            fillColor: SEVERITY_COLOR(incident.severity),
            fillOpacity: 0.7,
            weight: 1.5,
          }}
          eventHandlers={{
            click: () => onIncidentClick?.(incident)
          }}
        >
          <Popup className="aria-popup">
            <div style={{ fontFamily: 'monospace', fontSize: '12px', minWidth: '180px' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{incident.title}</div>
              <div style={{ color: '#9ca3af', marginBottom: 2 }}>
                {incident.district}, {incident.state}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <span style={{
                  background: SEVERITY_COLOR(incident.severity),
                  color: '#fff',
                  padding: '1px 6px',
                  borderRadius: 3,
                  fontSize: 11
                }}>
                  SEV {incident.severity}
                </span>
                <span style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase' }}>
                  {incident.disaster_type}
                </span>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {resources.map(resource => (
        <CircleMarker
          key={resource.id}
          center={[resource.latitude, resource.longitude]}
          radius={4}
          pathOptions={{
            color: resource.status === 'available' ? '#10b981' : '#6b7280',
            fillColor: resource.status === 'available' ? '#10b981' : '#6b7280',
            fillOpacity: 0.8,
            weight: 1,
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
              <div style={{ fontWeight: 600 }}>{resource.name}</div>
              <div style={{ color: '#9ca3af' }}>{resource.resource_type}</div>
              <div style={{ textTransform: 'uppercase', fontSize: 11, marginTop: 4 }}>
                {resource.status}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
