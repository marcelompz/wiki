# OrderFlow - Guía de Deploy

Esta guía documenta el proceso de deploy para staging y producción.

---

## 📋 Tabla de Contenidos

1. [Arquitectura](#arquitectura)
2. [Ambientes](#ambientes)
3. [Deploy Local](#deploy-local)
4. [Deploy a Staging](#deploy-a-staging)
5. [Deploy a Producción](#deploy-a-producción)
6. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloudflare (SSL/TLS)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS (443)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                     │
│                    Port: 80                                  │
└──────┬──────────────────────────────────────┬───────────────┘
       │                                      │
       ▼                                      ▼
┌──────────────────┐              ┌──────────────────┐
│   OrderFlow      │              │      Odoo        │
│   Frontend:3011  │              │   Adapter:3005   │
│   Backend:3010   │              │                  │
│   DB:5433        │              │                  │
└──────────────────┘              └──────────────────┘
```

---

## 🌍 Ambientes

| Ambiente | Branch | URL | Variables | Propósito |
|----------|--------|-----|-----------|-----------|
| **Desarrollo** | N/A | `http://localhost:3011` | `.env` | Desarrollo local |
| **Staging** | `staging` | `http://staging.orderflow.com` | `.env.staging` | Testing pre-producción |
| **Producción** | `main` | `https://provecchio.com` | `.env.production` | Producción real |

---

## 💻 Deploy Local

### Requisitos

- Node.js 22+
- Docker + Docker Compose
- Git

### Pasos

```bash
# 1. Clonar repo
git clone https://github.com/marcelompz/orderflow.git
cd orderflow

# 2. Instalar dependencias
cd frontend && npm install
cd ../backend && npm install

# 3. Configurar variables
cp frontend/.env.example frontend/.env

# 4. Iniciar servicios
cd ..
docker compose up -d

# 5. Acceder
http://localhost:3011
```

---

## 🚀 Deploy a Staging

### Script Automático

```bash
./scripts/deploy-staging.sh
```

### Manual

```bash
# 1. Checkout staging
git checkout staging
git pull origin staging

# 2. Build frontend
cd frontend
npm install
npm run build:staging

# 3. Reiniciar servicios
cd ..
docker compose down
docker compose up -d

# 4. Verificar
docker ps
docker logs orderflow_frontend
```

---

## 🎯 Deploy a Producción

### Script Automático

```bash
./scripts/deploy-production.sh
```

### Manual

```bash
# 1. Checkout main
git checkout main
git pull origin main

# 2. Build frontend
cd frontend
npm install
npm run build:production

# 3. Reiniciar servicios
cd ..
docker compose down
docker compose up -d

# 4. Verificar
docker ps
curl -I http://localhost:3011
```

### Post-Deploy

1. **Verificar logs:**
   ```bash
   docker logs orderflow_frontend --tail 50
   docker logs orderflow_backend --tail 50
   ```

2. **Testear endpoints:**
   ```bash
   curl http://localhost:3011/api/v1/health
   curl http://localhost:3010/api/v1/health
   ```

3. **Verificar Cloudflare:**
   - SSL/TLS → Full
   - DNS → Proxied (🟠)

---

## 🔧 Troubleshooting

### Frontend no carga

**Síntoma:** Error 502 o WebSocket errors

**Solución:**
```bash
# Verificar build
docker exec orderflow_frontend ls -la /app/dist

# Rebuild
docker compose restart frontend
```

### Backend no conecta a DB

**Síntoma:** Error de conexión a PostgreSQL

**Solución:**
```bash
# Verificar DB
docker exec orderflow_db psql -U orderflow -c "SELECT 1;"

# Rebuild DB container
docker compose restart postgres
```

### Cloudflare Error 521/522

**Causa:** Cloudflare no puede conectar al servidor

**Solución:**
1. Verificar puerto 80 abierto en router
2. Verificar Traefik escuchando: `ss -tlnp | grep :80`
3. Verificar Cloudflare SSL → Full mode

---

## 📊 Variables de Entorno

### Frontend

| Variable | Staging | Producción |
|----------|---------|------------|
| `NODE_ENV` | `staging` | `production` |
| `VITE_API_URL` | `http://localhost:3010/api` | `/api` |
| `VITE_DEBUG` | `true` | `false` |

### Backend

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://orderflow:orderflow@postgres:5432/orderflow_db` |
| `PORT` | `3010` |
| `FRONTEND_URL` | `http://localhost:3011` |

---

## 🔒 Security Checklist

- [ ] SSL/TLS activado (Cloudflare)
- [ ] Puertos cerrados excepto 80/443
- [ ] Variables de entorno no commiteadas
- [ ] Backups automáticos configurados
- [ ] Logs monitoreados

---

**Última actualización:** 2026-07-04
**Autor:** OrderFlow Team
