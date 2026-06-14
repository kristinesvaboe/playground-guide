import { useState } from 'react'
import { EQUIPMENT_OPTIONS, AGE_OPTIONS, SIZE_OPTIONS, SURFACE_OPTIONS } from './enrichmentOptions'
import './App.css'

export type Enrichment = {
  equipment: string[]
  ageSuitability: string[]
  size: string | null
  surfaceType: string[]
  otherEquipment: string | null
  transportInfo: string | null
  notes: string | null
  reviewed: boolean
}

export type EnrichmentDraft = {
  equipment: string[]
  ageSuitability: string[]
  size: string | null
  surfaceType: string[]
  otherEquipment: string | null
  transportInfo: string | null
  notes: string | null
}

const TRANSPORT_MAX = 200
const NOTES_MAX = 300
const OTHER_EQUIPMENT_MAX = 200

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
  const [ageSuitability, setAgeSuitability] = useState<string[]>(initial?.ageSuitability ?? [])
  const [equipment, setEquipment] = useState<string[]>(initial?.equipment ?? [])
  const [otherEquipment, setOtherEquipment] = useState(initial?.otherEquipment ?? '')
  const [size, setSize] = useState<string | null>(initial?.size ?? null)
  const [surfaceType, setSurfaceType] = useState<string[]>(initial?.surfaceType ?? [])
  const [transportInfo, setTransportInfo] = useState(initial?.transportInfo ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [emptyError, setEmptyError] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function toggleEquipment(value: string) {
    setEquipment((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
    if (emptyError) setEmptyError(false)
  }

  function toggleAgeSuitability(value: string) {
    setAgeSuitability((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
    if (emptyError) setEmptyError(false)
  }

  function toggleSize(value: string) {
    setSize((prev) => (prev === value ? null : value))
    if (emptyError) setEmptyError(false)
  }

  function toggleSurfaceType(value: string) {
    setSurfaceType((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
    if (emptyError) setEmptyError(false)
  }

  async function handleSave() {
    if (
      equipment.length === 0 &&
      ageSuitability.length === 0 &&
      size === null &&
      surfaceType.length === 0 &&
      !otherEquipment.trim() &&
      !transportInfo.trim() &&
      !notes.trim()
    ) {
      setEmptyError(true)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        equipment,
        ageSuitability,
        size,
        surfaceType,
        otherEquipment: otherEquipment.trim() ? otherEquipment.trim() : null,
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
            <label>Age suitability</label>
            <div className="equipment-tags">
              {AGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`equipment-tag chip ${ageSuitability.includes(opt.value) ? 'chip-selected' : ''}`}
                  aria-pressed={ageSuitability.includes(opt.value)}
                  onClick={() => toggleAgeSuitability(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
            <label htmlFor="otherEquipment">Other equipment</label>
            <p className="field-helper">Anything not in the list — zip wire, water play, etc.</p>
            <textarea
              id="otherEquipment"
              value={otherEquipment}
              maxLength={OTHER_EQUIPMENT_MAX}
              placeholder="e.g. zip wire, water play…"
              onChange={(e) => {
                setOtherEquipment(e.target.value)
                if (emptyError && e.target.value.trim()) setEmptyError(false)
              }}
            />
            {otherEquipment.length >= OTHER_EQUIPMENT_MAX * 0.8 && (
              <span className="char-counter">{otherEquipment.length}/{OTHER_EQUIPMENT_MAX}</span>
            )}
          </div>

          <div className="field">
            <label>Size</label>
            <div className="equipment-tags" role="radiogroup" aria-label="Playground size">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={size === opt.value}
                  className={`equipment-tag chip ${size === opt.value ? 'chip-selected' : ''}`}
                  onClick={() => toggleSize(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Surface type</label>
            <div className="equipment-tags">
              {SURFACE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`equipment-tag chip ${surfaceType.includes(opt.value) ? 'chip-selected' : ''}`}
                  aria-pressed={surfaceType.includes(opt.value)}
                  onClick={() => toggleSurfaceType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="form-divider" />

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
            <span className="field-error" role="alert">Please add at least one detail before saving.</span>
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
