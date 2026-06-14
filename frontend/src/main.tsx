import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import PlaygroundDetail from './PlaygroundDetail.tsx'
import AdminReview from './AdminReview.tsx'
import './index.css'

const root = document.getElementById('root')!

// Admin is a single isolated route that doesn't share the map shell or router
if (window.location.pathname === '/admin/review') {
  createRoot(root).render(
    <React.StrictMode>
      <AdminReview />
    </React.StrictMode>
  )
} else {
  createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/playground/:id" element={<PlaygroundDetail />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  )
}
