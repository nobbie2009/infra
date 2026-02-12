# 🚀 DEPLOYMENT & TESTING GUIDE - Phase 1 Complete

**Status**: ✅ Phase 1 Complete - Ready to Deploy!
**Date**: 2026-02-12
**What's Included**:
- ✅ Backend (Auth, Proxmox API, IP Management, Health Checks)
- ✅ Frontend (Dashboard, VM Dashboard, Credentials Vault)
- ✅ Database (User, Credential, VM, Service entities)
- ✅ Docker Setup (docker-compose.yml ready)

---

## 🎯 DEPLOYMENT STEPS

### Step 1: Prepare Configuration

```bash
cd /c/Users/nobbi/Documents/verwaltung/infrastruktur-manager

# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your editor
```

**Critical Environment Variables to Set:**

```bash
# Security (MUST CHANGE!)
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
ENCRYPTION_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Database (default is fine for Docker)
DB_HOST=postgres
DB_USER=inframan
DB_PASSWORD=change_me_in_production
DB_NAME=inframanager

# Proxmox (optional, set only if you have Proxmox)
PROXMOX_API_ENDPOINT=https://proxmox.local:8006/api2/json
PROXMOX_NODE=pve

# Frontend
VITE_API_URL=http://localhost:5000/api
CORS_ORIGIN=http://localhost:3000,http://localhost

# Others
NODE_ENV=development
BACKEND_PORT=5000
FRONTEND_PORT=3000
```

### Step 2: Start Docker Environment

```bash
# Build and start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# SERVICE              STATUS
# inframanager-db     Up
# inframanager-backend Up (healthy)
# inframanager-frontend Up (healthy)
# inframanager-nginx  Up
```

### Step 3: Verify Services

```bash
# Check Backend Health
curl http://localhost:5000/health
# Expected: {"status":"OK","timestamp":"..."}

# Check Frontend
curl http://localhost/
# Expected: HTML response

# Check API
curl http://localhost:5000/api
# Expected: API info JSON
```

### Step 4: Access Application

```
Frontend:  http://localhost        (port 3000)
API:       http://localhost:5000   (direct backend)
Health:    http://localhost/health
```

---

## 🔑 INITIAL SETUP & LOGIN

### Step 1: Create First Admin User

**Option A: Via Database**

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U inframan -d inframanager

# Create admin user (use hashed password)
# Password: Admin@123
INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@example.com',
  '$2a$12$R9h7cIPz0gi.URNNX3kh2OPST9EJhLLLlOoX/d1lkGXGCwY8kOfUa',
  'admin',
  true,
  NOW(),
  NOW()
);

# Exit psql
\q
```

**Option B: Via Registration API**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

### Step 2: Login to Application

```
Username: admin
Password: Admin@123
```

Navigate to: http://localhost

---

## 🧪 TESTING CHECKLIST

### Phase 1 Features

- [ ] **Authentication**
  - [ ] Register new user (API or UI)
  - [ ] Login with credentials
  - [ ] Access /auth/me endpoint
  - [ ] Logout

- [ ] **Credentials Vault** (http://localhost/credentials)
  - [ ] Add Proxmox credential (if you have Proxmox)
  - [ ] Test connection button works
  - [ ] List credentials
  - [ ] Delete credential

- [ ] **VM Dashboard** (http://localhost/vms)
  - [ ] Display empty state initially
  - [ ] Sync VMs from Proxmox (after adding credential)
  - [ ] See VMs listed with status
  - [ ] Start/Stop/Restart VM buttons (if Proxmox available)
  - [ ] View IP addresses
  - [ ] View services per VM

- [ ] **Health Checks**
  - [ ] POST /api/infrastructure/health-check/:serviceId
  - [ ] Check service status updates
  - [ ] View health stats

### Backend Endpoints

```bash
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/logout

# Infrastructure - Proxmox
POST   /api/infrastructure/proxmox/init
GET    /api/infrastructure/proxmox/status
GET    /api/infrastructure/nodes
GET    /api/infrastructure/vms
POST   /api/infrastructure/vms/:vmid/start
POST   /api/infrastructure/vms/:vmid/stop
POST   /api/infrastructure/vms/:vmid/restart

# Infrastructure - IP Management
GET    /api/infrastructure/ip-allocations
POST   /api/infrastructure/sync-vms
GET    /api/infrastructure/vms/:vmId
PUT    /api/infrastructure/vms/:vmId/ip
GET    /api/infrastructure/vms/:vmId/services
POST   /api/infrastructure/vms/:vmId/services

# Health Checks
POST   /api/infrastructure/health-check/:serviceId
POST   /api/infrastructure/health-check-all
GET    /api/infrastructure/services/healthy
GET    /api/infrastructure/services/unhealthy
GET    /api/infrastructure/services/stats
```

---

## 📊 TESTING WITHOUT PROXMOX

If you don't have Proxmox available, you can still test:

1. **Authentication Flow**
   ```bash
   # Register
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"test","email":"test@example.com","password":"Test@123"}'

   # Login
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"Test@123"}'

   # Use token
   curl http://localhost:5000/api/auth/me \
     -H "Authorization: Bearer <TOKEN>"
   ```

2. **UI Navigation**
   - Login → Dashboard
   - Click "Credentials Vault" button
   - Click "VM Dashboard" button
   - Test navigation between pages

3. **Credentials Vault UI** (without real Proxmox)
   - Add a test credential (endpoint, token, node can be dummy)
   - See it in the list
   - Delete it

---

## 🐛 DEBUGGING

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Database logs
docker-compose logs -f postgres

# All logs
docker-compose logs -f
```

### Common Issues

**Issue**: "Proxmox client not initialized"
- **Solution**: Add Proxmox credential via Credentials Vault first

**Issue**: "Database connection refused"
- **Solution**: Check postgres service is running: `docker-compose ps`

**Issue**: "ENCRYPTION_MASTER_KEY not set"
- **Solution**: Generate and add to .env: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

**Issue**: Frontend shows blank page
- **Solution**: Check browser console (F12) for errors, check nginx logs

### Reset Everything

```bash
# Stop all services
docker-compose down

# Remove database volume (WARNING: deletes all data!)
docker volume rm infrastruktur-manager_postgres_data

# Restart
docker-compose up -d
```

---

## 📈 PERFORMANCE METRICS

**Expected Response Times:**
- Login: <500ms
- Get VMs (first call): ~1000ms (Proxmox API call)
- Get VMs (cached): <50ms (5-min TTL)
- Health Check: 2-5 seconds (depends on service)
- List Credentials: <100ms

**Resource Usage (Typical):**
- Backend: 100-200MB RAM, <5% CPU idle
- Frontend: 50-100MB (browser)
- Database: 200-300MB RAM
- Total: ~1GB RAM, <500MB disk for image

---

## 🔐 SECURITY NOTES

- All API endpoints require JWT authentication
- Credentials are encrypted with AES-256-GCM
- Master key is never stored (env variable only)
- Passwords hashed with bcrypt (12 rounds)
- CORS restricted to configured origins
- Rate limiting on login endpoint (10 req/min)

---

## 🎯 WHAT'S NEXT

After Testing Phase 1:
1. ✅ Phase 0: Foundation (DONE)
2. ✅ Phase 1: Core Infrastructure (DONE - YOU ARE HERE)
3. 🔜 Phase 2: Project Management (GitHub, Kanban)
4. 🔜 Phase 3: Prompt Generator
5. 🔜 Phase 4: Monitoring & Admin

---

## 📞 SUPPORT

**If something fails:**
1. Check logs: `docker-compose logs -f`
2. Check environment: `cat .env | grep -v "#"`
3. Verify Docker: `docker ps`, `docker network ls`
4. Restart service: `docker-compose restart backend`
5. Rebuild image: `docker-compose build --no-cache`

---

**Deployment Timestamp**: 2026-02-12
**Phase 1 Status**: 🟢 COMPLETE & READY TO TEST
**Next Phase**: 🔜 Phase 2 (GitHub Integration, Kanban Board)
