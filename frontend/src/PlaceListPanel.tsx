import L from 'leaflet'

export type Place = {
  id: string
  name: string | null
  latitude: number
  longitude: number
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(1)} km`
}

export default function PlaceListPanel({
  title,
  items,
  position,
  onClose,
  onSelect,
  onRemove,
  emptyLabel,
  removeLabel,
  classPrefix,
}: {
  title: string
  items: Place[]
  position: [number, number]
  onClose: () => void
  onSelect: (item: Place) => void
  onRemove: (id: string) => void
  emptyLabel: string
  removeLabel: string
  // Distinct per-list class names so favourites and saved keep separate styling and E2E selectors
  classPrefix: string
}) {
  const here = L.latLng(position)

  // Nearest first: a parent deciding where to go scans for what's closest.
  const sorted = [...items].sort(
    (a, b) =>
      here.distanceTo([a.latitude, a.longitude]) - here.distanceTo([b.latitude, b.longitude])
  )

  return (
    <>
      <div className="form-scrim" onClick={onClose} />
      <div className={`${classPrefix}-panel`} role="dialog" aria-label={title}>
        <div className={`${classPrefix}-panel-header`}>
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Close" className="preview-close-btn">
            ×
          </button>
        </div>
        <div className={`${classPrefix}-panel-body`}>
          {sorted.length === 0 ? (
            <p className="muted">{emptyLabel}</p>
          ) : (
            <ul className={`${classPrefix}-list`}>
              {sorted.map((item) => (
                <li key={item.id} className={`${classPrefix}-row`}>
                  <button
                    type="button"
                    className={`${classPrefix}-row-main`}
                    onClick={() => onSelect(item)}
                  >
                    <span className={`${classPrefix}-row-name`}>{item.name ?? 'Playground'}</span>
                    <span className={`${classPrefix}-row-distance`}>
                      {formatDistance(here.distanceTo([item.latitude, item.longitude]))}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`${classPrefix}-row-remove`}
                    aria-label={removeLabel}
                    onClick={() => {
                      if (window.confirm(`${removeLabel}?`)) onRemove(item.id)
                    }}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
