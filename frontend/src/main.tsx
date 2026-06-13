import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import AdminReview from './AdminReview.tsx'
import './index.css'

const root = document.getElementById('root')!

// No router installed — admin is a single isolated route that doesn't need one
if (window.location.pathname === '/admin/review') {
  createRoot(root).render(
    <React.StrictMode>
      <AdminReview />
    </React.StrictMode>
  )
} else {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
