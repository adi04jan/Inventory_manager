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
        id          INTEGER PRIMARY KEY,
        part_id     INTEGER,
        rev         TEXT,
        fetched_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        pdf_path    TEXT NOT NULL,
        source_url  TEXT,
        pages       INTEGER,
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
        id      INTEGER PRIMARY KEY,
        part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
        package TEXT NOT NULL,
        bin_id  TEXT REFERENCES bins(id),
        qty     INTEGER NOT NULL DEFAULT 0,
        notes   TEXT
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

    op.execute("CREATE INDEX IF NOT EXISTS idx_parts_bin      ON parts(bin_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_events_part    ON events(part_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_events_ts      ON events(ts)")


def downgrade() -> None:
    for tbl in [
        "part_embeddings", "events", "cad_assets", "invoice_lines",
        "invoices", "bom_lines", "boms", "projects", "part_variants",
        "parts", "datasheets", "bins",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {tbl}")
