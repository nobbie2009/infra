#!/bin/bash

# ============================================
# Quick Deploy Script
# Faster alternative for updates without deep checks
# Usage: ./scripts/quick-deploy.sh
# Usage: ./scripts/quick-deploy.sh --clean (removes volumes/data)
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Helper functions
log_info() { echo -e "${BLUE}[*]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Infrastruktur-Manager Quick Deploy    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

cd "$PROJECT_DIR"

# API URL is relative - frontend nginx proxies /api/ to backend
VITE_API_URL="/api"

log_info "Project directory: $PROJECT_DIR"
log_info "API URL: $VITE_API_URL (relative, via frontend nginx proxy)"
echo ""

# Check for --clean flag
if [ "$1" = "--clean" ]; then
    log_info "Cleaning volumes (removing database)..."
    docker compose down -v --remove-orphans
    log_success "Volumes removed"
    echo ""
else
    log_info "Stopping containers..."
    docker compose down --remove-orphans 2>/dev/null || true
fi

log_info "Building and starting services..."
docker compose up -d --build

log_success "Services started!"
echo ""

# Wait for services
log_info "Waiting for services to be ready..."

# Wait for database
log_info "  - PostgreSQL..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U inframan > /dev/null 2>&1; then
        log_success "PostgreSQL ready"
        break
    fi
    [ $i -eq 30 ] && { log_error "PostgreSQL timeout"; exit 1; }
    sleep 1
done

# Wait for backend
log_info "  - Backend API..."
for i in {1..30}; do
    if docker compose exec -T backend wget --quiet --tries=1 --spider http://localhost:5000/health 2>/dev/null; then
        log_success "Backend API ready"
        break
    fi
    [ $i -eq 30 ] && { log_error "Backend timeout"; exit 1; }
    sleep 1
done

# Wait for frontend
log_info "  - Frontend..."
for i in {1..30}; do
    if docker compose exec -T frontend wget --quiet --tries=1 --spider http://localhost:3000/ > /dev/null 2>&1; then
        log_success "Frontend ready"
        break
    fi
    [ $i -eq 30 ] && { log_error "Frontend timeout"; exit 1; }
    sleep 1
done

echo ""
log_success "All services are running!"
echo ""

# Show status
log_info "Container status:"
docker compose ps
echo ""

log_info "Access points:"
echo "  Frontend:  http://localhost (or $(hostname -I | awk '{print $1}'))"
echo "  Backend:   http://localhost:5000/api"
echo "  Health:    http://localhost:5000/health"
echo ""

log_info "View logs:"
echo "  All:       docker compose logs -f"
echo "  Backend:   docker compose logs -f backend"
echo "  Frontend:  docker compose logs -f frontend"
echo ""

log_success "Deployment completed!"
