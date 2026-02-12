# 🚀 Infrastruktur-Manager - Scripts & Deployment

Complete guide to deploying and managing Infrastruktur-Manager on Proxmox.

## Quick Start

### Deploy on New VM
```bash
cd ~/infrastruktur-manager
bash scripts/deploy.sh
```

### Update After Code Changes
```bash
bash scripts/quick-deploy.sh
```

### Clean Restart (Remove All Data)
```bash
bash scripts/quick-deploy.sh --clean
```

---

## Available Scripts

### 1. **deploy.sh** - Full Deployment (Recommended for Initial Setup)
Complete deployment with all checks and verification.

**Usage:**
```bash
./scripts/deploy.sh
```

**Features:**
- Pre-deployment checks
- Environment validation
- Auto-generates JWT_SECRET & ENCRYPTION_MASTER_KEY
- Database initialization
- Admin user creation
- Health verification
- Detailed logging to `deploy.log`

**When to use:**
- Initial deployment on new VM
- Fresh setup with full configuration

---

### 2. **quick-deploy.sh** - Fast Update Deployment
Minimal checks, perfect for code updates.

**Usage:**
```bash
# Standard deploy (keeps database)
./scripts/quick-deploy.sh

# Clean deploy (removes database/data)
./scripts/quick-deploy.sh --clean
```

**When to use:**
- After code changes
- Quick restart
- Development workflows

---

### 3. **create-kvm-vm.sh** - Proxmox KVM VM Creation
Creates a complete KVM virtual machine on Proxmox.

**Usage:**
```bash
# Default (VM 300, 4 cores, 4GB, 50GB)
./scripts/create-kvm-vm.sh

# Custom (VM ID, cores, memory, disk)
./scripts/create-kvm-vm.sh 301 8 8 100
```

**Features:**
- Auto-detects next VM ID
- Ubuntu 22.04 with Docker
- Fallback URLs for ISO
- Storage validation
- Debug logging

---

## Übersicht

### Welche Bereitstellungsmethode wählen?

| Feature | LXC Container | KVM VM |
|---------|---------------|--------|
| **Docker Support** | ⚠️ Overlay-FS Probleme | ✅ Vollständig unterstützt |
| **Overlay FS** | ❌ Kernel-Limitierungen | ✅ Funktioniert einwandfrei |
| **Sicherheit** | ⚠️ Privilegiert/weniger isoliert | ✅ Vollständige Isolation |
| **Performance** | ✅ Minimal overhead | ⚠️ Mehr overhead (~5-10%) |
| **Setup-Zeit** | ✅ Schneller (~1 min) | ⚠️ Länger (~3-5 min) |
| **Disk-Speicher** | ✅ 30GB ausreichend | ⚠️ 50GB empfohlen |

**Empfehlung:** **Verwende KVM VM** (`create-kvm-vm.sh`) wenn du Docker-Builds brauchst!

---

### 1. `create-kvm-vm.sh` - Vollständige VM auf Proxmox (EMPFOHLEN)
**Verwendung:** Läuft auf dem Proxmox Host
**Funktion:** Erstellt eine vollständige Ubuntu KVM Virtual Machine mit Docker und Node.js

**Vorteile:**
- ✅ Docker läuft perfekt (Overlay FS funktioniert)
- ✅ Vollständige Kernel-Isolation
- ✅ Wie echte Server behandeln
- ✅ Besser für Production

**Installation:**
```bash
# Auf Proxmox Host
bash scripts/create-kvm-vm.sh

# ODER mit Custom VM ID (z.B. 201)
bash scripts/create-kvm-vm.sh 201
```

---

### 2. `create-lxc-container.sh` - Container Setup auf Proxmox
**Verwendung:** Läuft auf dem Proxmox Host
**Funktion:** Erstellt einen Ubuntu LXC Container (für nicht-Docker Anwendungen)

**⚠️ WARNUNG:** LXC hat Probleme mit Docker-Overlay-FS. Verwende stattdessen KVM VM!

#### Privilegiert vs. Unprivilegiert

**PRIVILIGIERTER Container (aktuell im Skript):**
```bash
--privileged 1
```
- ✅ Docker funktioniert (mit Limitierungen)
- ✅ Keine zusätzliche Konfiguration nötig
- ⚠️ Kernel overlay-FS Probleme möglich
- ⚠️ Etwas weniger sicher

**Unprivilegierter Container:**
```bash
--unprivileged 1
```
- ✅ Sicherer
- ❌ Docker benötigt extra Konfiguration
- ❌ Overlay-FS funktioniert nicht

**Empfehlung:** Verwende **KVM VM statt LXC** für Docker-Deployment!

---

### 2. `deploy.sh` - Anwendungs-Deployment
**Verwendung:** Läuft im Container nach dem Projekt-Transfer
**Funktion:** Orchestriert:
- Docker Compose Build
- PostgreSQL Datenbank
- Node.js Backend
- React Frontend
- Admin-Benutzer Erstellung
- Health Checks

---

## Workflow

### Schritt 1: Container erstellen (auf Proxmox Host)
```bash
# SSH in Proxmox Host
ssh root@<proxmox-ip>

# Skript ausführen (Container ID 100)
bash create-lxc-container.sh

# ODER mit Custom ID
bash create-lxc-container.sh 101
```

### Schritt 2: Projekt mit WinSCP transferieren
Siehe: `WINSCP_TRANSFER_GUIDE.md`

### Schritt 3: Im Container deployen
```bash
# In Container gehen
pct enter 100

# Oder per SSH
ssh root@<container-ip>

# Ins Projekt-Verzeichnis gehen
cd /root/infrastruktur-manager

# .env anpassen
cp .env.example .env
nano .env

# Deployen
bash scripts/deploy.sh
```

---

## Hardware-Anforderungen

**Empfehlungen für den Container:**
- CPU Cores: 4 (eingestellt in `create-lxc-container.sh`)
- RAM: 4GB (eingestellt in `create-lxc-container.sh`)
- Disk: 30GB (eingestellt in `create-lxc-container.sh`)

**Hinweis:** Kann in `create-lxc-container.sh` angepasst werden (Lines 23-25)

---

## Troubleshooting

### Problem: "Container 100 already exists"
```bash
# Container existiert bereits
# Entweder:
# 1. Andere ID verwenden
bash create-lxc-container.sh 101

# 2. Oder alten Container löschen
pct destroy 100
```

### Problem: Docker funktioniert nicht im Container
**Überprüfe:** Ist der Container **privilegiert**?
```bash
# Im Proxmox Host
pct config 100 | grep privilege

# Sollte anzeigen: something with 'privileged'
```

### Problem: Port bereits verwendet (deploy.sh)
```bash
# Überprüfe welche Ports belegt sind
netstat -tuln | grep -E ':(80|3000|5000|5432)'

# Falls Ports belegt:
# 1. Container neustarten
docker-compose down && docker-compose up -d

# 2. Oder andere Ports in .env verwenden
```

---

## Sicherheit

**Für Produktion:**
- Container zu **unprivilegiert** wechseln (mehr Sicherheit)
- Starke Passwörter für:
  - DB_PASSWORD
  - JWT_SECRET
  - ENCRYPTION_MASTER_KEY
- Firewall-Regeln für Ports konfigurieren
- HTTPS/SSL einrichten
- Regelmäßige Backups

**Für Heimlab (aktuell):**
- Privilegierter Container ist OK
- Sichere trotzdem die .env Datei
- Standardpasswörter nach dem ersten Login ändern

---

## Weitere Informationen

- `DEPLOYMENT_GUIDE.md` - Detaillierte Deploy-Anleitung
- `WINSCP_TRANSFER_GUIDE.md` - WinSCP Transfer-Anleitung
- `PROXMOX_INTEGRATION.md` - Proxmox API Dokumentation
