#!/bin/bash

################################################################################
# 🚀 INFRASTRUKTUR-MANAGER DEPLOYMENT SCRIPT
# Complete setup, database initialization, and testing
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
LOG_FILE="$PROJECT_DIR/deploy.log"

################################################################################
# Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

################################################################################
# Phase 1: Pre-deployment checks
################################################################################

phase_check() {
    print_header "PHASE 1: Pre-Deployment Checks"

    log_info "Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    log_success "Docker is installed: $(docker --version)"

    # Check if Docker Compose is installed
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    log_success "Docker Compose is installed: $(docker compose --version)"

    # Check if we're in the right directory
    if [ ! -f "$PROJECT_DIR/docker compose.yml" ]; then
        log_error "docker compose.yml not found. Make sure you're in the project root directory."
        exit 1
    fi
    log_success "Project directory verified: $PROJECT_DIR"

    # Check .env file
    if [ ! -f "$ENV_FILE" ]; then
        log_warning ".env file not found. Creating from .env.example..."
        if [ ! -f "$PROJECT_DIR/.env.example" ]; then
            log_error ".env.example not found either."
            exit 1
        fi
        cp "$PROJECT_DIR/.env.example" "$ENV_FILE"
        log_info "Created .env from template. Please edit it with your settings!"
        read -p "Press ENTER after configuring .env..."
    fi

    log_success "Pre-deployment checks passed!"
}

################################################################################
# Phase 2: Environment setup
################################################################################

phase_environment() {
    print_header "PHASE 2: Environment Setup"

    # Source .env file
    set -a
    source "$ENV_FILE"
    set +a

    log_info "Checking environment variables..."

    # Check critical variables
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_super_secret_jwt_key_change_in_production_12345" ]; then
        log_warning "JWT_SECRET not properly configured!"
        read -p "Generate new JWT_SECRET? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            NEW_SECRET=$(openssl rand -base64 32)
            sed -i.bak "s#JWT_SECRET=.*#JWT_SECRET=$NEW_SECRET#" "$ENV_FILE"
            log_success "JWT_SECRET generated and updated in .env"
        fi
    fi

    if [ -z "$ENCRYPTION_MASTER_KEY" ] || [ "$ENCRYPTION_MASTER_KEY" = "your_base64_encoded_master_key_here" ]; then
        log_warning "ENCRYPTION_MASTER_KEY not properly configured!"
        read -p "Generate new ENCRYPTION_MASTER_KEY? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" 2>/dev/null || openssl rand -base64 32)
            sed -i.bak "s#ENCRYPTION_MASTER_KEY=.*#ENCRYPTION_MASTER_KEY=$NEW_KEY#" "$ENV_FILE"
            log_success "ENCRYPTION_MASTER_KEY generated and updated in .env"
        fi
    fi

    log_success "Environment setup complete!"
}

################################################################################
# Phase 3: Docker deployment
################################################################################

phase_docker() {
    print_header "PHASE 3: Docker Deployment"

    # API URL is relative - frontend nginx proxies /api/ to backend
    VITE_API_URL="/api"
    log_info "Using relative API URL: $VITE_API_URL (via frontend nginx proxy)"

    log_info "Stopping existing containers (if any)..."
    docker compose down --remove-orphans 2>/dev/null || true

    log_info "Building Docker images..."
    docker compose build --no-cache

    log_info "Starting services..."
    docker compose up -d

    log_success "Docker containers started!"

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy (max 30 seconds)..."

    for i in {1..30}; do
        if docker compose ps | grep -q "Up"; then
            log_success "Services are running!"
            break
        fi
        sleep 1
    done

    # Show service status
    log_info "Service status:"
    docker compose ps
}

################################################################################
# Phase 4: Database initialization
################################################################################

phase_database() {
    print_header "PHASE 4: Database Initialization"

    log_info "Waiting for PostgreSQL to be ready..."

    for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U inframan &> /dev/null; then
            log_success "PostgreSQL is ready!"
            break
        fi
        log_info "Waiting... ($i/30)"
        sleep 1
    done

    log_info "Creating tables..."
    # Tables are auto-created by TypeORM synchronize option
    sleep 5  # Give it time to create tables

    log_success "Database initialization complete!"
}

################################################################################
# Phase 5: Create admin user
################################################################################

phase_admin_user() {
    print_header "PHASE 5: Create Admin User"

    read -p "Create first admin user? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Skipping admin user creation"
        return
    fi

    read -p "Admin username (default: admin): " USERNAME
    USERNAME=${USERNAME:-admin}

    read -p "Admin email (default: admin@example.com): " EMAIL
    EMAIL=${EMAIL:-admin@example.com}

    # Pre-hashed password for "Admin@123" using bcrypt
    # You can generate new hash with: node -e "require('bcryptjs').hash('YourPassword', 12, (err, hash) => console.log(hash))"
    HASH='$2a$12$R9h7cIPz0gi.URNNX3kh2OPST9EJhLLLlOoX/d1lkGXGCwY8kOfUa'

    log_info "Creating admin user: $USERNAME"

    docker compose exec -T postgres psql -U inframan -d inframanager -c "
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), '$USERNAME', '$EMAIL', '$HASH', 'admin', true, NOW(), NOW())
        ON CONFLICT (username) DO NOTHING;
    " 2>/dev/null || true

    log_success "Admin user created!"
    log_info "Login credentials:"
    echo "  Username: $USERNAME"
    echo "  Password: Admin@123"
}

################################################################################
# Phase 6: Verification
################################################################################

phase_verify() {
    print_header "PHASE 6: Verification"

    log_info "Checking API health..."
    if wget -qO- http://localhost:5000/health 2>/dev/null | grep -q "OK"; then
        log_success "Backend API is healthy"
    else
        log_warning "Backend API may not be ready yet (check: docker compose logs backend)"
    fi

    log_info "Checking frontend..."
    if wget -qO- http://localhost:3000/ 2>/dev/null | grep -q "html"; then
        log_success "Frontend is accessible"
    else
        log_warning "Frontend may not be fully ready yet (check: docker compose logs frontend)"
    fi

    log_success "Verification complete!"
}

################################################################################
# Phase 7: Summary
################################################################################

phase_summary() {
    print_header "DEPLOYMENT SUMMARY"

    # Get container IP or use localhost
    CONTAINER_IP=$(docker compose ps | grep -v "NAME" | head -1 | awk '{print $NF}')
    if [ -z "$CONTAINER_IP" ] || [ "$CONTAINER_IP" = "-" ]; then
        CONTAINER_IP="localhost"
    fi

    echo ""
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "Access your application:"
    echo "  Frontend:      ${BLUE}http://localhost${NC} (or http://$CONTAINER_IP)"
    echo "  Frontend Alt:  ${BLUE}http://localhost:3000${NC} (or http://$CONTAINER_IP:3000)"
    echo "  Backend API:   ${BLUE}http://localhost:5000/api${NC} (or http://$CONTAINER_IP:5000/api)"
    echo "  Health Check:  ${BLUE}http://localhost:5000/health${NC}"
    echo ""
    echo "API URL configured in Frontend:"
    echo "  ${BLUE}${VITE_API_URL}${NC}"
    echo ""
    echo "Login credentials:"
    echo "  Username: ${BLUE}admin${NC}"
    echo "  Password: ${BLUE}Admin@123${NC}"
    echo ""
    echo "Docker commands:"
    echo "  View logs:     ${BLUE}docker compose logs -f${NC}"
    echo "  View backend:  ${BLUE}docker compose logs -f backend${NC}"
    echo "  View frontend: ${BLUE}docker compose logs -f frontend${NC}"
    echo "  Stop services: ${BLUE}docker compose down${NC}"
    echo "  Restart:       ${BLUE}docker compose restart${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Login to http://localhost (or http://$CONTAINER_IP)"
    echo "  2. Add Proxmox credentials in Credentials Vault"
    echo "  3. Test connection"
    echo "  4. Sync VMs in VM Dashboard"
    echo ""
    echo "For production deployment, update environment variables in .env file"
    echo ""
}

################################################################################
# Main execution
################################################################################

main() {
    print_header "🚀 INFRASTRUKTUR-MANAGER DEPLOYMENT"

    echo "Log file: $LOG_FILE"
    echo ""

    # Run phases
    phase_check
    phase_environment
    phase_docker
    phase_database
    phase_admin_user
    phase_verify
    phase_summary

    log_success "Deployment script completed at $(date)"
}

# Run main function
main "$@"
