import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png?url'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png?url'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png?url'

// Vite breaks Leaflet's default icon asset resolution; supply the paths explicitly
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
const STAVANGER: [number, number] = [58.9700, 5.7331]

type Playground = {
  id: string
  name: string | null
  latitude: number
  longitude: number
}

function App() {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([])

  useEffect(() => {
    if (!navigator.geolocation) {
      setPosition(STAVANGER)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition(STAVANGER)
    )
  }, [])

  useEffect(() => {
    if (!position) return
    const [lat, lng] = position
    fetch(`${API_URL}/playgrounds?lat=${lat}&lng=${lng}&radius=5000`)
      .then((res) => res.json())
      .then(setPlaygrounds)
      .catch(() => {})
  }, [position])

  if (!position) return null

  return (
    <MapContainer center={position} zoom={14} style={{ height: '100dvh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {playgrounds.map((pg) => (
        <Marker key={pg.id} position={[pg.latitude, pg.longitude]}>
          <Popup>{pg.name ?? 'Playground'}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

export default App
