# 🚀 Infrastruktur-Manager

A comprehensive infrastructure and project management solution for your homelab.

## Features

- **Infrastructure Management**: Monitor and control VMs on Proxmox
- **Project & Feature Tracking**: Manage projects with GitHub integration
- **Credentials Vault**: Securely store and manage API keys, tokens, and credentials
- **Prompt Generator**: Auto-generate context-aware prompts for AI-assisted development
- **Health Monitoring**: Track service health and receive alerts
- **Admin Dashboard**: Manage users, settings, and system health

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js + TypeORM
- **Database**: PostgreSQL 15
- **Deployment**: Docker-Compose
- **Security**: JWT + AES-256-GCM Encryption

## Quick Start

### Prerequisites
- Docker & Docker-Compose
- Node.js 18+ (for local development)
- PostgreSQL 15

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <repo>
   cd infrastruktur-manager
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Generate Master Key**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   # Copy output to ENCRYPTION_MASTER_KEY in .env
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   # Backend: http://localhost:5000
   # Frontend: http://localhost:3000
   ```

### Docker Deployment

1. **Build and Start**
   ```bash
   docker-compose up -d
   ```

2. **Access Application**
   - Frontend: http://localhost
   - API: http://localhost/api
   - Health: http://localhost/health

3. **View Logs**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

### Database Setup

The application will automatically initialize the database on first run.

For manual initialization:
```bash
docker-compose exec backend npm run typeorm migration:run
```

## Configuration

### Environment Variables

Key variables (see `.env.example` for full list):
- `BACKEND_PORT`: Backend server port (default: 5000)
- `FRONTEND_PORT`: Frontend server port (default: 3000)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`: PostgreSQL config
- `JWT_SECRET`: Secret key for JWT token signing
- `ENCRYPTION_MASTER_KEY`: Base64-encoded 32-byte key for credential encryption

### Master Key Generation

```bash
# Generate a new master key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### System
- `GET /health` - Health check
- `GET /api` - API info

## Project Structure

```
infrastruktur-manager/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & app config
│   │   ├── controllers/      # API controllers
│   │   ├── entities/         # TypeORM entities
│   │   ├── middleware/       # Express middleware
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utilities
│   │   └── index.ts          # Entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── context/          # React context
│   │   ├── lib/              # Utilities & API
│   │   ├── pages/            # Page components
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── .env.example
```

## Development

### Running Backend Only
```bash
cd backend
npm install
npm run dev
```

### Running Frontend Only
```bash
cd frontend
npm install
npm run dev
```

### Building for Production
```bash
npm run build:backend
npm run build:frontend
```

### Testing
```bash
npm run test:backend
npm run test:frontend
```

## Security Considerations

- **Credentials Encryption**: All sensitive data encrypted with AES-256-GCM
- **JWT Authentication**: Token-based API authentication
- **Password Security**: Bcrypt hashing with 12 rounds
- **CORS Protection**: Restricted to configured origins
- **Security Headers**: HSTS, X-Frame-Options, CSP, etc.
- **Rate Limiting**: On auth endpoints (10 req/min for login)
- **Account Locking**: After 5 failed login attempts (30min lockout)

## Deployment on Proxmox

### System Requirements
- 2+ CPU cores
- 2GB+ RAM
- 10GB+ disk space
- Ubuntu 22.04 LTS (recommended)

### Installation Steps

1. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **Clone Repository**
   ```bash
   git clone <repo> /opt/infrastruktur-manager
   cd /opt/infrastruktur-manager
   ```

3. **Configure and Deploy**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   docker-compose up -d
   ```

4. **Verify Installation**
   ```bash
   docker-compose ps
   curl http://localhost/health
   ```

## Troubleshooting

### Database Connection Error
```
PostgreSQL connection refused
```
- Ensure `postgres` service is running: `docker-compose logs postgres`
- Check DB credentials in `.env`
- Verify database is initialized: `docker-compose exec postgres psql -U inframan -d inframanager -c "SELECT 1"`

### Authentication Failure
```
Invalid JWT_SECRET
```
- Ensure `JWT_SECRET` is set in `.env`
- Must be at least 32 characters

### Encryption Key Error
```
Encryption master key not set
```
- Generate key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- Set `ENCRYPTION_MASTER_KEY` in `.env`

### Port Already in Use
```
Port 3000/5000 already in use
```
- Change `BACKEND_PORT` or `FRONTEND_PORT` in `.env`
- Or kill existing process: `lsof -i :3000 | grep node | awk '{print $2}' | xargs kill -9`

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Submit pull request

## License

MIT

## Support

For issues and questions:
1. Check existing issues: https://github.com/YOUR_REPO/issues
2. Create new issue with detailed description
3. Include logs and environment info

## Roadmap

- [ ] Phase 1: Core Infrastructure (Proxmox integration, IP management)
- [ ] Phase 2: Project Management (GitHub integration, Kanban board)
- [ ] Phase 3: Prompt Generator (Auto-context for AI)
- [ ] Phase 4: Monitoring & Admin (Health checks, alerts)
- [ ] Phase 5: Advanced Features (Reporting, analytics)

---

**Last Updated**: 2026-02-12
**Version**: 0.1.0-alpha
