from __future__ import annotations
import csv
import io
import uuid
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from app.auth import get_current_user
from app.db import get_db, row_to_dict
from app.models import (
    HealthResponse, ImportPreviewRow, ImportPreviewResponse, ImportCommitResponse,
)

router = APIRouter(tags=["system"], dependencies=[Depends(get_current_user)])

# In-memory staging: {import_id: list[normalised_row_dict]}
# Lost on restart — acceptable since upload+commit is a fast two-step.
_pending_imports: Dict[str, List[dict]] = {}

_CSV_COLUMNS = ["Name", "Quantity", "Type", "Voltage", "Package", "Description", "Place"]


# ─── Health ───────────────────────────────────────────────────────────────────

@router.get("/api/system/health", response_model=HealthResponse)
def health():
    try:
        with get_db() as conn:
            low = conn.execute(
                "SELECT COUNT(*) FROM parts WHERE qty <= min_qty AND min_qty > 0"
            ).fetchone()[0]
        return HealthResponse(db="ok", low_stock_count=low)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": "db_error", "message": str(exc)},
        )


# ─── CSV export ───────────────────────────────────────────────────────────────

def _csv_cell(val) -> str:
    if val is None:
        return ""
    s = str(val)
    if "," in s or '"' in s or "\n" in s:
        return '"' + s.replace('"', '""') + '"'
    return s


@router.get("/api/csv")
def export_csv():
    def generate():
        yield ",".join(_CSV_COLUMNS) + "\n"
        with get_db() as conn:
            rows = conn.execute(
                "SELECT name, qty, category, voltage, package, description, bin_id"
                " FROM parts ORDER BY name"
            ).fetchall()
        for r in rows:
            d = row_to_dict(r)
            yield ",".join([
                _csv_cell(d.get("name")),
                _csv_cell(d.get("qty", 0)),
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


# ─── CSV ingest (two-phase) ───────────────────────────────────────────────────

def _normalise_row(row: dict, row_num: int) -> tuple[dict, list[str]]:
    issues: List[str] = []

    name = (row.get("Name") or "").strip()
    if not name:
        issues.append("empty name")

    qty_raw = (row.get("Quantity") or "").strip()
    qty: int = 0
    if qty_raw == "":
        issues.append("empty quantity")
    else:
        try:
            qty = int(float(qty_raw))
        except ValueError:
            issues.append(f"non-integer quantity: {qty_raw!r}")

    # Bin id: strip spaces ("2 E1" → "2E1"); take first if comma-separated
    bin_raw = (row.get("Place") or "").strip()
    bin_id = (bin_raw.split(",")[0].replace(" ", "") or None) if bin_raw else None

    return {
        "name": name,
        "qty": qty,
        "category": (row.get("Type") or "").strip() or None,
        "voltage": (row.get("Voltage") or "").strip() or None,
        "package": (row.get("Package") or "").strip() or None,
        "description": (row.get("Description") or "").strip() or None,
        "bin_id": bin_id,
    }, issues


@router.post("/api/ingest/csv", response_model=ImportPreviewResponse)
async def ingest_csv_upload(file: UploadFile = File(...)):
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict] = []
    preview: list[ImportPreviewRow] = []

    for i, raw_row in enumerate(reader, start=1):
        normalised, issues = _normalise_row(raw_row, i)
        if not normalised["name"]:
            continue  # silently skip blank rows
        rows.append(normalised)
        if len(preview) < 20 or issues:
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
        raise HTTPException(
            status_code=404,
            detail={"error": "import_not_found", "message": "Upload first via POST /api/ingest/csv"},
        )

    inserted = updated = skipped = 0

    with get_db() as conn:
        for row in rows:
            if not row["name"]:
                skipped += 1
                continue

            existing = conn.execute(
                """SELECT id, qty FROM parts
                   WHERE name = ?
                   AND (package IS ? OR package = ?)""",
                (row["name"], row["package"], row["package"]),
            ).fetchone()

            if existing:
                old_qty = existing["qty"]
                conn.execute(
                    "UPDATE parts SET qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (row["qty"], existing["id"]),
                )
                conn.execute(
                    "INSERT INTO events (kind, part_id, qty_delta, actor, note) VALUES (?,?,?,?,?)",
                    ("import", existing["id"], row["qty"] - old_qty, "system", "csv-import"),
                )
                updated += 1
            else:
                if row["bin_id"]:
                    conn.execute(
                        """INSERT OR IGNORE INTO bins (id, cabinet, row_label, col_num)
                           VALUES (?,?,?,?)""",
                        (row["bin_id"],
                         _bin_cabinet(row["bin_id"]),
                         _bin_row_label(row["bin_id"]),
                         _bin_col(row["bin_id"])),
                    )
                cur = conn.execute(
                    """INSERT INTO parts
                       (name, qty, category, voltage, package, description, bin_id)
                       VALUES (?,?,?,?,?,?,?)""",
                    (row["name"], row["qty"], row["category"], row["voltage"],
                     row["package"], row["description"], row["bin_id"]),
                )
                conn.execute(
                    "INSERT INTO events (kind, part_id, qty_delta, actor, note) VALUES (?,?,?,?,?)",
                    ("import", cur.lastrowid, row["qty"], "system", "csv-import"),
                )
                inserted += 1

    return ImportCommitResponse(inserted=inserted, updated=updated, skipped=skipped)


# ─── Bin ID parsing helpers ───────────────────────────────────────────────────

def _bin_cabinet(bin_id: str) -> str:
    """Leading digit(s) = cabinet number; letters-only bins = cabinet '0'."""
    digits = ""
    for ch in bin_id:
        if ch.isdigit():
            digits += ch
        else:
            break
    return digits or "0"


def _bin_row_label(bin_id: str) -> str:
    """Strip leading digits and trailing digits to get row letters."""
    s = bin_id.lstrip("0123456789")
    return s.rstrip("0123456789") or bin_id


def _bin_col(bin_id: str) -> int:
    """Trailing digit(s) = column number."""
    digits = ""
    for ch in reversed(bin_id):
        if ch.isdigit():
            digits = ch + digits
        else:
            break
    return int(digits) if digits else 1
