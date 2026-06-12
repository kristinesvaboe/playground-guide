import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

type ApiStatus = 'loading' | 'ok' | 'error'

function App() {
  const [status, setStatus] = useState<ApiStatus>('loading')

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => {
        setStatus(res.ok ? 'ok' : 'error')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [])

  return (
    <main>
      <h1>Playground Guide</h1>
      <p>API status: {status === 'loading' ? '…' : status === 'ok' ? 'OK' : 'error'}</p>
    </main>
  )
}

export default App
