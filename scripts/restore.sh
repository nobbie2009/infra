#!/bin/bash

# ============================================
# Restore Script for Infrastruktur-Manager
# Restores PostgreSQL database and application files from backup
# Usage: ./scripts/restore.sh <backup-file.tar.gz>
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
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }

# Print header
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Infrastruktur-Manager Restore Script  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Validate arguments
if [ -z "$1" ]; then
  log_error "Usage: ./scripts/restore.sh <backup-file.tar.gz>"
  log_info "Example: ./scripts/restore.sh ./backups/infrastruktur-manager-20240101-120000.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_RESTORE_DIR="/tmp/infrastruktur-manager-restore-${RANDOM}"

# Validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  log_error "Backup file not found: $BACKUP_FILE"
  exit 1
fi

log_info "Backup file: $BACKUP_FILE"
log_info "Project directory: $PROJECT_DIR"
log_info "Temporary restore directory: $TEMP_RESTORE_DIR"
echo ""

# Verify Docker is running
log_info "Checking Docker daemon..."
if ! docker ps &>/dev/null; then
  log_error "Docker daemon is not running"
  exit 1
fi
log_success "Docker is running"
echo ""

# Extract backup
log_info "Extracting backup archive..."
mkdir -p "$TEMP_RESTORE_DIR"
cd "$TEMP_RESTORE_DIR"
tar -xzf "$BACKUP_FILE"
cd "$PROJECT_DIR"

BACKUP_DIR=$(ls -d "$TEMP_RESTORE_DIR"/infrastruktur-manager-* 2>/dev/null | head -1)
if [ -z "$BACKUP_DIR" ]; then
  log_error "Could not find backup directory in archive"
  rm -rf "$TEMP_RESTORE_DIR"
  exit 1
fi

log_success "Backup extracted to: $BACKUP_DIR"
echo ""

# ============================================
# Confirmation Prompt
# ============================================
echo -e "${YELLOW}⚠️  WARNING: This will restore your database and files!${NC}"
echo "Backup contents:"
ls -la "$BACKUP_DIR"
echo ""
read -p "Do you want to continue with the restore? (yes/no): " -r CONFIRM
if [[ ! $CONFIRM =~ ^yes$ ]]; then
  log_warning "Restore cancelled"
  rm -rf "$TEMP_RESTORE_DIR"
  exit 0
fi

echo ""

# ============================================
# 1. Stop running containers (optional)
# ============================================
if docker ps | grep -q inframanager; then
  log_warning "Found running infrastruktur-manager containers"
  read -p "Stop containers before restore? (yes/no): " -r STOP_CONTAINERS
  if [[ $STOP_CONTAINERS =~ ^yes$ ]]; then
    log_info "Stopping containers..."
    docker compose -f "${PROJECT_DIR}/docker-compose.yml" down --remove-orphans 2>/dev/null || true
    sleep 5
    log_success "Containers stopped"
  fi
fi

echo ""

# ============================================
# 2. Restore Database
# ============================================
if [ -f "${BACKUP_DIR}/database.sql" ]; then
  log_info "Restoring PostgreSQL database..."

  # Start only the database container if not running
  if ! docker ps | grep -q inframanager-db; then
    log_info "Starting database container..."
    docker compose -f "${PROJECT_DIR}/docker-compose.yml" up -d postgres 2>/dev/null || true
    sleep 10
  fi

  # Wait for database to be ready
  for i in {1..30}; do
    if docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T postgres \
      pg_isready -U inframan -d inframanager &>/dev/null; then
      log_success "Database is ready"
      break
    fi
    if [ $i -eq 30 ]; then
      log_error "Database did not become ready in time"
      rm -rf "$TEMP_RESTORE_DIR"
      exit 1
    fi
    sleep 1
  done

  # Drop existing database and restore
  log_info "Dropping existing database..."
  docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T postgres \
    psql -U inframan -d postgres -c "DROP DATABASE IF EXISTS inframanager;" 2>/dev/null || true

  log_info "Restoring database from backup..."
  docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T postgres \
    psql -U inframan -d postgres -f /dev/stdin < "${BACKUP_DIR}/database.sql"

  log_success "Database restored"
else
  log_warning "No database.sql found in backup, skipping database restore"
fi

echo ""

# ============================================
# 3. Restore Application Files (optional)
# ============================================
if [ -d "${BACKUP_DIR}/backend/src" ] || [ -d "${BACKUP_DIR}/frontend/src" ]; then
  log_warning "Backup contains application source files"
  read -p "Restore application source files? (yes/no): " -r RESTORE_FILES
  if [[ $RESTORE_FILES =~ ^yes$ ]]; then
    log_info "Restoring application files..."

    if [ -d "${BACKUP_DIR}/backend/src" ]; then
      log_info "  Restoring backend/src..."
      cp -r "${BACKUP_DIR}/backend/src" "${PROJECT_DIR}/backend/"
    fi

    if [ -d "${BACKUP_DIR}/frontend/src" ]; then
      log_info "  Restoring frontend/src..."
      cp -r "${BACKUP_DIR}/frontend/src" "${PROJECT_DIR}/frontend/"
    fi

    log_success "Application files restored"
  fi
fi

echo ""

# ============================================
# 4. Restore Volumes
# ============================================
if [ -d "${BACKUP_DIR}/volumes" ]; then
  log_warning "Backup contains volume data"
  read -p "Restore volume data? (yes/no): " -r RESTORE_VOLUMES
  if [[ $RESTORE_VOLUMES =~ ^yes$ ]]; then
    log_info "Restoring volumes..."

    for volume_backup in "${BACKUP_DIR}/volumes"/*; do
      if [ -d "$volume_backup" ]; then
        volume_name=$(basename "$volume_backup")
        log_info "  Restoring volume: $volume_name"

        # Create or get volume
        docker volume create "$volume_name" 2>/dev/null || true

        # Copy data into volume
        CONTAINER_NAME="restore-volume-${RANDOM}"
        docker create --name "$CONTAINER_NAME" \
          -v "${volume_name}:/data" \
          alpine:latest > /dev/null 2>&1

        docker cp "${volume_backup}/." "${CONTAINER_NAME}:/data/"
        docker rm -f "$CONTAINER_NAME" > /dev/null 2>&1
      fi
    done

    log_success "Volumes restored"
  fi
fi

echo ""

# ============================================
# 5. Restart Services
# ============================================
read -p "Start services after restore? (yes/no): " -r START_SERVICES
if [[ $START_SERVICES =~ ^yes$ ]]; then
  log_info "Starting all services..."
  docker compose -f "${PROJECT_DIR}/docker-compose.yml" up -d

  # Wait for services
  sleep 10
  log_success "Services started"

  # Check status
  echo ""
  log_info "Service status:"
  docker compose -f "${PROJECT_DIR}/docker-compose.yml" ps
fi

echo ""

# ============================================
# Cleanup
# ============================================
log_info "Cleaning up temporary files..."
rm -rf "$TEMP_RESTORE_DIR"
log_success "Temporary files cleaned up"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Restore Completed Successfully!        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

