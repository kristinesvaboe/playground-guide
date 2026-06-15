import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { type Enrichment } from './EnrichmentForm'
import { EQUIPMENT_LABELS, AGE_LABELS, SIZE_LABELS } from './enrichmentOptions'
import { API_URL, CURRENT_USER_ID } from './config'
import FavouritesList, { type Favourite } from './FavouritesList'

// Leaflet's _getIconUrl prototype method ignores mergeOptions; delete it so the options are used instead
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

const STAVANGER: [number, number] = [58.9700, 5.7331]

// Heart badge marker for favourited pins; legible at 390px and stays clickable
const favouriteIcon = L.divIcon({
  className: 'favourite-pin',
  html: '<span aria-hidden="true">♥</span>',
  iconSize: [40, 40],
  iconAnchor: [20, 38],
})

// Pass an explicit default for non-favourite pins: icon={undefined} would override
// Leaflet's built-in default with undefined and crash on createIcon()
const defaultIcon = new L.Icon.Default()

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

function MapEvents({
  onMapClick,
  onMoveEnd,
}: {
  onMapClick: () => void
  onMoveEnd: (lat: number, lng: number, radius: number) => void
}) {
  const map = useMapEvents({
    click: onMapClick,
    moveend: () => {
      const center = map.getCenter()
      const radius = Math.round(map.distance(center, map.getBounds().getNorthEast()))
      onMoveEnd(center.lat, center.lng, radius)
    },
  })
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
  const [favourites, setFavourites] = useState<Favourite[]>([])
  const [favouritesOpen, setFavouritesOpen] = useState(false)

  const moveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const favouriteIds = new Set(favourites.map((f) => f.id))

  const loadFavourites = useCallback(() => {
    return fetch(`${API_URL}/favourites?userId=${CURRENT_USER_ID}`)
      .then((res) => res.json())
      .then(setFavourites)
      .catch(() => {})
  }, [])

  function toggleFavourite(id: string) {
    const isFavourite = favouriteIds.has(id)
    const request = isFavourite
      ? fetch(`${API_URL}/playgrounds/${id}/favourite?userId=${CURRENT_USER_ID}`, { method: 'DELETE' })
      : fetch(`${API_URL}/playgrounds/${id}/favourite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: CURRENT_USER_ID }),
        })
    return request.then(() => loadFavourites()).catch(() => {})
  }

  function loadPreview(id: string) {
    return fetch(`${API_URL}/playgrounds/${id}?userId=${CURRENT_USER_ID}`)
      .then((res) => res.json())
      .then(setPreview)
  }

  const loadPlaygrounds = useCallback((lat: number, lng: number, radius: number) => {
    fetch(`${API_URL}/playgrounds?lat=${lat}&lng=${lng}&radius=${radius}`)
      .then((res) => res.json())
      .then(setPlaygrounds)
      .catch(() => {})
  }, [])

  const handleMoveEnd = useCallback(
    (lat: number, lng: number, radius: number) => {
      // Panning away is a "show me elsewhere" gesture: drop the open preview so it
      // can't keep pointing at a marker that's about to leave the result set.
      setSelectedId(null)
      if (moveTimeout.current) clearTimeout(moveTimeout.current)
      moveTimeout.current = setTimeout(() => loadPlaygrounds(lat, lng, radius), 350)
    },
    [loadPlaygrounds]
  )

  // Drop any pending debounced fetch if the map unmounts mid-interaction
  useEffect(() => () => {
    if (moveTimeout.current) clearTimeout(moveTimeout.current)
  }, [])

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
    loadPlaygrounds(position[0], position[1], 5000)
  }, [position, loadPlaygrounds])

  useEffect(() => {
    loadFavourites()
  }, [loadFavourites])

  useEffect(() => {
    if (!selectedId) {
      setPreview(null)
      return
    }
    loadPreview(selectedId).catch(() => {})
  }, [selectedId])

  if (!position) return null

  const pending = preview?.myEnrichment && !preview.myEnrichment.reviewed

  return (
    <>
      <MapContainer center={position} zoom={14} style={{ height: '100dvh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapEvents onMapClick={() => setSelectedId(null)} onMoveEnd={handleMoveEnd} />
        {playgrounds.map((pg) => (
          <Marker
            key={pg.id}
            position={[pg.latitude, pg.longitude]}
            icon={favouriteIds.has(pg.id) ? favouriteIcon : defaultIcon}
            eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); setSelectedId(pg.id) } }}
          />
        ))}
      </MapContainer>

      <button
        className="favourites-toggle-btn"
        onClick={() => setFavouritesOpen(true)}
      >
        <span aria-hidden="true">♥</span> Favourites
      </button>

      {favouritesOpen && (
        <FavouritesList
          favourites={favourites}
          position={position}
          onClose={() => setFavouritesOpen(false)}
        />
      )}
      {preview && (
        <div className="preview-card">
          <div className="preview-card-header">
            <h2>{preview.name ?? 'Playground'}</h2>
            <button
              onClick={() => toggleFavourite(preview.id)}
              aria-label={favouriteIds.has(preview.id) ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={favouriteIds.has(preview.id)}
              className="favourite-toggle-btn"
            >
              {favouriteIds.has(preview.id) ? '♥' : '♡'}
            </button>
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
        </div>
      )}
    </>
  )
}

export default App
