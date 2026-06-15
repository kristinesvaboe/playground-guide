import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import './PlaygroundDetail.css'
import EnrichmentForm, { type Enrichment, type EnrichmentDraft } from './EnrichmentForm'
import { EQUIPMENT_LABELS, AGE_LABELS, SIZE_LABELS } from './enrichmentOptions'
import { API_URL, CURRENT_USER_ID } from './config'

type PlaygroundDetailResponse = {
  id: string
  name: string | null
  latitude: number
  longitude: number
  equipment: string[] | null
  ageSuitability: string[] | null
  size: string | null
  otherEquipment: string | null
  transportInfo: string | null
  notes: string | null
  myEnrichment: Enrichment | null
}

export default function PlaygroundDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<PlaygroundDetailResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [formOpen, setFormOpen] = useState(false)

  function loadDetail() {
    return fetch(`${API_URL}/playgrounds/${id}?userId=${CURRENT_USER_ID}`)
      .then((res) => {
        if (res.status === 404) {
          setStatus('notfound')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (!data) return
        setDetail(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }

  useEffect(() => {
    if (!id) return
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSave(draft: EnrichmentDraft) {
    if (!id) return
    const method = detail?.myEnrichment ? 'PUT' : 'POST'
    const res = await fetch(`${API_URL}/playgrounds/${id}/enrichment`, {
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
    await loadDetail()
    setFormOpen(false)
  }

  function hideFromMyView() {
    if (!id) return
    // Return to the map (no focus) so it reloads without the now-hidden playground;
    // a failed request self-corrects since the playground stays visible.
    fetch(`${API_URL}/playgrounds/${id}/hide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: CURRENT_USER_ID }),
    })
      .catch(() => {})
      .finally(() => navigate('/'))
  }

  if (status === 'loading') {
    return <div className="detail-page"><p className="detail-loading">Loading…</p></div>
  }

  if (status === 'notfound' || status === 'error' || !detail) {
    const message =
      status === 'error'
        ? "Couldn't load — check your connection."
        : 'This playground could not be found.'
    return (
      <div className="detail-page">
        <button className="detail-back-btn" onClick={() => navigate('/')}>← Back to map</button>
        <p className="detail-notfound">{message}</p>
      </div>
    )
  }

  const pending = detail.myEnrichment && !detail.myEnrichment.reviewed
  const view = pending ? detail.myEnrichment! : detail
  const hasDetails = pending || detail.equipment !== null

  const { equipment, ageSuitability, size, otherEquipment, transportInfo, notes } = view

  return (
    <div className="detail-page">
      <button className="detail-back-btn" onClick={() => navigate(`/?focus=${detail.id}`)}>
        ← Back to map
      </button>

      <div className="detail-body">
        <h1>{detail.name ?? 'Playground'}</h1>

        {pending && (
          <span className="pending-badge">Pending review — only you can see this</span>
        )}

        {!hasDetails && <p className="muted">No details added yet</p>}

        {equipment && equipment.length > 0 && (
          <div className="detail-section">
            <h2>Equipment</h2>
            <div className="equipment-tags">
              {equipment.map((eq) => (
                <span key={eq} className="equipment-tag">{EQUIPMENT_LABELS[eq] ?? eq}</span>
              ))}
            </div>
          </div>
        )}

        {ageSuitability && ageSuitability.length > 0 && (
          <div className="detail-section">
            <h2>Suitable for</h2>
            <div className="equipment-tags">
              {ageSuitability.map((a) => (
                <span key={a} className="equipment-tag">{AGE_LABELS[a] ?? a}</span>
              ))}
            </div>
          </div>
        )}

        {size && (
          <div className="detail-section">
            <h2>Size</h2>
            <span className="size-pill">{SIZE_LABELS[size] ?? size}</span>
          </div>
        )}

        {otherEquipment && (
          <div className="detail-section">
            <h2>Other equipment</h2>
            <p>{otherEquipment}</p>
          </div>
        )}

        <MapContainer
          center={[detail.latitude, detail.longitude]}
          zoom={16}
          dragging={false}
          zoomControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          keyboard={false}
          touchZoom={false}
          attributionControl={false}
          className="detail-map"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[detail.latitude, detail.longitude]} />
        </MapContainer>

        {transportInfo && (
          <div className="detail-section">
            <h2>Getting there</h2>
            <p>{transportInfo}</p>
          </div>
        )}

        {notes && (
          <div className="detail-section">
            <h2>Notes</h2>
            <p>{notes}</p>
          </div>
        )}

        <button className="detail-edit-btn" onClick={() => setFormOpen(true)}>
          {detail.myEnrichment ? 'Edit details' : 'Add details'}
        </button>

        <button className="hide-mine-btn" onClick={hideFromMyView}>
          Hide from my map
        </button>
      </div>

      {formOpen && (
        <EnrichmentForm
          playgroundName={detail.name}
          initial={detail.myEnrichment}
          onCancel={() => setFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
