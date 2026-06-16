import { useState } from 'react'
import { EQUIPMENT_OPTIONS, AGE_OPTIONS, SIZE_OPTIONS } from './enrichmentOptions'
import './App.css'

export type NewPlaygroundDraft = {
  name: string | null
  equipment: string[]
  ageSuitability: string[]
  size: string | null
  otherEquipment: string | null
  transportInfo: string | null
  notes: string | null
}

const NAME_MAX = 120
const TRANSPORT_MAX = 200
const NOTES_MAX = 300
const OTHER_EQUIPMENT_MAX = 200

export default function AddPlaygroundForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (draft: NewPlaygroundDraft) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [ageSuitability, setAgeSuitability] = useState<string[]>([])
  const [equipment, setEquipment] = useState<string[]>([])
  const [otherEquipment, setOtherEquipment] = useState('')
  const [size, setSize] = useState<string | null>(null)
  const [transportInfo, setTransportInfo] = useState('')
  const [notes, setNotes] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function toggleEquipment(value: string) {
    setEquipment((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function toggleAgeSuitability(value: string) {
    setAgeSuitability((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function toggleSize(value: string) {
    setSize((prev) => (prev === value ? null : value))
  }

  async function handleSubmit() {
    setSaving(true)
    setSaveError(null)
    try {
      await onSubmit({
        name: name.trim() ? name.trim() : null,
        equipment,
        ageSuitability,
        size,
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
      <div className="enrichment-form" role="dialog" aria-label="Add a playground">
        <div className="enrichment-form-header">
          <h2>Add a playground</h2>
        </div>

        <div className="enrichment-form-body">
          <div className="field">
            <label htmlFor="newName">Name (optional)</label>
            <input
              id="newName"
              type="text"
              value={name}
              maxLength={NAME_MAX}
              placeholder="e.g. Riverside playground"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
            <label htmlFor="newOtherEquipment">Other equipment</label>
            <p className="field-helper">Anything not in the list — zip wire, water play, etc.</p>
            <textarea
              id="newOtherEquipment"
              value={otherEquipment}
              maxLength={OTHER_EQUIPMENT_MAX}
              placeholder="e.g. zip wire, water play…"
              onChange={(e) => setOtherEquipment(e.target.value)}
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

          <hr className="form-divider" />

          <div className="field">
            <label htmlFor="newTransport">How do you get there?</label>
            <p className="field-helper">
              Parking, nearest bus stop or train — anything that helps someone plan the trip.
            </p>
            <textarea
              id="newTransport"
              value={transportInfo}
              maxLength={TRANSPORT_MAX}
              onChange={(e) => setTransportInfo(e.target.value)}
            />
            {transportNearLimit && (
              <span className="char-counter">{transportInfo.length}/{TRANSPORT_MAX}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="newNotes">Anything else?</label>
            <textarea
              id="newNotes"
              value={notes}
              maxLength={NOTES_MAX}
              placeholder="Shade, fenced, toilets nearby, busy times…"
              onChange={(e) => setNotes(e.target.value)}
            />
            {notesNearLimit && (
              <span className="char-counter">{notes.length}/{NOTES_MAX}</span>
            )}
          </div>
        </div>

        {saveError && (
          <p className="save-error" role="alert">{saveError}</p>
        )}

        <div className="enrichment-form-footer">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving}>
            Submit
          </button>
        </div>
      </div>
    </>
  )
}
