# Propuesta: rotación de contraseña SuperAdmin (`SuperAdmin123!`)

> **Estado:** ✅ **EJECUTADA en production provecchio (192.168.69.240)** el 2026-10-26: `marcelo@pesallaccia.com` con nueva passfrase alfanumérica de 24 chars (entregada por chat, NO versionada), backup del hash viejo en `/root/superadmin_passwordHash_backup_20261026.txt` del servidor. Verificado: login nuevo 200 + `isSuperAdmin: true` + JWT 349 chars; login viejo 409; login vacío 400/500. Pendiente: propagar en staging/hetzner si comparten credencial y limpieza de seeds.
> **Fecha:** 2026-10-26 · **Origen:** troubleshooting #201 + nota pendiente del cliente
> **Alcance:** entorno **production provecchio** (`192.168.69.240`, DB OrderFlow); extensible a staging/hetzner si aplica.

## 1. Contexto

La contraseña `SuperAdmin123!` sigue **expuesta en repos/git y seeds** (documentada en #201). Mientras exista en seeds y la wiki/infoproducción, cualquier lectura del repo revela una credencial viable del SuperAdmin. La rotación se hace cambiando el `passwordHash` del usuario `isSuperAdmin` en la DB de producción con una passfrase fuera de repo.

## 2. Passfrase propuesta (mínimo criptográfico)

- 4–5 palabras aleatorias (`diceware`) + 1 dígito + 1 símbolo, ≥ 20 chars. Ejemplos de forma (no usar el valor en repo):
- **Almacenamiento:** password manager del cliente; **prohibido** incluir el valor en commits, issues o docs.

## 3. Plan de ejecución (≤ 15 min, ventana acordada)

1. **Backup previo** de la fila: `SELECT id, email, passwordHash FROM "User" WHERE "isSuperAdmin" = true;` (por stdin, sin shell inline — lección #201).
2. **Generar hash bcrypt** en el server (misma lib del backend, sin dependencia de shell):
   ```bash
   docker exec orderflow_backend node -e \
     "const b=require('bcryptjs');console.log(b.hashSync(process.env.NUEVA,10))" \
     # NUEVA pasada por -e env var, nunca inline con $ o ! sin comillas
   ```
3. **UPDATE seguro** (patrón #201): hash → `base64` → `psql` por **stdin**, decodificando en SQL:
   ```bash
   printf 'UPDATE "User" SET "passwordHash"=convert_from(decode(%s,'"'"'base64'"'"'),'"'"'UTF8'"'"') WHERE id='<id>'; \n' "$B64" | docker exec -i orderflow_db psql -U orderflow -d orderflow
   ```
4. **Rotación en espejo:** repetir en `staging.pesallaccia.com`/hetzner si comparten la passfrase.
5. **Cierre de sesiones:** invalidar refresh tokens del usuario (rotación de `JWT_REFRESH_SECRET` es OTRO cambio broadcast — solo si se desactivan API keys activas de emergencia; NO necesario para cambiar password).

## 4. Verificación

- `POST /api/v1/auth/login` con la nueva credencial → 200 + JWT con `isSuperAdmin: true`.
- Login con la vieja credencial → 401.
- Smoke del dashboard (`/admin/*`) → 200.

## 5. Limpieza de repo (post-rotación)

- Quitar `SuperAdmin123!` de seeds/envs en repo (seeds usen `seed_dev_only` y env var), y **no** re-introducirla en documentación. El histórico git conserva la vieja: por eso la nueva **nunca debe** escribirse en ningún archivo versionado.

## 6. Rollback

- Conservar el hash viejo capturado en (3.1); si algo falla, repetir el UPDATE con el hash anterior por el mismo método stdin/base64.
