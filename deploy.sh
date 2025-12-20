#!/bin/bash
# VPS Deployment Script for Hikvision Backend
# Run this on your VPS at /root/srv/hik-backend

set -e  # Exit on error

echo "🚀 Starting Hikvision Backend Deployment..."

# 1. Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env from .env.example and configure it."
    exit 1
fi

# 2. Verify Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# 3. Verify Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Installing..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 4. Create required directories
echo "📁 Creating directories..."
mkdir -p data ftp uploads vehicles snapshots

# 5. Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# 6. Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# 7. Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 5

# 8. Check status
echo "✅ Checking service status..."
docker-compose ps

# 9. Show logs
echo ""
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Access dashboard at: http://YOUR_VPS_IP:9000"
echo "📡 FTP server running on port 21"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
