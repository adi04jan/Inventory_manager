from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, List


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
    items: List[PartResponse]
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
    items: List[EventResponse]
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
    parts: List[PartResponse]


class HealthResponse(BaseModel):
    db: str
    low_stock_count: int


class ImportPreviewRow(BaseModel):
    row: int
    name: str
    qty: Optional[int] = None
    category: Optional[str] = None
    package: Optional[str] = None
    bin_id: Optional[str] = None
    issues: List[str]


class ImportPreviewResponse(BaseModel):
    import_id: str
    row_count: int
    preview: List[ImportPreviewRow]


class ImportCommitResponse(BaseModel):
    inserted: int
    updated: int
    skipped: int
