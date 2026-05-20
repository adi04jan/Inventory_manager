#!/usr/bin/env bash
# One-shot BINDEX setup. Run on the server after uploading the backend/ folder.
# Does NOT touch system packages or other services.
set -euo pipefail

APP_DIR=/var/bindex
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== BINDEX setup ==="
echo "Deploy source : $DEPLOY_DIR"
echo "Install target: $APP_DIR"
echo ""

# ── 1. Check Python ───────────────────────────────────────────────────────────
PY=$(which python3)
PY_VER=$($PY --version 2>&1)
echo "[1/6] Using $PY_VER at $PY"

# ── 2. Directory tree ──────────────────────────────────────────────────────────
echo "[2/6] Creating $APP_DIR/ tree..."
sudo mkdir -p "$APP_DIR"/{app/routers,alembic/versions,backups,uploads}
sudo chown -R "$USER":"$USER" "$APP_DIR"

# ── 3. Copy application files ──────────────────────────────────────────────────
echo "[3/6] Copying application files..."
cp -r "$DEPLOY_DIR/app/." "$APP_DIR/app/"
cp -r "$DEPLOY_DIR/alembic/." "$APP_DIR/alembic/"
cp "$DEPLOY_DIR/alembic.ini" "$APP_DIR/"
cp "$DEPLOY_DIR/requirements.txt" "$APP_DIR/"

# ── 4. Virtualenv + dependencies ──────────────────────────────────────────────
echo "[4/6] Installing Python dependencies..."
# Install virtualenv in user space (no apt/sudo needed)
pip3 install --user virtualenv -q
VENV_BIN=$(python3 -c "import site; print(site.getuserbase())")/bin/virtualenv
$VENV_BIN "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip -q
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt" -q
echo "      Dependencies installed."

# ── 5. Run Alembic migrations ─────────────────────────────────────────────────
echo "[5/6] Running database migrations..."
cd "$APP_DIR"
BINDEX_DB="$APP_DIR/inv.db" "$APP_DIR/venv/bin/alembic" upgrade head
echo "      Database ready: $APP_DIR/inv.db"

# ── 6. systemd service ────────────────────────────────────────────────────────
echo "[6/6] Installing systemd service..."
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

# ── Done ──────────────────────────────────────────────────────────────────────
sleep 2
if systemctl is-active --quiet bindex; then
    echo ""
    echo "=== Setup complete ==="
    echo "  API : http://$(hostname -I | awk '{print $1}'):1880"
    echo "  Docs: http://$(hostname -I | awk '{print $1}'):1880/docs"
    echo ""
    echo "Next: import your CSV"
    echo "  curl -X POST http://localhost:1880/api/ingest/csv -F 'file=@/tmp/inventory.csv'"
else
    echo ""
    echo "ERROR: bindex.service failed to start. Check: journalctl -u bindex -n 50"
    exit 1
fi
