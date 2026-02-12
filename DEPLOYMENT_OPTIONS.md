# 🚀 Infrastruktur-Manager - Deployment Optionen

## Schnellübersicht

Du hast **3 Optionen** um deine Infrastruktur-Manager Anwendung auf Proxmox zu deployen:

| Option | Methode | Schwierigkeit | Docker | Empfohlen |
|--------|---------|--------------|--------|-----------|
| **Option A** | KVM VM (Cloud-Init) | ⭐ Einfach | ✅ Perfekt | ✅ JA |
| **Option B** | LXC Container | ⭐⭐ Mittel | ⚠️ Probleme | ❌ NEIN |
| **Option C** | Bare Proxmox Host | ⭐⭐⭐ Komplex | ✅ OK | ❌ NEIN |

---

## 🎯 Option A: KVM VM (EMPFOHLEN)

### Was passiert?
```
Proxmox Host
    ↓
    └─→ KVM VM (echte Hardware-Virtualisierung)
        ├─→ Ubuntu 22.04
        ├─→ Docker + Docker Compose
        ├─→ Node.js 20.x
        └─→ SSH Server
```

### Vorteile
- ✅ **Docker läuft perfekt** - keine Overlay-FS Probleme
- ✅ Vollständige Kernel-Isolation
- ✅ Wie echte Server behandeln
- ✅ Skalierbar auf Production
- ✅ Cloud-Init automatisiert alles

### Nachteile
- ⚠️ 5-10% Performance Overhead
- ⚠️ 50GB Disk statt 30GB
- ⚠️ 2-3 Min. Boot-Zeit

### Wann verwenden?
- Du möchtest Docker-Images bauen
- Du brauchst Production-Umgebung
- Du hast genug Proxmox Ressourcen

### Anleitung
**Schritt 1: VM erstellen**
```bash
ssh root@<proxmox-ip>
cd /root/infrastruktur-manager
bash scripts/create-kvm-vm.sh
```
→ Siehe: [KVM_DEPLOYMENT_GUIDE.md](KVM_DEPLOYMENT_GUIDE.md)

---

## ⚠️ Option B: LXC Container

### Was passiert?
```
Proxmox Host
    ↓
    └─→ LXC Container (OS-Virtualisierung)
        ├─→ Ubuntu 22.04
        ├─→ Docker + Docker Compose
        ├─→ Node.js 20.x
        └─→ SSH Server
```

### Vorteile
- ✅ **Minimal overhead** - schneller als KVM
- ✅ Weniger Disk-Speicher (30GB)
- ✅ Schneller Boot (~30 Sekunden)
- ✅ Gut für nicht-Docker Apps

### Nachteile
- ❌ **Docker hat Overlay-FS Probleme**
- ❌ Kernel-Limitierungen
- ❌ Docker-Builds können fehlschlagen
- ⚠️ Weniger Isolation

### Wann verwenden?
- Du willst vorgefertigte Docker-Images deployen (nur run, kein build)
- Du hast wenig Proxmox Ressourcen
- Du kannst Docker-Probleme debuggen

### ⚠️ WARNUNG
Falls Docker-Builds fehlschlagen mit:
```
failed to mount /tmp/containerd-mount: permission denied
```
→ Wechsle zu **Option A (KVM VM)**

### Anleitung
**Schritt 1: Container erstellen**
```bash
ssh root@<proxmox-ip>
cd /root/infrastruktur-manager
bash scripts/create-lxc-container.sh
```
→ Siehe: [WINSCP_TRANSFER_GUIDE.md](WINSCP_TRANSFER_GUIDE.md) + [scripts/README.md](scripts/README.md)

---

## 🖥️ Option C: Direkt auf Proxmox Host

### Was passiert?
```
Proxmox Host (direkt)
    ├─→ Docker + Docker Compose
    ├─→ Node.js
    └─→ SSH Server
```

### Vorteile
- ✅ Keine Virtualisierung
- ✅ Bestes Performance
- ✅ Einfach zu debuggen

### Nachteile
- ❌ **Nicht empfohlen** - Proxmox Host wird belastet
- ❌ Keine Isolation
- ❌ Kann Proxmox destabilisieren
- ❌ Production nicht geeignet

### Wann verwenden?
- **Nie in Production!**
- Nur für schnelle Tests/Entwicklung
- Wenn du Proxmox nicht brauchst für VMs

---

## 📋 Entscheidungsbaum

```
START
  ↓
Brauchst du Docker-Builds?
  ├─ JA → Nutze OPTION A (KVM VM) ✅
  │       (→ KVM_DEPLOYMENT_GUIDE.md)
  │
  └─ NEIN
      ↓
      Hast du viel Proxmox Ressourcen?
        ├─ JA → OPTION A ist trotzdem besser ✅
        │
        └─ NEIN
            ↓
            Du brauchst OPTION B (LXC)
            ABER: Nur vorgefertigte Images deployen!
```

---

## 🎯 Für die meisten: Option A (KVM VM)

### Kurz-Anleitung (5 Schritte)

**1. VM erstellen (auf Proxmox):**
```bash
ssh root@<proxmox-ip>
cd /root/infrastruktur-manager
bash scripts/create-kvm-vm.sh
# → Warte 2-3 Min. für Cloud-Init
```

**2. IP notieren:**
```
VM IP: 192.168.1.100 (beispiel)
```

**3. Projekt mit WinSCP transferieren:**
- Host: `ubuntu@192.168.1.100`
- From: `C:\Users\...\infrastruktur-manager`
- To: `/home/ubuntu/`

**4. SSH in VM:**
```bash
ssh ubuntu@192.168.1.100
cd infrastruktur-manager
cp .env.example .env
nano .env  # Überprüfe Variablen
```

**5. Deployen:**
```bash
bash scripts/deploy.sh
```

**Fertig!** App läuft auf: `http://192.168.1.100`

---

## 🔍 Vergleich im Detail

### Docker Build-Performance
| Methode | Build-Zeit | Erfolgsrate |
|---------|-----------|------------|
| KVM VM | ~2 Min | ✅ 99% |
| LXC Container | ❌ Fehler | ❌ 10% |
| Bare Host | ~1 Min | ✅ 100% |

### Isolation & Sicherheit
| Methode | Isolation | Sicherheit |
|---------|----------|-----------|
| KVM VM | ✅✅✅ Vollständig | ✅✅✅ Optimal |
| LXC Container | ⚠️ Kernel-Ebene | ✅✅ Gut |
| Bare Host | ❌ Keine | ❌ Riskant |

### Ressourcen-Verbrauch
| Methode | Min. RAM | Min. Disk | Boot-Zeit |
|---------|---------|----------|-----------|
| KVM VM | 4GB | 50GB | 2-3 Min |
| LXC Container | 2GB | 30GB | 30 Sec |
| Bare Host | 4GB | 30GB | N/A |

---

## ✅ Checkliste nach Wahl

### Wenn du Option A (KVM) wählst:
- [ ] Genug Proxmox Ressourcen? (4 CPU, 4GB RAM, 50GB Disk)
- [ ] Hast du SSH-Key oder Passwort für Ubuntu-User?
- [ ] Kannst du WinSCP verwenden?
- [ ] Hast du .env.example richtig konfiguriert?

### Wenn du Option B (LXC) wählst:
- [ ] Verstehst du dass Docker-Builds möglicherweise fehlschlagen?
- [ ] Hast du einen Plan B (KVM) falls Probleme entstehen?
- [ ] Willst du nur vorgefertigte Images deployen?

### Wenn du Option C (Bare Host) wählst:
- [ ] Ist das nur für Tests?
- [ ] Hast du ein Backup deines Proxmox?
- [ ] Weißt du wie man Docker deinstalliert falls nötig?

---

## 📚 Dokumentation

| Dokument | Zweck |
|----------|-------|
| **KVM_DEPLOYMENT_GUIDE.md** | Vollständige Anleitung für Option A |
| **WINSCP_TRANSFER_GUIDE.md** | Projekt-Transfer mit WinSCP |
| **SSH_TROUBLESHOOTING.md** | SSH-Probleme beheben |
| **scripts/README.md** | Script-Dokumentation |
| **DEPLOYMENT_OPTIONS.md** | Diese Datei |

---

## 🚀 Nächster Schritt

**Wähle deine Methode:**

```bash
# Option A: KVM VM (EMPFOHLEN)
ssh root@<proxmox-ip>
cd /root/infrastruktur-manager
bash scripts/create-kvm-vm.sh
# → Siehe: KVM_DEPLOYMENT_GUIDE.md

# Option B: LXC Container (nicht empfohlen)
bash scripts/create-lxc-container.sh
# → Siehe: WINSCP_TRANSFER_GUIDE.md
```

---

## 💬 Häufige Fragen

**Q: KVM oder LXC?**
A: KVM! Viel zuverlässiger für Docker.

**Q: Kann ich später von LXC zu KVM migrieren?**
A: Ja, aber musst Projekte neu transferieren. Besser direkt KVM nehmen.

**Q: Was wenn KVM zu langsam ist?**
A: Erhöhe Cores/RAM oder nutze Bare Host.

**Q: Brauche ich SSH-Key?**
A: Nein, Passwort geht auch (aber SSH-Key ist sicherer).

**Q: Kann ich mehrere VMs erstellen?**
A: Ja! Script wählt automatisch nächste ID.

---

**Bereit zu starten?** → Wähle Option A oben! 🚀

