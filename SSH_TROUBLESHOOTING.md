# 🔧 SSH Zugriff - Troubleshooting

## Problem: WinSCP / SSH Verbindung funktioniert nicht

### Schritt 1: Diagnose (auf Proxmox Host)

```bash
# Container ID prüfen (z.B. 102)
CONTAINER_ID=102

# Status überprüfen
pct list | grep $CONTAINER_ID

# Sollte "RUNNING" zeigen
```

### Schritt 2: Direkten Zugriff testen

```bash
# Auf Proxmox Host
pct enter 102

# Du solltest jetzt im Container sein (Kommando-Prompt)
```

**Falls `pct enter` funktioniert → weitermachen mit Schritt 3**

**Falls `pct enter` NICHT funktioniert → Container ist down, starten:**
```bash
pct start 102
sleep 3
pct enter 102
```

---

## Schritt 3: SSH konfigurieren (im Container oder via pct exec)

### Option A: Direkt im Container (falls du `pct enter` nutzen kannst)

```bash
# Im Container
bash /root/infrastruktur-manager/scripts/fix-ssh-access.sh
```

### Option B: Via pct exec (von Proxmox Host aus)

```bash
# Auf Proxmox Host
pct exec 102 -- bash /root/infrastruktur-manager/scripts/fix-ssh-access.sh
```

### Option C: Manuell im Container

```bash
# Im Container (via pct enter 102)

# 1. SSH installieren (falls nicht vorhanden)
apt-get update
apt-get install -y openssh-server

# 2. SSH konfigurieren
cat >> /etc/ssh/sshd_config << 'EOF'
PermitRootLogin yes
PasswordAuthentication yes
EOF

# 3. SSH neu starten
systemctl restart ssh

# 4. IP-Adresse anzeigen
ip addr show eth0
```

---

## Schritt 4: IP-Adresse prüfen

```bash
# Im Container oder per pct exec
pct exec 102 -- ip addr show eth0

# Suche nach einer Zeile wie:
#   inet 192.168.x.x/24 ...
```

**Falls KEINE IP → Netzwerk-Fehler!**

```bash
# DHCP neu starten
pct exec 102 -- dhclient eth0

# Warten
sleep 3

# Nochmal prüfen
pct exec 102 -- ip addr show eth0
```

---

## Schritt 5: WinSCP Verbindung testen

### Nach SSH-Fix:

**WinSCP Einstellungen:**
```
Protocol:      SSH (SFTP)
Hostname:      <container-ip>      (z.B. 192.168.1.50)
Port:          22
Username:      root
Password:      <dein passwort>
```

**Test-Schritte:**
1. Verbindung erstellen (Save)
2. "Login" klicken
3. Bestätigung wenn Fingerprint abgefragt wird
4. Sollte verbunden sein

---

## ⚠️ Häufige Fehler

### "Connection refused"
- SSH läuft nicht im Container
- → Ausführen: `pct exec 102 -- systemctl restart ssh`

### "Connection timed out"
- Container hat keine IP
- → Ausführen: `pct exec 102 -- dhclient eth0`
- Oder: Proxy Host Netzwerk überprüfen

### "Permission denied"
- Passwort falsch
- PermitRootLogin nicht aktiviert
- → Skript ausführen: `fix-ssh-access.sh`

### "Port 22 not open"
- Firewall blockiert?
- SSH läuft nicht
- → Von Host direkt prüfen: `pct exec 102 -- netstat -tuln | grep 22`

---

## Schnelle Diagnose (Komplettes Paket)

```bash
# Auf Proxmox Host (alle 5 Befehle kopieren und ausführen)

CONTAINER_ID=102

echo "1. Container Status:"
pct list | grep $CONTAINER_ID

echo -e "\n2. IP-Adresse:"
pct exec $CONTAINER_ID -- ip addr show eth0 | grep "inet "

echo -e "\n3. SSH Status:"
pct exec $CONTAINER_ID -- systemctl status ssh | head -5

echo -e "\n4. SSH Port Listening:"
pct exec $CONTAINER_ID -- netstat -tuln | grep 22

echo -e "\n5. SSH Config:"
pct exec $CONTAINER_ID -- grep -E "^(PermitRootLogin|PasswordAuthentication)" /etc/ssh/sshd_config
```

---

## Wenn alles andere fehlschlägt

### Plan B: Projekt per WinSCP nach Container-Start transferieren

Falls SSH immer noch nicht geht, kannst du alternativ:

1. **In Container kopieren via Proxmox:**
   ```bash
   # Auf Proxmox Host
   # (benötigt Zugriff auf die Container-Root)

   # Projekt in Container kopieren
   cp -r /root/infrastruktur-manager /var/lib/lxc/102/rootfs/root/
   ```

2. **Oder direkt mit `tar` + `pct exec`:**
   ```bash
   # Auf Proxmox Host, im Projekt-Verzeichnis
   tar czf - . | pct exec 102 -- tar xzf - -C /root/infrastruktur-manager
   ```

---

## 🆘 Ultra-Fallback (wenn Container nicht responsiv)

```bash
# Auf Proxmox Host
CONTAINER_ID=102

# Container neu starten
pct reboot $CONTAINER_ID
sleep 5

# Oder neu erstellen
pct destroy $CONTAINER_ID
bash create-lxc-container.sh 102
```

---

## Lösung Checkliste

- [ ] Container läuft (`pct list`)
- [ ] SSH installiert (`apt-get install openssh-server`)
- [ ] SSH konfiguriert (`PermitRootLogin yes`)
- [ ] SSH läuft (`systemctl restart ssh`)
- [ ] Container hat IP (`ip addr show eth0`)
- [ ] Port 22 offen (`netstat -tuln | grep 22`)
- [ ] WinSCP Test-Verbindung erfolgreich

Wenn alle Häkchen gesetzt sind → WinSCP sollte funktionieren! ✅
