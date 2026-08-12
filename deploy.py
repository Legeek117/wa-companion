import paramiko
import sys

host = "159.223.162.195"
user = "root"
password = "Amir2026Amir2026a"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=user, password=password, timeout=10)

commands = [
    "cd /root/cryptovip/wa-companion/backend && npx prisma db push",
    "cd /root/cryptovip/wa-companion/backend && npm run build",
    "cd /root/cryptovip/wa-companion && npm run build",
    "pm2 restart all"
]

for cmd in commands:
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Read output and safely print to Windows console by replacing unprintable characters
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    
    if out:
        print(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding))
    if err:
        print(err.encode(sys.stderr.encoding, errors='replace').decode(sys.stderr.encoding))

client.close()
