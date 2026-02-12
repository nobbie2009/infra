# 🚀 InfraManager Deployment Guide

This guide describes how to deploy the **InfraManager** in a production environment using Docker Compose.

## Prerequisites

- **Docker** & **Docker Compose** installed on the host.
- A **Proxmox** user with API token permissions (for VM management).
- A domain name (optional, if using SSL).

## 1. Installation

### 1.1 Clone Repository
Clone the repository to your server:
```bash
git clone https://github.com/your-repo/infrastruktur-manager.git
cd infrastruktur-manager
```

### 1.2 Configuration
Copy the example environment file and configure it:
```bash
cp .env.example .env
nano .env
```
**Critical Settings:**
- `JWT_SECRET`: Set a strong random string.
- `ENCRYPTION_MASTER_KEY`: Convert a 32-byte random key to Base64.
- `DB_PASSWORD`: Set a strong database password.

### 1.3 SSL Certificates (Optional)
Place your SSL certificates in `nginx/ssl/`:
- `cert.pem`
- `key.pem`

If you are just testing locally or don't have SSL yet, you can generate a self-signed certificate:
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

## 2. Starting the Application

Use the provided script to build and start the application in production mode:

```bash
chmod +x scripts/*.sh
./scripts/start.sh
```

This will:
1. Build optimized Docker images.
2. Start PostgreSQL, Backend, Frontend, and Nginx.
3. Configure auto-restart policies.

**Access:**
- **Frontend:** http://your-server-ip (or https://...)
- **API:** http://your-server-ip/api

## 3. Management

### Stop Application
```bash
./scripts/stop.sh
```

### View Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Database Backup
Run the backup script to dump the PostgreSQL database:
```bash
./scripts/backup.sh
```
Backups are saved in the `./backups` directory. You can set up a cron job to run this daily.

## 4. Updates

To update the application to the latest version:

```bash
git pull
./scripts/start.sh
```
(The start script automatically rebuilds the images).

## 5. Troubleshooting

**Database Connection Failed:**
- Check if `.env` password matches.
- Ensure the `postgres` container is healthy (`docker ps`).

**Nginx 502 Bad Gateway:**
- The backend might still be starting. Wait a few seconds.
- Check backend logs: `docker logs inframanager-backend`.
