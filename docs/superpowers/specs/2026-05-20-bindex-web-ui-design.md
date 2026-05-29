# BINDEX — Web UI (Sub-project 2) Design Spec

**Date:** 2026-05-20  
**Status:** Approved  
**Scope:** React/Vite frontend — 6 core screens wired to the live FastAPI backend  
**Out of scope:** Invoice ingest UI, Find-by-photo, BOM reconcile, Projects, CSV cleanup wizard, PWA/service worker

---

## Context

BINDEX Sub-project 1 delivered a working FastAPI + SQLite backend running at `http://182.70.254.11:1880`. Sub-project 2 adds the React web UI, matching the visual design from `Handoff/extracted/design_handoff_bindex/design_files/`. The frontend is served from the same origin as the API — FastAPI mounts the built `dist/` folder as static files.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite 5 |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| CSS | Port `design_files/styles.css` verbatim — no Tailwind, no CSS-in-JS |
| Fonts | Archivo Black 900 · Inter 400/500/600/700 · JetBrains Mono 400/500/700 (Google Fonts) |
| Build output | `frontend/dist/` → served by FastAPI at `/` |

---

## Directory layout

```
frontend/
├── index.html               # Google Fonts links, <div id="root">
├── vite.config.js           # /api proxy → http://182.70.254.11:1880 in dev
├── package.json
├── src/
│   ├── main.jsx             # React root, QueryClientProvider, BrowserRouter
│   ├── index.css            # Verbatim port of design_files/styles.css
│   ├── api/
│   │   ├── client.js        # fetch wrapper, VITE_API_URL, error handling
│   │   ├── parts.js         # TanStack Query hooks for /api/parts/*
│   │   ├── bins.js          # TanStack Query hooks for /api/bins/*
│   │   └── system.js        # useHealth (polled 30s)
│   ├── components/
│   │   ├── chrome/
│   │   │   ├── AppShell.jsx # grid layout: Topbar + Sidenav + main + Statusbar
│   │   │   ├── Topbar.jsx   # brand, global search input, health dot
│   │   │   ├── Sidenav.jsx  # nav links with Glyph icons, active state
│   │   │   └── Statusbar.jsx# host · db status · low-stock count · timestamp
│   │   ├── Glyph.jsx        # SVG icon set (ported from chrome.jsx)
│   │   ├── PartThumb.jsx    # SVG part placeholder images (res/cap/ic/di/mod/etc.)
│   │   ├── StockPill.jsx    # <qty|unit> pill, --ok / --low colour
│   │   ├── BinLabel.jsx     # tape-yellow bin badge
│   │   └── ConfidenceBar.jsx# 4px rust progress bar + mono percent
│   └── pages/
│       ├── Dashboard.jsx    # /
│       ├── Inventory.jsx    # /inventory
│       ├── PartDetail.jsx   # /parts/:id
│       ├── AddPart.jsx      # /parts/new
│       ├── Dispense.jsx     # /parts/:id/dispense
│       └── BinMap.jsx       # /bins
```

---

## Design system

`src/index.css` is the design handoff's `styles.css` copied verbatim. It provides:

- **CSS custom properties:** `--paper`, `--paper-2`, `--paper-3`, `--ink`, `--ink-2`, `--ink-3`, `--rule`, `--rust`, `--rust-2`, `--rust-3`, `--olive`, `--olive-2`, `--olive-3`, `--tape`, `--tape-2`
- **Dark theme:** `:root[data-theme="dark"]` overrides (toggle via `data-theme` on `<html>`)
- **Density variants:** `:root[data-density="compact"]` (toggle via `data-density` on `<html>`)
- **Component classes:** `.app`, `.card`, `.card__head`, `.card__title`, `.table`, `.btn`, `.btn--ink`, `.btn--rust`, `.btn--ghost`, `.btn--sm`, `.chip`, `.chip--rust`, `.chip--olive`, `.chip--ink`, `.chip--ghost`, `.stat`, `.stat__value`, `.stat__label`, `.stat__delta`, `.stockpill`, `.stockpill--ok`, `.stockpill--low`, `.bin`, `.bin--tape`, `.aipanel`, `.progress`, `.progress__fill`, `.mono`, `.display`, `.cap`, `.fnote`, `.washi`

No component should use inline styles except for dynamic values (widths, colours driven by data).

---

## Screens

### Dashboard (`/`)
- Four stat cards: Distinct parts, Total units, Low/out count (rust colour), Active BOMs
- Recent activity table: last 20 events from `/api/parts` events aggregated — time · kind chip · detail
- Inventory by category: horizontal bar chart using `div.progress` bars, data from `/api/parts?size=200` grouped client-side by category
- All data via `useHealth()` + `useParts()`

### Inventory (`/inventory`)
- Filter bar: category dropdown, package dropdown, bin-row dropdown, low-stock toggle chip
- Sortable table with columns: checkbox, Part (thumb + name + pn), Category, Package, Bin, Stock, Min, Cost
- `StockPill` shows ok/low state; `BinLabel` renders tape-yellow bin badges
- Row click → `/parts/:id`; checkbox select → bulk action bar (Dispense, Edit, Move Bin)
- Search driven by topbar global search input (shared state via URL `?q=` param)
- Pagination: 50 per page, prev/next controls
- Data via `useParts({ q, category, package, bin, low, page })`

### Part Detail (`/parts/:id`)
- Left: `PartThumb` large (80px), name, pn, manufacturer, category/package chips
- Right: stock panel — `StockPill` large, min-qty, cost, bin label
- Tabs: Overview (description, voltage, notes) · Events (audit log table)
- Action buttons: DISPENSE → `/parts/:id/dispense` · ADD STOCK inline form · EDIT inline PATCH
- Data via `usePart(id)` + `usePartEvents(id)`

### Add Part (`/parts/new`)
- Manual form method only (other methods are SP3)
- Fields: Name\*, Category, Package, Description, Voltage, Bin ID, Qty, Min Qty, Unit, Cost, Part Number, Manufacturer
- Submit → `useCreatePart()` mutation → redirect to `/parts/:id`
- Validation: name required; qty/min_qty must be integers ≥ 0

### Dispense (`/parts/:id/dispense`)
- Shows part name + current stock prominently
- Qty input (max = current stock), Actor field (default "workbench")
- CONFIRM button → `useDispense()` mutation → redirect back to `/parts/:id`
- Insufficient stock error shown inline (API returns 400)

### Bin Map (`/bins`)
- Grid of bin labels grouped by cabinet (0, 1, 2, AA, AB, BB, etc.)
- Each bin is a `BinLabel` showing id + part count; click → side panel lists parts in that bin
- Data via `useBins()` + `useBin(id)` on click

---

## API hooks (TanStack Query)

```js
// api/parts.js
useParts(filters)           // GET /api/parts?...  — staleTime 30s
usePart(id)                 // GET /api/parts/:id  — staleTime 10s
useCreatePart()             // POST /api/parts     — invalidates useParts
useUpdatePart()             // PATCH /api/parts/:id
useDeletePart()             // DELETE /api/parts/:id
useDispense()               // POST /api/parts/:id/dispense
useAddStock()               // POST /api/parts/:id/add-stock
usePartEvents(id, page)     // GET /api/parts/:id/events

// api/bins.js
useBins()                   // GET /api/bins       — staleTime 60s
useBin(id)                  // GET /api/bins/:id

// api/system.js
useHealth()                 // GET /api/system/health — refetchInterval 30000
```

`api/client.js` reads `import.meta.env.VITE_API_URL` (defaults to `/api`). All non-2xx responses throw `{ error, message }` shaped errors that TanStack Query surfaces.

---

## FastAPI changes (backend)

Two additions to `backend/app/main.py`:

1. Mount `StaticFiles` for the built frontend:
   ```python
   from fastapi.staticfiles import StaticFiles
   from fastapi.responses import FileResponse
   # After all routers are registered:
   FRONTEND_DIR = Path(os.environ.get("BINDEX_FRONTEND", "/var/bindex/frontend/dist"))
   if FRONTEND_DIR.exists():
       app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
   ```
2. SPA fallback — `html=True` on `StaticFiles` handles this automatically (returns `index.html` for unknown paths).

`BINDEX_FRONTEND` env var added to the systemd unit so it's configurable.

---

## Dev workflow

```bash
# On Windows — run Vite dev server locally
cd frontend
npm install
npm run dev
# Opens http://localhost:5173 — /api/* proxied to http://182.70.254.11:1880
```

```bash
# Deploy — build and push to server
npm run build                          # outputs frontend/dist/
python deploy_frontend.py              # scp dist/ → /var/bindex/frontend/dist/ + restart bindex
```

`deploy_frontend.py` mirrors `deploy.py` but only syncs `frontend/dist/` and runs `systemctl restart bindex`.

---

## Error handling

- API errors: TanStack Query `error` state rendered as inline rust-coloured alert within each page. No global error boundary crash.
- 404 part/bin: redirect to `/inventory` with a toast-style washi-tape note.
- Loading states: table rows show skeleton shimmer (CSS animation on placeholder `div`s).
- No optimistic updates in this sub-project — mutations wait for server confirmation before redirecting.

---

## What this sub-project does NOT include

- Invoice ingest, find-by-photo, CSV cleanup wizard (Sub-project 3)
- BOM reconcile, Projects screen (Sub-project 4)
- PWA manifest, service worker, offline queue (Sub-project 5)
- Dark mode toggle UI (CSS is ready; toggle button is Sub-project 4 polish pass)
- WebSocket live updates (added in Sub-project 3 when AI jobs need progress streaming)
- Barcode scanning, print labels
