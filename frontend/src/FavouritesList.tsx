import L from 'leaflet'

export type Favourite = {
  id: string
  name: string | null
  latitude: number
  longitude: number
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(1)} km`
}

export default function FavouritesList({
  favourites,
  position,
  onClose,
}: {
  favourites: Favourite[]
  position: [number, number]
  onClose: () => void
}) {
  const here = L.latLng(position)

  // Nearest first: a parent deciding where to go scans for what's closest.
  const sorted = [...favourites].sort(
    (a, b) =>
      here.distanceTo([a.latitude, a.longitude]) - here.distanceTo([b.latitude, b.longitude])
  )

  return (
    <>
      <div className="form-scrim" onClick={onClose} />
      <div className="favourites-panel" role="dialog" aria-label="Favourites">
        <div className="favourites-panel-header">
          <h2>Favourites</h2>
          <button onClick={onClose} aria-label="Close" className="preview-close-btn">
            ×
          </button>
        </div>
        <div className="favourites-panel-body">
          {sorted.length === 0 ? (
            <p className="muted">No favourites yet</p>
          ) : (
            <ul className="favourites-list">
              {sorted.map((f) => (
                <li key={f.id} className="favourites-row">
                  <span className="favourites-row-name">{f.name ?? 'Playground'}</span>
                  <span className="favourites-row-distance">
                    {formatDistance(here.distanceTo([f.latitude, f.longitude]))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
