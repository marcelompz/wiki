# OrderFlow - Guía de Deploy

Esta guía documenta el proceso de deploy para staging y producción.

---

## 📋 Tabla de Contenidos

1. [Arquitectura](#arquitectura)
2. [Ambientes](#ambientes)
3. [Deploy Local](#deploy-local)
4. [Deploy a Producción (Hetzner)](#deploy-a-producción-hetzner)
5. [Post-Deploy](#post-deploy)
6. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│              Hetzner VPS / Cloudflare (SSL/TLS)              │
│                    Traefik v3.4 Reverse Proxy                │
│                    Port: 80/443                              │
└──────┬──────────────────────────────────────┬────────────────┘
       │                                      │
       ▼                                      ▼
┌──────────────────┐               ┌──────────────────┐
│   OrderFlow      │               │   Odoo Adapter   │
│   Frontend:3011  │               │   Port:3005      │
│   Backend:3010   │               │                  │
│   DB:5432        │               │                  │
└──────────────────┘               └──────────────────┘
```

**Infraestructura:**
- **Proxy:** Traefik v3.4 (SSL automático, DNS dinámico, load balancing)
- **Servidor:** Hetzner VPS `178.105.226.175`
- **Base de datos:** PostgreSQL (shared/dedicated por tenant)
- **Backend:** NestJS + Prisma ORM
- **Frontend:** React + Vite + Ant Design + Refine
- **Contenedores:** Docker Compose

---

## 🌍 Ambientes

| Ambiente | Branch | URL | Variables | Propósito |
|----------|--------|-----|-----------|-----------|
| **Desarrollo** | N/A | `http://localhost:3011` | `.env` | Desarrollo local |
| **Producción** | `main` | `https://pesallaccia.com` / `https://provecchio.com` | `.env.production` | Producción real |
| **Tenant Dedicado** | `main` | `https://orderflow-company.pesallaccia.com` | `ORDERFLOW_COMPANY_DB_URL` | Tenant enterprise OrderFlow |

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

## 🚀 Deploy a Producción (Hetzner)

### Variables de Entorno Requeridas

```bash
# Backend (.env.production)
DATABASE_URL=postgresql://orderflow:orderflow@postgres:5432/orderflow_db
ORDERFLOW_COMPANY_DB_URL=postgresql://orderflow_company:ORDERFLOW_COMPANY_PASSWORD@postgres:5432/orderflow_company_db
PORT=3010
FRONTEND_URL=http://localhost:3011
NODE_ENV=production

# Frontend (.env.production)
VITE_API_URL=/api
VITE_ROOT_DOMAIN=pesallaccia.com
VITE_SYSTEM_SUBDOMAINS=orderflow,www,staging
NODE_ENV=production
```

### Script Automático

```bash
./scripts/deploy-production.sh production
```

### Proceso Manual

```bash
# 1. Checkout main y pull
git checkout main
git pull origin main

# 2. Build frontend
cd frontend
npm install
npm run build

# 3. Build y deploy en Hetzner
cd ..
./scripts/deploy-production.sh production

# 4. Verificar contenedores
ssh hetzner-orderflow "docker ps"
ssh hetzner-orderflow "docker logs --tail 50 orderflow-backend-prod"
ssh hetzner-orderflow "docker logs --tail 50 orderflow-frontend-prod"
```

### Post-Deploy

1. **Verificar health checks:**
   ```bash
   curl http://pesallaccia.com/api/v1/health
   curl https://provecchio.com/api/v1/health
   ```

2. **Verificar Traefik:**
   ```bash
   ssh hetzner-orderflow "docker logs traefik --tail 20"
   ```

3. **Verificar frontend:**
   ```bash
   curl -I https://pesallaccia.com
   curl -I https://provecchio.com
   ```

---

## 🔧 Troubleshooting

### Frontend no carga

**Síntoma:** Error 502 o WebSocket errors

**Solución:**
```bash
# Verificar build
ssh hetzner-orderflow "docker exec orderflow-frontend-prod ls -la /app/dist"

# Rebuild frontend
ssh hetzner-orderflow "docker compose -f /srv/orderflow/docker-compose.prod.yml up -d --force-recreate frontend"
```

### Backend no conecta a DB

**Síntoma:** Error de conexión a PostgreSQL

**Solución:**
```bash
# Verificar DB
ssh hetzner-orderflow "docker exec orderflow-db psql -U orderflow -c 'SELECT 1;'"

# Verificar logs del backend
ssh hetzner-orderflow "docker logs --tail 100 orderflow-backend-prod"
```

### Traefik Error 521/522

**Causa:** Cloudflare no puede conectar al servidor

**Solución:**
1. Verificar puerto 80/443 abierto en router
2. Verificar Traefik escuchando: `ssh hetzner-orderflow "docker logs traefik --tail 50"`
3. Verificar Cloudflare SSL → Full mode
4. Verificar DNS proxied en Cloudflare

### Migraciones Fallidas

**Síntoma:** Backend inicia pero migrations pendientes

**Solución:**
```bash
# Aplicar migraciones manualmente
ssh hetzner-orderflow "cd /srv/orderflow/backend && docker compose -f ../docker-compose.prod.yml --env-file ../.env exec backend npx prisma migrate deploy"

# O sincronizar esquema directamente
ssh hetzner-orderflow "cd /srv/orderflow/backend && docker compose -f ../docker-compose.prod.yml --env-file ../.env exec backend npx prisma db push --accept-data-loss"
```

---

## 📊 Características Principales

### PWA (Progressive Web App) v1.5.1
- **Instalable** desde Chrome/Edge/Safari (iOS y Android)
- **Service Worker** con cacheo de assets estáticos y fuentes Google
- **Manifest** con nombre, íconos, tema y display standalone
- **Meta tags iOS:** `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`
- **Botón de instalación:** aparece en el header cuando el browser soporta `beforeinstallprompt`

### Contactos Unificados (v1.5.1)
- **Menú único** "Contactos" reemplaza "Usuarios" y "Clientes"
- **Roles múltiples:** Cliente, Proveedor, Usuario, Empleado, Lead
- **Persona o Empresa:** `isCompany` flag con `parentId` para contactos vinculados
- **Campos de empleado:** `jobTitle`, `department`, `employeeNumber`, `hireDate`
- **API unificada:** `/api/v1/contacts` con filtrado por tipo y rol
- **Compatibilidad legacy:** Endpoints `/api/v1/customers` y `/api/v1/users` mantenidos

### Modelo de Suscripción SaaS
- **Planes:** `basic`, `professional`, `enterprise`
- **Suscripciones** por tenant con fecha de inicio/fin
- **Facturas** generadas automáticamente
- **Addons** opcionales por suscripción
- **Webhooks** para Stripe/Mercado Pago

### Multi-Tenancy
- **Shared DB:** Mismo esquema, aislamiento por `tenantId`
- **Dedicated DB:** Tenant `orderflow-company` con BD propia
- **Aislamiento:** Row-level security + connection pooling

### Módulos Activos
- **Core:** Products, Orders, Customers, Bookings, Quotations
- **CRM:** Contacts Unificados (Odoo-style)
- **Billing:** Subscription Plans, Subscriptions, Invoices
- **Integrations:** Odoo, Tango ERP, FacturaSend (SIFEN)
- **WhatsApp:** Catálogo, Checkout, Webhooks
- **Loyalty:** Programa de fidelización
- **POS:** Punto de venta
- **KDS:** Cocina (Kitchen Display)
- **Giveaways:** Sorteos
- **BioLinks:** Linktree-style
- **Homepage Builder:** Constructor visual de landing

---

## 🔒 Security Checklist

- [x] SSL/TLS activado (Cloudflare + Traefik)
- [x] Puertos cerrados excepto 80/443
- [x] Variables de entorno no commiteadas
- [x] Backups automáticos configurados
- [x] Logs monitoreados
- [x] API Key authentication por tenant
- [x] JWT con expiración 24h
- [x] Row-level security multi-tenant

---

## 📝 Notas

- **NO usar Nginx:** Traefik administra SSL y subdominios dinámicos
- **NO eliminar `tenantId`:** Ambos modos (community/enterprise) dependen de él
- **NO instanciar `PrismaClient` directamente:** Usar `this.prisma` o `@TenantPrisma()`
- **NO condicionar lógica por `ORDERFLOW_MODE`:** La diferencia es responsabilidad de guards/middleware

---

**Última actualización:** 2026-08-01  
**Versión:** 1.5.1  
**Autor:** OrderFlow Team
