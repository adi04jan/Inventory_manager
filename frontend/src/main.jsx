import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import { TOKEN_KEY } from './api/client'
import AppShell   from './components/chrome/AppShell'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Inventory  from './pages/Inventory'
import PartDetail from './pages/PartDetail'
import AddPart    from './pages/AddPart'
import Dispense   from './pages/Dispense'
import BinMap     from './pages/BinMap'

const queryClient = new QueryClient()

function ProtectedApp() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    return <Navigate to="/login" replace />
  }
  return (
    <AppShell>
      <Routes>
        <Route path="/"                   element={<Dashboard />} />
        <Route path="/inventory"          element={<Inventory />} />
        <Route path="/parts/new"          element={<AddPart />} />
        <Route path="/parts/:id"          element={<PartDetail />} />
        <Route path="/parts/:id/dispense" element={<Dispense />} />
        <Route path="/bins"               element={<BinMap />} />
        <Route path="*"                   element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*"     element={<ProtectedApp />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
