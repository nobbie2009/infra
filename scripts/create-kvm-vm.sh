#!/bin/bash

################################################################################
# 🚀 PROXMOX KVM VM CREATION SCRIPT
# Creates Ubuntu 22.04 KVM VM optimized for Docker
# Requires manual Ubuntu installation via ISO
# Run this script ON YOUR PROXMOX HOST in the shell
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# CONFIGURATION - ADJUST IF NEEDED
# ============================================================================
STORAGE="local-lvm"        # Local LVM storage (verify: pvesm storage-content local-lvm)
ISO_STORAGE="local"        # ISO storage pool (usually 'local' for Proxmox)
CORES=4                    # CPU cores
MEMORY=4096                # RAM in MB (4GB)
DISK=50                    # Disk in GB (50GB for Docker + apps)
NETWORK_BRIDGE="vmbr0"     # Network bridge
VM_NAME="inframanager"     # VM name prefix
# ============================================================================

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🚀 Proxmox KVM VM Setup${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Validate storage
echo -e "${YELLOW}[1/5]${NC} Validating Proxmox configuration..."
echo -e "${YELLOW}  [DEBUG] Checking storage: $STORAGE${NC}"
echo -e "${YELLOW}  [DEBUG] ISO storage: $ISO_STORAGE${NC}"
echo -e "${YELLOW}  [DEBUG] Network bridge: $NETWORK_BRIDGE${NC}"

if ! pvesm status 2>/dev/null | grep -q "^$STORAGE "; then
    echo -e "${RED}[ERROR]${NC} Storage '$STORAGE' not found!"
    echo -e "${YELLOW}  [DEBUG] Available storages:${NC}"
    pvesm status
    exit 1
fi
echo -e "${GREEN}✓ Storage $STORAGE verified${NC}"
echo -e "${YELLOW}  [DEBUG] Running final system check...${NC}"

# Find next available VM ID (start from 300)
echo -e "${YELLOW}  Scanning existing VMs...${NC}"
USED_IDS=$(qm list 2>/dev/null | awk 'NR>1 {print $1}' | sort -n || echo "")
VM_ID=300

if [ ! -z "$USED_IDS" ]; then
    echo -e "${YELLOW}  Found existing VMs: $USED_IDS${NC}"
    for ID in $USED_IDS; do
        if [ "$ID" -ge "$VM_ID" ]; then
            VM_ID=$((ID + 1))
            echo -e "${YELLOW}  VM $ID exists, next ID will be: $VM_ID${NC}"
        fi
    done
else
    echo -e "${YELLOW}  No existing VMs found, using default VM ID: $VM_ID${NC}"
fi

# Allow override from command line
if [ -n "$1" ]; then
    if qm list 2>/dev/null | grep -q "^$1 "; then
        echo -e "${RED}[ERROR]${NC} VM $1 already exists!"
        exit 1
    fi
    VM_ID=$1
fi

VM_HOSTNAME="${VM_NAME}-${VM_ID}"

echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  VM ID:        $VM_ID"
echo "  Hostname:     $VM_HOSTNAME"
echo "  Storage:      $STORAGE (LVM)"
echo "  CPU Cores:    $CORES"
echo "  Memory:       $MEMORY MB"
echo "  Disk:         $DISK GB"
echo "  Network:      $NETWORK_BRIDGE"
echo ""
echo -e "${YELLOW}ℹ️  KVM VM Benefits:${NC}"
echo "  ✓ Full kernel isolation (Docker overlay-fs works perfectly)"
echo "  ✓ No AppArmor confinement issues"
echo "  ✓ Production-ready deployment"
echo ""

# Ask for confirmation
read -p "Create VM with these settings? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}[INFO]${NC} Cancelled by user"
    exit 0
fi

# Create VM with proper LVM disk specification
echo -e "${YELLOW}[2/5]${NC} Creating KVM VM..."
echo -e "${YELLOW}  [DEBUG] Running: qm create $VM_ID --name $VM_HOSTNAME ...${NC}"
qm create $VM_ID \
    --name $VM_HOSTNAME \
    --memory $MEMORY \
    --cores $CORES \
    --sockets 1 \
    --machine q35 \
    --bios seabios \
    --onboot 1 \
    --scsihw virtio-scsi-pci \
    --virtio0 "$STORAGE:$DISK" \
    --net0 virtio,bridge=$NETWORK_BRIDGE,firewall=1 \
    --boot order='ide2;virtio0;net0'

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ VM created successfully (ID: $VM_ID)${NC}"
else
    echo -e "${RED}✗ Failed to create VM${NC}"
    exit 1
fi

# Download Ubuntu ISO
echo -e "${YELLOW}[3/5]${NC} Setting up Ubuntu 22.04 ISO..."
ISO_PATH="/tmp/ubuntu-22.04-live-server-amd64.iso"
ISO_NAME="ubuntu-22.04-live-server-amd64.iso"

# Try multiple URLs in order of preference
ISO_URLS=(
    "https://releases.ubuntu.com/jammy/ubuntu-22.04.5-live-server-amd64.iso"
    "https://releases.ubuntu.com/jammy/ubuntu-22.04.4-live-server-amd64.iso"
    "https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso"
    "https://releases.ubuntu.com/22.04/ubuntu-22.04.4-live-server-amd64.iso"
    "https://releases.ubuntu.com/jammy/$ISO_NAME"
    "https://releases.ubuntu.com/22.04/$ISO_NAME"
)

echo -e "${YELLOW}  [DEBUG] ISO_PATH: $ISO_PATH${NC}"
echo -e "${YELLOW}  [DEBUG] Trying versions: 22.04.5, 22.04.4, 22.04.3, 22.04${NC}"

ISO_SIZE=0
if [ -f "$ISO_PATH" ]; then
    ISO_SIZE=$(stat -f%z "$ISO_PATH" 2>/dev/null || stat -c%s "$ISO_PATH" 2>/dev/null || echo 0)
    echo -e "${YELLOW}  [DEBUG] Found cached ISO, size: $ISO_SIZE bytes${NC}"
fi

# Check if ISO is valid (>100MB)
if [ "$ISO_SIZE" -gt 104857600 ]; then
    echo -e "${GREEN}✓ ISO already cached and valid at $ISO_PATH${NC}"
    echo -e "${YELLOW}  [DEBUG] File size: $(du -h $ISO_PATH 2>/dev/null | cut -f1)${NC}"
else
    if [ "$ISO_SIZE" -gt 0 ]; then
        echo -e "${YELLOW}  [WARN] Cached ISO is corrupted (only $ISO_SIZE bytes), deleting...${NC}"
        rm -f "$ISO_PATH"
    else
        echo -e "${YELLOW}  [DEBUG] ISO not found, attempting download...${NC}"
    fi

    # Try each URL in sequence
    ISO_DOWNLOADED=0
    for URL in "${ISO_URLS[@]}"; do
        echo -e "${YELLOW}  [DEBUG] Trying: $URL${NC}"
        if wget --timeout=60 -O "$ISO_PATH" "$URL" 2>&1; then
            ISO_SIZE=$(stat -f%z "$ISO_PATH" 2>/dev/null || stat -c%s "$ISO_PATH" 2>/dev/null || echo 0)
            if [ "$ISO_SIZE" -gt 104857600 ]; then
                echo -e "${GREEN}✓ ISO downloaded successfully${NC}"
                echo -e "${YELLOW}  [DEBUG] File size: $(du -h $ISO_PATH | cut -f1)${NC}"
                ISO_DOWNLOADED=1
                break
            else
                echo -e "${YELLOW}  [WARN] Downloaded but invalid size ($ISO_SIZE bytes), trying next URL...${NC}"
                rm -f "$ISO_PATH"
            fi
        else
            echo -e "${YELLOW}  [WARN] URL failed, trying next...${NC}"
            rm -f "$ISO_PATH"
        fi
    done

    if [ $ISO_DOWNLOADED -eq 0 ]; then
        echo -e "${RED}✗ Failed to download ISO from all URLs!${NC}"
        echo -e "${YELLOW}  [DEBUG] All attempted URLs:${NC}"
        for URL in "${ISO_URLS[@]}"; do
            echo -e "${YELLOW}         $URL${NC}"
        done
        echo ""
        echo -e "${YELLOW}  [HELP] Manual options:${NC}"
        echo -e "${YELLOW}  1. Download manually from: https://releases.ubuntu.com/jammy/${NC}"
        echo -e "${YELLOW}  2. Place ISO at: $ISO_PATH${NC}"
        echo -e "${YELLOW}  3. Re-run this script${NC}"
        exit 1
    fi
fi

# Import ISO to Proxmox
echo -e "${YELLOW}  [DEBUG] Importing ISO to Proxmox ISO storage...${NC}"
echo -e "${YELLOW}  [DEBUG] Target: /var/lib/vz/template/iso/$ISO_NAME${NC}"
if cp "$ISO_PATH" /var/lib/vz/template/iso/ 2>/dev/null; then
    echo -e "${GREEN}✓ ISO imported to Proxmox${NC}"
else
    echo -e "${YELLOW}  [WARN] Could not copy ISO (may already exist)${NC}"
fi

# Attach ISO to VM
echo -e "${YELLOW}  [DEBUG] Attaching ISO: $ISO_STORAGE:iso/$ISO_NAME${NC}"
qm set $VM_ID --ide2 "$ISO_STORAGE:iso/$ISO_NAME,media=cdrom"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ISO attached to VM${NC}"
else
    echo -e "${RED}✗ Failed to attach ISO${NC}"
    exit 1
fi

# Start VM
echo -e "${YELLOW}[4/5]${NC} Starting VM..."
echo -e "${YELLOW}  [DEBUG] Running: qm start $VM_ID${NC}"
qm start $VM_ID
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ VM started successfully${NC}"
else
    echo -e "${RED}✗ Failed to start VM${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[5/5]${NC} Setup Complete"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ KVM VM Ready for Installation!${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

echo "VM Details:"
echo "  VM ID:     $VM_ID"
echo "  Hostname:  $VM_HOSTNAME"
echo "  Storage:   $STORAGE (50GB)"
echo "  Memory:    ${MEMORY}MB (4GB)"
echo "  CPU:       $CORES cores"
echo ""

echo -e "${YELLOW}📋 NEXT STEPS - Manual Ubuntu Installation:${NC}"
echo ""
echo "1. Open Proxmox Web UI → Virtual Machines → $VM_HOSTNAME"
echo "   OR use console:"
echo "   ${YELLOW}qm terminal $VM_ID${NC}"
echo ""
echo "2. Boot from ISO and install Ubuntu 22.04 LTS with:"
echo "   - Hostname: $VM_HOSTNAME"
echo "   - Username: ubuntu"
echo "   - Enable SSH server during installation"
echo ""
echo "3. After installation completes, find VM IP:"
echo "   ${YELLOW}ssh ubuntu@<IP>${NC}"
echo ""
echo "4. Install Docker on the VM:"
echo "   ${YELLOW}curl -fsSL https://get.docker.com | sh${NC}"
echo "   ${YELLOW}sudo usermod -aG docker ubuntu${NC}"
echo "   ${YELLOW}sudo systemctl enable docker${NC}"
echo ""
echo "5. Install Node.js 20 on the VM:"
echo "   ${YELLOW}curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -${NC}"
echo "   ${YELLOW}sudo apt-get install -y nodejs docker-compose-plugin${NC}"
echo ""
echo "6. Copy project to VM (from your machine):"
echo "   Use WinSCP or:"
echo "   ${YELLOW}scp -r infrastruktur-manager ubuntu@<VM-IP>:~/${NC}"
echo ""
echo "7. Deploy application in VM:"
echo "   ${YELLOW}cd ~/infrastruktur-manager${NC}"
echo "   ${YELLOW}cp .env.example .env${NC}"
echo "   ${YELLOW}nano .env  # Update JWT_SECRET, DB_PASSWORD${NC}"
echo "   ${YELLOW}bash scripts/deploy.sh${NC}"
echo ""

echo -e "${YELLOW}🔍 Check VM Status:${NC}"
echo "   ${YELLOW}qm status $VM_ID${NC}"
echo "   ${YELLOW}qm terminal $VM_ID${NC}"
echo ""

