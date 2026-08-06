# Limpieza y Rotación de Secretos — OrderFlow

**Prioridad:** P0 — Crítico  
**Fecha:** 2026-07-30  
**Versión del documento:** 1.0  
**Ámbito:** Producción (Provecchio / pesallaccia), Staging y repositorio  
**Estado:** Pendiente de ejecución

---

## 1. Objetivo

Invalidar todos los secretos expuestos (artefacto `.env.prod`, OAuth Google y variantes de `.env`), desplegar credenciales nuevas sin pérdida de datos y dejar el repositorio/servidores en un estado en el que **no vuelvan a versionarse secretos reales**.

---

## 2. Inventario de secretos comprometidos o a rotar

| # | Secreto | Uso | Acción |
|---|---------|-----|--------|
| 1 | `POSTGRES_PASSWORD` / `DATABASE_URL` | PostgreSQL, Prisma, backend, adapter | **Rotar** |
| 2 | `REDIS_PASSWORD` | Cache, rate-limit, WebSockets | **Rotar** |
| 3 | `JWT_SECRET` | Access tokens | **Rotar** (invalida sesiones) |
| 4 | `JWT_REFRESH_SECRET` | Refresh tokens | **Rotar** (invalida refresh) |
| 5 | `MASTER_API_KEY` | Super-admin, scripts, integraciones | **Rotar** |
| 6 | `apiKeySecret` por tenant | Integraciones ERP / API clientes | **Rotar críticos** |
| 7 | Google OAuth `client_secret` (+ JSON en repo) | Login Google / giveaways | **Rotar y borrar archivo** |
| 8 | Tokens Cloudflare / ACME (si aplican) | DNS-01 Traefik, subdominios | Revisar y rotar si expuestos |
| 9 | `SENTRY_DSN` | Telemetría | Regenerar si se filtró valor real |

> Tratar como **comprometido** cualquier valor que haya aparecido en zips, chats o commits. No reutilizar.

---

## 3. Archivos a eliminar o sanitizar

### 3.1 Eliminar del working tree y del servidor de empaquetado

```bash
# En la raíz del repo (local / CI workspace)
rm -f .env.prod
rm -f client_secret_*.json
rm -f **/client_secret_*.json

# Si contienen valores reales (no placeholders):
# - revisar y vaciar o convertir a ejemplo
# rm -f frontend/.env.production   # solo si tiene secretos reales
```

### 3.2 No debe volver a existir en git

| Archivo / patrón | Destino correcto |
|------------------|------------------|
| `.env.prod` | Solo en servidor: `/srv/orderflow/.env` (chmod 600) |
| `.env.production` con valores reales | Servidor o Vault; en repo solo `.env.production.example` |
| `.env.staging` con valores reales | `/srv/orderflow-staging/.env.staging` |
| `client_secret_*.json` | Google Cloud Console / secret manager; **nunca** en repo |
| `*.pem`, `*.pfx`, `*.pkcs12` | Ya en `.gitignore`; verificar que no estén trackeados |

### 3.3 Parche obligatorio de `.gitignore`

Añadir o reemplazar la sección de env/secrets por:

```gitignore
# Environment variables — todos los variantes
.env
.env.*
!.env.example
!.env.*.example

# Secrets & Credentials
client_secret*.json
*.pem
*.pfx
*.pkcs12
**/credentials*.json
```

Comprobar que `.env.prod`, `.env.production` y `.env.staging` queden ignorados:

```bash
git check-ignore -v .env.prod .env.production .env.staging
```

---

## 4. Generación de secretos nuevos

```bash
# Ejecutar en máquina segura (no dejar output en logs de CI públicos)
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → JWT_REFRESH_SECRET
openssl rand -hex 32   # → POSTGRES_PASSWORD
openssl rand -hex 32   # → REDIS_PASSWORD
echo "sk_master_$(openssl rand -hex 24)"  # → MASTER_API_KEY
```

Almacenar **solo** en:

- Gestor de secretos del equipo (1Password / Bitwarden / Vault), y/o  
- Archivo en servidor con permisos restringidos:

```bash
sudo install -m 600 /dev/null /root/.secrets/orderflow-prod.env
# editar con los valores nuevos
```

---

## 5. Orden de rotación en servidores

Ejecutar **por entorno** (Producción primero si fue el filtrado; Staging después). Secretos **distintos** por entorno.

```
0. Backup DB + uploads
1. Google OAuth (independiente)
2. MASTER_API_KEY
3. JWT_SECRET + JWT_REFRESH_SECRET
4. REDIS_PASSWORD
5. POSTGRES_PASSWORD + DATABASE_URL
6. API keys de tenants críticos
7. Limpieza repo / artefactos / historial
8. Verificación 24–48 h
```

### 5.0 Backup previo

```bash
cd /srv/orderflow   # o /srv/orderflow-staging
./scripts/backup-production.sh production
./scripts/verify-backups.sh
```

### 5.1 Google OAuth

1. Google Cloud Console → Credentials → OAuth 2.0 Client → **Reset secret**.  
2. Actualizar secret en servidor (variable de entorno o secret store).  
3. Borrar cualquier `client_secret_*.json` del disco.  
4. Probar login Google.

### 5.2 MASTER_API_KEY

1. Generar `sk_master_…` nuevo.  
2. Actualizar `.env` del servidor y scripts/cron/consumidores internos.  
3. Reiniciar backend.  
4. Comprobar **200** con la key nueva y **401** con la antigua.

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "x-api-key: $NUEVA_MASTER_KEY" \
  https://api.DOMINIO/api/v1/health
```

### 5.3 JWT_SECRET y JWT_REFRESH_SECRET

1. Escribir ambos valores nuevos en el `.env` del servidor.  
2. Reiniciar backend y microservicios que validen JWT (`auth-shared`).  
3. Efecto esperado: todos los usuarios deben volver a iniciar sesión.

### 5.4 REDIS_PASSWORD

```bash
# Actualizar REDIS_PASSWORD en env del stack
docker compose -f docker-compose.prod.yml up -d redis
docker compose -f docker-compose.prod.yml up -d backend
docker exec -it <redis-container> redis-cli -a "$NUEVO_REDIS_PASSWORD" PING
```

### 5.5 PostgreSQL

```sql
-- Como superusuario de Postgres
ALTER USER orderflow WITH PASSWORD '<NUEVO_PASSWORD>';
```

Actualizar en **todos** los consumidores:

```bash
POSTGRES_PASSWORD=<NUEVO>
DATABASE_URL=postgresql://orderflow:<NUEVO>@database:5432/orderflow_db?schema=public
```

Incluir: backend, odoo-adapter, microservicios standalone, jobs de backup, y URLs `dedicatedDatabaseUrl` de tenants enterprise si embeben password.

```bash
docker compose -f docker-compose.prod.yml up -d backend odoo_adapter
curl -s https://api.DOMINIO/api/v1/health
```

### 5.6 API keys de tenants

Usar el flujo de la aplicación cuando exista:

```http
POST /api/v1/tenants/:id/api-key/rotate
```

Entregar la nueva key al operador del tenant por canal seguro. Priorizar tenants con integraciones ERP activas.

---

## 6. Limpieza del repositorio Git

### 6.1 Working tree

```bash
git rm --cached .env.prod 2>/dev/null || true
git rm --cached client_secret_*.json 2>/dev/null || true
git rm --cached .env.production .env.staging 2>/dev/null || true

# Asegurar .gitignore actualizado (sección 3.3)
git add .gitignore
git status   # no debe listar secretos reales a commitear
```

### 6.2 Historial (si alguna vez se commitearon)

Los secretos en el historial siguen siendo públicos hasta reescribir historial **y** rotar (la rotación es lo prioritario).

```bash
# Con git-filter-repo (recomendado)
git filter-repo --path .env.prod --invert-paths
git filter-repo --path-glob 'client_secret*.json' --invert-paths

# Coordinar force-push con el equipo
# git push --force-with-lease origin main
```

### 6.3 Artefactos externos

- [ ] Borrar zips que contengan `.env.prod` de discos compartidos, Drive, chat, CI  
- [ ] Revisar GitHub Actions → Artifacts y Releases  
- [ ] Revocar tokens de CI si se usaron secretos de prod en workflows

---

## 7. Templates seguros en el repo

Mantener solo ejemplos con placeholders:

**`.env.production.example`** (fragmento mínimo):

```bash
POSTGRES_USER=orderflow
POSTGRES_DB=orderflow_db
POSTGRES_PASSWORD=cambiar_password_produccion_aleatorio
REDIS_PASSWORD=cambiar_redis_password_produccion_aleatorio
MASTER_API_KEY=cambiar_master_key_produccion_aleatorio
JWT_SECRET=cambiar_jwt_secret_produccion_aleatorio
JWT_REFRESH_SECRET=cambiar_jwt_refresh_secret_produccion_aleatorio
DATABASE_URL=postgresql://orderflow:cambiar_password_produccion_aleatorio@database:5432/orderflow_db?schema=public
SENTRY_DSN=
VITE_SENTRY_DSN=
```

Nunca copiar valores reales a archivos trackeados.

---

## 8. Checklist de verificación post-limpieza

| # | Check | Criterio de OK |
|---|-------|----------------|
| 1 | Health API | `GET /api/v1/health` → 200 |
| 2 | Login email/password | Emite JWT nuevo |
| 3 | Login Google | OAuth con secret nuevo |
| 4 | Master key nueva | 200; key antigua → 401 |
| 5 | Tenant API (críticos) | Sync / pedidos con key nueva |
| 6 | Redis | `PING` OK; KDS/rate-limit operativos |
| 7 | Postgres | Prisma lee/escribe |
| 8 | Traefik TLS | HTTPS con certificado válido |
| 9 | Repo limpio | `git status` sin `.env.prod` ni `client_secret*` |
| 10 | `.gitignore` | `git check-ignore -v .env.prod` reporta ignore |
| 11 | Backup nuevo | Backup post-rotación verificado |
| 12 | Monitoreo 24–48 h | Sin `28P01`, `WRONGPASS`, pico sostenido de 401 |

---

## 9. Runbook de ejecución (mismo día)

| Tiempo | Acción |
|--------|--------|
| T+0 | Backup DB + uploads; generar secretos; aviso de mantenimiento breve |
| T+15 | Rotar Google OAuth; borrar JSON local; probar login |
| T+25 | Rotar `MASTER_API_KEY`; actualizar scripts; restart backend |
| T+35 | Rotar JWT; restart backend + microservicios JWT |
| T+45 | Rotar Redis; recreate redis + backend |
| T+55 | `ALTER USER` Postgres; actualizar `DATABASE_URL`; restart stack |
| T+70 | Smoke: health, login, orden de prueba, KDS |
| T+90 | `git rm` secretos trackeados; parche `.gitignore`; templates example |
| T+24h | Revisar logs/Sentry; rotar API keys de tenants críticos restantes |

**Downtime esperado:** 5–15 minutos de reinicios. **Efecto usuario:** re-login obligatorio tras rotar JWT.

---

## 10. Rollback de emergencia

Si la aplicación no conecta a la DB tras el cambio:

1. Restaurar temporalmente el password anterior **solo desde el gestor de secretos privado** (no desde el zip filtrado si ya se rotó en el servidor de verdad).  
2. O restaurar el archivo `.env` del servidor desde backup **privado** del VPS.  
3. Corregir la configuración, volver a aplicar el password **nuevo** y no reintroducir el secreto filtrado en ningún repositorio.

---

## 11. Prevención continua

| Medida | Detalle |
|--------|---------|
| `.gitignore` estricto | Cubrir `.env.*` y `client_secret*.json` |
| Pre-commit | gitleaks o detect-secrets en CI |
| Secrets en CI | Solo GitHub Actions Secrets / Vault |
| Rotación periódica | JWT / Master cada ~90 días; DB/Redis ante incidente o cada 6–12 meses |
| Master key | Nunca en frontend ni apps móviles |
| Dueño | Asignar responsable por secreto (quién puede rotarlo) |

---

## 12. Referencias internas

| Documento / ruta | Uso |
|------------------|-----|
| `docs/BACKUP_RESTORE.md` | Backup y restore pre/post rotación |
| `docs/DRP.md` | Continuidad si el incidente escala |
| `docs/guides/DEPLOYMENT.md` | Variables de entorno por entorno |
| `docs/GITHUB_ACTIONS_SETUP.md` | Secrets de CI (no usar prod en CI) |
| `.env.production` / `.env.staging` (templates) | Placeholders `cambiar_*` únicamente |
| `AGENTS.md` | Reglas de ingeniería; no versionar secretos |

---

## 13. Cierre del incidente

Marcar como cerrado cuando:

- [ ] Todos los ítems de la sección 2 estén rotados o descartados con justificación  
- [ ] Archivos de la sección 3 eliminados del árbol y del tracking  
- [ ] `.gitignore` verificado con `git check-ignore`  
- [ ] Checklist de la sección 8 completo  
- [ ] Sin reaparición de secretos en el remoto tras 48 h  
- [ ] Registro en el gestor de secretos actualizado con valores nuevos y fecha de rotación  

**Resultado esperado:** credenciales filtradas inválidas, stack operativo con secretos nuevos, repositorio sin material sensible trackeado.
