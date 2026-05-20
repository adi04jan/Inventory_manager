"""Deploy built frontend/dist/ to the BINDEX server via SSH."""
import os
import paramiko

HOST = "182.70.254.11"
PORT = 2201
USER = "aditya"
PASSWORD = "root"
LOCAL_DIST = "frontend/dist"
REMOTE_DIST = "/var/bindex/frontend/dist"


def run(ssh, cmd):
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    if out.strip():
        print(out.strip())
    if err.strip():
        print("ERR:", err.strip())
    return out


def upload_dir(sftp, local, remote):
    try:
        sftp.mkdir(remote)
    except OSError:
        pass
    for name in os.listdir(local):
        lpath = os.path.join(local, name)
        rpath = f"{remote}/{name}"
        if os.path.isdir(lpath):
            upload_dir(sftp, lpath, rpath)
        else:
            sftp.put(lpath, rpath)
            print(f"  -> {rpath}")


def main():
    if not os.path.isdir(LOCAL_DIST):
        print(f"ERROR: {LOCAL_DIST} does not exist. Run 'npm run build' in frontend/ first.")
        return

    print(f"Connecting to {USER}@{HOST}:{PORT}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD)

    run(ssh, f"mkdir -p {REMOTE_DIST}")

    sftp = ssh.open_sftp()
    print(f"Uploading {LOCAL_DIST} -> {REMOTE_DIST}")
    upload_dir(sftp, LOCAL_DIST, REMOTE_DIST)
    sftp.close()

    print("Restarting bindex service...")
    run(ssh, "systemctl restart bindex")
    status = run(ssh, "systemctl is-active bindex").strip()
    print(f"Service status: {status}")
    ssh.close()

    if status == "active":
        print("Done. Visit http://182.70.254.11:1880")
    else:
        print("WARNING: Service may not have started cleanly.")


if __name__ == "__main__":
    main()
