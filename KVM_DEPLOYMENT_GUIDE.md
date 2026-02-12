# 🖥️ KVM VM Deployment Guide

## Übersicht

Diese Anleitung zeigt dir wie du die Infrastruktur-Manager Anwendung in einer KVM VM auf deinem Proxmox Host deployst.

**Warum KVM statt LXC?**
- ✅ Docker builds funktionieren perfekt
- ✅ Keine Overlay-FS Probleme
- ✅ Vollständige Kernel-Isolation
- ✅ Besser für Production

---

## Schritt 1: KVM VM erstellen

### 1a. SSH in Proxmox Host
```bash
ssh root@<proxmox-ip>
```

### 1b. VM erstellen
```bash
cd /root/infrastruktur-manager
bash scripts/create-kvm-vm.sh
```

Das Skript wird dich fragen, ob du fortfahren möchtest. Tippe `y` und Enter.

**Output Beispiel:**
```
================================
✅ KVM VM Created Successfully!
================================

VM Details:
  VM ID: 200
  Name: inframanager-200
  IP Address: 192.168.1.100
  Hostname: inframanager-200

Next Steps:
  1. Wait 2-3 minutes for cloud-init to complete
  2. SSH into the VM: ssh ubuntu@192.168.1.100
  3. Copy your project to /home/ubuntu/infrastruktur-manager
```

---

## Schritt 2: Projekt mit WinSCP transferieren

### 2a. WinSCP öffnen
- Download: https://winscp.net/eng/download.php
- Starten

### 2b. Neue Verbindung erstellen

**Verbindungsparameter:**
```
Protokoll:        SSH (SFTP)
Hostname:         192.168.1.100          (deine VM IP)
Port:             22
Benutzername:     ubuntu
Authentifizierung: Public Key (SSH-Key)
  Schlüsseldatei: <path-to-private-key>
```

**Oder mit Passwort (falls kein SSH-Key):**

Falls die VM mit Passwort-Auth starten soll:
```bash
# In der VM via Proxmox Console (qm terminal 200)
sudo passwd ubuntu
# Neues Passwort setzen

# Dann in SSH config Password Auth aktivieren
sudo nano /etc/ssh/sshd_config
# Finde: PasswordAuthentication
# Ändere zu: PasswordAuthentication yes
sudo systemctl restart ssh
```

Dann in WinSCP:
```
Protokoll:        SSH (SFTP)
Hostname:         192.168.1.100
Port:             22
Benutzername:     ubuntu
Passwort:         <dein-passwort>
```

### 2c. Verbindung testen
- Klick auf "Anmelden" oder "Login"
- Sollte grünes "Session" Fenster öffnen

### 2d. Projekt kopieren

**Lokale Seite (Links):**
```
C:\Users\nobbi\Documents\verwaltung\infrastruktur-manager
```

**Remote Seite (Rechts):**
```
/home/ubuntu/
```

**Ordner-Transfer:**
1. Lokale Seite: Gehe zu `C:\Users\nobbi\Documents\verwaltung\`
2. Rechts-klick auf `infrastruktur-manager` Ordner
3. Wähle **"Copy"**
4. Remote Seite: Stelle sicher du in `/home/ubuntu/` bist
5. Rechts-klick → **"Paste"**

*Das dauert ca. 1-2 Minuten*

---

## Schritt 3: In der VM deployen

### 3a. SSH in die VM
```bash
# Vom Proxmox Host oder deinem Rechner
ssh ubuntu@192.168.1.100

# ODER via Proxmox Console
qm terminal 200
```

### 3b. Ins Projekt-Verzeichnis gehen
```bash
cd /home/ubuntu/infrastruktur-manager
```

### 3c. Permissions überprüfen
```bash
# Sollte alle deine Projekt-Dateien zeigen
ls -la

# Output sollte sein:
# -rw-r--r-- ... backend/
# -rw-r--r-- ... frontend/
# -rw-r--r-- ... scripts/
# -rw-r--r-- ... docker-compose.yml
```

Wenn Dateien fehlen, stelle sicher dass die WinSCP-Übertragung komplett war!

### 3d. Environment vorbereiten
```bash
# .env von .env.example erstellen
cp .env.example .env

# WICHTIG: .env anpassen
nano .env

# Wichtige Variablen überprüfen:
# JWT_SECRET=<random-secret>
# DB_PASSWORD=<neues-passwort>
# ENCRYPTION_MASTER_KEY=<random-key>
# FRONTEND_URL=http://192.168.1.100
# API_URL=http://192.168.1.100:5000
```

**Zufällige Keys generieren:**
```bash
# JWT_SECRET (im Editor einfügen)
openssl rand -base64 32

# ENCRYPTION_MASTER_KEY
openssl rand -base64 32
```

### 3e. Docker & Node.js überprüfen
```bash
# Überprüfe ob Docker läuft
docker --version
docker ps

# Überprüfe ob Node.js installiert ist
node --version
npm --version

# Falls docker nicht läuft, starten
sudo systemctl start docker

# Falls Docker zu groß ist, aufräumen
docker system prune -a
```

### 3f. Deploy-Skript ausführen
```bash
# Innerhalb des Projekt-Verzeichnisses
bash scripts/deploy.sh
```

**Das Skript wird:**
- ✅ Docker Images bauen (Backend & Frontend)
- ✅ PostgreSQL Datenbank starten
- ✅ Backend & Frontend starten
- ✅ Datenbank initialisieren
- ✅ Admin-Benutzer erstellen
- ✅ Services überprüfen

---

## Schritt 4: Zugriff testen

### 4a. Docker Services überprüfen
```bash
docker-compose ps

# Sollte zeigen:
# NAME       STATUS
# postgres   Up
# backend    Up
# frontend   Up (Port 3000)
```

### 4b. Logs überprüfen (falls Fehler)
```bash
# Alle Logs anschauen
docker-compose logs -f

# Nur Backend-Logs
docker-compose logs -f backend

# Nur Frontend-Logs
docker-compose logs -f frontend
```

### 4c. Browser öffnen
```
Frontend:  http://192.168.1.100
API:       http://192.168.1.100:5000
API Docs:  http://192.168.1.100:5000/api/docs
```

### 4d. Login testen
```
Username: admin
Password: Admin@123
```

---

## ✅ Deployment erfolgreich!

**Wenn du diese Seite erreichst:**
- ✅ VM läuft
- ✅ Docker ist aktiv
- ✅ Backend API antwortet
- ✅ Frontend wird serviert
- ✅ Datenbank ist initialisiert

---

## 🔧 Häufige Probleme

### Problem: "Connection refused"
**Lösung:**
```bash
# Überprüfe ob VM läuft
qm status 200

# VM neu starten
qm reboot 200

# Logs überprüfen
docker-compose logs
```

### Problem: "Permission denied" in WinSCP
**Lösung:**
- Überprüfe Benutzername (sollte `ubuntu` sein)
- Überprüfe SSH-Key oder Passwort
- Stelle sicher SSH-Dienst läuft: `sudo systemctl status ssh`

### Problem: "Docker command not found"
**Lösung:**
```bash
# Docker wurde nicht von cloud-init installiert
# Installiere manuell
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
sudo systemctl enable docker
sudo systemctl start docker

# Logout und Login für Gruppe-Änderung
exit
ssh ubuntu@192.168.1.100
```

### Problem: Disk voll (Docker build fails)
**Lösung:**
```bash
# Überprüfe Disk-Nutzung
df -h

# Bereinige Docker
docker system prune -a
docker volume prune

# Oder vergrößere Disk in Proxmox
# (offline nur möglich)
```

### Problem: Port 80/3000/5000 bereits verwendet
**Lösung:**
```bash
# Überprüfe welche Ports belegt sind
sudo netstat -tuln | grep -E ':(80|3000|5000|5432)'

# Falls Ports belegt, ändere in .env
# z.B. FRONTEND_PORT=8080
nano .env

# Services neu starten
docker-compose down
docker-compose up -d
```

### Problem: Datenbank-Fehler beim Starten
**Lösung:**
```bash
# Überprüfe Datenbank-Logs
docker-compose logs postgres

# Datenbank-Volume löschen und neu starten
docker-compose down -v
docker-compose up -d postgres
sleep 5
docker-compose up -d
```

---

## 🚀 Performance-Tipps

### CPU & Memory Anpassen
Wenn die VM langsam ist, erhöhe in Proxmox:
```bash
# Auf Proxmox Host
qm set 200 --cores 6 --memory 8192

# VM neu starten
qm reboot 200
```

### Docker Build schneller machen
```bash
# Im Projekt
nano .env

# Füge hinzu
DOCKER_BUILDKIT=1

# Neustart
docker-compose down
docker-compose up -d --build
```

---

## 📊 Monitoring

### VM Status
```bash
# Auf Proxmox Host
qm status 200
qm monitor 200

# CPU/Memory Nutzung
qm monitor 200 | grep -E "cpu|mem"
```

### Docker Status
```bash
# In der VM
docker stats

# Einzelner Container
docker stats frontend
```

### Logs
```bash
# Real-time logs
docker-compose logs -f

# Letzte 50 Zeilen
docker-compose logs --tail=50
```

---

## 🔒 Security

### Nach Deployment
1. **Passwort ändern:**
   ```bash
   sudo passwd ubuntu
   ```

2. **SSH-Key nur Auth:**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Ändere: PasswordAuthentication no
   sudo systemctl restart ssh
   ```

3. **Firewall aktivieren:**
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 5000/tcp
   ```

4. **Admin-Passwort in App ändern**
   - Login mit: admin / Admin@123
   - Ändere Passwort sofort

---

## 📞 Hilfe

**Docker Logs anschauen:**
```bash
docker-compose logs -f
```

**Services überprüfen:**
```bash
docker-compose ps
```

**Neustarten:**
```bash
docker-compose restart
```

**Alles stoppen:**
```bash
docker-compose down
```

**Vollständig zurücksetzen:**
```bash
docker-compose down -v
rm -rf uploads/ logs/
docker-compose up -d
```

---

**Fertig!** Die Anwendung sollte jetzt laufen. 🎉

