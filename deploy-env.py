import paramiko
import os

host = "159.223.162.195"
user = "root"
password = "Amir2026Amir2026a"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=user, password=password, timeout=10)

sftp = client.open_sftp()
try:
    if os.path.exists("backend/.env"):
        sftp.put("backend/.env", "/root/cryptovip/wa-companion/backend/.env")
        print("Uploaded backend/.env")
    if os.path.exists(".env"):
        sftp.put(".env", "/root/cryptovip/wa-companion/.env")
        print("Uploaded frontend/.env")
except Exception as e:
    print(e)
finally:
    sftp.close()

commands = [
    "cd /root/cryptovip/wa-companion/backend && npx prisma db push",
    "pm2 restart all"
]

for cmd in commands:
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    
    if out:
        print(out)
    if err:
        print(err)

client.close()
