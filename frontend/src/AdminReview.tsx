import { useEffect, useState } from 'react'
import './AdminReview.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const ADMIN_KEY = (import.meta.env.VITE_ADMIN_KEY as string | undefined) ?? ''

const EQUIPMENT_LABELS: Record<string, string> = {
  Swing: 'Swing',
  Trampoline: 'Trampoline',
  Slide: 'Slide',
  ClimbingFrame: 'Climbing frame',
  Sandpit: 'Sandpit',
  Springy: 'Springy rider',
  Roundabout: 'Roundabout',
}

type Submission = {
  id: string
  playgroundId: string
  playgroundName: string | null
  equipment: string[]
  transportInfo: string | null
  notes: string | null
  createdAt: string
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

function SubmissionCard({
  submission,
  onRemove,
}: {
  submission: Submission
  onRemove: (id: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notesExpanded, setNotesExpanded] = useState(false)

  async function handleApprove() {
    setSaving(true)
    setError(null)
    const res = await fetch(`${API_URL}/admin/enrichments/${submission.id}/approve`, {
      method: 'POST',
      headers: { 'X-Admin-Key': ADMIN_KEY },
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) {
      setError('Failed to approve — please try again.')
      return
    }
    onRemove(submission.id)
  }

  async function handleReject() {
    if (!window.confirm('Delete this submission permanently?')) return
    setSaving(true)
    setError(null)
    const res = await fetch(`${API_URL}/admin/enrichments/${submission.id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': ADMIN_KEY },
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) {
      setError('Failed to delete — please try again.')
      return
    }
    onRemove(submission.id)
  }

  return (
    <div className="submission-card">
      <div className="card-meta">
        <h2 className="card-title">{submission.playgroundName ?? 'Playground'}</h2>
        <span className="card-date">{formatDate(submission.createdAt)}</span>
      </div>

      {submission.equipment.length > 0 && (
        <div className="admin-equipment-tags">
          {submission.equipment.map((eq) => (
            <span key={eq} className="admin-equipment-tag">{EQUIPMENT_LABELS[eq] ?? eq}</span>
          ))}
        </div>
      )}

      {submission.transportInfo && (
        <p className="card-field">
          <span className="field-label">Transport:</span> {submission.transportInfo}
        </p>
      )}

      {submission.notes && (
        <div className="card-field">
          <p className={notesExpanded ? undefined : 'notes-clamped'}>{submission.notes}</p>
          <button
            type="button"
            className="toggle-notes"
            onClick={() => setNotesExpanded((v) => !v)}
          >
            {notesExpanded ? 'Read less' : 'Read more'}
          </button>
        </div>
      )}

      {error && <p className="card-error" role="alert">{error}</p>}

      <div className="card-actions">
        <button
          type="button"
          className="btn-approve"
          onClick={handleApprove}
          disabled={saving}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn-reject"
          onClick={handleReject}
          disabled={saving}
        >
          Reject
        </button>
      </div>
    </div>
  )
}

export default function AdminReview() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/admin/enrichments`, {
      headers: { 'X-Admin-Key': ADMIN_KEY },
    })
      .then((res) => {
        if (res.status === 401) throw new Error('Unauthorized — check your admin key.')
        if (!res.ok) throw new Error('Failed to load submissions.')
        return res.json() as Promise<Submission[]>
      })
      .then(setSubmissions)
      .catch((err) => setFetchError(err instanceof Error ? err.message : 'Failed to load.'))
      .finally(() => setLoading(false))
  }, [])

  function removeSubmission(id: string) {
    setSubmissions((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="admin-page">
      <h1>Admin review</h1>
      {loading && <p className="admin-status">Loading…</p>}
      {fetchError && <p className="admin-error" role="alert">{fetchError}</p>}
      {!loading && !fetchError && submissions.length === 0 && (
        <p className="admin-status">No pending submissions.</p>
      )}
      {submissions.map((s) => (
        <SubmissionCard key={s.id} submission={s} onRemove={removeSubmission} />
      ))}
    </div>
  )
}
