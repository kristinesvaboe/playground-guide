import { useEffect, useState } from 'react'
import './AdminReview.css'
import { EQUIPMENT_LABELS, AGE_LABELS, SIZE_LABELS, FLAG_REASON_LABELS } from './enrichmentOptions'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const ADMIN_KEY = (import.meta.env.VITE_ADMIN_KEY as string | undefined) ?? ''

type Submission = {
  id: string
  playgroundId: string
  playgroundName: string | null
  equipment: string[]
  ageSuitability: string[]
  size: string | null
  otherEquipment: string | null
  transportInfo: string | null
  notes: string | null
  createdAt: string
}

type HiddenPlayground = {
  id: string
  name: string | null
  latitude: number
  longitude: number
  userId: string
  userName: string | null
  reason: string
  reasonNote: string | null
  createdAt: string
}

type PendingPlayground = {
  id: string
  name: string | null
  latitude: number
  longitude: number
  submittedByUserId: string | null
  submitterName: string | null
  equipment: string[]
  ageSuitability: string[]
  size: string | null
  otherEquipment: string | null
  transportInfo: string | null
  notes: string | null
  createdAt: string | null
}

type FlaggedPlayground = {
  id: string
  name: string | null
  latitude: number
  longitude: number
  flagCount: number
  latestFlaggedAt: string
}

function formatDate(iso: string | null): string {
  // Guard a null/invalid timestamp: new Date(null) is the epoch, which would render as
  // "1 Jan 1970". Pre-#58 user-submitted rows have no resolvable submitter/date.
  if (!iso) return 'Unknown date'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
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

      {submission.ageSuitability.length > 0 && (
        <div className="admin-equipment-tags">
          {submission.ageSuitability.map((a) => (
            <span key={a} className="admin-equipment-tag">{AGE_LABELS[a] ?? a}</span>
          ))}
        </div>
      )}

      {submission.size && (
        <p className="card-field">
          <span className="field-label">Size:</span> {SIZE_LABELS[submission.size] ?? submission.size}
        </p>
      )}

      {submission.otherEquipment && (
        <p className="card-field">
          <span className="field-label">Other equipment:</span> {submission.otherEquipment}
        </p>
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

function PendingPlaygroundCard({
  playground,
  onRemove,
}: {
  playground: PendingPlayground
  onRemove: (id: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = playground.name ?? `${playground.latitude}, ${playground.longitude}`

  async function handleApprove() {
    setSaving(true)
    setError(null)
    const res = await fetch(`${API_URL}/admin/playgrounds/${playground.id}/approve`, {
      method: 'POST',
      headers: { 'X-Admin-Key': ADMIN_KEY },
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) {
      setError('Failed to approve — please try again.')
      return
    }
    onRemove(playground.id)
  }

  async function handleReject() {
    if (!window.confirm('Reject and permanently delete this playground?')) return
    setSaving(true)
    setError(null)
    const res = await fetch(`${API_URL}/admin/playgrounds/${playground.id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': ADMIN_KEY },
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) {
      setError('Failed to delete — please try again.')
      return
    }
    onRemove(playground.id)
  }

  return (
    <div className="submission-card">
      <div className="card-meta">
        <h2 className="card-title">{label}</h2>
        <span className="card-date">{formatDate(playground.createdAt)}</span>
      </div>

      <span className="user-submitted-badge">User submitted</span>

      <p className="card-field">
        <span className="field-label">Submitted by:</span>{' '}
        {playground.submitterName ?? playground.submittedByUserId ?? 'Unknown'}
      </p>

      {playground.equipment.length > 0 && (
        <div className="admin-equipment-tags">
          {playground.equipment.map((eq) => (
            <span key={eq} className="admin-equipment-tag">{EQUIPMENT_LABELS[eq] ?? eq}</span>
          ))}
        </div>
      )}

      {playground.ageSuitability.length > 0 && (
        <div className="admin-equipment-tags">
          {playground.ageSuitability.map((a) => (
            <span key={a} className="admin-equipment-tag">{AGE_LABELS[a] ?? a}</span>
          ))}
        </div>
      )}

      {playground.size && (
        <p className="card-field">
          <span className="field-label">Size:</span> {SIZE_LABELS[playground.size] ?? playground.size}
        </p>
      )}

      {playground.otherEquipment && (
        <p className="card-field">
          <span className="field-label">Other equipment:</span> {playground.otherEquipment}
        </p>
      )}

      {playground.transportInfo && (
        <p className="card-field">
          <span className="field-label">Transport:</span> {playground.transportInfo}
        </p>
      )}

      {playground.notes && (
        <p className="card-field">
          <span className="field-label">Notes:</span> {playground.notes}
        </p>
      )}

      <p className="card-field">
        <a
          className="map-link"
          href={`https://www.openstreetmap.org/?mlat=${playground.latitude}&mlon=${playground.longitude}#map=18/${playground.latitude}/${playground.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          View on map
        </a>
      </p>

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

function FlaggedPlaygroundCard({
  playground,
  onRemove,
}: {
  playground: FlaggedPlayground
  onRemove: (id: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = playground.name ?? `${playground.latitude}, ${playground.longitude}`

  async function handleForceHide() {
    setSaving(true)
    setError(null)
    const res = await fetch(`${API_URL}/admin/playgrounds/${playground.id}/force-hide`, {
      method: 'POST',
      headers: { 'X-Admin-Key': ADMIN_KEY },
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) {
      setError('Failed to hide — please try again.')
      return
    }
    onRemove(playground.id)
  }

  return (
    <div className="submission-card">
      <div className="card-meta">
        <h2 className="card-title">{label}</h2>
        <span className="card-date">{formatDate(playground.latestFlaggedAt)}</span>
      </div>

      <p className="card-field">
        <span className="field-label">Flags:</span> {playground.flagCount} of 3 flags
      </p>

      <p className="card-field">
        <a
          className="map-link"
          href={`https://www.openstreetmap.org/?mlat=${playground.latitude}&mlon=${playground.longitude}#map=18/${playground.latitude}/${playground.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          View on map
        </a>
      </p>

      {error && <p className="card-error" role="alert">{error}</p>}

      <div className="card-actions">
        <button
          type="button"
          className="btn-reject"
          onClick={handleForceHide}
          disabled={saving}
        >
          Force hide
        </button>
      </div>
    </div>
  )
}

function HiddenPlaygroundCard({
  playground,
  onRemove,
}: {
  playground: HiddenPlayground
  onRemove: (id: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = playground.name ?? `${playground.latitude}, ${playground.longitude}`

  async function handleRestore() {
    setSaving(true)
    setError(null)
    const res = await fetch(`${API_URL}/admin/playgrounds/${playground.id}/restore`, {
      method: 'POST',
      headers: { 'X-Admin-Key': ADMIN_KEY },
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) {
      setError('Failed to restore — please try again.')
      return
    }
    onRemove(playground.id)
  }

  return (
    <div className="submission-card">
      <div className="card-meta">
        <h2 className="card-title">{label}</h2>
        <span className="card-date">{formatDate(playground.createdAt)}</span>
      </div>

      <p className="card-field">
        <span className="field-label">Flagged by:</span> {playground.userName ?? playground.userId}
      </p>

      <p className="card-field">
        <span className="field-label">Reason:</span> {FLAG_REASON_LABELS[playground.reason] ?? playground.reason}
      </p>

      {playground.reasonNote && (
        <p className="card-field">
          <span className="field-label">Note:</span> {playground.reasonNote}
        </p>
      )}

      <p className="card-field">
        <a
          className="map-link"
          href={`https://www.openstreetmap.org/?mlat=${playground.latitude}&mlon=${playground.longitude}#map=18/${playground.latitude}/${playground.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          View on map
        </a>
      </p>

      {error && <p className="card-error" role="alert">{error}</p>}

      <div className="card-actions">
        <button
          type="button"
          className="btn-approve"
          onClick={handleRestore}
          disabled={saving}
        >
          Restore
        </button>
      </div>
    </div>
  )
}

export default function AdminReview() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [hidden, setHidden] = useState<HiddenPlayground[]>([])
  const [hiddenLoading, setHiddenLoading] = useState(true)
  const [hiddenError, setHiddenError] = useState<string | null>(null)
  const [flagged, setFlagged] = useState<FlaggedPlayground[]>([])
  const [flaggedLoading, setFlaggedLoading] = useState(true)
  const [flaggedError, setFlaggedError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingPlayground[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [pendingError, setPendingError] = useState<string | null>(null)

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

  useEffect(() => {
    fetch(`${API_URL}/admin/hidden-playgrounds`, {
      headers: { 'X-Admin-Key': ADMIN_KEY },
    })
      .then((res) => {
        if (res.status === 401) throw new Error('Unauthorized — check your admin key.')
        if (!res.ok) throw new Error('Failed to load hidden playgrounds.')
        return res.json() as Promise<HiddenPlayground[]>
      })
      .then(setHidden)
      .catch((err) => setHiddenError(err instanceof Error ? err.message : 'Failed to load.'))
      .finally(() => setHiddenLoading(false))
  }, [])

  useEffect(() => {
    fetch(`${API_URL}/admin/flagged-playgrounds`, {
      headers: { 'X-Admin-Key': ADMIN_KEY },
    })
      .then((res) => {
        if (res.status === 401) throw new Error('Unauthorized — check your admin key.')
        if (!res.ok) throw new Error('Failed to load flagged playgrounds.')
        return res.json() as Promise<FlaggedPlayground[]>
      })
      .then(setFlagged)
      .catch((err) => setFlaggedError(err instanceof Error ? err.message : 'Failed to load.'))
      .finally(() => setFlaggedLoading(false))
  }, [])

  useEffect(() => {
    fetch(`${API_URL}/admin/pending-playgrounds`, {
      headers: { 'X-Admin-Key': ADMIN_KEY },
    })
      .then((res) => {
        if (res.status === 401) throw new Error('Unauthorized — check your admin key.')
        if (!res.ok) throw new Error('Failed to load pending playgrounds.')
        return res.json() as Promise<PendingPlayground[]>
      })
      .then(setPending)
      .catch((err) => setPendingError(err instanceof Error ? err.message : 'Failed to load.'))
      .finally(() => setPendingLoading(false))
  }, [])

  function removePending(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id))
  }

  function removeFlagged(id: string) {
    setFlagged((prev) => prev.filter((f) => f.id !== id))
  }

  function removeSubmission(id: string) {
    setSubmissions((prev) => prev.filter((s) => s.id !== id))
  }

  function removeHidden(id: string) {
    setHidden((prev) => prev.filter((h) => h.id !== id))
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

      <h1>Pending playgrounds</h1>
      {pendingLoading && <p className="admin-status">Loading…</p>}
      {pendingError && <p className="admin-error" role="alert">{pendingError}</p>}
      {!pendingLoading && !pendingError && pending.length === 0 && (
        <p className="admin-status">No playgrounds awaiting approval.</p>
      )}
      {pending.map((p) => (
        <PendingPlaygroundCard key={p.id} playground={p} onRemove={removePending} />
      ))}

      <h1>Flagged playgrounds</h1>
      {flaggedLoading && <p className="admin-status">Loading…</p>}
      {flaggedError && <p className="admin-error" role="alert">{flaggedError}</p>}
      {!flaggedLoading && !flaggedError && flagged.length === 0 && (
        <p className="admin-status">No flagged playgrounds.</p>
      )}
      {flagged.map((f) => (
        <FlaggedPlaygroundCard key={f.id} playground={f} onRemove={removeFlagged} />
      ))}

      <h1>Hidden playgrounds</h1>
      {hiddenLoading && <p className="admin-status">Loading…</p>}
      {hiddenError && <p className="admin-error" role="alert">{hiddenError}</p>}
      {!hiddenLoading && !hiddenError && hidden.length === 0 && (
        <p className="admin-status">No hidden playgrounds.</p>
      )}
      {hidden.map((h) => (
        <HiddenPlaygroundCard key={h.id} playground={h} onRemove={removeHidden} />
      ))}
    </div>
  )
}
