import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import EnrichmentForm, { type Enrichment, type EnrichmentDraft } from './EnrichmentForm'

// Leaflet's _getIconUrl prototype method ignores mergeOptions; delete it so the options are used instead
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const STAVANGER: [number, number] = [58.9700, 5.7331]

// Placeholder identity until authentication exists; matches AppDbContext.SeedUserId
const CURRENT_USER_ID = 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d'

const EQUIPMENT_LABELS: Record<string, string> = {
  Swing: 'Swing',
  Trampoline: 'Trampoline',
  Slide: 'Slide',
  ClimbingFrame: 'Climbing frame',
  Sandpit: 'Sandpit',
  Springy: 'Springy rider',
  Roundabout: 'Roundabout',
}

type Playground = {
  id: string
  name: string | null
  latitude: number
  longitude: number
}

type PlaygroundPreview = {
  id: string
  name: string | null
  equipment: string[] | null
  myEnrichment: Enrichment | null
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick })
  return null
}

function App() {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PlaygroundPreview | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  function loadPreview(id: string) {
    return fetch(`${API_URL}/playgrounds/${id}?userId=${CURRENT_USER_ID}`)
      .then((res) => res.json())
      .then(setPreview)
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setPosition(STAVANGER)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition(STAVANGER)
    )
  }, [])

  useEffect(() => {
    if (!position) return
    const [lat, lng] = position
    fetch(`${API_URL}/playgrounds?lat=${lat}&lng=${lng}&radius=5000`)
      .then((res) => res.json())
      .then(setPlaygrounds)
      .catch(() => {})
  }, [position])

  useEffect(() => {
    if (!selectedId) {
      setPreview(null)
      setFormOpen(false)
      return
    }
    loadPreview(selectedId).catch(() => {})
  }, [selectedId])

  async function handleSave(draft: EnrichmentDraft) {
    if (!selectedId) return
    const method = preview?.myEnrichment ? 'PUT' : 'POST'
    const res = await fetch(`${API_URL}/playgrounds/${selectedId}/enrichment`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: CURRENT_USER_ID, ...draft }),
    })
    if (!res.ok) return
    await loadPreview(selectedId)
    setFormOpen(false)
  }

  if (!position) return null

  const selectedPlayground = playgrounds.find((pg) => pg.id === selectedId)
  const formCentre: [number, number] = selectedPlayground
    ? [selectedPlayground.latitude, selectedPlayground.longitude]
    : position
  const pending = preview?.myEnrichment && !preview.myEnrichment.reviewed

  return (
    <>
      <MapContainer center={position} zoom={14} style={{ height: '100dvh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapClickHandler onMapClick={() => setSelectedId(null)} />
        {playgrounds.map((pg) => (
          <Marker
            key={pg.id}
            position={[pg.latitude, pg.longitude]}
            eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); setSelectedId(pg.id) } }}
          />
        ))}
      </MapContainer>
      {preview && !formOpen && (
        <div className="preview-card">
          <div className="preview-card-header">
            <h2>{preview.name ?? 'Playground'}</h2>
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="preview-close-btn"
            >
              ×
            </button>
          </div>

          {pending && (
            <>
              <span className="pending-badge">Pending review — only you can see this</span>
              <div className="equipment-tags">
                {preview.myEnrichment!.equipment.map((eq) => (
                  <span key={eq} className="equipment-tag">{EQUIPMENT_LABELS[eq] ?? eq}</span>
                ))}
              </div>
              {preview.myEnrichment!.notes && (
                <p className="pending-notes">{preview.myEnrichment!.notes}</p>
              )}
            </>
          )}

          {!pending && preview.equipment === null && (
            <p className="muted">No details added yet</p>
          )}
          {!pending && preview.equipment !== null && preview.equipment.length === 0 && (
            <p className="muted">No equipment listed</p>
          )}
          {!pending && preview.equipment !== null && preview.equipment.length > 0 && (
            <div className="equipment-tags">
              {preview.equipment.map((eq) => (
                <span key={eq} className="equipment-tag">{EQUIPMENT_LABELS[eq] ?? eq}</span>
              ))}
            </div>
          )}

          <button className="details-btn" onClick={() => setFormOpen(true)}>
            {preview.myEnrichment ? 'Edit details' : 'Add details'}
          </button>
        </div>
      )}

      {preview && formOpen && (
        <EnrichmentForm
          playgroundName={preview.name}
          centre={formCentre}
          initial={preview.myEnrichment}
          onCancel={() => setFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

export default App
