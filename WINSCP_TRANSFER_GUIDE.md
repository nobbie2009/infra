# 📦 Projekt Transfer - Anleitung

## ⚠️ WICHTIG: Wähle die richtige Bereitstellungsmethode!

### KVM VM (EMPFOHLEN) vs. LXC Container

**Wenn du Docker-Images bauen möchtest:**
→ Verwende **KVM VM** (`create-kvm-vm.sh`)
- Docker läuft perfekt
- Keine Overlay-FS Probleme
- Empfohlen für Production

**Wenn du nur existierende Docker-Images deployst:**
→ LXC Container geht auch (`create-lxc-container.sh`)

---

## Schritt 1: VM/Container erstellen (auf Proxmox Host)

### 1a. SSH in Proxmox Host
```bash
# Verbindung zu deinem Proxmox Host
ssh root@<proxmox-ip>
```

### 1b. KVM VM erstellen (EMPFOHLEN)
```bash
# Navigiere zum Projekt-Verzeichnis
cd /root/infrastruktur-manager

# KVM VM erstellen
bash scripts/create-kvm-vm.sh

# ODER mit Custom VM ID (z.B. 201)
bash scripts/create-kvm-vm.sh 201
```

Das Skript wird:
- ✅ Ubuntu 22.04 KVM VM erstellen
- ✅ Docker installieren
- ✅ Node.js 20.x installieren
- ✅ Docker Compose installieren
- ✅ Cloud-Init ausführen (~2-3 Min)
- ✅ VM IP ausdrucken

**Alternativ: LXC Container (nicht empfohlen für Docker)**
```bash
bash scripts/create-lxc-container.sh

# ODER mit Custom Container ID (z.B. 101)
bash scripts/create-lxc-container.sh 101
```

**Beispiel Output:**
```
================================
✅ Container Created Successfully!
================================

Container Details:
  Container ID: 100
  Name: inframanager
  IP Address: 192.168.1.50
  Hostname: inframanager

Next Steps:
  1. Copy your project to /root/infrastruktur-manager
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
Hostname:         <Container-IP-Adresse>    (z.B. 192.168.1.50)
Port:             22
Benutzername:     root
Passwort:         <root password der Container>
```

**Oder mit Key (falls SSH-Keys konfiguriert):**
```
Protokoll:        SSH (SFTP)
Hostname:         <Container-IP-Adresse>
Port:             22
Benutzername:     root
Authentifizierung: Public Key
  Schlüsseldatei: <pfad-zu-private-key>
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
/root/
```

**Ordner-Transfer:**
1. **Lokale Seite:** Gehe zu `C:\Users\nobbi\Documents\verwaltung\`
2. **Rechts-klick** auf `infrastruktur-manager` Ordner
3. Wähle **"Copy"**
4. **Remote Seite:** Stelle sicher du in `/root/` bist
5. **Rechts-klick** → **"Paste"**

*Das dauert ca. 30-60 Sekunden je nach Dateigröße*

**Oder Kommandozeile (schneller):**
```
mkdir -p /root/infrastruktur-manager
# Dann Ordner-Inhalt copyieren
```

---

## Schritt 3: Projekt-Verzeichnis überprüfen

### 3a. SSH in Container
```bash
# Im Proxmox Host
pct enter 100

# ODER direkt per SSH
ssh root@<container-ip>
```

### 3b. Verzeichnis überprüfen
```bash
ls -la /root/infrastruktur-manager/

# Sollte anzeigen:
# backend/
# frontend/
# scripts/
# docker-compose.yml
# .env.example
# DEPLOYMENT_GUIDE.md
# etc.
```

---

## Schritt 4: Projekt deployen

### 4a. In Container gehen
```bash
cd /root/infrastruktur-manager
```

### 4b. Environment vorbereiten
```bash
# .env von .env.example erstellen
cp .env.example .env

# WICHTIG: .env anpassen
nano .env

# Anpassen:
# JWT_SECRET=<random-secret>
# DB_PASSWORD=<neues-passwort>
# ENCRYPTION_MASTER_KEY=<random-key>
```

**Zufällige Keys generieren (Linux):**
```bash
# JWT_SECRET (im Editor einfügen)
openssl rand -base64 32

# ENCRYPTION_MASTER_KEY
openssl rand -base64 32
```

### 4c. Deploy-Skript ausführen
```bash
bash scripts/deploy.sh
```

Das Skript wird:
- ✅ Docker Images bauen
- ✅ Container starten
- ✅ Datenbank initialisieren
- ✅ Admin-Benutzer erstellen
- ✅ Services überprüfen

---

## Schritt 5: Zugriff testen

### 5a. Container IP prüfen
```bash
# Im Container
ip addr show eth0

# Beispiel: 192.168.1.50
```

### 5b. Frontend öffnen
```
http://192.168.1.50
```

### 5c. Login
```
Username: admin
Password: Admin@123
```

---

## ⚠️ Häufige Probleme

### Problem: "Connection refused"
**Lösung:**
```bash
# Überprüfe ob Container läuft
pct list | grep inframanager

# Neu starten
pct restart 100

# Logs überprüfen
docker-compose logs -f
```

### Problem: "Permission denied" in WinSCP
**Lösung:**
- Überprüfe Benutzername und Passwort
- Stelle sicher root-Benutzer SSH erlaubt ist
- Check: `nano /etc/ssh/sshd_config` → `PermitRootLogin yes`

### Problem: Projekt-Dateien nicht angekommen
**Lösung:**
```bash
# Im Container überprüfen
ls -la /root/

# Falls leer, nochmal WinSCP verwenden
# Oder per SCP:
scp -r C:\Users\nobbi\Documents\verwaltung\infrastruktur-manager root@<container-ip>:/root/
```

### Problem: Docker fehlt
**Lösung:**
```bash
# Im Container
curl -fsSL https://get.docker.com | sh
usermod -aG docker root
systemctl enable docker
systemctl start docker
```

---

## 🚀 Schnellanleitung (TL;DR)

```bash
# 1. AUF PROXMOX HOST
bash create-lxc-container.sh

# 2. NOTIERE DIE CONTAINER-IP (z.B. 192.168.1.50)

# 3. IN WINSCP
# Verbindung: root@192.168.1.50
# Transfer: C:\Users\...\infrastruktur-manager → /root/

# 4. IN CONTAINER (SSH oder pct enter 100)
cd /root/infrastruktur-manager
cp .env.example .env
nano .env          # JWT_SECRET und Master Key anpassen
bash scripts/deploy.sh

# 5. ZUGRIFF
# Browser: http://192.168.1.50
# Login: admin / Admin@123
```

---

## 📞 Weitere Hilfe

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

---

**Fertig!** Die Anwendung sollte jetzt laufen. 🎉
