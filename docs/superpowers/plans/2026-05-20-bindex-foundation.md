# BINDEX Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the BINDEX backend — FastAPI + SQLite parts inventory API with CRUD, CSV import/export, and dispense — deployable on `aditya@182.70.254.11 -p 2201`.

**Architecture:** Code lives in `backend/` locally and is deployed to `/var/bindex/app/` on the server. FastAPI serves on `:1880` via uvicorn under systemd. SQLite with WAL mode at `/var/bindex/inv.db`. All DB access goes through a `get_db()` context manager in `db.py`.

**Tech Stack:** Python 3.12, FastAPI 0.111, Pydantic v2, Alembic 1.13, Uvicorn, stdlib sqlite3

---

## File Map

| File | Responsibility |
|---|---|
| `backend/app/main.py` | App factory, lifespan, CORS, router registration |
| `backend/app/db.py` | sqlite3 connection, WAL pragmas, row helper |
| `backend/app/models.py` | All Pydantic request/response schemas |
| `backend/app/routers/parts.py` | `/api/parts/*` — CRUD, dispense, add-stock, events |
| `backend/app/routers/bins.py` | `/api/bins/*` |
| `backend/app/routers/system.py` | `/api/system/health`, `/api/csv`, `/api/ingest/csv` |
| `backend/alembic/env.py` | Alembic env config |
| `backend/alembic/versions/0001_initial_schema.py` | Full schema migration |
| `backend/alembic.ini` | Alembic config |
| `backend/requirements.txt` | Python dependencies |
| `backend/setup.sh` | One-shot install on server |
| `backend/test-curl.sh` | Smoke tests via curl |

---

### Task 1: Project scaffold

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/alembic.ini`
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/app/routers/__init__.py` (empty)

- [ ] **Step 1: Create requirements.txt**

```
fastapi>=0.111
uvicorn[standard]>=0.29
pydantic>=2.7
alembic>=1.13
python-multipart>=0.0.9
```

- [ ] **Step 2: Create alembic.ini**

```ini
[alembic]
script_location = alembic
sqlalchemy.url = sqlite:////var/bindex/inv.db

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 3: Create empty init files**

`backend/app/__init__.py` — empty file
`backend/app/routers/__init__.py` — empty file

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat: scaffold BINDEX backend project structure"
```

---

### Task 2: Database layer

**Files:**
- Create: `backend/app/db.py`

- [ ] **Step 1: Write db.py**

```python
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(os.environ.get("BINDEX_DB", "/var/bindex/inv.db"))

def _configure(conn: sqlite3.Connection) -> None:
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    _configure(conn)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/db.py
git commit -m "feat: add database connection layer with WAL config"
```

---

### Task 3: Pydantic models

**Files:**
- Create: `backend/app/models.py`

- [ ] **Step 1: Write models.py**

```python
from pydantic import BaseModel
from typing import Optional

class PartCreate(BaseModel):
    name: str
    category: Optional[str] = None
    package: Optional[str] = None
    description: Optional[str] = None
    voltage: Optional[str] = None
    bin_id: Optional[str] = None
    qty: int = 0
    min_qty: int = 0
    unit: str = "pc"
    cost: Optional[float] = None
    pn: Optional[str] = None
    manufacturer: Optional[str] = None

class PartUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    package: Optional[str] = None
    description: Optional[str] = None
    voltage: Optional[str] = None
    bin_id: Optional[str] = None
    qty: Optional[int] = None
    min_qty: Optional[int] = None
    unit: Optional[str] = None
    cost: Optional[float] = None
    pn: Optional[str] = None
    manufacturer: Optional[str] = None

class PartResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    package: Optional[str] = None
    description: Optional[str] = None
    voltage: Optional[str] = None
    bin_id: Optional[str] = None
    qty: int
    min_qty: int
    unit: str
    cost: Optional[float] = None
    pn: Optional[str] = None
    manufacturer: Optional[str] = None
    ai_confidence: Optional[float] = None
    updated_at: str
    created_at: str

class PaginatedParts(BaseModel):
    items: list[PartResponse]
    total: int
    page: int
    size: int

class DispenseRequest(BaseModel):
    qty: int
    actor: str
    project_id: Optional[int] = None

class AddStockRequest(BaseModel):
    qty: int
    supplier: Optional[str] = None
    unit_cost: Optional[float] = None

class EventResponse(BaseModel):
    id: int
    ts: str
    kind: str
    part_id: Optional[int] = None
    qty_delta: Optional[int] = None
    actor: Optional[str] = None
    ref: Optional[str] = None
    note: Optional[str] = None

class PaginatedEvents(BaseModel):
    items: list[EventResponse]
    total: int
    page: int
    size: int

class BinResponse(BaseModel):
    id: str
    cabinet: str
    row_label: str
    col_num: int
    description: Optional[str] = None
    capacity_hint: Optional[int] = None
    part_count: int

class BinDetailResponse(BaseModel):
    id: str
    cabinet: str
    row_label: str
    col_num: int
    description: Optional[str] = None
    capacity_hint: Optional[int] = None
    parts: list[PartResponse]

class HealthResponse(BaseModel):
    db: str
    low_stock_count: int

class ImportPreviewRow(BaseModel):
    row: int
    name: str
    qty: Optional[int]
    category: Optional[str]
    package: Optional[str]
    bin_id: Optional[str]
    issues: list[str]

class ImportPreviewResponse(BaseModel):
    import_id: str
    row_count: int
    preview: list[ImportPreviewRow]

class ImportCommitResponse(BaseModel):
    inserted: int
    updated: int
    skipped: int
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models.py
git commit -m "feat: add Pydantic request/response schemas"
```

---

### Task 4: Alembic migration — full schema

**Files:**
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/0001_initial_schema.py`

- [ ] **Step 1: Write alembic/env.py**

```python
from logging.config import fileConfig
from alembic import context
import os, sqlite3
from pathlib import Path

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

DB_PATH = os.environ.get("BINDEX_DB", "/var/bindex/inv.db")

def run_migrations_offline() -> None:
    context.configure(url=f"sqlite:///{DB_PATH}", literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    from sqlalchemy import create_engine
    engine = create_engine(f"sqlite:///{DB_PATH}")
    with engine.connect() as conn:
        context.configure(connection=conn)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 2: Write alembic/script.py.mako**

```
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 3: Write alembic/versions/0001_initial_schema.py**

```python
"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-20
"""
from alembic import op

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS bins (
        id            TEXT PRIMARY KEY,
        cabinet       TEXT NOT NULL,
        row_label     TEXT NOT NULL,
        col_num       INTEGER NOT NULL,
        description   TEXT,
        capacity_hint INTEGER
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS datasheets (
        id         INTEGER PRIMARY KEY,
        part_id    INTEGER,
        rev        TEXT,
        fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        pdf_path   TEXT NOT NULL,
        source_url TEXT,
        pages      INTEGER,
        params_json TEXT
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS parts (
        id            INTEGER PRIMARY KEY,
        pn            TEXT,
        name          TEXT NOT NULL,
        manufacturer  TEXT,
        category      TEXT,
        package       TEXT,
        description   TEXT,
        voltage       TEXT,
        bin_id        TEXT REFERENCES bins(id),
        qty           INTEGER NOT NULL DEFAULT 0,
        min_qty       INTEGER DEFAULT 0,
        unit          TEXT DEFAULT 'pc',
        cost          REAL,
        thumb_path    TEXT,
        datasheet_id  INTEGER REFERENCES datasheets(id),
        ai_confidence REAL,
        updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS part_variants (
        id       INTEGER PRIMARY KEY,
        part_id  INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
        package  TEXT NOT NULL,
        bin_id   TEXT REFERENCES bins(id),
        qty      INTEGER NOT NULL DEFAULT 0,
        notes    TEXT
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id          INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        rev         TEXT,
        description TEXT,
        created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS boms (
        id          INTEGER PRIMARY KEY,
        project_id  INTEGER REFERENCES projects(id),
        filename    TEXT,
        uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS bom_lines (
        id          INTEGER PRIMARY KEY,
        bom_id      INTEGER NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
        ref_des     TEXT,
        source_name TEXT NOT NULL,
        part_id     INTEGER REFERENCES parts(id),
        qty         INTEGER NOT NULL,
        match_conf  REAL,
        status      TEXT NOT NULL
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS invoices (
        id           INTEGER PRIMARY KEY,
        supplier     TEXT,
        invoice_no   TEXT,
        pdf_path     TEXT NOT NULL,
        total        REAL,
        status       TEXT NOT NULL,
        uploaded_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        committed_at TEXT
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS invoice_lines (
        id          INTEGER PRIMARY KEY,
        invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        source_text TEXT NOT NULL,
        qty         INTEGER NOT NULL,
        unit_price  REAL,
        part_id     INTEGER REFERENCES parts(id),
        match_conf  REAL,
        status      TEXT NOT NULL
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS cad_assets (
        id      INTEGER PRIMARY KEY,
        part_id INTEGER REFERENCES parts(id),
        kind    TEXT NOT NULL,
        path    TEXT NOT NULL,
        library TEXT
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id           INTEGER PRIMARY KEY,
        ts           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        kind         TEXT NOT NULL,
        part_id      INTEGER REFERENCES parts(id),
        qty_delta    INTEGER,
        actor        TEXT,
        ref          TEXT,
        note         TEXT,
        ai_meta_json TEXT
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS part_embeddings (
        part_id   INTEGER PRIMARY KEY REFERENCES parts(id) ON DELETE CASCADE,
        embedding BLOB NOT NULL
    )
    """)

    # Indexes for common query patterns
    op.execute("CREATE INDEX IF NOT EXISTS idx_parts_bin ON parts(bin_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_events_part ON events(part_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts)")


def downgrade() -> None:
    for tbl in [
        "part_embeddings", "events", "cad_assets", "invoice_lines",
        "invoices", "bom_lines", "boms", "projects", "part_variants",
        "parts", "datasheets", "bins"
    ]:
        op.execute(f"DROP TABLE IF EXISTS {tbl}")
```

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/
git commit -m "feat: add Alembic migration with full BINDEX schema"
```

---

### Task 5: Parts router

**Files:**
- Create: `backend/app/routers/parts.py`

- [ ] **Step 1: Write routers/parts.py**

```python
from fastapi import APIRouter, HTTPException, Query
from app.db import get_db, row_to_dict
from app.models import (
    PartCreate, PartUpdate, PartResponse, PaginatedParts,
    DispenseRequest, AddStockRequest, EventResponse, PaginatedEvents,
)

router = APIRouter(prefix="/api/parts", tags=["parts"])


def _get_part_or_404(conn, part_id: int) -> dict:
    row = conn.execute("SELECT * FROM parts WHERE id = ?", (part_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": f"Part {part_id} not found"})
    return row_to_dict(row)


@router.get("", response_model=PaginatedParts)
def list_parts(
    q: str = Query(default=""),
    category: str = Query(default=""),
    package: str = Query(default=""),
    bin: str = Query(default=""),
    low: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
):
    conditions = []
    params: list = []

    if q:
        like = f"%{q}%"
        conditions.append("(name LIKE ? OR pn LIKE ? OR description LIKE ?)")
        params.extend([like, like, like])
    if category:
        conditions.append("category = ?")
        params.append(category)
    if package:
        conditions.append("package = ?")
        params.append(package)
    if bin:
        conditions.append("bin_id = ?")
        params.append(bin)
    if low:
        conditions.append("qty <= min_qty")

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    offset = (page - 1) * size

    with get_db() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM parts {where}", params).fetchone()[0]
        rows = conn.execute(
            f"SELECT * FROM parts {where} ORDER BY name LIMIT ? OFFSET ?",
            params + [size, offset],
        ).fetchall()

    return PaginatedParts(
        items=[PartResponse(**row_to_dict(r)) for r in rows],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{part_id}", response_model=PartResponse)
def get_part(part_id: int):
    with get_db() as conn:
        return PartResponse(**_get_part_or_404(conn, part_id))


@router.post("", response_model=PartResponse, status_code=201)
def create_part(body: PartCreate):
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO parts (name, category, package, description, voltage, bin_id,
               qty, min_qty, unit, cost, pn, manufacturer)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (body.name, body.category, body.package, body.description, body.voltage,
             body.bin_id, body.qty, body.min_qty, body.unit, body.cost, body.pn, body.manufacturer),
        )
        return PartResponse(**row_to_dict(
            conn.execute("SELECT * FROM parts WHERE id = ?", (cur.lastrowid,)).fetchone()
        ))


@router.patch("/{part_id}", response_model=PartResponse)
def update_part(part_id: int, body: PartUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        with get_db() as conn:
            return PartResponse(**_get_part_or_404(conn, part_id))

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    set_clause += ", updated_at = CURRENT_TIMESTAMP"

    with get_db() as conn:
        _get_part_or_404(conn, part_id)
        conn.execute(
            f"UPDATE parts SET {set_clause} WHERE id = ?",
            list(updates.values()) + [part_id],
        )
        return PartResponse(**row_to_dict(
            conn.execute("SELECT * FROM parts WHERE id = ?", (part_id,)).fetchone()
        ))


@router.delete("/{part_id}", status_code=204)
def delete_part(part_id: int):
    with get_db() as conn:
        _get_part_or_404(conn, part_id)
        conn.execute("DELETE FROM parts WHERE id = ?", (part_id,))


@router.post("/{part_id}/dispense", status_code=200)
def dispense(part_id: int, body: DispenseRequest):
    with get_db() as conn:
        part = _get_part_or_404(conn, part_id)
        if part["qty"] < body.qty:
            raise HTTPException(
                status_code=400,
                detail={"error": "insufficient_stock", "message": f"Only {part['qty']} in stock"},
            )
        conn.execute("UPDATE parts SET qty = qty - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                     (body.qty, part_id))
        conn.execute(
            "INSERT INTO events (kind, part_id, qty_delta, actor, ref) VALUES (?,?,?,?,?)",
            ("dispense", part_id, -body.qty, body.actor,
             f"project:{body.project_id}" if body.project_id else None),
        )
        new_qty = part["qty"] - body.qty
    return {"part_id": part_id, "qty": new_qty, "dispensed": body.qty}


@router.post("/{part_id}/add-stock", status_code=200)
def add_stock(part_id: int, body: AddStockRequest):
    with get_db() as conn:
        _get_part_or_404(conn, part_id)
        update_cost = ", cost = ?" if body.unit_cost is not None else ""
        cost_param = [body.unit_cost] if body.unit_cost is not None else []
        conn.execute(
            f"UPDATE parts SET qty = qty + ?, updated_at = CURRENT_TIMESTAMP{update_cost} WHERE id = ?",
            [body.qty] + cost_param + [part_id],
        )
        conn.execute(
            "INSERT INTO events (kind, part_id, qty_delta, actor, note) VALUES (?,?,?,?,?)",
            ("add", part_id, body.qty, "workbench", body.supplier),
        )
        new_qty = conn.execute("SELECT qty FROM parts WHERE id = ?", (part_id,)).fetchone()[0]
    return {"part_id": part_id, "qty": new_qty, "added": body.qty}


@router.get("/{part_id}/events", response_model=PaginatedEvents)
def get_events(part_id: int, page: int = Query(default=1, ge=1), size: int = Query(default=20, ge=1, le=100)):
    offset = (page - 1) * size
    with get_db() as conn:
        _get_part_or_404(conn, part_id)
        total = conn.execute("SELECT COUNT(*) FROM events WHERE part_id = ?", (part_id,)).fetchone()[0]
        rows = conn.execute(
            "SELECT * FROM events WHERE part_id = ? ORDER BY ts DESC LIMIT ? OFFSET ?",
            (part_id, size, offset),
        ).fetchall()
    return PaginatedEvents(
        items=[EventResponse(**row_to_dict(r)) for r in rows],
        total=total, page=page, size=size,
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/parts.py
git commit -m "feat: add parts CRUD, dispense, add-stock, and events endpoints"
```

---

### Task 6: Bins router

**Files:**
- Create: `backend/app/routers/bins.py`

- [ ] **Step 1: Write routers/bins.py**

```python
from fastapi import APIRouter, HTTPException
from app.db import get_db, row_to_dict
from app.models import BinResponse, BinDetailResponse, PartResponse

router = APIRouter(prefix="/api/bins", tags=["bins"])


@router.get("", response_model=list[BinResponse])
def list_bins():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT b.*, COUNT(p.id) as part_count
            FROM bins b
            LEFT JOIN parts p ON p.bin_id = b.id
            GROUP BY b.id
            ORDER BY b.cabinet, b.row_label, b.col_num
        """).fetchall()
    return [BinResponse(**row_to_dict(r)) for r in rows]


@router.get("/{bin_id}", response_model=BinDetailResponse)
def get_bin(bin_id: str):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM bins WHERE id = ?", (bin_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail={"error": "not_found", "message": f"Bin {bin_id} not found"})
        parts = conn.execute("SELECT * FROM parts WHERE bin_id = ? ORDER BY name", (bin_id,)).fetchall()
    return BinDetailResponse(
        **{k: row_to_dict(row)[k] for k in ["id","cabinet","row_label","col_num","description","capacity_hint"]},
        parts=[PartResponse(**row_to_dict(p)) for p in parts],
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/bins.py
git commit -m "feat: add bins list and detail endpoints"
```

---

### Task 7: System router (health + CSV + ingest)

**Files:**
- Create: `backend/app/routers/system.py`

- [ ] **Step 1: Write routers/system.py**

```python
import csv
import io
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from app.db import get_db, row_to_dict
from app.models import HealthResponse, ImportPreviewRow, ImportPreviewResponse, ImportCommitResponse

router = APIRouter(tags=["system"])

# In-memory import staging: {import_id: list[dict]}
_pending_imports: dict[str, list[dict]] = {}

CSV_COLUMNS = ["Name", "Quantity", "Type", "Voltage", "Package", "Description", "Place"]


def _parse_csv_row(row: dict, row_num: int) -> tuple[dict, list[str]]:
    """Normalise one CSV row; return (normalised_dict, issues_list)."""
    issues = []
    name = (row.get("Name") or "").strip()
    if not name:
        issues.append("empty name")

    qty_raw = (row.get("Quantity") or "").strip()
    qty: int | None = None
    if qty_raw == "":
        issues.append("empty quantity")
    else:
        try:
            qty = int(qty_raw)
        except ValueError:
            issues.append(f"non-integer quantity: {qty_raw!r}")

    # Bin id: strip spaces (e.g. "2 E1" -> "2E1")
    bin_raw = (row.get("Place") or "").strip()
    # Some rows have two bins separated by comma in the same cell after the trailing comma
    bin_id = bin_raw.split(",")[0].replace(" ", "") if bin_raw else None

    return {
        "name": name,
        "qty": qty if qty is not None else 0,
        "category": (row.get("Type") or "").strip() or None,
        "voltage": (row.get("Voltage") or "").strip() or None,
        "package": (row.get("Package") or "").strip() or None,
        "description": (row.get("Description") or "").strip() or None,
        "bin_id": bin_id or None,
    }, issues


@router.get("/api/system/health", response_model=HealthResponse)
def health():
    try:
        with get_db() as conn:
            low = conn.execute("SELECT COUNT(*) FROM parts WHERE qty <= min_qty AND min_qty > 0").fetchone()[0]
        return HealthResponse(db="ok", low_stock_count=low)
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": "db_error", "message": str(exc)})


@router.get("/api/csv")
def export_csv():
    def generate():
        yield ",".join(CSV_COLUMNS) + "\n"
        with get_db() as conn:
            rows = conn.execute(
                "SELECT name, qty, category, voltage, package, description, bin_id FROM parts ORDER BY name"
            ).fetchall()
        for r in rows:
            d = row_to_dict(r)
            yield ",".join([
                _csv_cell(d.get("name")),
                _csv_cell(str(d.get("qty", 0))),
                _csv_cell(d.get("category")),
                _csv_cell(d.get("voltage")),
                _csv_cell(d.get("package")),
                _csv_cell(d.get("description")),
                _csv_cell(d.get("bin_id")),
            ]) + "\n"

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory.csv"},
    )


def _csv_cell(val) -> str:
    if val is None:
        return ""
    s = str(val)
    if "," in s or '"' in s or "\n" in s:
        return '"' + s.replace('"', '""') + '"'
    return s


@router.post("/api/ingest/csv", response_model=ImportPreviewResponse)
async def ingest_csv_upload(file: UploadFile = File(...)):
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handle BOM
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict] = []
    preview: list[ImportPreviewRow] = []

    for i, row in enumerate(reader, start=1):
        normalised, issues = _parse_csv_row(row, i)
        if not normalised["name"]:
            continue  # skip fully blank rows silently
        rows.append(normalised)
        if i <= 20 or issues:  # always include rows with issues in preview
            preview.append(ImportPreviewRow(
                row=i,
                name=normalised["name"],
                qty=normalised["qty"],
                category=normalised["category"],
                package=normalised["package"],
                bin_id=normalised["bin_id"],
                issues=issues,
            ))

    import_id = str(uuid.uuid4())
    _pending_imports[import_id] = rows

    return ImportPreviewResponse(import_id=import_id, row_count=len(rows), preview=preview)


@router.post("/api/ingest/csv/{import_id}/commit", response_model=ImportCommitResponse)
def ingest_csv_commit(import_id: str):
    rows = _pending_imports.pop(import_id, None)
    if rows is None:
        raise HTTPException(status_code=404, detail={"error": "import_not_found", "message": "Upload first via POST /api/ingest/csv"})

    inserted = updated = skipped = 0

    with get_db() as conn:
        for row in rows:
            if not row["name"]:
                skipped += 1
                continue
            existing = conn.execute(
                "SELECT id, qty FROM parts WHERE name = ? AND (package = ? OR (package IS NULL AND ? IS NULL))",
                (row["name"], row["package"], row["package"]),
            ).fetchone()

            if existing:
                conn.execute(
                    "UPDATE parts SET qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (row["qty"], existing["id"]),
                )
                conn.execute(
                    "INSERT INTO events (kind, part_id, qty_delta, actor, note) VALUES (?,?,?,?,?)",
                    ("import", existing["id"], row["qty"] - existing["qty"], "system", "csv-import"),
                )
                updated += 1
            else:
                cur = conn.execute(
                    """INSERT INTO parts (name, qty, category, voltage, package, description, bin_id)
                       VALUES (?,?,?,?,?,?,?)""",
                    (row["name"], row["qty"], row["category"], row["voltage"],
                     row["package"], row["description"], row["bin_id"]),
                )
                conn.execute(
                    "INSERT INTO events (kind, part_id, qty_delta, actor, note) VALUES (?,?,?,?,?)",
                    ("import", cur.lastrowid, row["qty"], "system", "csv-import"),
                )
                # Auto-create bin record if it doesn't exist
                if row["bin_id"]:
                    conn.execute(
                        "INSERT OR IGNORE INTO bins (id, cabinet, row_label, col_num) VALUES (?,?,?,?)",
                        (row["bin_id"], _parse_bin_cabinet(row["bin_id"]),
                         _parse_bin_row(row["bin_id"]), _parse_bin_col(row["bin_id"])),
                    )
                inserted += 1

    return ImportCommitResponse(inserted=inserted, updated=updated, skipped=skipped)


def _parse_bin_cabinet(bin_id: str) -> str:
    """Extract cabinet from bin id: 'A1'→'0', '2E1'→'2', 'AA1'→'0'."""
    if not bin_id:
        return "0"
    if bin_id[0].isdigit():
        return bin_id[0]
    return "0"


def _parse_bin_row(bin_id: str) -> str:
    """Extract row letters: 'A1'→'A', '2E1'→'E', 'AA1'→'AA'."""
    s = bin_id.lstrip("0123456789")
    return s.rstrip("0123456789") or bin_id


def _parse_bin_col(bin_id: str) -> int:
    """Extract trailing digit: 'A1'→1, 'AB2'→2."""
    digits = ""
    for ch in reversed(bin_id):
        if ch.isdigit():
            digits = ch + digits
        else:
            break
    return int(digits) if digits else 1
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/system.py
git commit -m "feat: add health, CSV export, and two-phase CSV ingest endpoints"
```

---

### Task 8: Main app

**Files:**
- Create: `backend/app/main.py`

- [ ] **Step 1: Write app/main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import parts, bins, system


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield  # startup / shutdown hooks go here in later sub-projects


app = FastAPI(title="BINDEX", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tightened in production via env var
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parts.router)
app.include_router(bins.router)
app.include_router(system.router)


@app.get("/")
def root():
    return {"service": "bindex", "version": "0.1.0", "docs": "/docs"}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: wire FastAPI app with routers and CORS"
```

---

### Task 9: Setup script

**Files:**
- Create: `backend/setup.sh`

- [ ] **Step 1: Write setup.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/bindex
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== BINDEX setup ==="

# 1. Install Python 3.12 if missing
if ! python3.12 --version &>/dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y python3.12 python3.12-venv python3.12-dev
fi

# 2. Create directory tree
sudo mkdir -p "$APP_DIR"/{app,backups,uploads,venv}
sudo chown -R "$USER":"$USER" "$APP_DIR"

# 3. Copy app files
cp -r "$REPO_DIR/app/"* "$APP_DIR/app/"
cp -r "$REPO_DIR/alembic/" "$APP_DIR/alembic/"
cp "$REPO_DIR/alembic.ini" "$APP_DIR/"
cp "$REPO_DIR/requirements.txt" "$APP_DIR/"

# 4. Create/update venv and install deps
python3.12 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip -q
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt" -q

# 5. Run migrations
cd "$APP_DIR"
BINDEX_DB="$APP_DIR/inv.db" "$APP_DIR/venv/bin/alembic" upgrade head
echo "Database ready: $APP_DIR/inv.db"

# 6. Write systemd unit
sudo tee /etc/systemd/system/bindex.service > /dev/null <<EOF
[Unit]
Description=BINDEX Inventory API
After=network.target

[Service]
User=$USER
WorkingDirectory=$APP_DIR
Environment=BINDEX_DB=$APP_DIR/inv.db
ExecStart=$APP_DIR/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 1880 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable bindex
sudo systemctl restart bindex

echo ""
echo "=== Done ==="
echo "API:  http://$(hostname -I | awk '{print $1}'):1880"
echo "Docs: http://$(hostname -I | awk '{print $1}'):1880/docs"
```

- [ ] **Step 2: Make executable and commit**

```bash
chmod +x backend/setup.sh
git add backend/setup.sh
git commit -m "feat: add one-shot server setup script"
```

---

### Task 10: Smoke test script

**Files:**
- Create: `backend/test-curl.sh`

- [ ] **Step 1: Write test-curl.sh**

```bash
#!/usr/bin/env bash
# Run on the server after setup: ./test-curl.sh
set -euo pipefail
BASE="http://localhost:1880"

pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; exit 1; }
check() { echo "$1" | grep -q "$2" && pass "$3" || fail "$3: expected '$2' in '$1'"; }

echo "=== BINDEX smoke tests ==="

# Health
R=$(curl -sf "$BASE/api/system/health")
check "$R" '"db":"ok"' "health check"

# Create a part
R=$(curl -sf -X POST "$BASE/api/parts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test NE555","category":"IC","package":"DIP","qty":10,"min_qty":2}')
check "$R" '"name":"Test NE555"' "create part"
ID=$(echo "$R" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

# Get it back
R=$(curl -sf "$BASE/api/parts/$ID")
check "$R" '"name":"Test NE555"' "get part"

# Patch it
R=$(curl -sf -X PATCH "$BASE/api/parts/$ID" \
  -H "Content-Type: application/json" \
  -d '{"qty":20}')
check "$R" '"qty":20' "patch part qty"

# Dispense
R=$(curl -sf -X POST "$BASE/api/parts/$ID/dispense" \
  -H "Content-Type: application/json" \
  -d '{"qty":3,"actor":"workbench"}')
check "$R" '"dispensed":3' "dispense"

# Add stock
R=$(curl -sf -X POST "$BASE/api/parts/$ID/add-stock" \
  -H "Content-Type: application/json" \
  -d '{"qty":5,"supplier":"robu.in","unit_cost":12.5}')
check "$R" '"added":5' "add stock"

# Events
R=$(curl -sf "$BASE/api/parts/$ID/events")
check "$R" '"kind":"dispense"' "events log"

# List parts
R=$(curl -sf "$BASE/api/parts?q=NE555")
check "$R" '"name":"Test NE555"' "search parts"

# CSV export
R=$(curl -sf "$BASE/api/csv")
check "$R" "Name,Quantity" "csv export header"

# Delete
curl -sf -X DELETE "$BASE/api/parts/$ID"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/parts/$ID")
[ "$R" = "404" ] && pass "delete part" || fail "delete part: expected 404, got $R"

echo ""
echo "All smoke tests passed."
```

- [ ] **Step 2: Commit**

```bash
chmod +x backend/test-curl.sh
git add backend/test-curl.sh
git commit -m "chore: add curl smoke test script"
```

---

### Task 11: Deploy to server and seed CSV

- [ ] **Step 1: Copy backend to server**

```bash
# Run from project root on your machine
rsync -avz --progress -e "ssh -p 2201" \
  backend/ \
  aditya@182.70.254.11:/tmp/bindex-deploy/
```

- [ ] **Step 2: SSH in and run setup**

```bash
ssh aditya@182.70.254.11 -p 2201
cd /tmp/bindex-deploy
chmod +x setup.sh
./setup.sh
```

Expected final output:
```
=== Done ===
API:  http://<server-ip>:1880
Docs: http://<server-ip>:1880/docs
```

- [ ] **Step 3: Run smoke tests**

```bash
# Still on the server
cd /tmp/bindex-deploy
chmod +x test-curl.sh
./test-curl.sh
```

Expected: `All smoke tests passed.`

- [ ] **Step 4: Import the real CSV**

```bash
# Upload the seed CSV
curl -s -X POST http://localhost:1880/api/ingest/csv \
  -F "file=@/tmp/bindex-deploy/../Handoff/extracted/design_handoff_bindex/source_data/Inventory List - Sheet1.csv"
# Copy the import_id from the response, then commit:
IMPORT_ID="<paste-id-here>"
curl -s -X POST http://localhost:1880/api/ingest/csv/$IMPORT_ID/commit | python3 -m json.tool
```

Expected: `{"inserted": ~270, "updated": 0, "skipped": ~10}`

- [ ] **Step 5: Verify inventory loaded**

```bash
curl -s "http://localhost:1880/api/parts?size=5" | python3 -m json.tool
curl -s "http://localhost:1880/api/parts?q=NE555" | python3 -m json.tool
curl -s "http://localhost:1880/api/system/health" | python3 -m json.tool
```

- [ ] **Step 6: Commit final state**

```bash
# Back on your Windows machine
git add -A
git commit -m "chore: confirm server deployment and CSV seed"
```
