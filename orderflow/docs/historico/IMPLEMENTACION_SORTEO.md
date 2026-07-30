# Guía de Implementación - Sorteo Provecchio

## 📋 Resumen

Implementación lista para el sorteo "Gran Inauguración Di Mora" en el servidor de Provecchio.

## ✅ Lo que está implementado

### 1. Single-Tenant Mode
- OrderFlow carga directamente la tienda de Provecchio
- Sin selección de tenant
- API Key: `0bb60656b9fbfcc27e38ae444e9e376f`

### 2. Super Admin
- Usuario: `marcelo@pesallaccia.com`
- Acceso total a todos los tenants
- Campo `isSuperAdmin` en User

### 3. Sorteo con Compartir en Redes
- Landing page: `/giveaway/provecchio-dimora-001`
- Botones: Instagram, Facebook, WhatsApp
- Copiar enlace
- Autocompletado con Google/Facebook

### 4. Tenants Configurados
- Gaia Wellness (Spa)
- Repuestos Enciso (Automotriz)
- Provecchio Di Mora (Restaurant)

---

## 🚀 Pasos para Implementar Mañana

### 1. Actualizar servidor desde GitHub
```bash
ssh dimoraserverlocal
cd /srv/orderflow
git checkout staging
git pull origin staging
```

### 2. Ejecutar seed del sorteo
```bash
docker exec -e PGPASSWORD=GwV2UpPdZnCocfdjmOKUfqiX \
  orderflow-db-prod psql -U orderflow_admin -d orderflow_prod_db \
  -f /srv/orderflow/backend/prisma/seed-giveaway-provecchio.sql
```

### 3. Reiniciar backend
```bash
cd /srv/orderflow
docker compose --env-file .env.prod -f docker-compose.prod.yml restart backend
```

### 4. Verificar
```bash
# Verificar sorteo
docker exec -e PGPASSWORD=GwV2UpPdZnCocfdjmOKUfqiX \
  orderflow-db-prod psql -U orderflow_admin -d orderflow_prod_db \
  -c "SELECT id, name, status, \"endDate\" FROM giveaways WHERE \"tenantId\"='provecchio-dimora-001';"

# Test API
curl http://localhost:8080/api/v1/giveaways/public/active/provecchio-dimora-001
curl http://localhost:8080/api/v1/giveaways/public/share/provecchio-dimora-001
```

### 5. Probar Landing Page
```
URL: http://dimora.provecchio.com:8083/giveaway/provecchio-dimora-001
```

---

## 🔧 Configuración OAuth (Opcional)

Para que el autocompletado con Google/Facebook funcione en producción:

### Google OAuth
1. Ir a https://console.cloud.google.com/apis/credentials
2. Crear OAuth Client ID
3. Authorized redirect URI: `https://dimora.provecchio.com`
4. Copiar Client ID
5. Actualizar `.env.prod`:
   ```bash
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   ```

### Facebook App
1. Ir a https://developers.facebook.com/apps
2. Crear App
3. Agregar producto "Facebook Login"
4. Valid OAuth Redirect URIs: `https://dimora.provecchio.com`
5. Copiar App ID
6. Actualizar `.env.prod`:
   ```bash
   FACEBOOK_APP_ID=1234567890123
   ```

### Actualizar .env.prod en servidor
```bash
ssh dimoraserverlocal
cd /srv/orderflow
nano .env.prod
# Agregar:
# GOOGLE_CLIENT_ID=xxxxx
# FACEBOOK_APP_ID=xxxxx

# Reiniciar
docker compose --env-file .env.prod -f docker-compose.prod.yml restart backend
```

---

## 📊 URLs de Acceso

### OrderFlow
- **Frontend:** http://dimora.provecchio.com:8083
- **Landing Sorteo:** http://dimora.provecchio.com:8083/giveaway/provecchio-dimora-001
- **API:** http://dimora.provecchio.com:8080/api/v1/...

### Odoo
- **URL:** http://dimora.provecchio.com:8082
- **User:** soporte@crossnexion.com
- **Password:** Cross1983_

---

## 🎯 Enlaces para Compartir el Sorteo

Una vez implementado:

- **Enlace directo:** `http://dimora.provecchio.com:8083/giveaway/provecchio-dimora-001`
- **Instagram:** Botón en la landing page
- **Facebook:** Botón en la landing page
- **WhatsApp:** Botón en la landing page

---

## 📝 Notas

1. **Single-Tenant:** OrderFlow carga directamente Provecchio, no muestra selector de tenants
2. **Super Admin:** Marcelo tiene acceso total a todos los tenants
3. **Multi-Tenant:** Los usuarios pueden estar en múltiples tenants
4. **SSL:** Cloudflare maneja HTTPS (provecchio.com, dimora.provecchio.com)

---

## 🆘 Soporte

Si hay problemas:
1. Verificar logs: `docker compose -f docker-compose.prod.yml logs backend`
2. Revertir: `git checkout <commit-anterior>`
3. Reiniciar todo: `docker compose -f docker-compose.prod.yml restart`
