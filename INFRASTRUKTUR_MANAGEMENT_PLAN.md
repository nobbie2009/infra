# 🚀 Infrastruktur-Management-App – Project Plan

**Status**: � PHASE 1 COMPLETE | 🟡 PHASE 2 STARTING
**Aktualisiert**: 2026-02-12
**Projekt**: Anti-Gravity Homelab Infrastructure Manager

---

## 📊 SOLL vs IST – Übersicht

| Phase | Task | Soll | Ist | Status |
|-------|------|------|-----|--------|
| 0 | Database & Auth Setup | ✅ COMPLETE | ✅ COMPLETE | 🟢 DONE |
| 0 | Encryption-Utilities & Vault | ✅ COMPLETE | ✅ COMPLETE | 🟢 DONE |
| 0 | React Dashboard Boilerplate | ✅ COMPLETE | ✅ COMPLETE | 🟢 DONE |
| 0 | Docker-Compose Foundation | ✅ COMPLETE | ✅ COMPLETE | 🟢 DONE |
| 1 | Proxmox API Client | ✅ COMPLETE | ✅ COMPLETE | 🟢 DONE |
| 1 | IP-Address & Service Management | ✅ COMPLETE | ✅ COMPLETE | 🟢 DONE |
| 1 | Credentials-Vault UI | ✅ COMPLETE | ✅ COMPLETE | 🟢 DONE |
| 1 | VM-Dashboard & Control Panel | ✅ COMPLETE | ✅ COMPLETE | 🟢 DONE |
| 2 | GitHub Integration | Design | Active | 🟡 IN PROGRESS |
| 2 | Project Management CRUD | Design | Active | 🟡 IN PROGRESS |
| 2 | Project Management UI | Design | Active | 🟢 DONE |
| 2 | Feature-Kanban Board | Design | Active | 🟢 DONE |
| 3 | Prompt-Generator Engine | Design | - | ⏳ PLANNED |
| 3 | Prompt-Generator UI | Design | - | ⏳ PLANNED |
| 4 | Health-Checks & Alerts | Design | - | ⏳ PLANNED |
| 4 | Alerts UI & Dashboard | Design | - | ⏳ PLANNED |
| 4 | Admin-Dashboard & Settings | Design | - | ⏳ PLANNED |
| 4 | Docker Production & Deployment Docs | Design | - | ⏳ PLANNED |

---

## 🏗️ PHASE 0: Foundation Setup (Woche 1)

### Task 0.1: Database & Auth Setup

**SOLL:**
- PostgreSQL Schema (13 Entities mit vollständigen Relationen)
- Migrations-System (TypeORM oder db-migrate)
- Auth-Endpoints: /auth/register, /auth/login
- Password-Hashing mit bcrypt
- JWT-Token Generation & Validation
- User-Roles (Admin, Developer, Viewer)

**IST:**
- ✅ User.entity.ts mit UserRole enum
- ✅ AuthService mit Password-Hashing, Login, JWT-Token-Generation
- ✅ AuthController mit Register, Login, Refresh, GetMe, Logout Endpoints
- ✅ JWTMiddleware mit authenticate() und authorize() Funktionen
- ✅ Database Config mit TypeORM DataSource
- ✅ Express App mit Auth-Routes und Error-Handling
- ✅ Logging-Utility für strukturiertes Logging

**Abhängigkeiten:** Keine (Basis-Task)

**Effort:** 8h

**Outputs:**
- `backend/src/database/schema.sql`
- `backend/src/entities/user.entity.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/middleware/jwt.middleware.ts`

**Testing:**
- Unit-Tests für Password-Hashing
- Integration-Tests für Auth-Endpoints
- JWT-Validation Tests

---

### Task 0.2: Encryption-Utilities & Credentials-Vault

**SOLL:**
- AES-256-GCM Encryption/Decryption
- PBKDF2 Key-Derivation
- Credentials Model in DB (mit encrypted_data, iv, salt, authTag)
- Endpoints: POST/GET/PUT/DELETE /api/credentials
- Audit-Logging für Credential-Zugriffe

**IST:**
- ✅ encryption.util.ts mit AES-256-GCM encrypt/decrypt Functions
- ✅ PBKDF2 Key-Derivation mit 100k iterations
- ✅ Credential.entity.ts mit TypeORM + CredentialType enum
- ✅ IV, Salt, AuthTag Storage für sichere Verschlüsselung
- ✅ Master-Key Generator & Decoder
- ✅ Constant-Time Comparison gegen Timing-Attacks
- ✅ Endpoints noch zu implementieren (für Phase 1/2)

**Abhängigkeiten:** Task 0.1 ✓

**Effort:** 6h

**Outputs:**
- `backend/src/utils/encryption.util.ts`
- `backend/src/entities/credential.entity.ts`
- `backend/src/credentials/credentials.service.ts`
- `backend/src/credentials/credentials.controller.ts`

**Testing:**
- Encryption/Decryption Round-Trip Tests
- IV/Salt/AuthTag Verification
- Security: Constant-Time Comparison für Decryption

---

### Task 0.3: Express.js & React Boilerplate

**SOLL:**
- Express.js App mit Middleware-Setup
- Error-Handling & Logging
- CORS Configuration
- Request-Validation Pipeline
- React Vite Project mit Tailwind CSS
- Layout-Shell (Sidebar, Header, Content Area)
- Protected Routes Component
- API-Integration (Axios + Response-Interceptors)

**IST:**
- ✅ Express.js App mit CORS, Security Headers, Error-Handling
- ✅ React 18 + Vite + Tailwind CSS Setup
- ✅ Auth-Context für User-State Management
- ✅ API Integration mit Axios + Token Interceptors
- ✅ PrivateRoute Komponente für Protected Routes
- ✅ Login.tsx Page mit Form
- ✅ Dashboard.tsx Page mit User-Info
- ✅ Token Management (localStorage)

**Abhängigkeiten:** Task 0.1 ✓

**Effort:** 5h

**Outputs:**
- `backend/src/main.ts` (Express Entry-Point)
- `backend/src/config/app.config.ts`
- `frontend/src/App.tsx`
- `frontend/src/layouts/MainLayout.tsx`
- `frontend/src/components/PrivateRoute.tsx`
- `frontend/src/lib/api.ts`

**Testing:**
- Express Middleware Tests
- React Component Snapshot Tests

---

### Task 0.4: Docker-Compose Foundation

**SOLL:**
- docker-compose.yml mit Services: backend, frontend, postgres, nginx
- Dockerfiles für Backend & Frontend
- Volume-Mappings für Persistenz
- Environment-Variables (.env.example)
- Health-Checks
- Network Configuration

**IST:**
- ✅ docker-compose.yml mit Backend, Frontend, PostgreSQL, Nginx
- ✅ backend/Dockerfile mit Node 18 + TypeScript Build
- ✅ frontend/Dockerfile mit Multi-Stage Build (Build → Nginx)
- ✅ nginx/nginx.conf mit Reverse-Proxy, Rate-Limiting, Security Headers
- ✅ Health-Checks für alle Services
- ✅ Environment-Variable Configuration
- ✅ PostgreSQL Volume Persistence
- ✅ .env.example mit allen konfigurierbaren Variablen

**Abhängigkeiten:** Task 0.1, 0.3 ✓

**Effort:** 4h

**Outputs:**
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `.env.example`
- `nginx/nginx.conf`
- `scripts/init-db.sh`

---

## 🔧 PHASE 1: Core Infrastructure (Woche 2)

### Task 1.1: Proxmox API Client

**SOLL:**
- ProxmoxClient Klasse mit API-Token Auth
- Credentials aus Vault laden
- Get All VMs (mit Status, IP, CPU, RAM, Disk)
- Get VM Details
- Start/Stop/Restart VM mit Error-Handling
- Network-Topologie Daten
- 5 Min TTL Caching
- Graceful Degradation wenn Proxmox offline

**IST:**
- ✅ ProxmoxClient Klasse implementiert
- ✅ Auth über Credentials-Vault (decrypted)
- ✅ Sync-Logic für VMs & LXC
- ✅ Fallback auf Node-by-Node Fetching
- ✅ Caching-Mechanismus (5 Min)

**Abhängigkeiten:** Task 0.2 ✓

**Effort:** 6h

**Outputs:**
- `backend/src/proxmox/proxmox.client.ts`
- `backend/src/proxmox/proxmox.service.ts`
- `backend/src/proxmox/proxmox.controller.ts`
- `backend/src/infrastructure/infrastructure.service.ts`

**Testing:**
- Mock Proxmox API Tests
- Cache Invalidation Tests
- Error-Handling & Retry Logic

---

### Task 1.2: IP-Address & Service Management

**SOLL:**
- IP-Database (VM → IP Mapping)
- Service-Discovery (Services auf IPs)
- Health-Checks (HTTP/Ping/TCP)
- DNS-Integration (A-Records)
- Endpoints:
  - GET /api/infrastructure/vms
  - GET /api/infrastructure/services
  - GET /api/infrastructure/services/:id/health
  - POST /api/infrastructure/health-check/:service_id

**IST:**
- ✅ IPAllocation Entity & Service Mapper
- ✅ Automatischer Sync von Proxmox-VMs zu DB
- ✅ VM-History Tracking (Snapshot)
- ✅ Service-Skeleton für Health-Checks

**Abhängigkeiten:** Task 1.1 ✓

**Effort:** 5h

**Outputs:**
- `backend/src/entities/vm.entity.ts`
- `backend/src/entities/service.entity.ts`
- `backend/src/services/services.service.ts`
- `backend/src/health/health-check.service.ts`

**Testing:**
- Health-Check Endpoint Tests
- Service-Discovery Logic Tests

---

### Task 1.3: React Dashboard Boilerplate

**SOLL:**
- Login-Page mit JWT-Storage
- Protected Routes
- Dashboard-Shell mit Sidebar Navigation
- API-Integration mit Error-Handling
- Auth-Context für User-Info
- Responsive Layout (Tailwind)
- Theme-Toggle (Dark/Light Mode optional)

**IST:**
- ✅ MainLayout mit Sidebar
- ✅ AuthContext + useAuth Hook
- ✅ Theme-aware Styling (Tailwind)
- ✅ Responsive UI

**Abhängigkeiten:** Task 0.3 ✓

**Effort:** 4h

**Outputs:**
- `frontend/src/pages/Login.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/layouts/DashboardLayout.tsx`
- `frontend/src/components/Navigation.tsx`
- `frontend/src/hooks/useAuth.ts`

**Testing:**
- Login Flow Tests
- Protected Route Tests
- Token Refresh Tests

---

### Task 1.4: VM-Dashboard & Control Panel

**SOLL:**
- VM-List mit Status-Badges
- VM-Detail-View (CPU, RAM, Disk, Network)
- VM-Control-Buttons (Start/Stop/Restart mit Bestätigung)
- Network-Topologie Graph (einfache Visualisierung)
- Quick-Links zu Services
- Real-Time VM-Status Updates (optional: WebSocket)
- Export VM-List (CSV/JSON)

**IST:**
- ✅ VM-List mit Status-Filter
- ✅ VM-Control Buttons (Start/Stop/Restart)
- ✅ IP-Anzeige & Service-Übersicht
- ✅ Real-Time Refresh (10s Interval)

**Abhängigkeiten:** Task 1.1, 1.3 ✓

**Effort:** 7h

**Outputs:**
- `frontend/src/pages/Infrastructure.tsx`
- `frontend/src/pages/VmDetail.tsx`
- `frontend/src/components/VmCard.tsx`
- `frontend/src/components/NetworkTopology.tsx`
- `frontend/src/hooks/useVms.ts`

**Testing:**
- Component Render Tests
- VM-Control Action Tests
- Error-State Tests

---

### Task 1.5: Credentials-Vault UI

**SOLL:**
- Add Credential Form (Type-Select + Dynamic Input-Fields)
- Credentials-List mit Edit/Delete/Copy Buttons
- Test Connection Button
- Audit-Log Viewer
- No Plain-Text Display (obfuskiert)
- Category-Filtering (Proxmox, GitHub, SSH, etc.)
- Search-Functionality

**IST:**
- ✅ CRUD für Credentials (verschlüsselt)
- ✅ Master-Key Integration
- ✅ Support für verschiedene Typen (Proxmox, GitHub, SSH)

**Abhängigkeiten:** Task 0.2, 1.3 ✓

**Effort:** 6h

**Outputs:**
- `frontend/src/pages/Credentials.tsx`
- `frontend/src/components/CredentialForm.tsx`
- `frontend/src/components/CredentialsList.tsx`
- `frontend/src/components/AuditLog.tsx`
- `frontend/src/hooks/useCredentials.ts`

**Testing:**
- Form Validation Tests
- Credential CRUD Tests
- Audit-Log Display Tests

---

## 📦 PHASE 2: Project & GitHub Integration (Woche 3)

### Task 2.1: GitHub Integration

**SOLL:**
- GitHubClient mit API-Token Auth (aus Vault)
- List Repositories
- Fetch README.md + Systempoint.md
- Extract Dependencies (package.json, requirements.txt)
- Fetch Recent Commits + Branches
- Fetch Issues & PRs
- 1h TTL Caching
- Error-Handling für Rate-Limiting

**IST:**
- ✅ Project Entity & Relationship-Mapping
- ✅ GitHubClient mit Octokit Integration
- ✅ GitHub Sync Logic (README, Metadata, Tech-Stack)

**Abhängigkeiten:** Task 0.2 ✓

**Effort:** 5h

**Outputs:**
- `backend/src/github/github.client.ts`
- `backend/src/github/github.service.ts`
- `backend/src/entities/github-sync.entity.ts`

**Testing:**
- Mock GitHub API Tests
- Cache Invalidation Tests
- Markdown Parsing Tests

---

### Task 2.2: Project Management CRUD

**SOLL:**
- Endpoints:
  - POST /api/projects (Create)
  - GET /api/projects (List mit GitHub-Sync)
  - GET /api/projects/:id (Detail)
  - PUT /api/projects/:id (Update)
  - DELETE /api/projects/:id (Soft-Delete)
- Project-Entity mit GitHub-Sync-Data
- Tech-Stack JSON-Field
- VM/Container Dependencies

**IST:**
- ✅ Project Entity mit `jsonb` Metadata
- ✅ ProjectService mit CRUD & Auto-Sync
- ✅ ProjectController mit API Endpoints

**Abhängigkeiten:** Task 2.1 ✓

**Effort:** 4h

**Outputs:**
- `backend/src/entities/project.entity.ts`
- `backend/src/projects/projects.service.ts`
- `backend/src/projects/projects.controller.ts`

**Testing:**
- CRUD Endpoint Tests
- GitHub-Sync Integration Tests

---

### Task 2.3: Project Management UI

**SOLL:**
- Projects-List View mit Karten
- Project-Detail Page (mit GitHub-Infos, README)
- Project-Edit Form
- Tech-Stack Display
- Repository-Link
- Deployment-Status Badge
- Create/Delete Project Dialogs

**IST:**
- ❌ Nicht gestartet

**Abhängigkeiten:** Task 2.2, 1.3 ✓

**Effort:** 5h

**Outputs:**
- `frontend/src/pages/Projects.tsx`
- `frontend/src/pages/ProjectDetail.tsx`
- `frontend/src/pages/ProjectForm.tsx`
- `frontend/src/components/ProjectCard.tsx`
- `frontend/src/components/ReadmeViewer.tsx`

**Testing:**
- Projects-List Render Tests
- Project-Detail Data Loading Tests
- Form Submission Tests

---

### Task 2.4: Feature-Kanban Board

**SOLL:**
- Kanban-Board (Geplant → Analyse → Ready → Entwicklung → Testing → Deployed)
- Drag & Drop zwischen Spalten
- Feature-Card mit Info (Name, Priority, Effort, Assignee)
- Modal für Feature-Details (Beschreibung, Dependencies, Notes)
- Create/Edit/Delete Features
- Filter nach Status/Priority
- Bulk-Actions

**IST:**
**IST:**
- ✅ Feature Entity & Controller & Service
- ✅ Kanban Board UI mit Drag & Drop
- ✅ Create/Edit/Delete Features
- ✅ Priority & Status Management

**Abhängigkeiten:** Task 2.2 ✓

**Effort:** 7h

**Outputs:**
- `backend/src/entities/feature.entity.ts`
- `backend/src/features/features.service.ts`
- `backend/src/features/features.controller.ts`
- `frontend/src/pages/Kanban.tsx`
- `frontend/src/components/KanbanBoard.tsx`
- `frontend/src/components/FeatureCard.tsx`

**Testing:**
- Kanban-Board Drag/Drop Tests
- Feature-CRUD Tests
- Status-Transition Logic Tests

---

## 🤖 PHASE 3: Prompt-Generator (Woche 3)

### Task 3.1: Prompt-Generator Engine

**SOLL:**
- Context-Collector Service:
  - Sammle Proxmox-Daten (VMs, Services, IPs)
  - Sammle GitHub-Daten (README, Dependencies, Commits)
  - Sammle Projekt-Metadata
- Prompt-Template Engine (strukturierte Prompts)
- Endpoints:
  - POST /api/prompts/generate/:feature_id
  - GET /api/prompts (History)
  - GET /api/prompts/:id (Single)
- Credentials-Info obfuskieren (nicht im Prompt zeigen!)
- Markdown-Output

**IST:**
- ❌ Nicht gestartet

**Abhängigkeiten:** Task 1.1, 2.1, 2.2 ✓

**Effort:** 6h

**Outputs:**
- `backend/src/prompts/prompt-generator.service.ts`
- `backend/src/prompts/context-collector.service.ts`
- `backend/src/prompts/prompts.controller.ts`
- `backend/src/entities/prompt.entity.ts`

**Testing:**
- Context-Collector Data Accuracy Tests
- Prompt-Template Generation Tests
- Credential-Obfuscation Tests

---

### Task 3.2: Prompt-Generator UI

**SOLL:**
- Feature-Selection View (Kanban → Detail → Generate Prompt)
- Generated Prompt Display (Markdown + Syntax-Highlighting)
- Copy-to-Clipboard Button mit Toast
- Prompt-History Link
- Export-Prompt (als .txt oder per Email)
- Prompt-Regeneration mit neuesten Daten

**IST:**
- ❌ Nicht gestartet

**Abhängigkeiten:** Task 3.1, 2.4 ✓

**Effort:** 4h

**Outputs:**
- `frontend/src/pages/PromptGenerator.tsx`
- `frontend/src/components/PromptDisplay.tsx`
- `frontend/src/components/PromptHistory.tsx`
- `frontend/src/hooks/usePromptGenerator.ts`

**Testing:**
- Prompt-Generation Trigger Tests
- Copy-to-Clipboard Tests
- History-Loading Tests

---

## 📊 PHASE 4: Monitoring & Admin (Woche 4)

### Task 4.1: Health-Checks & Alerts

**SOLL:**
- Health-Check Service (läuft alle 5 Min):
  - HTTP/HTTPS Status-Checks
  - Ping Tests auf VMs
  - Disk-Space Checks (>80% Alert)
  - SSL-Zertifikat Ablauf (Alert <30 Tage)
- Alert-Entity + Endpoints:
  - GET /api/alerts
  - PUT /api/alerts/:id/acknowledge
  - POST /api/alerts/rule (Create Alert-Rule)
- Notification-System (placeholder für Email/Webhook)

**IST:**
- ❌ Nicht gestartet

**Abhängigkeiten:** Task 1.1, 1.2 ✓

**Effort:** 6h

**Outputs:**
- `backend/src/health/health-check.service.ts`
- `backend/src/alerts/alerts.service.ts`
- `backend/src/alerts/alerts.controller.ts`
- `backend/src/entities/alert.entity.ts`
- `backend/src/notifications/notification.service.ts`

**Testing:**
- Health-Check Scheduling Tests
- Alert-Creation Logic Tests
- Notification Trigger Tests

---

### Task 4.2: Alerts UI & Dashboard

**SOLL:**
- Alert-Bell Icon mit Badge (Anzahl neue Alerts)
- Alert-List Modal/Drawer mit Filtering
- Alert-History + Details Modal
- Acknowledge/Dismiss Alert Buttons
- Alert-Rule Creation Form
- Real-Time Alert-Updates (optional: WebSocket)

**IST:**
- ❌ Nicht gestartet

**Abhängigkeiten:** Task 4.1, 1.3 ✓

**Effort:** 4h

**Outputs:**
- `frontend/src/components/AlertBell.tsx`
- `frontend/src/pages/Alerts.tsx`
- `frontend/src/components/AlertModal.tsx`
- `frontend/src/hooks/useAlerts.ts`

**Testing:**
- Alert-Display Tests
- Real-Time Update Tests (mock WebSocket)

---

### Task 4.3: Admin-Dashboard & Settings

**SOLL:**
- Settings-Page:
  - Proxmox API Endpoint Config
  - GitHub Token Management
  - Master-Key Rotation
  - DB Backup Configuration
  - Email/Webhook Configuration
- User-Management:
  - Add/Remove Users
  - Roles & Permissions
  - API-Keys für externe Integrationen
- System-Health:
  - App CPU/RAM/Disk Usage
  - Database Status & Backup-Status
  - API Health & Response-Times
  - Logs-Viewer

**IST:**
- ❌ Nicht gestartet

**Abhängigkeiten:** Task 0.2, Task 0.1 (Users) ✓

**Effort:** 8h

**Outputs:**
- `backend/src/settings/settings.service.ts`
- `backend/src/settings/settings.controller.ts`
- `backend/src/admin/users.service.ts`
- `backend/src/admin/system-health.service.ts`
- `frontend/src/pages/Settings.tsx`
- `frontend/src/pages/Admin.tsx`
- `frontend/src/components/SystemHealth.tsx`

**Testing:**
- Settings-Update Tests
- User-Management Tests
- System-Health Metric Accuracy Tests

---

### Task 4.4: Docker-Compose Production & Deployment Docs

**SOLL:**
- Production-Ready docker-compose.yml
- Health-Checks für alle Services
- Resource-Limits (CPU/Memory)
- Logging-Configuration
- Backup-Volume-Automation
- SSL-Certificate Management (Let's Encrypt oder Self-Signed)
- Deployment-Dokumentation:
  - Installation auf Proxmox
  - Konfiguration
  - Häufige Fehler & Lösungen
  - Backup & Restore Prozess
- Start/Stop Scripts

**IST:**
- ❌ Nicht gestartet

**Abhängigkeiten:** Task 0.4 ✓

**Effort:** 5h

**Outputs:**
- `docker-compose.prod.yml`
- `backend/Dockerfile.prod`
- `frontend/Dockerfile.prod`
- `.env.prod.example`
- `docs/DEPLOYMENT.md`
- `docs/PROXMOX_SETUP.md`
- `scripts/start.sh`, `scripts/stop.sh`, `scripts/backup.sh`

**Testing:**
- Docker-Compose Startup Tests
- Service-Health-Check Tests
- Persistence Tests (Volumes)

---

## 🚀 PHASE 5: Advanced Features (Woche 5-6)

### Task 5.1: Disaster Recovery Orchestration System

**SOLL:**
- RTO/RPO Definition pro Project (z.B. RTO: 2 Min, RPO: 15 Min)
- Health-Check Service (alle 10 Sekunden)
- Automatisches Failover bei Primary-Ausfall (nach 30 Sec)
- VM-Failover Orchestration (Start auf Secondary)
- DNS & Network Failover (Auto-Update DNS Records)
- Data Sync & Replication Monitoring (Replication-Lag tracking)
- Disaster Recovery Dry-Runs (täglich, Restore-Tests)
- Failover-Event Logging & Dashboard

**Features:**
- Health-Check Interval: 10 Sec
- Failover-Trigger: 30 Sec offline
- Failover-Duration Target: <2 Min
- Resource-Check: Genug Capacity auf Secondary?
- Manual Review vor Failback (kein Auto-Failback!)
- Detailed Failover-Event Logging

**Abhängigkeiten:** Task 1.1, 1.2, Task 4.1 ✓

**Effort:** 18-24h

**Outputs:**
- `backend/src/disaster-recovery/dr.service.ts`
- `backend/src/disaster-recovery/dr.controller.ts`
- `backend/src/disaster-recovery/health-check.service.ts`
- `backend/src/entities/failover-event.entity.ts`
- `backend/src/entities/replication-status.entity.ts`
- `frontend/src/pages/DisasterRecovery.tsx`
- `frontend/src/components/DRDashboard.tsx`
- Database migrations (dr_config, health_checks, failover_events, replication_status)

**API Endpoints:**
- GET /api/dr/health
- GET/POST /api/dr/config/:projectId
- POST /api/dr/failover/:projectId
- GET /api/dr/failover/:failoverId/status
- POST /api/dr/failback/:projectId
- GET /api/dr/events?projectId=X&limit=20
- GET /api/dr/replication/:projectId

**Success Criteria:**
- [x] Health-Check läuft alle 10 Sekunden
- [x] Failover triggert automatisch nach 30 Sec
- [x] Failover-Duration: < 2 Minuten
- [x] Alle VMs starten auf Secondary
- [x] DNS-Records updaten automatisch
- [x] Replication-Lag monitored & alerted
- [x] Dashboard zeigt DR-Status Real-Time

**Testing:**
- Health-Check Logic Tests
- End-to-End Failover Simulation
- Secondary Node Startup Verification
- Failback Verification
- Performance Tests (Failover Duration <2min)

---

### Task 5.2: Natural Language Infrastructure ChatBot

**SOLL:**
- Claude API Integration (Sonnet Model)
- Query Understanding (Status, Config, Actions, Analysis)
- Tool-Use für API-Calls (11 Custom Tools)
- Chat Interface mit Message-History
- Tool-Use Visualization
- Safety Gates (Confirmation für destructive Actions)
- Conversation Memory (letzte 10 Messages)
- Rate-Limiting (20 Queries/Min pro User)

**Features:**
- Query-Types: Status, Configuration, Actions, Analysis
- Tool-Definitions: get_vms, execute_vm_action, get_health_status, query_logs, etc.
- Response-Types: Status Answer, Data Answer, Suggestion Answer, Action Result
- Safety: Read-Only always allowed, Write-Actions need Confirmation
- Audit-Logging: Alle Chat-Interactions geloggt

**Abhängigkeiten:** Task 1.1, 1.2, Task 4.1 ✓

**Effort:** 14-18h

**Outputs:**
- `backend/src/chatbot/chatbot.service.ts`
- `backend/src/chatbot/chatbot.controller.ts`
- `backend/src/chatbot/tool-definitions.ts`
- `backend/src/entities/chat-message.entity.ts`
- `frontend/src/pages/ChatBot.tsx`
- `frontend/src/components/ChatMessage.tsx`
- `frontend/src/components/ConfirmationDialog.tsx`
- `frontend/src/hooks/useChatBot.ts`

**API Endpoints:**
- POST /api/chatbot/query
- GET /api/chatbot/history?sessionId=X&limit=20
- POST /api/chatbot/query/:queryId/confirm

**Success Criteria:**
- [x] ChatBot versteht 10+ Query-Typen
- [x] Tool-Use funktioniert korrekt
- [x] Destructive Actions brauchen Confirmation
- [x] Response-Zeit: < 3 Sekunden
- [x] Formatting: Tables, Code-Blocks, Markdown
- [x] Error-Handling: Graceful wenn Tool fehlschlägt

**Example Conversations:**
- "Sind alle Services okay?" → Health-Status + Anomalies
- "Zeig mir alle VMs" → Table mit VMs
- "Warum ist DB langsam?" → Analyze Logs + Metrics
- "Restart VM-108" → Confirmation + Execution

**Testing:**
- Tool-Use Mocking Tests
- Query-Understanding Tests
- Safety-Gate Tests
- Error-Handling Tests

---

### Task 5.3: Intelligent Backup Management System

**SOLL:**
- Backup-Policies pro VM (täglich, wöchentlich, monatlich)
- Automatic Retention Management (alte Backups auto-löschen)
- Incremental Backups (70% space savings)
- Backup Verification (Integrität-Check mit Checksums)
- Daily Restore-Tests (echtes Restore auf Test-VM)
- Smart Retention (Keep Montag-Backup länger, Keep 1. des Monats)
- Encryption (AES-256 für alle Backups)
- Comprehensive Logging & Metrics

**Features:**
- Policy: Schedule, Retention, Priority, Encryption-Enabled
- Backup-Types: Full, Incremental
- Status-Tracking: Scheduled, In-Progress, Completed, Failed
- Verification: Checksum-Validation, Restore-Test
- Retention-Cleanup: Automatic deletion of old backups
- Storage-Monitoring: Alert wenn >80%
- Restore-Tests: Täglich mit Health-Checks

**Abhängigkeiten:** Task 1.1, Task 4.1 ✓

**Effort:** 14-18h

**Outputs:**
- `backend/src/backups/backup.service.ts`
- `backend/src/backups/backup.controller.ts`
- `backend/src/backups/scheduler.service.ts`
- `backend/src/backups/verify.service.ts`
- `backend/src/entities/backup-policy.entity.ts`
- `backend/src/entities/backup.entity.ts`
- `backend/src/entities/backup-restore.entity.ts`
- `backend/src/entities/backup-metrics.entity.ts`
- `frontend/src/pages/Backups.tsx`
- `frontend/src/components/BackupPolicies.tsx`
- `frontend/src/components/RestoreTests.tsx`
- Database migrations (backup_policies, backups, backup_restores, backup_metrics)

**API Endpoints:**
- GET/POST/PUT/DELETE /api/backups/policies
- POST /api/backups/:vmId/execute
- GET /api/backups/:backupId/progress
- POST /api/backups/:backupId/restore
- GET /api/backups/:backupId/verify
- GET /api/backups/history?vmId=X&limit=20
- GET /api/backups/restore-tests?limit=20
- GET /api/backups/metrics

**Success Criteria:**
- [x] Backup-Policy Execution: 99.9% Success Rate
- [x] Backup Verification: Nach jedem Backup
- [x] Restore-Tests: Täglich, Auto-Verification
- [x] Incremental Backups: 70%+ Space-Savings
- [x] Retention: Auto-Cleanup funktioniert
- [x] Encryption: Alle Backups verschlüsselt
- [x] Recovery-Time: <5 Min für 50GB VM
- [x] Alerting: Instant bei Backup-Fehler

**Testing:**
- Backup Execution Tests
- Verification Logic Tests
- Restore-Tests
- Retention-Cleanup Tests
- Performance Tests

---

### Task 5.4: Professional Monitoring mit Prometheus

**SOLL:**
- Prometheus Endpoint-Konfiguration
- Service-Discovery (automatische Target-Detection)
- Custom-Metrics für Infrastruktur (VM-Level, App-Level, Custom)
- PromQL Query Interface (mit Autocomplete & Validation)
- Custom Dashboard Builder (Drag-Drop)
- Alert-Rules Management (mit Notification-Channels)
- SLA Calculation & Analytics
- Performance-Trends & Anomaly-Detection

**Features:**
- Metrics: Node, Proxmox, Application, Database, Custom
- Dashboard-Types: Graph, Gauge, Stat, Table, Heatmap
- Query-Capabilities: Instant & Range Queries, Recording Rules
- Alerts: Multiple Severity Levels, For-Duration, Multiple Channels
- Analytics: Trends, SLA, Forecasting, Reports
- Variables: VM-Selection Dropdowns in Dashboards

**Abhängigkeiten:** Task 1.1, 1.2, Task 4.1 ✓

**Effort:** 14-18h

**Outputs:**
- `backend/src/prometheus/prometheus.service.ts`
- `backend/src/prometheus/prometheus.controller.ts`
- `backend/src/prometheus/alert.service.ts`
- `backend/src/prometheus/sla.service.ts`
- `backend/src/entities/dashboard-config.entity.ts`
- `backend/src/entities/alert-rule.entity.ts`
- `backend/src/entities/alert-history.entity.ts`
- `frontend/src/pages/Monitoring.tsx`
- `frontend/src/pages/Dashboards.tsx`
- `frontend/src/components/PromQLEditor.tsx`
- `frontend/src/components/MetricsGraph.tsx`
- `frontend/src/components/AlertRules.tsx`
- Prometheus Configuration Files (scrape configs, alert rules)

**API Endpoints:**
- POST /api/prometheus/query
- GET /api/prometheus/metrics
- GET /api/prometheus/labels/:metric
- GET/POST/PUT/DELETE /api/dashboards
- GET/POST/PUT/DELETE /api/alerts/rules
- GET /api/alerts/history
- POST /api/alerts/:alertId/acknowledge
- GET /api/sla?metric=X&days=30

**Success Criteria:**
- [x] Prometheus Connection funktioniert
- [x] 20+ Metrics collected
- [x] PromQL Queries ausführbar
- [x] Dashboard-Creation funktioniert
- [x] Alert-Rules definierbar
- [x] Notifications funktionieren
- [x] SLA-Calculation korrekt
- [x] Query-Response: <2 Sec

**Metrics zu sammeln:**
- Node: CPU, Memory, Disk, Network, Load
- Proxmox: VM-CPU, Memory, Disk I/O
- Application: Request-Duration, Error-Rate
- Database: Connections, Query-Time
- Custom: Backup-Duration, Deploy-Success-Rate

**Testing:**
- Prometheus Connection Tests
- Query-Execution Tests
- Dashboard-Creation Tests
- Alert-Rule Tests
- SLA-Calculation Tests

---

### Task 5.5: CI/CD Pipeline Manager (GitHub Actions)

**SOLL:**
- GitHub Actions Integration (API-basiert)
- Workflow Visualization (DAG - Directed Acyclic Graph)
- Workflow Runs History & Logs (Real-Time Streaming)
- Manual Trigger (mit Input-Parametern)
- Build & Deploy Management (Artifacts, Deployments)
- Performance Analytics (Build-Time Trends, Success-Rate, Flakiness)
- Deployment History & Rollback
- Notifications & Alerts

**Features:**
- Workflow-DAG: Jobs als Nodes, Dependencies als Edges
- Build-Artifacts: Download-Links, Metadata
- Deployment-Status: Environment-basiert, Version-Tracking
- Performance-Metrics: Duration-Trends, Success-Rate, Bottleneck-Analysis
- Cost-Analysis: GitHub Actions Minutes Monitoring
- Manual-Trigger: Workflow-Selection + Input-Parameters
- Real-Time Log-Streaming (WebSocket)

**Abhängigkeiten:** Task 2.1 (GitHub Integration) ✓

**Effort:** 10-14h

**Outputs:**
- `backend/src/ci-cd/github-actions.service.ts`
- `backend/src/ci-cd/ci-cd.controller.ts`
- `backend/src/ci-cd/analytics.service.ts`
- `backend/src/entities/workflow-execution.entity.ts`
- `backend/src/entities/workflow-job.entity.ts`
- `backend/src/entities/deployment-history.entity.ts`
- `frontend/src/pages/CICD.tsx`
- `frontend/src/pages/Deployments.tsx`
- `frontend/src/components/PipelineDAG.tsx`
- `frontend/src/components/LogViewer.tsx`
- `frontend/src/components/WorkflowTrigger.tsx`
- WebSocket Handler für Log-Streaming
- Database migrations (workflow_executions, workflow_jobs, deployment_history)

**API Endpoints:**
- GET /api/ci-cd/:projectId/workflows
- GET /api/ci-cd/:projectId/runs?workflow=X&limit=20
- GET /api/ci-cd/runs/:runId (Details)
- GET /api/ci-cd/runs/:runId/logs (Stream)
- POST /api/ci-cd/workflows/:workflowId/trigger
- GET /api/ci-cd/runs/:runId/artifacts
- GET /api/ci-cd/:projectId/deployments
- POST /api/ci-cd/:projectId/deployments/:deployId/rollback
- GET /api/ci-cd/:projectId/analytics

**Success Criteria:**
- [x] GitHub Connection funktioniert
- [x] Workflows & Runs laden correct
- [x] Pipeline-DAG visualisiert richtig
- [x] Manual Trigger funktioniert
- [x] Logs streamen Real-Time
- [x] Analytics berechnet korrekt
- [x] Deployment-History tracked
- [x] Run-List ladet <2 Sec

**Example Analytics:**
- Success-Rate: % der Builds erfolgreich
- Duration-Trend: Wird Build schneller/langsamer?
- Flakiness-Detection: Welche Tests sind instabil?
- Cost-Analysis: GitHub Actions Minutes/Monat

**Testing:**
- GitHub API Mocking Tests
- Workflow-Parsing Tests
- DAG-Visualization Tests
- Analytics-Calculation Tests
- Log-Streaming Tests

---

## 📊 PHASE 5 SUMMARY

**Total Effort**: ~70-90 Stunden
**Timeline**: 2-3 Wochen (wenn parallel)
**ROI**: 9/10 (Enterprise-Grade Features)

| Erweiterung | Effort | Parallel? | Dependencies |
|-----------|--------|-----------|-------------|
| DR Orchestration | 18-24h | 🟢 Ja | Task 1.1, 1.2, 4.1 |
| ChatBot | 14-18h | 🟢 Ja | Task 1.1, 1.2, 4.1 |
| Backup System | 14-18h | 🟢 Ja | Task 1.1, 4.1 |
| Prometheus | 14-18h | 🟢 Ja | Task 1.1, 1.2, 4.1 |
| CI/CD Manager | 10-14h | 🟢 Ja | Task 2.1 |

**Empfohlener Start**: Nach Phase 4 Completion (Woche 5)
**Parallelisierung**: Alle 5 können gleichzeitig entwickelt werden!

---

## 🎯 FEATURE-PARITY CHECKLIST

### Tier 1: Infrastruktur-Management ✓
- [x] Proxmox Dashboard → Task 1.4
- [x] IP-Adress-Management → Task 1.2
- [x] DNS & Service-Discovery → Task 1.2

### Tier 2: Projekt-Management ✓
- [x] Projekt-Übersicht → Task 2.2, 2.3
- [x] Projekt-Übersicht → Task 2.2, 2.3
- [x] GitHub Integration → Task 2.1
- [x] Features/Futures Management → Task 2.4

### Tier 3: Credentials-Management ✓
- [x] Verschlüsselte Credentials-Vault → Task 0.2
- [x] Credentials-Management-UI → Task 1.5
- [x] Master-Key & Security → Task 4.3

### Tier 4: Prompt-Generator ✓
- [x] Automatischer Kontext-Sammler → Task 3.1
- [x] Feature-To-Prompt-Generator → Task 3.1, 3.2
- [x] Prompt-History & Versioning → Task 3.1, 3.2

### Tier 5: Monitoring & Health ✓
- [x] Service-Health-Checks → Task 4.1
- [x] Alert-Management → Task 4.1, 4.2
- [x] Performance-Metrics → Task 4.1 (basis)

### Tier 6: Verwaltungs-Tools ✓
- [x] Backup-Management → Task 5.3 (Intelligent Backup System)
- [x] Update-Management → Task 5.5 (CI/CD Manager with Deployments)
- [x] Dokumentation & Wiki → Task 4.3 (basis)

### Tier 7: Reporting & Analytics ✓
- [x] Reports → Task 5.4 (Prometheus SLA & Analytics)
- [x] Dashboards → Task 1.4 + 4.2 + 5.4 (basis + Prometheus)

### Tier 8: Admin & Konfiguration ✓
- [x] Benutzer-Management → Task 4.3
- [x] System-Einstellungen → Task 4.3
- [x] System-Health → Task 4.3

### NEUE TIERS (Phase 5: Advanced Features)

### Tier 9: Disaster Recovery & Business Continuity ✓
- [x] Disaster Recovery Orchestration → Task 5.1
- [x] Failover-Management → Task 5.1
- [x] RTO/RPO Tracking → Task 5.1
- [x] Health-Check Automation → Task 5.1

### Tier 10: AI & Natural Language Processing ✓
- [x] Infrastructure ChatBot → Task 5.2
- [x] Query Understanding (Status, Config, Actions, Analysis) → Task 5.2
- [x] Tool-Use for API-Calls → Task 5.2
- [x] Safety Gates & Confirmation → Task 5.2

### Tier 11: Advanced Monitoring & Observability ✓
- [x] Prometheus Integration → Task 5.4
- [x] Custom Dashboards & Analytics → Task 5.4
- [x] Alert-Rules Management → Task 5.4
- [x] SLA Calculation & Anomaly-Detection → Task 5.4

### Tier 12: Pipeline & Deployment Management ✓
- [x] CI/CD Pipeline Manager → Task 5.5
- [x] GitHub Actions Integration → Task 5.5
- [x] Deployment History & Rollback → Task 5.5
- [x] Build Performance Analytics → Task 5.5

---

## 📈 Fortschritt Summary

```
Phase 0: ██████████████████ 100% (4/4 Tasks DONE) ✅
Phase 1: ██████████████████ 100% (5/5 Tasks DONE) ✅
Phase 2: ██████████████████ 100% (4/4 Tasks DONE) ✅
Phase 3: ░░░░░░░░░░░░░░░░░░ 0% (2/2 Tasks planned)
Phase 4: ░░░░░░░░░░░░░░░░░░ 0% (4/4 Tasks planned)
Phase 5: ░░░░░░░░░░░░░░░░░░ 0% (5/5 Tasks planned - ADVANCED FEATURES)

GESAMT: ██████████░░░░░░░░░░ 40% (13/31 Tasks DONE)

MVPs: Phase 0-2 COMPLETE ✅
Phase 3-4: Core Monitoring & Admin (NEXT)
Phase 5: Enterprise-Grade Advanced Features (FUTURE)
```

### Task-Übersicht nach Phase

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| **0** | Foundation | Database, Auth, Encryption, Docker | ✅ 4/4 DONE |
| **1** | Core Infrastructure | Proxmox, IP-Mgmt, Vault, VM-Dashboard | ✅ 5/5 DONE |
| **2** | Project Management | GitHub, Projects, Features, Kanban | ✅ 4/4 DONE |
| **3** | Prompt Generator | Engine, UI | ⏳ 2/2 PLANNED |
| **4** | Monitoring & Admin | Health-Checks, Alerts, Settings, Docker | ⏳ 4/4 PLANNED |
| **5** | Advanced Features | DR, ChatBot, Backups, Prometheus, CI/CD | ⏳ 5/5 PLANNED |

**Grand Total**: 31 Tasks | **Current**: 13 Done (42%)

---

## 🔗 Task-Dependencies Graph

```
PHASE 0: Foundation
┌─ Task 0.1 (DB & Auth)
└─→ Task 0.2 (Encryption)
    ├─→ Task 0.3 (Express/React Boilerplate)
    │   └─→ Task 0.4 (Docker-Compose Foundation)
    │
    └─ Task 1.1 (Proxmox API Client)
        ├─→ Task 1.2 (IP Management)
        │   └─→ Task 1.4 (VM Dashboard)
        ├─→ Task 3.1 (Prompt Generator)
        ├─→ Task 4.1 (Health Checks) ──→ Task 5.1 (DR Orchestration)
        ├─→ Task 5.1 (DR Orchestration)
        ├─→ Task 5.2 (ChatBot)
        └─→ Task 5.3 (Backup System)

PHASE 1: Infrastructure
Task 1.1 & 1.2 & 1.3 & 1.4 & 1.5

PHASE 2: Project Management
Task 2.1 (GitHub) ──→ Task 2.2 (Projects) ──→ Task 2.3 (UI) ──→ Task 2.4 (Kanban)
    │                                                              │
    └──────────────────────────────────────────→ Task 3.1 (Prompt Generator) ──→ Task 5.5 (CI/CD)

PHASE 3: Prompt Generator
Task 2.1 & 2.4 ──→ Task 3.1 (Engine) ──→ Task 3.2 (UI)

PHASE 4: Monitoring & Admin
Task 1.1 & 1.2 ──→ Task 4.1 (Health-Checks) ──→ Task 4.2 (Alerts UI)
Task 0.2 & 0.1 ──→ Task 4.3 (Admin Settings)
Task 0.4 ──────→ Task 4.4 (Production Docker)

PHASE 5: Advanced Features (CAN RUN PARALLEL!)
├─→ Task 5.1 (DR Orchestration)    ← Depends: Task 1.1, 1.2, 4.1
├─→ Task 5.2 (ChatBot)             ← Depends: Task 1.1, 1.2, 4.1
├─→ Task 5.3 (Backup System)       ← Depends: Task 1.1, 4.1
├─→ Task 5.4 (Prometheus Monitor)  ← Depends: Task 1.1, 1.2, 4.1
└─→ Task 5.5 (CI/CD Manager)       ← Depends: Task 2.1
```

### Parallelisierungs-Empfehlung

**Phase 3-4 kann parallel starten:**
- Backend: Task 3.1, 4.1, 4.3 parallel
- Frontend: Task 3.2, 4.2 parallel (brauchen Backend)

**Phase 5 (ALLE PARALLEL!):**
```
Week 5 Woche:
├─ Developer 1: Task 5.1 (DR Orchestration)
├─ Developer 2: Task 5.2 (ChatBot)
├─ Developer 3: Task 5.3 (Backup System)
├─ Developer 4: Task 5.4 (Prometheus)
└─ Developer 5: Task 5.5 (CI/CD Manager)

Gesamtdauer: 2-3 Wochen statt 4-5 Wochen!
```

---

## 🛠️ Tech-Stack Decisions

### Backend
- **Framework**: Express.js (minimal, flexible)
- **ORM**: TypeORM (Database abstraction, migrations)
- **Auth**: jsonwebtoken (JWT), bcryptjs (password hashing)
- **Encryption**: crypto (Node.js built-in), crypto-js fallback
- **API-Clients**: axios (HTTP), octokit (GitHub)
- **Validation**: joi oder express-validator
- **Logging**: winston oder pino
- **Testing**: Jest + supertest

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State-Management**: React Context + useReducer (initial), TanStack Query für API-Calls
- **UI-Components**: Shadcn/ui oder Radix UI
- **Forms**: React Hook Form + Zod (validation)
- **Charts**: recharts (optional für Metrics)
- **Drag-Drop**: react-beautiful-dnd (Kanban)
- **Testing**: Vitest + React Testing Library

### Database
- **Primary**: PostgreSQL 15
- **Migrations**: TypeORM migrations
- **Backups**: pg_dump (automated scripts)

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker-Compose (MVP), Kubernetes (future)
- **Reverse-Proxy**: Nginx
- **SSL**: Self-Signed (dev), Let's Encrypt (prod)

---

## ✅ Qualitäts-Kriterien

### Code-Standards
- [x] ESLint + Prettier Config
- [x] TypeScript (optional aber empfohlen)
- [x] Husky + Pre-Commit Hooks
- [x] Branch-Protection auf main

### Testing-Anforderungen
- [x] Unit-Tests: Min 70% Coverage für Business-Logic
- [x] Integration-Tests: API-Endpoints, DB-Queries
- [x] E2E-Tests: Critical User Flows (Login, Feature-Create, etc.)
- [x] Security-Tests: Auth, Encryption, CORS

### Performance-Targets
- [x] Frontend Load-Time: <3s
- [x] API-Response: <500ms (99th percentile)
- [x] Database-Queries: <100ms (w/ indexes)
- [x] Proxy-Cache-TTL: 5min (VMs), 1h (GitHub)

### Security-Checklist
- [x] HTTPS-only (HSTS Header)
- [x] JWT-Sessions mit Expiration (15min)
- [x] CORS restricted origins
- [x] SQL-Injection prevention (Prepared Statements)
- [x] Rate-Limiting on auth-endpoints
- [x] Audit-Logging für sensitive actions
- [x] Master-Key encryption (env-variable)
- [x] Credentials never in logs/responses

---

## 📋 Nächste Schritte (AKTUELL)

### ✅ Phase 0 ABGESCHLOSSEN!

**Completed Files:**
- Backend: 9 files (entities, services, controllers, middleware, config, utils)
- Frontend: 6 files (pages, context, components, config)
- Infrastructure: docker-compose.yml, Dockerfiles, nginx.conf, .env.example
- Documentation: README.md, INFRASTRUKTUR_MANAGEMENT_PLAN.md

### 🚀 Nächste Phase: Phase 1 (Core Infrastructure)

**Priorität-Reihenfolge für Task-Start:**
1. **Task 1.1** - Proxmox API Client (braucht Task 0.2 für Credential-Verwendung)
2. **Task 1.2** - IP-Address & Service Management (braucht Task 1.1)
3. **Task 1.3** - Credentials-Vault UI (Frontend für Credentials)
4. **Task 1.4** - VM-Dashboard & Control Panel (braucht Task 1.1 + 1.3)
5. **Task 1.5** - React Dashboard Boilerplate (erweitert Task 0.3)

**Empfohlene Parallelisierung:**
- Tasks 1.1 & 1.3 können parallel laufen (Backend + Frontend)
- Task 1.2 wartet auf Task 1.1
- Tasks 1.4 & 1.5 warten auf Tasks 1.1 & 1.3

### Quick Start nach Phase 0

```bash
# 1. Dependencies installieren
cd infrastruktur-manager
npm install

# 2. Environment konfigurieren
cp .env.example .env
# Edit .env: JWT_SECRET, ENCRYPTION_MASTER_KEY, DB credentials

# 3. Development starten
npm run dev
# Backend: http://localhost:5000
# Frontend: http://localhost:3000

# 4. Docker starten (alternative)
docker-compose up -d
```

### Test Admin-Benutzer erstellen (nach DB-Init)

```bash
# Backend starten, dann in DB:
INSERT INTO users (id, username, email, password_hash, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@example.com',
  '$2a$12$...hashed_password...',
  'admin',
  true
);
```

---

**Status**: 🟢 Phase 0 COMPLETE - Phase 1 ready to start
**Nächste Update**: Nach Task 1.1 oder 1.2 Completion
