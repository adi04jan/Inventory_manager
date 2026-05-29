# BINDEX — Foundation (Sub-project 1) Design Spec

**Date:** 2026-05-20  
**Status:** Approved  
**Scope:** Backend only — FastAPI + SQLite + CSV import/export + parts CRUD + dispense  
**Out of scope:** React UI, Ollama AI, BOM reconciliation, Litestream, rclone, PWA

---

## Context

BINDEX is a self-hosted parts inventory manager for an electronics workshop. It runs on an i5 Linux Lenovo mini PC (`aditya@182.70.254.11 -p 2201`) accessible via SSH. The full system is a 5 sub-project build; this spec covers sub-project 1: the data layer and REST API.

The design reference is in `Handoff/extracted/design_handoff_bindex/`. The real inventory data is 281 rows in `Handoff/extracted/design_handoff_bindex/source_data/Inventory List - Sheet1.csv`.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Python 3.12 venv | System Python on Linux; 3.12 is current stable |
| Framework | FastAPI | Spec calls for it; best AI/PDF ecosystem for later sub-projects |
| Database | SQLite (stdlib `sqlite3`) | Single-user, one file, backup is `cp inv.db` |
| Migrations | Alembic | Schema will evolve across 5 sub-projects; README mandates it |
| Validation | Pydantic v2 | FastAPI's native validation layer |
| Server | Uvicorn | Standard FastAPI ASGI server |
| Process | systemd unit | Restart-on-failure, starts on boot |

No ORM (SQLAlchemy). Raw SQL against sqlite3 — the schema is fully specified and raw SQL is easier to audit for a relational schema of this complexity.

---

## Directory layout (on server)

```
/var/bindex/
├── app/
│   ├── main.py            # FastAPI app factory, lifespan, CORS
│   ├── db.py              # Connection pool, WAL PRAGMA setup, helpers
│   ├── models.py          # Pydantic request/response schemas
│   ├── routers/
│   │   ├── parts.py       # /api/parts/* endpoints
│   │   ├── bins.py        # /api/bins/* endpoints
│   │   ├── events.py      # /api/parts/{id}/events
│   │   └── system.py      # /api/system/health, /api/csv, /api/ingest/csv
│   └── alembic/
│       ├── env.py
│       ├── script.py.mako
│       └── versions/
│           └── 0001_initial_schema.py
├── inv.db                 # SQLite WAL database
├── backups/               # CSV snapshots (future: nightly cron)
├── uploads/               # photos, PDFs (future sub-projects)
├── venv/                  # Python virtual environment
├── requirements.txt
└── setup.sh               # One-shot install script
```

Local repo (`D:\Personal\Project\Inventory_manager`) mirrors this layout under `backend/`.

---

## Database schema

Full schema as specified in the README. All tables created in migration `0001_initial_schema.py`. Only `parts`, `bins`, `part_variants`, and `events` have endpoints in this sub-project; remaining tables (`projects`, `boms`, `bom_lines`, `invoices`, `invoice_lines`, `datasheets`, `cad_assets`, `part_variants`, `part_embeddings`) are created now so future migrations can add FK constraints without recreating tables.

**Connection settings applied at every connection open:**
```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;
```

---

## API contract (this sub-project)

All responses: `Content-Type: application/json`. Errors: `{"error": "<code>", "message": "<human>"}`. Times: ISO-8601 UTC.

### Parts

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| `GET` | `/api/parts` | `?q=&category=&package=&bin=&low=true&page=1&size=50` | Fuzzy text search on `name`+`pn`+`description`; `low=true` filters `qty <= min_qty` |
| `GET` | `/api/parts/{id}` | — | 404 if not found |
| `POST` | `/api/parts` | `PartCreate` body | Returns created part with `id` |
| `PATCH` | `/api/parts/{id}` | `PartUpdate` body (all fields optional) | Partial update; sets `updated_at` |
| `DELETE` | `/api/parts/{id}` | — | Hard delete; also deletes variants via cascade |
| `POST` | `/api/parts/{id}/dispense` | `{qty: int, actor: str, project_id?: int}` | Decrements `qty`, writes `events` row `kind='dispense'`; 400 if stock insufficient |
| `POST` | `/api/parts/{id}/add-stock` | `{qty: int, supplier?: str, unit_cost?: float}` | Increments `qty`, writes `events` row `kind='add'`; updates `cost` if `unit_cost` provided |
| `GET` | `/api/parts/{id}/events` | `?page=1&size=20` | Audit log for this part, newest first |

### Bins

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/bins` | All bins with occupancy count |
| `GET` | `/api/bins/{id}` | Single bin + parts in it |

### System / CSV

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/system/health` | `{db: ok, low_stock_count: n}` |
| `GET` | `/api/csv` | Full CSV export matching source column order: `Name,Quantity,Type,Voltage,Package,Description,Place` |
| `POST` | `/api/ingest/csv` | Multipart `file=<csv>`. Validates, returns `{import_id, row_count, preview: [{row, issues}]}`. No DB writes yet. |
| `POST` | `/api/ingest/csv/{id}/commit` | Upserts rows into `parts`; writes one `events` row per upsert (`kind='import'`); returns `{inserted, updated, skipped}` |

### Two-phase CSV ingest detail

1. `POST /api/ingest/csv` — parses the uploaded file, stores it in memory (keyed by `import_id` UUID), returns the first 20 rows as preview plus any detected issues (empty name, missing qty, unknown bin format). No DB write.
2. `POST /api/ingest/csv/{id}/commit` — reads the stored import, upserts into `parts` (match on `name` + `package`; insert if no match), emits events. Import state is held in a module-level dict for simplicity (no Redis); state is lost on restart, which is acceptable since the upload step is fast.

---

## Pydantic schemas (key ones)

```python
class PartCreate(BaseModel):
    name: str
    category: str | None = None
    package: str | None = None
    description: str | None = None
    voltage: str | None = None
    bin_id: str | None = None
    qty: int = 0
    min_qty: int = 0
    unit: str = "pc"
    cost: float | None = None
    pn: str | None = None
    manufacturer: str | None = None

class PartUpdate(BaseModel):
    # all fields optional
    name: str | None = None
    # ... same fields as PartCreate

class PartResponse(BaseModel):
    id: int
    name: str
    category: str | None
    package: str | None
    description: str | None
    voltage: str | None
    bin_id: str | None
    qty: int
    min_qty: int
    unit: str
    cost: float | None
    pn: str | None
    manufacturer: str | None
    ai_confidence: float | None
    updated_at: str
    created_at: str
```

---

## Error handling

- Validation errors (Pydantic): FastAPI default 422 with field detail.
- Not found: 404 `{"error": "not_found", "message": "Part {id} not found"}`.
- Insufficient stock: 400 `{"error": "insufficient_stock", "message": "Only {n} in stock"}`.
- DB errors: logged + 500 `{"error": "db_error", "message": "Internal error"}`.
- Import ID not found (commit without upload): 404 `{"error": "import_not_found"}`.

---

## Setup script (`setup.sh`)

Runs on a fresh Debian/Ubuntu Linux x86_64 box. Steps:
1. `apt install python3.12 python3.12-venv`
2. Create `/var/bindex/` tree
3. Create venv, install `requirements.txt`
4. Run `alembic upgrade head` (creates `inv.db`)
5. Import the seed CSV (`Inventory List - Sheet1.csv`) via `/api/ingest/csv` + commit
6. Write and enable `bindex.service` systemd unit (uvicorn on `:1880`)
7. `systemctl start bindex`

---

## Requirements

```
fastapi>=0.111
uvicorn[standard]>=0.29
pydantic>=2.7
alembic>=1.13
python-multipart>=0.0.9
```

No other runtime dependencies. `httpx` added as dev dependency for testing.

---

## Testing

No test framework setup in this sub-project — that's a deliberate cut for speed. Manual testing via:
- FastAPI's built-in `/docs` (Swagger UI) at `http://182.70.254.11:1880/docs`
- `curl` examples in a `test-curl.sh` script committed alongside the code
- Seed CSV import is the integration smoke-test

---

## What this sub-project does NOT include

- React frontend (sub-project 2)
- Ollama / AI features (sub-project 3)
- BOM/projects endpoints (sub-project 4)
- Litestream, rclone, nightly backup cron (sub-project 5)
- Authentication (single-user; rely on network ACL)
- WebSocket (`/ws`) — added in sub-project 2 when UI needs it
- `part_embeddings` population — table created, never written in this slice
