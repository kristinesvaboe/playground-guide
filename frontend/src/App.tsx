import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import EnrichmentForm, { type Enrichment, type EnrichmentDraft } from './EnrichmentForm'
import { EQUIPMENT_LABELS, AGE_LABELS, SIZE_LABELS } from './enrichmentOptions'
import { API_URL, CURRENT_USER_ID } from './config'

// Leaflet's _getIconUrl prototype method ignores mergeOptions; delete it so the options are used instead
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

const STAVANGER: [number, number] = [58.9700, 5.7331]

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
  ageSuitability: string[] | null
  size: string | null
  myEnrichment: Enrichment | null
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick })
  return null
}

function App() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
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
    // Returning from the detail page: centre on that playground and re-open its preview
    if (focusId) {
      fetch(`${API_URL}/playgrounds/${focusId}?userId=${CURRENT_USER_ID}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((pg) => {
          if (!pg) return
          setPosition([pg.latitude, pg.longitude])
          setSelectedId(focusId)
        })
        .catch(() => {})
      return
    }

    if (!navigator.geolocation) {
      setPosition(STAVANGER)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition(STAVANGER)
    )
  }, [focusId])

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
    if (!res.ok) {
      const message = await res
        .json()
        .then((body) => body?.error as string | undefined)
        .catch(() => undefined)
      throw new Error(message ?? "Couldn't save — please try again.")
    }
    await loadPreview(selectedId).catch(() => {})
    setFormOpen(false)
  }

  if (!position) return null

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
              {preview.myEnrichment!.ageSuitability.length > 0 && (
                <div className="equipment-tags">
                  {preview.myEnrichment!.ageSuitability.map((a) => (
                    <span key={a} className="equipment-tag">{AGE_LABELS[a] ?? a}</span>
                  ))}
                </div>
              )}
              {preview.myEnrichment!.size && (
                <span className="size-pill">{SIZE_LABELS[preview.myEnrichment!.size] ?? preview.myEnrichment!.size}</span>
              )}
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
          {!pending && preview.ageSuitability !== null && preview.ageSuitability.length > 0 && (
            <div className="equipment-tags">
              {preview.ageSuitability.map((a) => (
                <span key={a} className="equipment-tag">{AGE_LABELS[a] ?? a}</span>
              ))}
            </div>
          )}
          {!pending && preview.size && (
            <span className="size-pill">{SIZE_LABELS[preview.size] ?? preview.size}</span>
          )}

          <button
            className="view-details-btn"
            onClick={() => navigate(`/playground/${preview.id}`)}
          >
            View details
          </button>
          <button className="details-btn" onClick={() => setFormOpen(true)}>
            {preview.myEnrichment ? 'Edit details' : 'Add details'}
          </button>
        </div>
      )}

      {preview && formOpen && (
        <EnrichmentForm
          playgroundName={preview.name}
          initial={preview.myEnrichment}
          onCancel={() => setFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

export default App
