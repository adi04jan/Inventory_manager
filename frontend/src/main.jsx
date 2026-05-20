import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import AppShell   from './components/chrome/AppShell'
import Dashboard  from './pages/Dashboard'
import Inventory  from './pages/Inventory'
import PartDetail from './pages/PartDetail'
import AddPart    from './pages/AddPart'
import Dispense   from './pages/Dispense'
import BinMap     from './pages/BinMap'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/"                   element={<Dashboard />} />
            <Route path="/inventory"          element={<Inventory />} />
            <Route path="/parts/new"          element={<AddPart />} />
            <Route path="/parts/:id"          element={<PartDetail />} />
            <Route path="/parts/:id/dispense" element={<Dispense />} />
            <Route path="/bins"               element={<BinMap />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
