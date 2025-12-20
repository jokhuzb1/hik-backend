# Upload Code to VPS

## Option 1: Using WinSCP (Recommended for Windows)

1. **Download WinSCP**: https://winscp.net/eng/download.php
2. **Connect to VPS**:
   - Host: `YOUR_VPS_IP`
   - Username: `root`
   - Password: `YOUR_PASSWORD`
3. **Navigate** to `/root/srv/hik-backend` on the VPS (right side)
4. **Upload** all files from `c:\Users\user\Desktop\hik-backend` (left side)

## Option 2: Using SCP from PowerShell

```powershell
# From your Windows machine
scp -r c:\Users\user\Desktop\hik-backend\* root@YOUR_VPS_IP:/root/srv/hik-backend/
```

## Option 3: Using Git (If you have a repository)

### On your Windows machine:
```powershell
cd c:\Users\user\Desktop\hik-backend
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### On your VPS:
```bash
cd /root/srv/hik-backend
git clone YOUR_REPO_URL .
```

## After Upload - On VPS

```bash
# 1. Verify files are there
ls -la /root/srv/hik-backend

# 2. Create .env file
cp .env.example .env
nano .env
# Set PASV_URL=77.237.245.47 (your VPS public IP)
# Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID

# 3. Run deployment
chmod +x deploy.sh
./deploy.sh
```

## Quick Manual Deployment (if deploy.sh fails)

```bash
cd /root/srv/hik-backend

# Create directories
mkdir -p data ftp uploads vehicles snapshots

# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```
