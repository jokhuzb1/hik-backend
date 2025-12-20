# Quick Reference

## Initial Deployment
```bash
# 1. Upload code to VPS
scp -r /path/to/hik-backend root@YOUR_VPS_IP:/root/srv/hik-backend

# 2. SSH into VPS
ssh root@YOUR_VPS_IP

# 3. Navigate to directory
cd /root/srv/hik-backend

# 4. Configure environment
cp .env.example .env
nano .env  # Set PASV_URL, TELEGRAM_BOT_TOKEN, etc.

# 5. Run deployment script
chmod +x deploy.sh
./deploy.sh
```

## Firewall Configuration
```bash
# Ubuntu/Debian (UFW)
ufw allow 21/tcp
ufw allow 9000/tcp
ufw allow 10000:10100/tcp

# CentOS/RHEL (firewalld)
firewall-cmd --permanent --add-port=21/tcp
firewall-cmd --permanent --add-port=9000/tcp
firewall-cmd --permanent --add-port=10000-10100/tcp
firewall-cmd --reload
```

## Camera Settings
- **FTP Server**: `YOUR_VPS_PUBLIC_IP`
- **Port**: `21`
- **Username**: `hik`
- **Password**: `1234`

## Useful Commands
```bash
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Update and redeploy
git pull
docker-compose up -d --build
```
