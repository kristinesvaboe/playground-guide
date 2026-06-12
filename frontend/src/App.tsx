import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Leaflet's _getIconUrl prototype method ignores mergeOptions; delete it so the options are used instead
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
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
      return
    }
    fetch(`${API_URL}/playgrounds/${selectedId}`)
      .then((res) => res.json())
      .then(setPreview)
      .catch(() => {})
  }, [selectedId])

  if (!position) return null

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
      {preview && (
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
          {preview.equipment === null && (
            <p className="muted">No details added yet</p>
          )}
          {preview.equipment !== null && preview.equipment.length === 0 && (
            <p className="muted">No equipment listed</p>
          )}
          {preview.equipment !== null && preview.equipment.length > 0 && (
            <div className="equipment-tags">
              {preview.equipment.map((eq) => (
                <span key={eq} className="equipment-tag">{eq}</span>
              ))}
            </div>
          )}
          <button className="view-details-btn" disabled>View details</button>
        </div>
      )}
    </>
  )
}

export default App
