# 🏗️ SaaS Common Library - Documentación Técnica

> **Librería común de configuraciones y mejores prácticas para proyectos SaaS multi-tenant**

**Última actualización:** 2026-07-06  
**Autor:** marcelompz  
**Email:** marcelo@pesallaccia.com

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura de Referencia](#arquitectura-de-referencia)
3. [Configuraciones Comunes](#configuraciones-comunes)
   - [Nginx + SSL](#nginx--ssl)
   - [Docker Compose](#docker-compose)
   - [Environment Variables](#environment-variables)
4. [Security Best Practices](#security-best-practices)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Database Patterns](#database-patterns)
7. [Monitoring & Health Checks](#monitoring--health-checks)

---

## Visión General

**Propósito:** Centralizar configuraciones compartidas entre todos los proyectos SaaS para:
- ✅ Evitar duplicación de configuraciones
- ✅ Mantener consistencia entre proyectos
- ✅ Facilitar actualizaciones de seguridad
- ✅ Documentar mejores prácticas validadas en producción

**Proyectos que usan esta librería:**

| Proyecto | Path | Staging | Production | Estado |
|----------|------|---------|------------|--------|
| AIEER | `/srv/aieer` | ✅ | ✅ | Operativo |
| OrderFlow | `/srv/orderflow` | ✅ | ✅ | Operativo |
| VitaLog | `/srv/vitalog` | 🔄 | 🔄 | Pendiente |
| Axon | `/srv/axon` | 🔄 | 🔄 | Pendiente |

---

## Arquitectura de Referencia

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare DNS                        │
│              (SSL Full/Strict Mode)                      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS (443)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Nginx Reverse Proxy + SSL                   │
│         - Let's Encrypt (Certbot auto-renew)           │
│         - Security Headers                              │
│         - Rate Limiting                                 │
│         - Cloudflare IP Whitelist                       │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   Frontend     Backend      Database
   (React)     (FastAPI/     (PostgreSQL)
               Node.js)
```

**Principios Clave:**
1. **Tenant Isolation:** API Key-based o subdomain-based
2. **Shared Infrastructure:** Single codebase, multi-tenant DB
3. **Data Segregation:** Row-level security con tenant_id
4. **Scalability:** Horizontal scaling ready

---

## Configuraciones Comunes

### Nginx + SSL

#### Staging Configuration

**Archivo:** `/opt/saas-common/nginx/staging.conf.template`

```nginx
server {
    listen 80;
    server_name staging.mi-proyecto.com;

    # ACME Challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Cloudflare IP ranges
    set_real_ip_from 103.21.24.0/22;
    # ... (ver template completo)
    real_ip_header CF-Connecting-IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3003;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8082;
    }
}
```

#### Production Configuration

**Archivo:** `/opt/saas-common/nginx/production.conf.template`

Similar al staging, pero con:
- HTTPS habilitado (puerto 443)
- HSTS header activado
- Redirect HTTP → HTTPS

#### SSL Certificate Setup

```bash
# Generar certificado inicial
docker compose -f docker-compose.nginx.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email marcelo@pesallaccia.com \
  --agree-tos \
  --no-eff-email \
  -d staging.mi-proyecto.com
```

### Docker Compose

#### Base Services Pattern

**Archivo:** `/opt/saas-common/docker/docker-compose.base.yml`

```yaml
services:
  db:
    image: postgres:15
    container_name: ${PROJECT_NAME}_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
    networks:
      - ${PROJECT_NAME}_net

  backend:
    build: ./backend
    container_name: ${PROJECT_NAME}_backend
    ports:
      - "${BACKEND_PORT}:8000"
    depends_on:
      - db
    environment:
      DATABASE_URL: ${DATABASE_URL}
    networks:
      - ${PROJECT_NAME}_net

  frontend:
    build: ./frontend
    container_name: ${PROJECT_NAME}_frontend
    ports:
      - "${FRONTEND_PORT}:80"
    depends_on:
      - backend
    networks:
      - ${PROJECT_NAME}_net

networks:
  ${PROJECT_NAME}_net:
    driver: bridge
```

#### Nginx + Certbot Pattern

**Archivo:** `/opt/saas-common/docker/docker-compose.nginx.yml`

```yaml
services:
  nginx:
    image: nginx:alpine
    container_name: ${PROJECT_NAME}_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - certbot_data:/var/www/certbot
      - certbot_certs:/etc/letsencrypt
    depends_on:
      - frontend
      - backend
    networks:
      - ${PROJECT_NAME}_net

  certbot:
    image: certbot/certbot
    container_name: ${PROJECT_NAME}_certbot
    restart: unless-stopped
    volumes:
      - certbot_data:/var/www/certbot
      - certbot_certs:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait ${!}; done;'"

volumes:
  certbot_data:
  certbot_certs:
```

### Environment Variables

#### .env.staging Template

```bash
# Project
PROJECT_NAME=aieer
ENVIRONMENT=staging
DEBUG=true

# Database
POSTGRES_USER=user_admin
POSTGRES_PASSWORD=staging-password-change-me
POSTGRES_DB=medicina_db
DATABASE_URL=postgresql://user_admin:password123@db:5432/medicina_db

# Backend
BACKEND_PORT=8082
FRONTEND_URL=http://localhost:3003

# Frontend
FRONTEND_PORT=3003

# SSL
SSL_EMAIL=marcelo@pesallaccia.com
DOMAIN=staging.aieer.pesallaccia.com

# JWT
SECRET_KEY=staging-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### .env.production Template

```bash
# Project
PROJECT_NAME=aieer
ENVIRONMENT=production
DEBUG=false

# Database
POSTGRES_USER=user_admin
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
POSTGRES_DB=medicina_db

# Backend
BACKEND_PORT=8081
FRONTEND_URL=https://aieer.pesallaccia.com

# Frontend
FRONTEND_PORT=3000

# SSL
SSL_EMAIL=marcelo@pesallaccia.com
DOMAIN=aieer.pesallaccia.com

# JWT
SECRET_KEY=production-secret-key-64-chars-minimum
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

---

## Security Best Practices

### Rate Limiting

#### Backend (FastAPI + SlowAPI)

```python
# app/limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute", "1000/hour"]
)

# Critical endpoints
@router.post("/token")
@limiter.limit("5/minute")  # Brute force protection
async def login(): ...

@router.post("/public-enrolment")
@limiter.limit("10/hour")  # Spam protection
async def enrolment(): ...
```

#### Nginx Rate Limiting

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Apply to location
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
}
```

### Security Headers

**Siempre incluir en nginx:**

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Password Hashing

**Backend (bcrypt):**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hash password
hashed = pwd_context.hash("plain_password")

# Verify password
is_valid = pwd_context.verify("plain_password", hashed)
```

**Cost factor:** 12 (balance security/performance)

---

## CI/CD Pipeline

### GitHub Actions Pattern

**Archivo:** `.github/workflows/ci-cd.yml`

```yaml
name: AIEER CI/CD Pipeline

on:
  push:
    branches: ["main", "staging"]

jobs:
  backend-build:
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🐍 Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: 📦 Install dependencies
        working-directory: ./backend
        run: pip install -r requirements.txt

      - name: ✅ Run tests
        working-directory: ./backend
        run: pytest

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🟢 Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: 📦 Install dependencies
        working-directory: ./frontend
        run: npm install --legacy-peer-deps

      - name: 🔨 Build
        working-directory: ./frontend
        run: npm run build

  deploy-staging:
    needs: [backend-build, frontend-build]
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - name: 🚀 Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /srv/aieer/staging
            git fetch origin
            git reset --hard origin/staging
            docker compose down
            docker rm -f aieer_staging_backend aieer_staging_frontend aieer_staging_db 2>/dev/null || true
            docker compose pull
            docker compose up -d

  deploy-production:
    needs: [backend-build, frontend-build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: 🚀 Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /srv/aieer/production
            git fetch origin
            git reset --hard origin/main
            docker compose down
            docker rm -f aieer_production_backend aieer_production_frontend aieer_production_db 2>/dev/null || true
            docker compose pull
            docker compose up -d
```

### Required Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `SSH_HOST` | Server IP | `178.104.193.155` |
| `SSH_USER` | SSH username | `root` |
| `SSH_KEY` | Private key (GitHub → Server) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PROJECT_NAME` | Project identifier | `aieer` |

---

## Database Patterns

### Multi-Tenant Patterns

#### Pattern 1: Shared DB, Row-Level Security

```sql
-- Add tenant_id to all tables
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their tenant's data
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

**Ventajas:**
- ✅ Simple de implementar
- ✅ Un solo pool de conexiones
- ✅ Backups centralizados

**Desventajas:**
- ⚠️ Menor aislamiento que schema-per-tenant

#### Pattern 2: Schema-per-Tenant

```sql
-- Create schema for each tenant
CREATE SCHEMA tenant_abc123;

-- Set search path per request
SET search_path TO tenant_abc123, public;
```

**Ventajas:**
- ✅ Mayor aislamiento
- ✅ Backups por tenant posibles

**Desventajas:**
- ⚠️ Más complejo de mantener
- ⚠️ Múltiples pools de conexión

**Recomendado:** Pattern 1 para la mayoría de casos, Pattern 2 para requisitos estrictos de aislamiento.

### Backup Strategy

#### Daily Automated Backup

```yaml
# docker-compose.yml
services:
  backup:
    image: prodrigestivill/postgres-backup-local
    restart: unless-stopped
    environment:
      - POSTGRES_HOST=db
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - SCHEDULE: "@daily"
      - BACKUP_KEEP_DAYS: "7"
    volumes:
      - ./backups:/backups
    networks:
      - ${PROJECT_NAME}_net
```

#### SFTP Off-site Backup

```python
# scripts/backup_to_sftp.py
import paramiko
from datetime import datetime

def upload_to_sftp(backup_file):
    transport = paramiko.Transport((SFTP_HOST, 22))
    transport.connect(username=SFTP_USER, password=SFTP_PASSWORD)
    sftp = paramiko.SFTPClient.from_transport(transport)
    
    remote_path = f"/backups/{PROJECT_NAME}/{datetime.now():%Y-%m-%d}.sql.gz"
    sftp.put(backup_file, remote_path)
    
    sftp.close()
    transport.close()
```

---

## Monitoring & Health Checks

### Health Check Endpoints

#### Backend

```python
@router.get("/health")
async def health_check():
    """Health check endpoint (no auth required)."""
    return {
        "status": "ok",
        "database": {"status": "ok"},
        "version": "1.0.0"
    }

@router.get("/ready")
async def readiness_check():
    """Readiness check (includes DB connection)."""
    try:
        db = next(get_db())
        db.execute(select(1))
        return {"status": "ok", "ready": True}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB error: {str(e)}")
```

### Uptime Monitoring

**Herramientas recomendadas:**

| Herramienta | Tipo | Costo | Notas |
|-------------|------|-------|-------|
| **Uptime Kuma** | Self-hosted | Gratis | Recomendado para inicio |
| **Better Stack** | Cloud | Gratis (tier free) | 10 checks gratis |
| **Pingdom** | Enterprise | Pago | Enterprise-grade |

**Configuración recomendada:**
- **Endpoint:** `https://staging.mi-proyecto.com/health`
- **Intervalo:** 1 minuto
- **Timeout:** 10 segundos
- **Alertas:** Email + Slack

---

## 📞 Soporte y Contacto

**Primary Contact:** marcelo@pesallaccia.com  
**GitHub:** https://github.com/marcelompz  
**Wiki:** https://marcelompz.github.io/wiki/

---

## 🔄 Changelog

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-07-06 | Creación de documentación técnica | marcelompz |
| 2026-07-06 | Agregados patrones de database multi-tenant | marcelompz |
| 2026-07-06 | Agregados templates de nginx + SSL | marcelompz |
| 2026-07-06 | Agregados patrones de CI/CD | marcelompz |

---

**Próxima revisión:** 2026-10-06 (Quarterly)
