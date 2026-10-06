#!/bin/bash
# Production Deployment Script for DigitalOcean / AWS EC2

set -e

echo "=== Starting VoiceNexus AI Production Deployment ==="

# 1. Update Ubuntu packages
sudo apt update && sudo apt upgrade -y

# 2. Install Docker & Docker Compose if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# 3. Pull latest code & launch containers
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.yml up -d --build

echo "=== Deployment Completed Successfully! ==="
