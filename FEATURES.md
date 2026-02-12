# Infrastruktur-Manager - Features & Implementation Guide

**Status**: Phase 1 Complete - Core Infrastructure Ready
**Updated**: 2026-02-12
**Version**: 0.2.0

---

## 🎯 Project Overview

Infrastruktur-Manager is a comprehensive infrastructure and project management tool designed for homelab environments and small-scale production deployments. It provides centralized control of Proxmox infrastructure, secure credential management, health monitoring, and automated backups.

---

## ✨ Features Implemented

### Phase 0: Foundation (100% Complete)
- ✅ PostgreSQL Database with TypeORM ORM
- ✅ JWT Authentication & Authorization
- ✅ AES-256-GCM Encryption for sensitive data
- ✅ React + Vite Frontend with Tailwind CSS
- ✅ Docker Compose orchestration
- ✅ Nginx reverse proxy with CORS support

### Phase 1: Core Infrastructure (100% Complete)

#### 1.1 Credentials Management ✅
**Backend**:
- `CredentialsService`: Full CRUD operations with encryption
- `CredentialsController`: REST API endpoints
- AES-256-GCM encryption for all stored secrets
- PBKDF2 key derivation with 100k iterations
- Support for multiple credential types: Proxmox, GitHub, SSH, Database, API Keys

**Endpoints**:
```bash
POST   /api/credentials               # Create credential
GET    /api/credentials               # List all credentials
GET    /api/credentials/:id           # Get single credential
PUT    /api/credentials/:id           # Update credential
DELETE /api/credentials/:id           # Delete credential
POST   /api/credentials/:id/decrypt   # Decrypt credential (audit logged)
GET    /api/credentials/type/:type    # Filter by type
```

**Frontend** (`CredentialsVault.tsx`):
- Form to add new credentials with type-specific fields
- Secure list view (no sensitive data exposed)
- Test connection button for Proxmox credentials
- Delete functionality with confirmation
- Category filtering and search

#### 1.2 Proxmox Integration ✅
**Backend Services**:
- `ProxmoxClient`: Direct Proxmox API integration
  - Node management
  - VM control (start, stop, restart)
  - Network topology discovery
  - Cluster status monitoring
- `ProxmoxService`: Caching & credential management
  - 5-minute TTL caching for performance
  - Automatic cache invalidation on VM state changes
- `ProxmoxController`: REST endpoints for API clients

**Endpoints**:
```bash
POST  /api/infrastructure/proxmox/init       # Initialize Proxmox connection
GET   /api/infrastructure/proxmox/status     # Check connection status
GET   /api/infrastructure/nodes              # List all nodes
GET   /api/infrastructure/nodes/:node        # Get node status
GET   /api/infrastructure/vms                # List all VMs
GET   /api/infrastructure/vms/:vmid          # Get VM details
POST  /api/infrastructure/vms/:vmid/start    # Start VM
POST  /api/infrastructure/vms/:vmid/stop     # Stop VM
POST  /api/infrastructure/vms/:vmid/restart  # Restart VM
GET   /api/infrastructure/topology           # Network topology
GET   /api/infrastructure/cluster-status     # Cluster status
```

#### 1.3 VM Synchronization ✅
**Backend**:
- `VMSyncService`: Sync Proxmox VMs with database
  - Create/update VMs in database
  - Track IP allocations
  - Service management for each VM

**Functionality**:
- Automatic VM discovery from Proxmox
- IP address management (IPv4, IPv6)
- Hostname mapping
- Service tracking per VM
- Status monitoring

**Endpoints**:
```bash
POST  /api/infrastructure/sync-vms           # Sync VMs from Proxmox
GET   /api/infrastructure/ip-allocations     # Get IP allocation summary
GET   /api/infrastructure/vm-details/:vmId   # Get VM details
PUT   /api/infrastructure/vm-details/:vmId/ip # Update VM IP
```

**Frontend** (`VMDashboard.tsx`):
- Real-time VM status display
- VM statistics cards (running, stopped, total)
- Quick start/stop/restart controls
- IP address display
- Service status indicators
- Auto-refresh every 10 seconds

#### 1.4 Health Checks & Monitoring ✅
**Backend**:
- `HealthCheckService`: Multi-protocol health checking
  - HTTP/HTTPS status checks
  - TCP port connectivity tests
  - UDP health probes
  - Response time measurement
- Service health tracking:
  - Check count & failed count
  - Last successful check timestamp
  - Response time metrics
  - Error message logging

**Features**:
- Per-service health monitoring
- Protocol-specific checks
- Automatic status updates
- Response time tracking
- Error logging for troubleshooting

**Endpoints**:
```bash
POST  /api/infrastructure/health-check/:serviceId      # Check single service
POST  /api/infrastructure/health-check-all             # Check all services
GET   /api/infrastructure/services/healthy             # Get healthy services
GET   /api/infrastructure/services/unhealthy           # Get unhealthy services
GET   /api/infrastructure/services/stats               # Service statistics
POST  /api/infrastructure/vm-details/:vmId/services    # Add service to VM
GET   /api/infrastructure/vm-details/:vmId/services    # Get VM services
DELETE /api/infrastructure/services/:serviceId          # Remove service
```

#### 1.5 IP Management ✅
**Database Schema**:
```sql
VM Table:
  - vmid (Proxmox VM ID)
  - node (Proxmox node name)
  - ipv4_address (manual input)
  - ipv6_address (manual input)
  - hostname
  - status (online, offline, paused)
  - cpu_cores, memory_mb, disk_gb
  - network_in, network_out (bytes)
  - last_sync timestamp

Service Table:
  - name
  - type (ssh, http, https, docker, kubernetes, database, custom)
  - port
  - protocol (tcp, udp, http, https)
  - url (for HTTP checks)
  - health_status
  - response_time_ms
  - check_count, failed_count
  - enabled flag
  - last_check, last_successful_check
```

---

## 🔒 Security Features

1. **Encryption**:
   - AES-256-GCM for all stored credentials
   - PBKDF2 key derivation (100,000 iterations)
   - Random salt & IV generation
   - Authentication tag for integrity verification

2. **Authentication**:
   - JWT tokens with 15-minute expiration
   - Refresh token mechanism (7-day expiration)
   - bcrypt password hashing (12 rounds)
   - Role-based access control (admin, developer, viewer)

3. **Audit Logging**:
   - All credential access logged
   - User activity tracking
   - Failed login attempt logging
   - Sensitive operations logged with IP address

4. **API Security**:
   - CORS restrictions to allowed origins
   - Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS)
   - JWT validation on protected routes
   - Input validation on all endpoints

---

## 📦 Backup & Disaster Recovery

### Automated Backups

**Backup Script** (`scripts/backup.sh`):
- Full PostgreSQL database dump
- Application source files backup
- Volume data backup
- Compressed archive creation (tar.gz)
- Automatic cleanup of old backups (keeps last 5)
- Detailed backup reports

**Usage**:
```bash
# Manual backup
./scripts/backup.sh

# Backup to specific directory
./scripts/backup.sh /path/to/backups
```

**Backup Contents**:
```
backup-20260212-120000/
├── database.sql                 # PostgreSQL dump
├── backend/src/                 # Backend source
├── frontend/src/                # Frontend source
├── docker-compose.yml           # Docker config
├── volumes/                     # Volume data
└── BACKUP_INFO.txt             # Metadata
```

### Restore Script (`scripts/restore.sh`)

**Features**:
- Interactive restore process
- Database restoration with existing data cleanup
- Application files restoration (optional)
- Volume data restoration (optional)
- Service restart automation
- Rollback safety checks

**Usage**:
```bash
./scripts/restore.sh ./backups/infrastruktur-manager-20260212-120000.tar.gz
```

### Automated Cron Scheduling

**Setup Cron Jobs** (`scripts/setup-backup-cron.sh`):
- Automatic daily backup scheduling
- Custom time configuration
- Log file management
- Cron job verification

**Usage**:
```bash
# Daily backup at 2:30 AM
./scripts/setup-backup-cron.sh 2 30

# Default: 2:30 AM
./scripts/setup-backup-cron.sh

# View active cron jobs
crontab -l | grep infrastruktur-manager
```

---

## 🚀 Deployment & Operations

### Quick Deploy

**Fast Deployment** (`scripts/quick-deploy.sh`):
- Rebuild and restart containers
- Health check verification
- Service readiness waiting
- Perfect for code updates

**Usage**:
```bash
# Deploy with new code
./scripts/quick-deploy.sh

# Deploy with clean database
./scripts/quick-deploy.sh --clean
```

### Initial Setup

**Complete Deployment** (`scripts/deploy.sh`):
- Full environment setup
- Docker image building
- Database initialization
- SSL certificate handling
- Comprehensive logging

**Usage**:
```bash
./scripts/deploy.sh
```

### Docker Compose

**Development**:
```bash
docker compose up -d
```

**Production** (with monitoring):
```bash
docker compose -f docker-compose.yml up -d
docker compose logs -f
```

---

## 📊 API Response Format

All endpoints follow a consistent response format:

**Success Response**:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // endpoint-specific data
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Detailed error message"
}
```

---

## 🔧 Configuration

### Environment Variables

**Core Configuration** (`.env`):
```bash
# Database
DB_USER=inframan
DB_PASSWORD=secure_password
DB_NAME=inframanager
DB_PORT=5432

# Authentication
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Encryption
ENCRYPTION_MASTER_KEY=base64_encoded_key

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5000

# Optional Proxmox defaults
PROXMOX_API_ENDPOINT=https://proxmox.local:8006/api2/json
PROXMOX_NODE=pve
```

### Docker Compose

**Service Configuration**:
- Backend: Express.js on port 5000
- Frontend: Vite/Nginx on port 3000
- PostgreSQL: Port 5432
- Nginx Proxy: Port 80/443

---

## 📝 API Examples

### Create a Proxmox Credential

```bash
curl -X POST http://localhost:5000/api/credentials \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Proxmox",
    "type": "proxmox",
    "value": "{\"endpoint\": \"https://proxmox.local:8006/api2/json\", \"token\": \"user@pam!tokenid=secret\", \"node\": \"pve\"}",
    "description": "Production Proxmox cluster"
  }'
```

### Initialize Proxmox Connection

```bash
curl -X POST http://localhost:5000/api/infrastructure/proxmox/init \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credentialId": "credential-uuid"}'
```

### Sync VMs from Proxmox

```bash
curl -X POST http://localhost:5000/api/infrastructure/sync-vms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get IP Allocations

```bash
curl -X GET http://localhost:5000/api/infrastructure/ip-allocations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Check Service Health

```bash
curl -X POST http://localhost:5000/api/infrastructure/health-check/:serviceId \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 Next Steps / Future Phases

### Phase 2: Project Management (Planned)
- GitHub repository integration
- Project metadata tracking
- Technology stack management
- Dependency tracking

### Phase 3: Prompt Generator (Planned)
- Automatic context collection
- AI-assisted feature planning
- Prompt templating system
- History & versioning

### Phase 4: Advanced Monitoring (Planned)
- Alert system with rules
- Notification channels (email, webhook, Slack)
- Performance metrics dashboard
- Log aggregation & analysis

---

## 🐛 Troubleshooting

### Common Issues

**Proxmox Connection Failed**:
- Verify API token has correct permissions
- Check firewall rules between containers and Proxmox
- Ensure endpoint URL is correct (format: `https://host:8006/api2/json`)
- Test with: `curl -X GET https://proxmox.local:8006/api2/json/version -H "Authorization: PVEAPIToken=..."`

**Database Connection Issues**:
- Check `docker compose logs postgres` for details
- Verify credentials in `.env` file
- Ensure database container is running: `docker compose ps`

**Backend API Unavailable**:
- Check if backend container is running: `docker compose ps backend`
- View logs: `docker compose logs -f backend`
- Verify port mapping: `docker compose ps`

**Frontend Not Loading**:
- Verify Nginx is running: `docker compose ps frontend`
- Check frontend logs: `docker compose logs -f frontend`
- Verify VITE_API_URL is set to `/api` for relative proxying

---

## 📚 Documentation

- **Database Schema**: See TypeORM entities in `backend/src/entities/`
- **API Specification**: Endpoints documented in controllers
- **Encryption**: See `backend/src/utils/encryption.util.ts`
- **Project Plan**: See `INFRASTRUKTUR_MANAGEMENT_PLAN.md`

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! For major changes:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📞 Support

For issues, questions, or feature requests, please refer to the GitHub issues page.

