# VPS Server Setup Guide

This guide provides two methods to run your Hikvision backend on your VPS.

---

## 🐳 Method 1: Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed on VPS
- Ports 21, 9000, 10000-10100 open in firewall

### Step 1: Check Docker Status
```bash
# SSH into your VPS
ssh root@77.237.245.47

# Navigate to project directory
cd /root/srv/hik-backend

# Check if Docker is running
docker --version
docker-compose --version

# Check running containers
docker ps -a
```

### Step 2: Check Logs for Errors
```bash
# View container logs
docker-compose logs

# View last 50 lines
docker-compose logs --tail=50

# Follow logs in real-time
docker-compose logs -f
```

### Step 3: Common Docker Issues & Fixes

#### Issue: Container Exits Immediately
```bash
# Check container status
docker-compose ps

# If container is stopped, check logs
docker-compose logs hik-app

# Common causes:
# - Missing .env file
# - Database permission errors
# - Port conflicts
```

#### Issue: Port Already in Use
```bash
# Find what's using port 21 or 9000
netstat -tulpn | grep :21
netstat -tulpn | grep :9000

# Kill the process if needed
kill -9 <PID>

# Or change ports in docker-compose.yml
```

#### Issue: Database Errors (SQLITE_CANTOPEN)
```bash
# Ensure data directory exists and has correct permissions
mkdir -p data ftp uploads vehicles snapshots
chmod -R 755 data

# Restart containers
docker-compose down
docker-compose up -d
```

### Step 4: Restart Docker Containers
```bash
# Stop all containers
docker-compose down

# Remove old containers and rebuild
docker-compose down --volumes
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f
```

### Step 5: Verify Services
```bash
# Test web dashboard
curl http://localhost:9000

# Test FTP server
curl ftp://hik:1234@localhost:21
```

---

## 🚀 Method 2: Without Docker (Direct Node.js)

This method runs the server directly on your VPS without Docker.

### Step 1: Install Node.js
```bash
# SSH into VPS
ssh root@77.237.245.47

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Setup Project
```bash
# Navigate to project directory
cd /root/srv/hik-backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Step 3: Configure .env File
Make sure your `.env` file contains:
```env
PORT=9000
FTP_PORT=21
PASV_URL=77.237.245.47
PASV_MIN=10000
PASV_MAX=10100
FTP_USER=hik
FTP_PASS=1234
TELEGRAM_BOT_TOKEN=your_actual_bot_token
TELEGRAM_CHAT_ID=your_actual_chat_id
```

### Step 4: Create Required Directories
```bash
mkdir -p data ftp uploads vehicles snapshots events hik
chmod -R 755 .
```

### Step 5: Run Server with PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start server
pm2 start server.js --name hik-backend

# View logs
pm2 logs hik-backend

# Check status
pm2 status

# Make PM2 start on boot
pm2 startup
pm2 save
```

### Step 6: Alternative - Run with Screen (Simpler)
```bash
# Install screen
apt-get install screen

# Start a new screen session
screen -S hik-backend

# Run the server
node server.js

# Detach from screen: Press Ctrl+A, then D
# Reattach later: screen -r hik-backend
```

### Step 7: Alternative - Run with nohup (Simplest)
```bash
# Run in background
nohup node server.js > server.log 2>&1 &

# View logs
tail -f server.log

# Find process
ps aux | grep node

# Stop server
kill <PID>
```

---

## 🔍 Troubleshooting Common Issues

### Port 21 Permission Denied
FTP port 21 requires root privileges. Either:
1. Run as root: `sudo node server.js`
2. Use PM2 as root: `sudo pm2 start server.js --name hik-backend`
3. Change FTP_PORT to 2121 in .env (and update camera settings)

### Firewall Blocking Connections
```bash
# Check firewall status
ufw status

# Allow required ports
ufw allow 21/tcp
ufw allow 9000/tcp
ufw allow 10000:10100/tcp

# Or disable firewall temporarily for testing
ufw disable
```

### Cannot Connect to FTP from Camera
```bash
# Test FTP locally
ftp localhost 21
# Login with: hik / 1234

# Test from another machine
ftp 77.237.245.47 21

# Check if FTP server is listening
netstat -tulpn | grep :21
```

### Telegram Bot Not Sending Messages
1. Verify bot token is correct in `.env`
2. Check bot logs for errors
3. Ensure bot has been started by users (`/start` command)
4. Test bot manually: `curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe`

---

## 📊 Monitoring & Management

### Check Server Status
```bash
# For Docker
docker-compose ps
docker-compose logs -f

# For PM2
pm2 status
pm2 logs hik-backend

# For manual process
ps aux | grep node
tail -f server.log
```

### Restart Server
```bash
# Docker
docker-compose restart

# PM2
pm2 restart hik-backend

# Manual
kill <PID>
node server.js
```

### Stop Server
```bash
# Docker
docker-compose down

# PM2
pm2 stop hik-backend
pm2 delete hik-backend

# Manual
kill <PID>
```

---

## 🎯 Quick Start Commands

### Docker Method
```bash
cd /root/srv/hik-backend
docker-compose down
docker-compose up -d --build
docker-compose logs -f
```

### Non-Docker Method (PM2)
```bash
cd /root/srv/hik-backend
npm install
pm2 start server.js --name hik-backend
pm2 logs hik-backend
```

### Non-Docker Method (Screen)
```bash
cd /root/srv/hik-backend
npm install
screen -S hik-backend
node server.js
# Press Ctrl+A, then D to detach
```

---

## 🔗 Access Your Services

- **Web Dashboard**: http://77.237.245.47:9000
- **FTP Server**: ftp://hik:1234@77.237.245.47:21
- **API Stats**: http://77.237.245.47:9000/api/stats

---

## 💡 Recommendations

1. **For Production**: Use Docker + PM2 or Docker alone
2. **For Quick Testing**: Use PM2 or Screen without Docker
3. **For Debugging**: Run directly with `node server.js` to see all output
4. **Always**: Keep `.env` file secure and never commit it to Git
