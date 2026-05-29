"""Deploy BINDEX backend to server and run setup."""
import os
import sys
import stat
import paramiko
from pathlib import Path

HOST = "182.70.254.11"
PORT = 2201
USER = "aditya"
PASS = "root"

BACKEND_DIR = Path(__file__).parent / "backend"
CSV_FILE = Path(__file__).parent / "Handoff/extracted/design_handoff_bindex/source_data/Inventory List - Sheet1.csv"
REMOTE_DEPLOY = "/tmp/bindex-deploy"


def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=15)
    return client


def run(client, cmd, check=True):
    print(f"  $ {cmd}")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    rc = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.strip())
    if err.strip():
        print(err.strip(), file=sys.stderr)
    if check and rc != 0:
        raise RuntimeError(f"Command failed (rc={rc}): {cmd}")
    return out, rc


def upload_dir(sftp, local: Path, remote: str):
    try:
        sftp.mkdir(remote)
    except OSError:
        pass
    for item in local.iterdir():
        rpath = f"{remote}/{item.name}"
        if item.is_dir():
            upload_dir(sftp, item, rpath)
        else:
            print(f"  upload {item.relative_to(BACKEND_DIR.parent)} -> {rpath}")
            sftp.put(str(item), rpath)
            # Make .sh files executable
            if item.suffix == ".sh":
                sftp.chmod(rpath, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)


def main():
    print(f"Connecting to {USER}@{HOST}:{PORT}...")
    client = connect()
    sftp = client.open_sftp()

    # ── 1. Upload backend files ──────────────────────────────────────────────
    print(f"\n[1/4] Uploading backend files to {REMOTE_DEPLOY}/...")
    run(client, f"rm -rf {REMOTE_DEPLOY} && mkdir -p {REMOTE_DEPLOY}", check=False)
    upload_dir(sftp, BACKEND_DIR, REMOTE_DEPLOY)

    # ── 2. Upload CSV ────────────────────────────────────────────────────────
    print("\n[2/4] Uploading inventory CSV...")
    sftp.put(str(CSV_FILE), "/tmp/inventory.csv")
    print("  upload inventory.csv -> /tmp/inventory.csv")

    sftp.close()

    # ── 3. Run setup.sh ──────────────────────────────────────────────────────
    print("\n[3/4] Running setup.sh (this takes ~2 min)...")

    # Use a pty so sudo prompts and apt output work correctly
    _, stdout, stderr = client.exec_command(
        f"DEBIAN_FRONTEND=noninteractive bash {REMOTE_DEPLOY}/setup.sh 2>&1",
        get_pty=True,
    )
    for line in stdout:
        print(" ", line.rstrip().encode("ascii", "replace").decode("ascii"))
    rc = stdout.channel.recv_exit_status()
    if rc != 0:
        print("\nERROR: setup.sh failed.")
        sys.exit(1)

    # ── 4. Import CSV ────────────────────────────────────────────────────────
    print("\n[4/4] Importing inventory CSV...")
    import time, json

    time.sleep(2)  # let uvicorn finish starting
    out, _ = run(client,
        "curl -sf -X POST http://localhost:1880/api/ingest/csv "
        "-F 'file=@/tmp/inventory.csv'")
    try:
        data = json.loads(out)
        import_id = data["import_id"]
        row_count = data["row_count"]
        print(f"  Staged {row_count} rows (import_id: {import_id})")
    except Exception:
        print(f"  Unexpected response: {out}")
        sys.exit(1)

    out, _ = run(client,
        f"curl -sf -X POST http://localhost:1880/api/ingest/csv/{import_id}/commit")
    try:
        result = json.loads(out)
        print(f"  Committed: {result}")
    except Exception:
        print(f"  Unexpected response: {out}")
        sys.exit(1)

    # ── Done ─────────────────────────────────────────────────────────────────
    print("\n=== Deployment complete ===")
    print(f"  API : http://{HOST}:1880")
    print(f"  Docs: http://{HOST}:1880/docs")

    client.close()


if __name__ == "__main__":
    main()
