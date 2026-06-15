import { useState } from 'react'
import { FLAG_REASON_OPTIONS } from './enrichmentOptions'
import './App.css'

const REASON_NOTE_MAX = 200

export default function FlagReasonDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (reason: string, reasonNote: string | null) => Promise<void>
}) {
  const [reason, setReason] = useState<string | null>(null)
  const [reasonNote, setReasonNote] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!reason) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(reason, reason === 'Other' && reasonNote.trim() ? reasonNote.trim() : null)
    } catch {
      setSubmitError("Couldn't hide this playground — please try again.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="form-scrim" onClick={onCancel} />
      <div className="enrichment-form flag-reason-dialog" role="dialog" aria-label="Why is this playground gone?">
        <div className="enrichment-form-header">
          <h2>This playground no longer exists</h2>
        </div>

        <div className="enrichment-form-body">
          <p className="field-helper">
            This removes the playground from everyone's map. An admin reviews flagged
            playgrounds and can restore it.
          </p>

          <div className="field">
            <label>Reason</label>
            <div className="equipment-tags" role="radiogroup" aria-label="Reason">
              {FLAG_REASON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={reason === opt.value}
                  className={`equipment-tag chip flag-reason-chip ${reason === opt.value ? 'chip-selected' : ''}`}
                  onClick={() => setReason(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {reason === 'Other' && (
            <div className="field">
              <label htmlFor="reasonNote">Tell us more (optional)</label>
              <textarea
                id="reasonNote"
                value={reasonNote}
                maxLength={REASON_NOTE_MAX}
                onChange={(e) => setReasonNote(e.target.value)}
              />
              {reasonNote.length >= REASON_NOTE_MAX * 0.8 && (
                <span className="char-counter">{reasonNote.length}/{REASON_NOTE_MAX}</span>
              )}
            </div>
          )}
        </div>

        {submitError && (
          <p className="save-error" role="alert">{submitError}</p>
        )}

        <div className="enrichment-form-footer">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flag-reason-submit"
            onClick={handleSubmit}
            disabled={!reason || submitting}
          >
            Hide for everyone
          </button>
        </div>
      </div>
    </>
  )
}
