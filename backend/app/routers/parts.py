from typing import List
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
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "message": f"Part {part_id} not found"},
        )
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
    conditions: List[str] = []
    params: List = []

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
        conditions.append("qty <= min_qty AND min_qty > 0")

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
            """INSERT INTO parts
               (name, category, package, description, voltage, bin_id,
                qty, min_qty, unit, cost, pn, manufacturer)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (body.name, body.category, body.package, body.description,
             body.voltage, body.bin_id, body.qty, body.min_qty, body.unit,
             body.cost, body.pn, body.manufacturer),
        )
        row = conn.execute("SELECT * FROM parts WHERE id = ?", (cur.lastrowid,)).fetchone()
    return PartResponse(**row_to_dict(row))


@router.patch("/{part_id}", response_model=PartResponse)
def update_part(part_id: int, body: PartUpdate):
    updates = body.model_dump(exclude_unset=True)
    with get_db() as conn:
        _get_part_or_404(conn, part_id)
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates) + ", updated_at = CURRENT_TIMESTAMP"
            conn.execute(
                f"UPDATE parts SET {set_clause} WHERE id = ?",
                list(updates.values()) + [part_id],
            )
        row = conn.execute("SELECT * FROM parts WHERE id = ?", (part_id,)).fetchone()
    return PartResponse(**row_to_dict(row))


@router.delete("/{part_id}", status_code=204)
def delete_part(part_id: int):
    with get_db() as conn:
        _get_part_or_404(conn, part_id)
        conn.execute("DELETE FROM parts WHERE id = ?", (part_id,))


@router.post("/{part_id}/dispense")
def dispense(part_id: int, body: DispenseRequest):
    with get_db() as conn:
        part = _get_part_or_404(conn, part_id)
        if part["qty"] < body.qty:
            raise HTTPException(
                status_code=400,
                detail={"error": "insufficient_stock", "message": f"Only {part['qty']} in stock"},
            )
        conn.execute(
            "UPDATE parts SET qty = qty - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (body.qty, part_id),
        )
        conn.execute(
            "INSERT INTO events (kind, part_id, qty_delta, actor, ref) VALUES (?,?,?,?,?)",
            ("dispense", part_id, -body.qty, body.actor,
             f"project:{body.project_id}" if body.project_id else None),
        )
        new_qty = part["qty"] - body.qty
    return {"part_id": part_id, "qty": new_qty, "dispensed": body.qty}


@router.post("/{part_id}/add-stock")
def add_stock(part_id: int, body: AddStockRequest):
    with get_db() as conn:
        _get_part_or_404(conn, part_id)
        if body.unit_cost is not None:
            conn.execute(
                "UPDATE parts SET qty = qty + ?, cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (body.qty, body.unit_cost, part_id),
            )
        else:
            conn.execute(
                "UPDATE parts SET qty = qty + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (body.qty, part_id),
            )
        conn.execute(
            "INSERT INTO events (kind, part_id, qty_delta, actor, note) VALUES (?,?,?,?,?)",
            ("add", part_id, body.qty, "workbench", body.supplier),
        )
        new_qty = conn.execute("SELECT qty FROM parts WHERE id = ?", (part_id,)).fetchone()[0]
    return {"part_id": part_id, "qty": new_qty, "added": body.qty}


@router.get("/{part_id}/events", response_model=PaginatedEvents)
def get_events(
    part_id: int,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
):
    offset = (page - 1) * size
    with get_db() as conn:
        _get_part_or_404(conn, part_id)
        total = conn.execute(
            "SELECT COUNT(*) FROM events WHERE part_id = ?", (part_id,)
        ).fetchone()[0]
        rows = conn.execute(
            "SELECT * FROM events WHERE part_id = ? ORDER BY ts DESC LIMIT ? OFFSET ?",
            (part_id, size, offset),
        ).fetchall()
    return PaginatedEvents(
        items=[EventResponse(**row_to_dict(r)) for r in rows],
        total=total,
        page=page,
        size=size,
    )
