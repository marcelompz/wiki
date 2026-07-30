# Configuración de Sesión por Tenant

**Fecha:** 2026-07-06  
**Estado:** ✅ Implementado

---

## Descripción

OrderFlow ahora permite configurar la duración de la sesión **por tenant/perfil**. Cada tenant puede definir su propia política de seguridad para los tokens JWT.

---

## Arquitectura

### Base de Datos

Se agregó el campo `sessionConfig` (JSONB) a la tabla `tenants`:

```sql
ALTER TABLE "tenants" ADD COLUMN "sessionConfig" JSONB;
```

**Estructura del JSON:**
```json
{
  "accessTokenExpiresIn": "1h",
  "refreshTokenExpiresIn": "30d"
}
```

---

## Configuración por Defecto

Si un tenant no tiene configuración personalizada, se usan los valores globales del `.env`:

```bash
# Backend .env
JWT_EXPIRES_IN=1h          # Access token: 1 hora
JWT_REFRESH_EXPIRES_IN=30d # Refresh token: 30 días
```

---

## API Endpoints

### 1. GET `/api/v1/auth/session-config`

Obtiene la configuración de sesión del tenant actual.

**Requiere:** JWT Token (Bearer)

**Response:**
```json
{
  "accessTokenExpiresIn": "1h",
  "refreshTokenExpiresIn": "30d",
  "isCustomized": false
}
```

**Ejemplo:**
```bash
curl -X GET http://localhost:3010/api/v1/auth/session-config \
  -H "Authorization: Bearer <tu-token>"
```

---

### 2. PUT `/api/v1/auth/session-config`

Actualiza la configuración de sesión del tenant.

**Requiere:**
- JWT Token (Bearer)
- Rol: **ADMIN** u **OWNER**

**Body:**
```json
{
  "accessTokenExpiresIn": "2h",
  "refreshTokenExpiresIn": "60d"
}
```

**Formatos válidos:**
- `"30m"` - 30 minutos
- `"1h"` - 1 hora
- `"2d"` - 2 días
- `"30d"` - 30 días

**Response:**
```json
{
  "success": true,
  "config": {
    "accessTokenExpiresIn": "2h",
    "refreshTokenExpiresIn": "60d"
  },
  "message": "Session configuration updated successfully. New tokens will use the updated expiration times."
}
```

**Ejemplo:**
```bash
curl -X PUT http://localhost:3010/api/v1/auth/session-config \
  -H "Authorization: Bearer <tu-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accessTokenExpiresIn": "8h",
    "refreshTokenExpiresIn": "90d"
  }'
```

---

## Flujo de Uso

### 1. Login

Al hacer login, el backend lee la configuración del tenant y la incluye en la respuesta:

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": "8h",          # ← Duración del access token
  "refreshExpiresIn": "90d",  # ← Duración del refresh token
  "user": { ... },
  "tenants": [ ... ]
}
```

### 2. Frontend

El frontend puede usar esta información para:
- Mostrar al usuario cuándo expirará su sesión
- Programar refresh automático del token
- Mostrar advertencias de "sesión por expirar"

**Ejemplo en React:**
```typescript
// After login
const { expiresIn, refreshExpiresIn } = loginResponse;

// Parse duration
const accessDuration = parseDuration(expiresIn); // e.g., "8h" → 28800000 ms
const refreshDuration = parseDuration(refreshExpiresIn);

// Set auto-refresh timer
setTimeout(() => {
  refreshToken(); // Refresh 5 minutos antes de expirar
}, accessDuration - 5 * 60 * 1000);
```

---

## Migración de Base de Datos

### Ambiente 1: Local (Desarrollo)

```bash
cd /opt/orderflow/backend
npx prisma migrate dev
```

**Variables (`.env`):**
```bash
JWT_SECRET=orderflow-secret-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=orderflow-refresh-secret-change-in-production
JWT_REFRESH_EXPIRES_IN=30d
```

---

### Ambiente 2: Staging (`http://staging.provecchio.com`)

**Paso 1: Aplicar migración**
```bash
# SSH al servidor Hetzner
ssh user@178.105.226.175

# Ir al directorio
cd /opt/orderflow

# Ejecutar migración en staging (docker-compose.yml)
docker compose -f docker-compose.yml exec backend npx prisma migrate deploy
```

**Paso 2: Actualizar `.env.staging`**
```bash
# Editar archivo
nano /opt/orderflow/.env.staging

# Agregar/actualizar:
JWT_SECRET=tu_jwt_secret_staging_aleatorio
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=tu_refresh_secret_staging_aleatorio
JWT_REFRESH_EXPIRES_IN=30d
```

**Paso 3: Reiniciar backend**
```bash
docker compose -f docker-compose.yml restart backend
```

**Puertos Staging:**
- DB: 5433
- Backend: 3012
- Frontend: 3013

---

### Ambiente 3: Producción (`https://provecchio.com`)

**Paso 1: Aplicar migración**
```bash
# SSH al servidor Hetzner
ssh user@178.105.226.175

# Ir al directorio
cd /opt/orderflow

# Ejecutar migración en production (docker-compose.prod.yml)
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

**Paso 2: Actualizar `.env.production`**
```bash
# Editar archivo
nano /opt/orderflow/.env.production

# Agregar/actualizar:
JWT_SECRET=tu_jwt_secret_production_aleatorio
JWT_EXPIRES_IN=8h                     # Más largo para mejor UX en prod
JWT_REFRESH_SECRET=tu_refresh_secret_production_aleatorio
JWT_REFRESH_EXPIRES_IN=90d            # 3 meses para prod
```

**Paso 3: Reiniciar backend**
```bash
docker compose -f docker-compose.prod.yml restart backend
```

**Puertos Producción:**
- DB: 5432
- Backend: 3010
- Frontend: 3011 (nginx host: 80/443 → 8080)

---

### Manual (SQL directo)

**Local:**
```bash
psql -h localhost -p 5433 -U orderflow -d orderflow_db
```

**Staging:**
```bash
psql -h localhost -p 5433 -U orderflow -d orderflow_db
```

**Producción:**
```bash
psql -h localhost -p 5432 -U orderflow -d orderflow_db
```

**SQL (todos los ambientes):**
```sql
ALTER TABLE "tenants" ADD COLUMN "sessionConfig" JSONB;
COMMENT ON COLUMN "tenants"."sessionConfig" IS 'Session configuration: { accessTokenExpiresIn: "1h", refreshTokenExpiresIn: "30d" }';
```

---

## Valores Recomendados por Tipo de Tenant

### 🔒 Alta Seguridad (Bancos, Salud)
```json
{
  "accessTokenExpiresIn": "15m",
  "refreshTokenExpiresIn": "1d"
}
```

### 💼 Normal (Oficinas, Spas)
```json
{
  "accessTokenExpiresIn": "8h",
  "refreshTokenExpiresIn": "30d"
}
```

### 🏪 Baja Seguridad (Retail, E-commerce)
```json
{
  "accessTokenExpiresIn": "24h",
  "refreshTokenExpiresIn": "90d"
}
```

### 📱 Kioscos / Pantallas Táctiles
```json
{
  "accessTokenExpiresIn": "1h",
  "refreshTokenExpiresIn": "7d"
}
```

---

## Consideraciones de Seguridad

1. **Access Token Corto:** Menor ventana de ataque si es comprometido
2. **Refresh Token Largo:** Mejor UX sin comprometer seguridad
3. **Rotación:** Cambiar secrets regularmente en `.env`
4. **HTTPS:** Siempre usar HTTPS en producción
5. **Logout:** Invalidar refresh tokens en logout

---

## Troubleshooting

### Los tokens expiran muy rápido
- Verificar configuración del tenant: `GET /api/v1/auth/session-config`
- Verificar `.env` del backend: `JWT_EXPIRES_IN`
- Revisar logs del backend para errores de parsing

### Los tokens no expiran nunca
- Verificar que el refresh token se está guardando correctamente
- Revisar que el logout invalida el refresh token
- Verificar clocks del servidor (time drift)

### Error al actualizar configuración
- Asegurar que el usuario tiene rol ADMIN u OWNER
- Verificar formato de duración (ej: "1h", no "1 hour")
- Revisar logs del backend para errores de validación

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `prisma/schema.prisma` | Agregado `sessionConfig` field en Tenant |
| `prisma/migrations/.../migration.sql` | Migración SQL |
| `src/auth/auth.service.ts` | `generateAccessToken()`, `generateRefreshToken()`, `getSessionConfig()`, `updateSessionConfig()` |
| `src/auth/auth.controller.ts` | Endpoints GET/PUT `/session-config` |
| `src/auth/dto/update-session-config.dto.ts` | DTO para validación |
| `.env` | Defaults cambiados a `1h` / `30d` |

---

## Próximas Mejoras

- [ ] UI en Super Admin Dashboard para configurar sesión por tenant
- [ ] Audit log de cambios de configuración
- [ ] Notificación a usuarios antes de expirar sesión
- [ ] Refresh automático en frontend
- [ ] Configuración de "Remember Me" (checkbox en login)
