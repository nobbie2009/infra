#!/bin/bash

# ============================================
# Backup Script for Infrastruktur-Manager
# Backs up PostgreSQL database and application files
# Usage: ./scripts/backup.sh
# Usage: ./scripts/backup.sh [backup-dir] (default: ./backups)
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${1:-${PROJECT_DIR}/backups}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_NAME="infrastruktur-manager-${TIMESTAMP}"
FULL_BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Helper functions
log_info() { echo -e "${BLUE}[*]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }

# Print header
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Infrastruktur-Manager Backup Script   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verify Docker is running
if ! command -v docker &> /dev/null; then
  log_error "Docker is not installed or not in PATH"
  exit 1
fi

log_info "Checking Docker daemon..."
if ! docker ps &>/dev/null; then
  log_error "Docker daemon is not running"
  exit 1
fi

# Create backup directory
log_info "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Create backup subdirectory
mkdir -p "$FULL_BACKUP_PATH"
log_success "Backup directory created"
echo ""

# ============================================
# 1. Backup PostgreSQL Database
# ============================================
log_info "Backing up PostgreSQL database..."

# Check if database container is running
if docker ps | grep -q inframanager-db; then
  DB_BACKUP_FILE="${FULL_BACKUP_PATH}/database.sql"

  docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T postgres \
    pg_dump -U inframan inframanager > "$DB_BACKUP_FILE"

  if [ -s "$DB_BACKUP_FILE" ]; then
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    log_success "PostgreSQL backup created: $DB_SIZE"
  else
    log_error "PostgreSQL backup is empty"
    exit 1
  fi
else
  log_warning "Database container not running, skipping database backup"
fi

echo ""

# ============================================
# 2. Backup Application Files
# ============================================
log_info "Backing up application files..."

# Backup important directories
BACKUP_SOURCES=(
  "backend/src"
  "frontend/src"
  "docker-compose.yml"
  ".env.example"
)

for source in "${BACKUP_SOURCES[@]}"; do
  if [ -e "${PROJECT_DIR}/$source" ]; then
    log_info "  Backing up: $source"
    mkdir -p "${FULL_BACKUP_PATH}/$(dirname "$source")"
    cp -r "${PROJECT_DIR}/$source" "${FULL_BACKUP_PATH}/$source"
  fi
done

log_success "Application files backed up"
echo ""

# ============================================
# 3. Backup Volumes (if any)
# ============================================
log_info "Backing up volumes..."

VOLUMES_BACKUP="${FULL_BACKUP_PATH}/volumes"
mkdir -p "$VOLUMES_BACKUP"

if docker volume ls | grep -q inframanager; then
  log_info "Found infrastruktur-manager volumes"

  for volume in $(docker volume ls | grep inframanager | awk '{print $2}'); do
    log_info "  Backing up volume: $volume"

    # Create a temporary container to mount and backup the volume
    CONTAINER_NAME="backup-container-${RANDOM}"
    docker create --name "$CONTAINER_NAME" \
      -v "${volume}:/data:ro" \
      alpine:latest > /dev/null 2>&1 || true

    docker cp "${CONTAINER_NAME}:/data/." "${VOLUMES_BACKUP}/${volume}/" 2>/dev/null || true
    docker rm -f "$CONTAINER_NAME" > /dev/null 2>&1 || true
  done

  log_success "Volumes backed up"
else
  log_warning "No infrastruktur-manager volumes found"
fi

echo ""

# ============================================
# 4. Create Backup Metadata
# ============================================
log_info "Creating backup metadata..."

METADATA_FILE="${FULL_BACKUP_PATH}/BACKUP_INFO.txt"
cat > "$METADATA_FILE" << EOF
Infrastruktur-Manager Backup Information
=========================================
Backup Date: $(date '+%Y-%m-%d %H:%M:%S')
Backup Name: $BACKUP_NAME
Project Directory: $PROJECT_DIR

Contents:
  - database.sql: PostgreSQL database dump
  - Application source files (backend/frontend)
  - Docker configuration
  - Volumes (if any)

Restoration:
  1. Extract backup: tar -xzf ${BACKUP_NAME}.tar.gz
  2. Run restore script: ./scripts/restore.sh $FULL_BACKUP_PATH

System Information:
  Docker Version: $(docker --version)
  Docker Compose Version: $(docker compose version 2>/dev/null || echo "unknown")
  Timestamp: $TIMESTAMP
EOF

log_success "Metadata file created"
echo ""

# ============================================
# 5. Create Compressed Archive
# ============================================
log_info "Creating compressed backup archive..."

cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME" --remove-files

if [ -f "${BACKUP_NAME}.tar.gz" ]; then
  ARCHIVE_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
  log_success "Backup archive created: ${BACKUP_NAME}.tar.gz ($ARCHIVE_SIZE)"
else
  log_error "Failed to create backup archive"
  exit 1
fi

cd "$PROJECT_DIR"
echo ""

# ============================================
# 6. Generate Backup Report
# ============================================
log_info "Generating backup report..."

REPORT_FILE="${BACKUP_DIR}/BACKUP_REPORT.txt"
cat >> "$REPORT_FILE" << EOF
Backup Completed: $(date '+%Y-%m-%d %H:%M:%S')
Backup File: ${BACKUP_NAME}.tar.gz
Location: $BACKUP_DIR
Size: $ARCHIVE_SIZE

Files in Backup:
$(tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | head -20)
...

Total Files: $(tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | wc -l)

EOF

log_success "Backup report generated"
echo ""

# ============================================
# 7. Cleanup old backups (keep last 5)
# ============================================
log_info "Cleaning up old backups..."

BACKUP_COUNT=$(ls -1d infrastruktur-manager-*.tar.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt 5 ]; then
  log_warning "Found $BACKUP_COUNT backups, keeping only 5 most recent"
  ls -1t infrastruktur-manager-*.tar.gz | tail -n +6 | while read file; do
    log_info "  Removing: $file"
    rm -f "$file"
  done
fi

echo ""

# ============================================
# Final Summary
# ============================================
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Backup Completed Successfully!         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
log_success "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
log_success "Backup size: $ARCHIVE_SIZE"
log_success "Backup report: $REPORT_FILE"
echo ""
log_info "To restore this backup, run:"
echo "  ./scripts/restore.sh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""

