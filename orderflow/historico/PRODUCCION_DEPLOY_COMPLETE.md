# OrderFlow - Deploy a Producción Completado

**Fecha:** 2026-07-05  
**Estado:** ✅ **PRODUCCIÓN OPERATIVA**  
**URL:** https://provecchio.com

---

## 📊 Resumen Ejecutivo

OrderFlow SaaS multi-tenant está 100% operativo en producción con:
- ✅ Frontend React + Vite
- ✅ Backend NestJS + Prisma + PostgreSQL
- ✅ Nginx reverse proxy (host + container)
- ✅ Google OAuth configurado
- ✅ Multi-tenant isolation
- ✅ Giveaways module funcional

---

## 🏗️ Arquitectura de Deploy

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare DNS/SSL                    │
│              (provecchio.com → 38.52.135.227)            │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS 443
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Nginx Host (dimoraserver1)                  │
│              /etc/nginx/sites-enabled/                   │
│              provecchio.com.conf                         │
│         proxy_pass → http://localhost:8080               │
└─────────────────────┬───────────────────────────────────┘
                      │ Puerto 8080
                      ▼
┌─────────────────────────────────────────────────────────┐
│         Nginx Container (orderflow-edge-proxy)           │
│         /srv/orderflow/nginx/nginx.conf                  │
│    proxy_pass → frontend:80, backend:3010                │
└────────────┬──────────────┬─────────────────────────────┘
             │              │
             ▼              ▼
    ┌────────────┐  ┌──────────────┐
    │  Frontend  │  │   Backend    │
    │  :80       │  │   :3010      │
    │  (React)   │  │   (NestJS)   │
    └────────────┘  └──────┬───────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  PostgreSQL │
                    │  :5432      │
                    └─────────────┘
```

---

## 🔧 Configuración del Servidor

### **Host:** `dimoraserver1` (38.52.135.227)

**Ubicación:** `/srv/orderflow/`

**Archivos Clave:**

| Archivo | Propósito |
|---------|-----------|
| `.env.prod` | Credenciales de producción (DB, Redis, JWT) |
| `docker-compose.prod.yml` | Servicios Docker |
| `nginx/nginx.conf` | Configuración interna del container |
| `/etc/nginx/sites-enabled/provecchio.com.conf` | Proxy reverso del host |

### **Variables de Entorno (.env.prod)**

```bash
# Database
POSTGRES_USER=orderflow
POSTGRES_PASSWORD=GwV2UpPdZnCocfdjmOKUfqiX
POSTGRES_DB=orderflow_db

# Redis
REDIS_PASSWORD=dajV4HxcK4C4WinkGxvVssWQ

# JWT
JWT_SECRET=K8tEQLTjPjUOdNKyPNKll8v0
JWT_REFRESH_SECRET=nIkQdRYzso4Z62dH3U6Pw6fC
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

# Master API Key
MASTER_API_KEY=sk_master_dyDtImtW39jXa7RroYjQgkro

# Nginx Proxy
DOMAIN_NAME=provecchio.com
DOMAIN_ALIASES=www.provecchio.com
FRONTEND_HOST=orderflow-frontend-prod
BACKEND_HOST=orderflow-backend-prod
ODOO_HOST=orderflow-odoo-adapter-prod

# Frontend
VITE_API_URL=/api
VITE_APP_NAME=OrderFlow
VITE_GOOGLE_CLIENT_ID=167229821672-gdjkve4kaui9f83cstfpt3c7bc2na3tt.apps.googleusercontent.com
```

---

## 🚀 Comandos de Deploy

### **Deploy Completo (Producción)**

```bash
cd /srv/orderflow
docker compose -f docker-compose.prod.yml --env-file .env.prod down
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### **Reiniciar Servicios Individuales**

```bash
docker restart orderflow-backend-prod
docker restart orderflow-frontend-prod
docker restart orderflow-edge-proxy
```

### **Ver Logs**

```bash
# Backend
docker logs orderflow-backend-prod --tail 50 -f

# Frontend
docker logs orderflow-frontend-prod --tail 50 -f

# Nginx
docker logs orderflow-edge-proxy --tail 50 -f
```

### **Health Check**

```bash
# Backend API
curl http://localhost:8080/api/v1/health

# Frontend
curl http://localhost:8080/

# Via dominio
curl -ks https://provecchio.com/api/v1/health
```

---

## 🔐 Google OAuth Setup

### **1. Google Cloud Console**

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear/select proyecto `provecchio-<id>`
3. Ir a **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins: `https://provecchio.com`
7. Authorized redirect URIs: `https://provecchio.com`
8. Copiar **Client ID**

### **2. Actualizar Frontend**

**Opción A: Environment Variable (Build-time)**

```bash
# En .env.prod
VITE_GOOGLE_CLIENT_ID=167229821672-gdjkve4kaui9f83cstfpt3c7bc2na3tt.apps.googleusercontent.com

# Rebuild frontend
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate frontend
```

**Opción B: Tenant Config (Runtime)**

```bash
cd /srv/orderflow
node scripts/set-tenant-google-client-id.js provecchio-dimora-001 <CLIENT_ID>
```

### **3. Publicar OAuth App**

**Error común:** `access_denied - provecchio.com no ha completado el proceso de verificación`

**Solución:**

1. Ir a [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Completar campos obligatorios:
   - App name: `Provecchio Di Mora`
   - User support email: `marcelo@pesallaccia.com`
   - Developer contact: `marcelo@pesallaccia.com`
   - App domain: `https://provecchio.com`
3. Click **SAVE AND CONTINUE** (3 veces)
4. En Dashboard, click **PUBLISH APP**
5. Confirmar

**Alternativa (Testing):**
- Agregar `marcelompz@gmail.com` en **Test users**

---

## 📁 Estructura de la Base de Datos

### **Tablas Principales**

| Tabla | Propósito |
|-------|-----------|
| `tenants` | Multi-tenant isolation |
| `users` | Usuarios globales (SuperAdmin) |
| `user_tenant_access` | Relación usuario-tenant con roles |
| `contacts` | Contactos por tenant (clientes, proveedores) |
| `products` | Catálogo de productos |
| `giveaways` | Sorteos activos |
| `giveaway_registrations` | Participantes de sorteos |
| `orders` | Pedidos de e-commerce |
| `order_lines` | Detalle de pedidos |

### **Migraciones Pendientes**

Si faltan columnas en una tabla:

```bash
# Ejemplo: giveaways
docker exec -i orderflow-db-prod psql -U orderflow -d orderflow_db << 'EOSQL'
ALTER TABLE giveaways 
ADD COLUMN IF NOT EXISTS "background" TEXT,
ADD COLUMN IF NOT EXISTS "backgroundType" TEXT DEFAULT 'color',
ADD COLUMN IF NOT EXISTS "shareConfig" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "winnerCount" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "drawTime" TEXT;
EOSQL
```

---

## 👥 Usuarios y Accesos

### **SuperAdmin**

```
Email: marcelo@pesallaccia.com
Password: SuperAdmin123!
Role: ADMIN (tenant access) + isSuperAdmin: true
```

### **Crear Nuevo Usuario**

```bash
docker exec orderflow-backend-prod node << 'ENDSCRIPT'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = bcrypt.hashSync('Password123!', 10);
  
  const user = await prisma.User.create({
    data: {
      email: 'usuario@provecchio.com',
      passwordHash: passwordHash,
      name: 'Nombre Usuario',
      isSuperAdmin: false,
    }
  });
  
  await prisma.UserTenantAccess.create({
    data: {
      userId: user.id,
      tenantId: 'provecchio-dimora-001',
      role: 'ADMIN', // ADMIN | MANAGER | SELLER | VIEWER
      active: true,
    }
  });
  
  console.log('Usuario creado:', user.email);
}

main().catch(console.error);
ENDSCRIPT
```

---

## 🔍 Troubleshooting

### **Backend no inicia**

```bash
# Verificar logs
docker logs orderflow-backend-prod --tail 50

# Error común: DATABASE_URL incorrecta
# Solución: Verificar .env.prod

# Error común: Migraciones fallidas
docker exec orderflow-backend-prod npx prisma migrate deploy
```

### **Frontend no carga**

```bash
# Verificar build
docker logs orderflow-frontend-prod --tail 50

# Verificar nginx container
docker logs orderflow-edge-proxy --tail 50

# Verificar nginx host
systemctl status nginx
nginx -t
```

### **502 Bad Gateway**

1. Verificar backend: `curl http://localhost:8080/api/v1/health`
2. Verificar nginx host: `cat /etc/nginx/sites-enabled/provecchio.com.conf`
3. Reiniciar nginx: `systemctl restart nginx`

### **Google OAuth no funciona**

1. Verificar Client ID en frontend build:
   ```bash
   docker exec orderflow-frontend-prod grep -l '167229821672' /usr/share/nginx/html/assets/*.js
   ```
2. Verificar dominio en Google Cloud Console
3. Verificar app publicada (no en testing mode)

---

## 📊 Monitoreo

### **Comandos Útiles**

```bash
# Estado de contenedores
docker ps --filter 'name=orderflow'

# Uso de recursos
docker stats

# Logs en tiempo real
docker logs orderflow-backend-prod -f

# Conexión a DB
docker exec -it orderflow-db-prod psql -U orderflow -d orderflow_db
```

### **Endpoints de Health**

```bash
# Backend
curl https://provecchio.com/api/v1/health

# Expected response:
{"timestamp":"...","services":{"database":{"status":"ok"},"odoo_adapter":{"status":"ok"}},"status":"ok"}
```

---

## 🔄 CI/CD con GitHub Actions

### **Flujo Actual**

1. **Push a `staging`** → Auto deploy a staging
2. **Push a `main`** → Auto deploy a producción
3. **Merge `staging` → `main`** → Deploy production

### **Comandos**

```bash
# Deploy manual (si falla GitHub Actions)
cd /srv/orderflow
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.prod down
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## ✅ Checklist de Deploy

- [ ] `.env.prod` con credenciales reales
- [ ] `docker-compose.prod.yml` con puerto 8080:80
- [ ] Nginx host configurado (`/etc/nginx/sites-enabled/provecchio.com.conf`)
- [ ] Google OAuth Client ID en frontend build
- [ ] OAuth app publicada en Google Cloud Console
- [ ] Usuario SuperAdmin creado
- [ ] Migraciones de DB aplicadas
- [ ] Health check responde 200 OK
- [ ] HTTPS funcionando (Cloudflare SSL)

---

**Última actualización:** 2026-07-05  
**Autor:** OrderFlow Team  
**Estado:** ✅ PRODUCCIÓN OPERATIVA
