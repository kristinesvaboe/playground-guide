import { useState } from 'react'

export type Enrichment = {
  equipment: string[]
  transportInfo: string | null
  notes: string | null
  reviewed: boolean
}

export type EnrichmentDraft = {
  equipment: string[]
  transportInfo: string | null
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

export default function EnrichmentForm({
  playgroundName,
  initial,
  onCancel,
  onSave,
}: {
  playgroundName: string | null
  initial: Enrichment | null
  onCancel: () => void
  onSave: (draft: EnrichmentDraft) => Promise<void>
}) {
  const [transportInfo, setTransportInfo] = useState(initial?.transportInfo ?? '')
  const [equipment, setEquipment] = useState<string[]>(initial?.equipment ?? [])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [emptyError, setEmptyError] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function toggleEquipment(value: string) {
    setEquipment((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function handleSave() {
    if (equipment.length === 0 && !transportInfo.trim() && !notes.trim()) {
      setEmptyError(true)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        equipment,
        transportInfo: transportInfo.trim() ? transportInfo.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save — please try again.")
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
            <label htmlFor="transport">How do you get there?</label>
            <p className="field-helper">
              Parking, nearest bus stop or train — anything that helps someone plan the trip.
            </p>
            <textarea
              id="transport"
              value={transportInfo}
              maxLength={TRANSPORT_MAX}
              onChange={(e) => {
                setTransportInfo(e.target.value)
                if (emptyError && e.target.value.trim()) setEmptyError(false)
              }}
            />
            {transportNearLimit && (
              <span className="char-counter">{transportInfo.length}/{TRANSPORT_MAX}</span>
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
                  onClick={() => {
                    toggleEquipment(opt.value)
                    if (emptyError) setEmptyError(false)
                  }}
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
              onChange={(e) => {
                setNotes(e.target.value)
                if (emptyError && e.target.value.trim()) setEmptyError(false)
              }}
            />
            {notesNearLimit && (
              <span className="char-counter">{notes.length}/{NOTES_MAX}</span>
            )}
          </div>

          {emptyError && (
            <span className="field-error" role="alert">Add at least one detail to save.</span>
          )}
        </div>

        {saveError && (
          <p className="save-error" role="alert">{saveError}</p>
        )}

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
