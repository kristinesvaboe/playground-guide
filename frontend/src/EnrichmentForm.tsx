import { useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'

export type Enrichment = {
  equipment: string[]
  transportInfo: string
  transportLocation: { lat: number; lng: number } | null
  notes: string | null
  reviewed: boolean
}

export type EnrichmentDraft = {
  equipment: string[]
  transportInfo: string
  transportLocation: { lat: number; lng: number } | null
  notes: string | null
}

// Enum values sent to the API paired with the human-facing label
const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Swing', label: 'Swing' },
  { value: 'Trampoline', label: 'Trampoline' },
  { value: 'Slide', label: 'Slide' },
  { value: 'ClimbingFrame', label: 'Climbing frame' },
  { value: 'Sandpit', label: 'Sandpit' },
  { value: 'Springy', label: 'Springy rider' },
  { value: 'Roundabout', label: 'Roundabout' },
]

const TRANSPORT_MAX = 200
const NOTES_MAX = 300

function PinPicker({
  centre,
  pin,
  onPlace,
}: {
  centre: [number, number]
  pin: { lat: number; lng: number } | null
  onPlace: (latlng: { lat: number; lng: number }) => void
}) {
  function ClickHandler() {
    useMapEvents({ click: (e) => onPlace({ lat: e.latlng.lat, lng: e.latlng.lng }) })
    return null
  }
  return (
    <MapContainer center={centre} zoom={15} className="pin-mini-map" style={{ height: '180px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ClickHandler />
      {pin && <Marker position={[pin.lat, pin.lng]} />}
    </MapContainer>
  )
}

export default function EnrichmentForm({
  playgroundName,
  centre,
  initial,
  onCancel,
  onSave,
}: {
  playgroundName: string | null
  centre: [number, number]
  initial: Enrichment | null
  onCancel: () => void
  onSave: (draft: EnrichmentDraft) => Promise<void>
}) {
  const [transportInfo, setTransportInfo] = useState(initial?.transportInfo ?? '')
  const [equipment, setEquipment] = useState<string[]>(initial?.equipment ?? [])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(initial?.transportLocation ?? null)
  const [showPinMap, setShowPinMap] = useState(false)
  const [transportError, setTransportError] = useState(false)
  const [saving, setSaving] = useState(false)
  const transportRef = useRef<HTMLTextAreaElement>(null)

  function toggleEquipment(value: string) {
    setEquipment((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function handleSave() {
    if (!transportInfo.trim()) {
      setTransportError(true)
      transportRef.current?.focus()
      transportRef.current?.scrollIntoView({ block: 'center' })
      return
    }
    setSaving(true)
    try {
      await onSave({
        equipment,
        transportInfo: transportInfo.trim(),
        transportLocation: pin,
        notes: notes.trim() ? notes.trim() : null,
      })
    } finally {
      setSaving(false)
    }
  }

  const transportNearLimit = transportInfo.length >= TRANSPORT_MAX * 0.8
  const notesNearLimit = notes.length >= NOTES_MAX * 0.8

  return (
    <>
      <div className="form-scrim" onClick={onCancel} />
      <div className="enrichment-form" role="dialog" aria-label="Add playground details">
        <div className="enrichment-form-header">
          <h2>{playgroundName ?? 'Playground'}</h2>
        </div>

        <div className="enrichment-form-body">
          <div className="field">
            <label htmlFor="transport">How do you get there? (required)</label>
            <p className="field-helper">
              Parking, nearest bus stop or train — anything that helps someone plan the trip.
            </p>
            <textarea
              id="transport"
              ref={transportRef}
              value={transportInfo}
              maxLength={TRANSPORT_MAX}
              aria-invalid={transportError}
              onChange={(e) => {
                setTransportInfo(e.target.value)
                if (transportError && e.target.value.trim()) setTransportError(false)
              }}
            />
            {transportNearLimit && (
              <span className="char-counter">{transportInfo.length}/{TRANSPORT_MAX}</span>
            )}
            {transportError && (
              <span className="field-error" role="alert">Please add how to get there.</span>
            )}
          </div>

          <div className="field">
            <label>Equipment</label>
            <div className="equipment-tags">
              {EQUIPMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`equipment-tag chip ${equipment.includes(opt.value) ? 'chip-selected' : ''}`}
                  aria-pressed={equipment.includes(opt.value)}
                  onClick={() => toggleEquipment(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Anything else?</label>
            <textarea
              id="notes"
              value={notes}
              maxLength={NOTES_MAX}
              placeholder="Shade, fenced, toilets nearby, busy times…"
              onChange={(e) => setNotes(e.target.value)}
            />
            {notesNearLimit && (
              <span className="char-counter">{notes.length}/{NOTES_MAX}</span>
            )}
          </div>

          <div className="field">
            {!showPinMap && !pin && (
              <button type="button" className="add-pin-btn" onClick={() => setShowPinMap(true)}>
                Add a pin (optional)
              </button>
            )}
            {(showPinMap || pin) && (
              <>
                <label>Location pin</label>
                <PinPicker centre={pin ? [pin.lat, pin.lng] : centre} pin={pin} onPlace={setPin} />
                {pin && (
                  <button type="button" className="clear-pin-btn" onClick={() => setPin(null)}>
                    Clear pin
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="enrichment-form-footer">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            Save
          </button>
        </div>
      </div>
    </>
  )
}
