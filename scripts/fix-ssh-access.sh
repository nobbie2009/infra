#!/bin/bash

################################################################################
# 🔧 CONTAINER SSH ACCESS FIX
# Fixes SSH access issues in the LXC container
# Run this script ON THE CONTAINER or via: pct exec <ID> -- bash fix-ssh-access.sh
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Container SSH Access Troubleshooting${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 1. Check if SSH is installed
echo -e "${YELLOW}[1/5]${NC} Checking SSH installation..."
if command -v sshd &> /dev/null; then
    echo -e "${GREEN}✓ SSH server is installed${NC}"
else
    echo -e "${YELLOW}[INSTALL]${NC} Installing SSH server..."
    apt-get update > /dev/null
    apt-get install -y openssh-server > /dev/null 2>&1
    echo -e "${GREEN}✓ SSH server installed${NC}"
fi

# 2. Check SSH configuration
echo -e "${YELLOW}[2/5]${NC} Checking SSH configuration..."

# Enable PermitRootLogin
if grep -q "^#PermitRootLogin" /etc/ssh/sshd_config; then
    echo -e "${YELLOW}[FIX]${NC} Enabling PermitRootLogin..."
    sed -i 's/^#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
    echo -e "${GREEN}✓ PermitRootLogin enabled${NC}"
elif ! grep -q "^PermitRootLogin yes" /etc/ssh/sshd_config; then
    echo -e "${YELLOW}[FIX]${NC} Adding PermitRootLogin yes..."
    echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
    echo -e "${GREEN}✓ PermitRootLogin added${NC}"
else
    echo -e "${GREEN}✓ PermitRootLogin already enabled${NC}"
fi

# Enable password authentication
if grep -q "^#PasswordAuthentication" /etc/ssh/sshd_config; then
    echo -e "${YELLOW}[FIX]${NC} Enabling PasswordAuthentication..."
    sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
    echo -e "${GREEN}✓ PasswordAuthentication enabled${NC}"
elif ! grep -q "^PasswordAuthentication yes" /etc/ssh/sshd_config; then
    echo -e "${YELLOW}[FIX]${NC} Adding PasswordAuthentication yes..."
    echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config
    echo -e "${GREEN}✓ PasswordAuthentication added${NC}"
else
    echo -e "${GREEN}✓ PasswordAuthentication already enabled${NC}"
fi

# 3. Start/Restart SSH service
echo -e "${YELLOW}[3/5]${NC} Starting SSH service..."
systemctl enable ssh > /dev/null 2>&1
systemctl restart ssh > /dev/null 2>&1
echo -e "${GREEN}✓ SSH service running${NC}"

# 4. Check SSH port
echo -e "${YELLOW}[4/5]${NC} Checking SSH port..."
if netstat -tuln | grep -q ":22 "; then
    echo -e "${GREEN}✓ SSH listening on port 22${NC}"
else
    echo -e "${RED}✗ SSH NOT listening on port 22${NC}"
    echo "Trying to restart SSH..."
    systemctl restart ssh
    sleep 2
fi

# 5. Get container IP
echo -e "${YELLOW}[5/5]${NC} Getting container IP address..."
IP=$(ip addr show eth0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1)

if [ -z "$IP" ]; then
    echo -e "${RED}✗ No IP address assigned${NC}"
    echo "Trying DHCP..."
    dhclient eth0 > /dev/null 2>&1 || true
    sleep 2
    IP=$(ip addr show eth0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1)
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ SSH Configuration Complete!${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

if [ -z "$IP" ]; then
    echo -e "${RED}⚠️ WARNING: No IP address found!${NC}"
    echo ""
    echo "Check network configuration:"
    echo "  ip addr show"
    echo "  ip link show"
else
    echo "SSH Access Details:"
    echo "  Host: $IP"
    echo "  Port: 22"
    echo "  User: root"
    echo "  Password: <your new password>"
    echo ""
    echo "Test connection:"
    echo "  ssh root@$IP"
    echo ""
    echo "From WinSCP:"
    echo "  Hostname: $IP"
    echo "  Port: 22"
    echo "  Username: root"
    echo "  Password: <your new password>"
fi

echo ""
echo "Current SSH configuration:"
grep -E "^(PermitRootLogin|PasswordAuthentication)" /etc/ssh/sshd_config || echo "No SSH config found"
echo ""

