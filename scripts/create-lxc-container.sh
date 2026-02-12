#!/bin/bash

################################################################################
# 🚀 PROXMOX LXC CONTAINER SETUP SCRIPT
# Creates an Ubuntu LXC container with all dependencies for Infrastruktur-Manager
# Run this script ON YOUR PROXMOX HOST in the shell
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
STORAGE="local-lvm"  # Change if using different storage
CORES=4
MEMORY=4096  # 4GB
DISK=30  # 30GB
NETWORK_BRIDGE="vmbr0"
CONTAINER_NAME="inframanager"

# Find next available Container ID
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Proxmox LXC Container Setup${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}[INFO]${NC} Finding next available Container ID..."

# Get all used container IDs and find the next available one
USED_IDS=$(pct list | awk 'NR>1 {print $1}' | sort -n)
CONTAINER_ID=100

if [ -z "$USED_IDS" ]; then
    CONTAINER_ID=100
else
    # Find first gap or use highest+1
    for ID in $USED_IDS; do
        if [ "$ID" -ge "$CONTAINER_ID" ]; then
            CONTAINER_ID=$((ID + 1))
        fi
    done
fi

# Allow override from command line argument
if [ -n "$1" ]; then
    if pct list | grep -q "^$1 "; then
        echo -e "${RED}[ERROR]${NC} Container $1 already exists!"
        exit 1
    fi
    CONTAINER_ID=$1
    echo -e "${YELLOW}[INFO]${NC} Using custom Container ID: $CONTAINER_ID"
else
    echo -e "${GREEN}[INFO]${NC} Next available Container ID: $CONTAINER_ID"
fi

CONTAINER_HOSTNAME="${CONTAINER_NAME}-${CONTAINER_ID}"

echo ""
echo "Configuration:"
echo "  Container ID: $CONTAINER_ID"
echo "  Container Name: $CONTAINER_NAME"
echo "  Container Hostname: $CONTAINER_HOSTNAME"
echo "  Storage: $STORAGE"
echo "  CPU Cores: $CORES"
echo "  Memory: $MEMORY MB"
echo "  Disk: $DISK GB"
echo "  Network: $NETWORK_BRIDGE"
echo ""

# Ask for confirmation
read -p "Create container with these settings? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}[INFO]${NC} Cancelled by user"
    exit 0
fi

# Create the LXC container (PRIVILEGED - needed for Docker to work properly)
echo -e "${YELLOW}[1/6]${NC} Creating LXC container..."
pct create $CONTAINER_ID \
    local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
    --hostname $CONTAINER_HOSTNAME \
    --cores $CORES \
    --memory $MEMORY \
    --storage $STORAGE \
    --rootfs $STORAGE:$DISK \
    --net0 name=eth0,bridge=$NETWORK_BRIDGE,ip=dhcp \
    --onboot 1 \
    --privileged 1
echo -e "${GREEN}✓ Container created${NC}"

# Start the container
echo -e "${YELLOW}[2/6]${NC} Starting container..."
pct start $CONTAINER_ID
sleep 3  # Wait for container to start
echo -e "${GREEN}✓ Container started${NC}"

# Wait for container to be ready
echo -e "${YELLOW}[3/6]${NC} Waiting for container to be ready..."
for i in {1..30}; do
    if pct exec $CONTAINER_ID -- apt-get update > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Container is ready${NC}"
        break
    fi
    echo "  Waiting... ($i/30)"
    sleep 1
done

# Install dependencies
echo -e "${YELLOW}[4/6]${NC} Installing dependencies..."
pct exec $CONTAINER_ID -- bash << 'SCRIPT'
set -e

echo "Updating package lists..."
apt-get update > /dev/null

echo "Installing basic tools..."
apt-get install -y \
    curl \
    wget \
    git \
    nano \
    htop \
    net-tools \
    ca-certificates \
    > /dev/null 2>&1

echo "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null
apt-get install -y nodejs > /dev/null 2>&1

echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh > /dev/null 2>&1
rm get-docker.sh

echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

echo "Adding root to docker group..."
usermod -aG docker root

echo "Enabling Docker service..."
systemctl enable docker > /dev/null 2>&1

echo "Starting Docker..."
systemctl start docker > /dev/null 2>&1

SCRIPT

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Get container IP
echo -e "${YELLOW}[5/6]${NC} Getting container IP..."
sleep 2
CONTAINER_IP=$(pct exec $CONTAINER_ID -- ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1)

echo ""
echo -e "${YELLOW}[6/6]${NC} Summary"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ Container Created Successfully!${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "Container Details:"
echo "  Container ID: $CONTAINER_ID"
echo "  Name: $CONTAINER_NAME"
echo "  IP Address: $CONTAINER_IP"
echo "  Hostname: $CONTAINER_HOSTNAME"
echo ""
echo "Installed:"
echo "  ✓ Node.js 20.x"
echo "  ✓ Docker"
echo "  ✓ Docker Compose"
echo "  ✓ Git, curl, wget, nano"
echo ""
echo "Next Steps:"
echo "  1. Copy your project to /root/infrastruktur-manager"
echo "     (Use WinSCP to transfer the project folder)"
echo ""
echo "  2. SSH into the container:"
echo "     pct enter $CONTAINER_ID"
echo "     OR"
echo "     ssh root@$CONTAINER_IP"
echo ""
echo "  3. Deploy the application:"
echo "     cd /root/infrastruktur-manager"
echo "     bash scripts/deploy.sh"
echo ""
echo "  4. Access the application:"
echo "     Frontend:  http://$CONTAINER_IP"
echo "     API:       http://$CONTAINER_IP:5000"
echo ""

