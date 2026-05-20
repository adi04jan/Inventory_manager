"""Deploy built frontend/dist/ to the BINDEX server via SSH."""
import os
import time
import paramiko

HOST = "182.70.254.11"
PORT = 2201
USER = "aditya"
PASSWORD = "root"
LOCAL_DIST = "frontend/dist"
REMOTE_DIST = "/var/bindex/frontend/dist"
BACKEND_APP = "backend/app"
REMOTE_APP = "/var/bindex/app"


def run(ssh, cmd):
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    if out.strip():
        print(out.strip())
    if err.strip():
        print("ERR:", err.strip())
    return out


def sudo_run(ssh, cmd):
    """Run command via sudo with PTY (needed for systemctl)."""
    channel = ssh.get_transport().open_session()
    channel.get_pty()
    channel.exec_command(f"echo {PASSWORD} | sudo -S {cmd}")
    time.sleep(3)
    out = channel.recv(4096).decode("utf-8", "replace")
    channel.close()
    return out.strip()


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

    sftp = ssh.open_sftp()
    run(ssh, f"mkdir -p {REMOTE_DIST}")

    print(f"Uploading {LOCAL_DIST} -> {REMOTE_DIST}")
    upload_dir(sftp, LOCAL_DIST, REMOTE_DIST)

    if os.path.isdir(BACKEND_APP):
        print(f"Uploading {BACKEND_APP} -> {REMOTE_APP}")
        upload_dir(sftp, BACKEND_APP, REMOTE_APP)

    sftp.close()

    print("Restarting bindex service...")
    sudo_run(ssh, "systemctl restart bindex")
    status = run(ssh, "systemctl is-active bindex").strip()
    print(f"Service status: {status}")
    ssh.close()

    if status == "active":
        print("Done. Visit http://182.70.254.11:1880")
    else:
        print("WARNING: Service may not have started cleanly. Check: journalctl -u bindex -n 50")


if __name__ == "__main__":
    main()
