# OrderFlow - Guía de Deploy para Staging

**Última actualización:** 2026-07-15  
**Versión:** v0.4.0  
**Servidor:** Hetzner VPS (`178.105.226.175`)  
**Dominio:** `staging.provecchio.com`

---

## 📊 **Arquitectura de Ambientes**

| Ambiente | Dominio | Propósito | Google OAuth Scopes |
|----------|---------|-----------|---------------------|
| **Producción** | `https://provecchio.com` | Usuarios reales | `profile email` (básicos) |
| **Staging** | `https://staging.provecchio.com` | Testing avanzado | `profile email + birthday + phone` |

---

## 🎯 **Objetivo de Staging**

Staging permite probar **Google People API con scopes avanzados** (cumpleaños, teléfono) sin afectar la producción estable.

**Ventajas:**
- ✅ Probar scopes que requieren verificación de Google
- ✅ Testear nuevas funcionalidades antes de producción
- ✅ Debuggear errores sin impactar usuarios reales
- ✅ Validar cambios de configuración OAuth

---

## 📋 **Pre-requisitos**

1. ✅ **Servidor Hetzner VPS:** `178.105.226.175`
2. ✅ **Acceso SSH:** `root@178.105.226.175`
3. ✅ **Docker instalado** en el VPS
4. ✅ **Git** instalado
5. ✅ **Google Cloud Console** con OAuth Client ID configurado
6. ✅ **Cloudflare** para DNS management

---

## 🚀 **Paso a Paso**

### **Paso 1: Configurar DNS en Cloudflare**

1. Entrar a: https://dash.cloudflare.com/
2. Seleccionar dominio `provecchio.com`
3. Ir a **DNS** → **Add Record**
4. Completar:
   ```
   Type: A
   Name: staging
   Content: 178.105.226.175
   Proxy status: 🟠 Proxied (orange cloud)
   TTL: Auto
   ```
5. Click en **Save**

**Esperar 1-5 minutos** para propagación.

**Verificar:**
```bash
ping staging.provecchio.com
# Debería responder: 178.105.226.175
```

---

### **Paso 2: Configurar Google OAuth para Staging**

1. Entrar a: https://console.cloud.google.com/apis/credentials
2. Editar OAuth Client ID (`488073621789-2tlllcqt1r7si3o2mr35fb128vnpevmk`)
3. Agregar en **Authorized JavaScript origins**:
   ```
   https://provecchio.com
   https://staging.provecchio.com
   ```
4. Agregar en **Authorized redirect URIs**:
   ```
   https://provecchio.com
   https://staging.provecchio.com
   ```
5. Click en **SAVE**

---

### **Paso 3: Crear Rama Staging en GitHub**

```bash
# Localmente
cd /opt/orderflow

# Asegurarse de tener todos los cambios
git status
git add .
git commit -m "feat: Complete production fixes and staging preparation"

# Crear rama staging
git checkout -b staging

# Push a GitHub
git push -u origin staging
```

**En GitHub:**
1. Ir a: https://github.com/marcelompz/orderflow
2. Verificar que la rama `staging` existe
3. Opcional: Crear Pull Request `staging → main` para revisión

---

### **Paso 4: Crear .env.staging**

Crear archivo `.env.staging` en el repositorio:

```bash
# Database
POSTGRES_USER=orderflow
POSTGRES_PASSWORD=<generar_password_seguro>
POSTGRES_DB=orderflow_staging_db

# Redis
REDIS_PASSWORD=<generar_password_seguro>

# JWT
JWT_SECRET=<generar_secret_aleatorio>
JWT_REFRESH_SECRET=<generar_secret_aleatorio>
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

# Master API Key
MASTER_API_KEY=sk_master_staging_<aleatorio>

# Frontend
VITE_API_URL=/api
VITE_APP_NAME=OrderFlow Staging
VITE_GOOGLE_CLIENT_ID=488073621789-2tlllcqt1r7si3o2mr35fb128vnpevmk.apps.googleusercontent.com
VITE_ENVIRONMENT=staging
VITE_DEBUG=true

# Domain
DOMAIN_NAME=staging.provecchio.com
```

**Generar passwords seguros:**
```bash
openssl rand -hex 32
```

---

### **Paso 5: Deploy en Hetzner VPS**

OrderFlow incluye scripts de deploy hardened con backup pre-deploy, migraciones y health checks.

```bash
# Conectar al servidor
ssh root@178.105.226.175

# Crear directorio para staging
mkdir -p /srv/orderflow-staging
cd /srv/orderflow-staging

# Clonar repositorio (rama staging)
git clone https://github.com/marcelompz/orderflow.git .
git checkout staging

# Verificar Docker
docker --version
docker compose version

# Ejecutar deploy hardened
./scripts/deploy-staging.sh

# Verificar estado
docker compose -f docker-compose.prod.yml --env-file .env.staging ps
```

**Nota:** El deploy script automáticamente:
- Crea backup pre-deploy en `./backups/`
- Guarda snapshot de env en `./deploy-artifacts/`
- Aplica migraciones de Prisma
- Ejecuta health checks con polling
- Hace rollback automático si falla migración o health check

---

### **Paso 6: Traefik v3.3 como Proxy Exclusivo**

Traefik reemplaza completamente a NGINX. Se configura como servicio en `docker-compose.prod.yml` con DNS-01 Challenge vía Cloudflare para certificados SSL automáticos. No se instala ni administra ningún proxy en el host.

```bash
# Verificar que Traefik está corriendo
docker ps | grep traefik

# Verificar que Traefik cargó los routers
docker exec orderflow-traefik-prod traefik providers providers

# Verificar entradas DNS
traefik --version
```

### **Paso 6.5: Verificar Routers de Traefik**

Los routers se auto-configuran vía labels en `docker-compose.prod.yml`:

| Servicio | Dominio | Entrada |
|----------|---------|---------|
| Frontend | `staging.provecchio.com` | websecure (HTTPS) |
| Backend API | `api.staging.provecchio.com` | websecure (HTTPS) |
| Odoo Adapter | `odoo-adapter.staging.provecchio.com` | websecure (HTTPS) |
| Odoo Web | `odoo.staging.provecchio.com` | websecure (HTTPS) |

---

### **Paso 7: Actualizar Código para Scopes por Ambiente**

En `frontend/src/pages/GiveawayRegister.tsx`:

```typescript
// Determinar scopes según el ambiente
const googleScopes = import.meta.env.VITE_ENVIRONMENT === 'staging'
  ? 'profile email https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.phonenumbers.read'
  : 'profile email';

const client = (window as any).google.accounts.oauth2.initTokenClient({
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  scope: googleScopes,
  callback: async (tokenResponse: any) => {
    if (tokenResponse && tokenResponse.access_token) {
      // Obtener datos básicos
      const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`);
      const userInfo = await res.json();
      
      // Obtener datos extendidos (solo staging)
      if (import.meta.env.VITE_ENVIRONMENT === 'staging') {
        const peopleRes = await fetch(`https://people.googleapis.com/v1/people/me?personFields=birthdays,phoneNumbers,addresses&access_token=${tokenResponse.access_token}`);
        const peopleData = peopleRes.ok ? await peopleRes.json() : {};
        
        // Extraer teléfono, cumpleaños, dirección
        const phone = peopleData?.phoneNumbers?.[0]?.value || '';
        const birthday = peopleData?.birthdays?.[0]?.date;
        const birthDate = birthday ? `${birthday.day?.toString().padStart(2, '0')}/${(birthday.month || 1).toString().padStart(2, '0')}/${birthday.year || '1990'}` : '';
        
        setForm((prev) => ({
          ...prev,
          name: userInfo.name,
          email: userInfo.email,
          phone: phone,
          birthDate: birthDate,
        }));
      } else {
        // Producción: solo nombre y email
        setForm((prev) => ({
          ...prev,
          name: userInfo.name,
          email: userInfo.email,
        }));
      }
    }
  },
  error_callback: (err: any) => {
    console.error("Google OAuth error:", err);
    message.error("Error al iniciar sesión con Google.");
  }
});

client.requestAccessToken();
```

**Rebuild después del cambio:**
```bash
cd /srv/orderflow-staging
git pull origin staging
docker compose -f docker-compose.prod.yml --env-file .env.staging up -d --build frontend
```

---

## 🧪 **Testing en Staging**

### **Verificar DNS:**
```bash
ping staging.provecchio.com
# Debería: 178.105.226.175
```

### **Verificar Servicios:**
```bash
curl -I https://staging.provecchio.com
curl -s https://staging.provecchio.com/api/v1/health
```

### **Verificar Google OAuth:**

1. Entrar a: https://staging.provecchio.com/sorteo/:id
2. Click en **"Google"**
3. Iniciar sesión
4. **Debería autocompletar:**
   - ✅ Nombre
   - ✅ Email
   - ✅ **Fecha de nacimiento** (staging only)
   - ✅ **Teléfono** (staging only)

### **Comparar con Producción:**

1. Entrar a: https://provecchio.com/sorteo/:id
2. Click en **"Google"**
3. **Debería autocompletar:**
   - ✅ Nombre
   - ✅ Email
   - 📝 Cumpleaños (manual)
   - 📝 Teléfono (manual)

---

## 📊 **Monitoreo y Logs**

### **Verificar Contenedores:**
```bash
cd /srv/orderflow-staging
docker compose -f docker-compose.prod.yml --env-file .env.staging ps
```

### **Ver Logs:**
```bash
# Frontend
docker logs orderflow-frontend-staging --tail 50 -f

# Backend
docker logs orderflow-backend-staging --tail 50 -f

# Traefik/Docker
docker logs orderflow-traefik-prod --tail 50 -f

# Frontend
docker logs orderflow-frontend-staging --tail 50 -f

# Backend
docker logs orderflow-backend-staging --tail 50 -f
```

### **Health Check:**
```bash
# Backend API
curl https://staging.provecchio.com/api/v1/health

# Frontend
curl https://staging.provecchio.com
```

---

## 🔄 **Flujo de Trabajo Recomendado**

### **Desarrollo → Staging:**
```bash
# 1. Desarrollo local
git checkout -b feature/nueva-funcionalidad
# ... hacer cambios ...
git commit -m "feat: nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# 2. PR a staging
# En GitHub: Crear Pull Request feature → staging

# 3. Merge a staging
git checkout staging
git pull origin staging
git merge feature/nueva-funcionalidad
git push origin staging

# 4. Deploy automático (si está configurado CI/CD)
# O manual:
ssh root@178.105.226.175
cd /srv/orderflow-staging
git pull origin staging
docker compose -f docker-compose.prod.yml --env-file .env.staging up -d --build
```

### **Staging → Producción:**
```bash
# 1. Testear en staging (1-2 semanas)
# 2. Si todo funciona, crear PR staging → main
# 3. Merge a main
git checkout main
git pull origin main
git merge staging
git push origin main

# 4. Deploy a producción con rollback info
ssh root@178.105.226.175
cd /srv/orderflow
./scripts/deploy-production.sh production

# En caso de fallo, rollback con:
./scripts/rollback-deploy.sh production deploy-artifacts/rollback-production-YYYYMMDD_HHMMSS.env
```

---

## ⚠️ **Troubleshooting**

### **Error: DNS no resuelve**
```bash
# Verificar en Cloudflare
# Esperar 5-10 minutos para propagación
# Flush DNS local
sudo dscacheutil -flushcache  # macOS
ipconfig /flushdns  # Windows
```

### **Error: Google OAuth access_denied**
1. Verificar que `staging.provecchio.com` está en Authorized JavaScript origins
2. Verificar que el usuario está en Test users (si la app está en testing mode)
3. Esperar 5-10 minutos después de guardar cambios en Google Cloud Console

### **Error: Traefik 502 Bad Gateway**
```bash
# Verificar que los contenedores están corriendo
docker ps

# Verificar logs de Traefik
docker logs orderflow-traefik-prod --tail 50 -f

# Verificar que Traefik puede alcanzar el backend
docker exec orderflow-traefik-prod wget --spider http://127.0.0.1:3010/api/v1/health || exit 1

# Recargar configuración de Traefik
docker exec orderflow-traefik-prod kill -HUP 1

# Verificar routers en Traefik API
docker exec orderflow-traefik-prod wget -qO- http://127.0.0.1:8080/api/http/routers | python3 -m json.tool
```

### **Error: Docker build falla**
```bash
# Limpiar caché de Docker
docker system prune -af

# Rebuild sin caché
docker compose -f docker-compose.prod.yml --env-file .env.staging build --no-cache
```

---

## 📝 **Checklist de Deploy**

- [ ] DNS configurado en Cloudflare (`staging` → `178.105.226.175`)
- [ ] Google OAuth actualizado con `staging.provecchio.com`
- [ ] Rama `staging` creada en GitHub
- [ ] `.env.staging` creado con credenciales seguras
- [ ] Docker instalado en Hetzner VPS
- [ ] Deploy completado (`./scripts/deploy-staging.sh`)
- [ ] Backup pre-deploy verificado en `./backups/`
- [ ] Health checks pasan (`/api/v1/health`)
- [ ] Google OAuth funciona en staging
- [ ] Scopes avanzados funcionan (birthday, phone)
- [ ] Rollback info guardada en `./deploy-artifacts/`
- [ ] Documentación actualizada

---

## 🔐 **Seguridad**

### **Contraseñas Seguras:**
- ✅ Generar con `openssl rand -hex 32`
- ✅ NO commitear `.env.staging` a GitHub
- ✅ Usar `.gitignore` para archivos `.env`

### **Firewall:**
```bash
# En Hetzner VPS
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### **SSL/TLS:**
- ✅ Cloudflare SSL Flexible (no requiere certificado en origen)
- ✅ DNS records en modo "Proxied" (🟠 orange cloud)

---

## 📚 **Recursos Adicionales**

- **Producción Deployment:** `docs/PRODUCCION_DEPLOY_COMPLETE.md`
- **Google OAuth Setup:** `docs/GOOGLE_OAUTH_SETUP.md`
- **CI/CD Strategy:** `docs/CI_CD_TESTING_STRATEGY.md`

---

**Última actualización:** 2026-07-15  
**Autor:** OrderFlow Team  
**Estado:** ✅ Ready for deployment
