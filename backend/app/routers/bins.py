from __future__ import annotations
from typing import List
from fastapi import APIRouter, HTTPException
from app.db import get_db, row_to_dict
from app.models import BinResponse, BinDetailResponse, PartResponse

router = APIRouter(prefix="/api/bins", tags=["bins"])


@router.get("", response_model=List[BinResponse])
def list_bins():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT b.id, b.cabinet, b.row_label, b.col_num, b.description, b.capacity_hint,
                   COUNT(p.id) as part_count
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
            raise HTTPException(
                status_code=404,
                detail={"error": "not_found", "message": f"Bin {bin_id} not found"},
            )
        parts = conn.execute(
            "SELECT * FROM parts WHERE bin_id = ? ORDER BY name", (bin_id,)
        ).fetchall()
    b = row_to_dict(row)
    return BinDetailResponse(
        id=b["id"],
        cabinet=b["cabinet"],
        row_label=b["row_label"],
        col_num=b["col_num"],
        description=b.get("description"),
        capacity_hint=b.get("capacity_hint"),
        parts=[PartResponse(**row_to_dict(p)) for p in parts],
    )
