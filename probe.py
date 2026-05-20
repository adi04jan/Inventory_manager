import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("182.70.254.11", port=2201, username="aditya", password="root", timeout=15)

cmds = [
    ("Health", "curl -sf http://localhost:1880/api/system/health"),
    ("Total parts", "curl -sf 'http://localhost:1880/api/parts?size=1' | python3 -c \"import sys,json; d=json.load(sys.stdin); print(f'total={d[\\\"total\\\"]}'  )\""),
    ("NE555 search", "curl -sf 'http://localhost:1880/api/parts?q=NE555' | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d['items'][0]['name'], 'qty='+str(d['items'][0]['qty']), 'bin='+str(d['items'][0]['bin_id']))\""),
    ("Bins count", "curl -sf http://localhost:1880/api/bins | python3 -c \"import sys,json; b=json.load(sys.stdin); print(f'{len(b)} bins')\""),
    ("Service status", "systemctl is-active bindex"),
]

for label, cmd in cmds:
    _, stdout, _ = client.exec_command(cmd)
    out = stdout.read().decode(errors="replace").strip()
    print(f"  {label}: {out}")

client.close()
