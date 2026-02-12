#!/bin/bash

# ============================================
# Setup Automated Backups with Cron
# Configures automatic daily backups
# Usage: ./scripts/setup-backup-cron.sh [hour] [minute]
# Example: ./scripts/setup-backup-cron.sh 2 30  (runs at 2:30 AM)
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log_info() { echo -e "${BLUE}[*]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# Print header
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Backup Cron Setup Script              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Get parameters
HOUR="${1:-2}"
MINUTE="${2:-30}"

# Validate parameters
if ! [[ "$HOUR" =~ ^[0-9]+$ ]] || [ "$HOUR" -lt 0 ] || [ "$HOUR" -gt 23 ]; then
  log_error "Invalid hour: $HOUR (must be 0-23)"
  exit 1
fi

if ! [[ "$MINUTE" =~ ^[0-9]+$ ]] || [ "$MINUTE" -lt 0 ] || [ "$MINUTE" -gt 59 ]; then
  log_error "Invalid minute: $MINUTE (must be 0-59)"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="${PROJECT_DIR}/scripts/backup.sh"
LOG_FILE="${PROJECT_DIR}/backups/backup.log"

log_info "Project directory: $PROJECT_DIR"
log_info "Backup script: $BACKUP_SCRIPT"
log_info "Log file: $LOG_FILE"
log_info "Scheduled time: $HOUR:$MINUTE daily"
echo ""

# Check if running on Linux/macOS
if [[ "$OSTYPE" != "linux-gnu"* ]] && [[ "$OSTYPE" != "darwin"* ]]; then
  log_error "This script only works on Linux/macOS"
  log_info "On Windows, use Task Scheduler instead"
  exit 1
fi

# Make backup script executable
log_info "Making backup script executable..."
chmod +x "$BACKUP_SCRIPT"
chmod +x "${PROJECT_DIR}/scripts/restore.sh"
log_success "Scripts are executable"
echo ""

# Create cron job entry
CRON_ENTRY="$MINUTE $HOUR * * * cd \"$PROJECT_DIR\" && bash \"$BACKUP_SCRIPT\" >> \"$LOG_FILE\" 2>&1"

log_info "Cron entry to be added:"
echo "  $CRON_ENTRY"
echo ""

# Check if cron entry already exists
CRONTAB_FILE="/tmp/crontab-inframan-${RANDOM}.txt"
crontab -l > "$CRONTAB_FILE" 2>/dev/null || echo "" > "$CRONTAB_FILE"

if grep -q "infrastruktur-manager.*backup.sh" "$CRONTAB_FILE"; then
  log_error "Backup cron job already exists"
  read -p "Remove existing job and create a new one? (yes/no): " -r CONFIRM
  if [[ ! $CONFIRM =~ ^yes$ ]]; then
    rm -f "$CRONTAB_FILE"
    exit 0
  fi
  # Remove existing entry
  grep -v "infrastruktur-manager.*backup.sh" "$CRONTAB_FILE" > "${CRONTAB_FILE}.new"
  mv "${CRONTAB_FILE}.new" "$CRONTAB_FILE"
fi

# Add new cron job
echo "$CRON_ENTRY" >> "$CRONTAB_FILE"

# Install crontab
log_info "Installing cron job..."
crontab "$CRONTAB_FILE"
rm -f "$CRONTAB_FILE"

log_success "Cron job installed"
echo ""

# Verify installation
log_info "Verifying installation..."
if crontab -l | grep -q "infrastruktur-manager.*backup.sh"; then
  log_success "Cron job is active"
  echo ""
  log_info "Current cron jobs:"
  crontab -l | grep "infrastruktur-manager" || echo "  (none found - this is unexpected)"
else
  log_error "Cron job installation failed"
  exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Cron Setup Completed!                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
log_success "Automatic backups scheduled for $HOUR:$MINUTE daily"
log_info "Backup log: $LOG_FILE"
echo ""
echo "To remove the cron job, run: crontab -e"
echo "Or remove with: crontab -r"
echo ""

