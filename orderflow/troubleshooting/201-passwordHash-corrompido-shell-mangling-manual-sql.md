# 201 — Login "Invalid password" en producción por `passwordHash` corrompido (shell mangling en SQL manual)

## Síntoma
- `POST /api/v1/auth/login` en `provecchio.com` responde HTTP 409 con `"Invalid password"` para el SuperAdmin (`marcelo@pesallaccia.com`), con **cualquier** password.
- El mismo login **funciona** en el entorno local (`provecchio.local`) contra la DB restaurada del backup.
- `GET /api/v1/health` responde OK; el resto de usuarios (mozo, caja, cocina…) loguean normalmente.

## Diagnóstico
1. `usersService.authenticate()` (`backend/src/users/services/users.service.ts`) hace `bcrypt.compare()` y lanza `ConflictException('Invalid password')` cuando el compare falla → el mensaje es exactamente el observado.
2. `GET /api/v1/tenants`-style comprobación: en la DB de producción el usuario **sí existe** y está `active`.
3. Consulta de `length("passwordHash")` en producción:

   | Usuario | `length(passwordHash)` | `updatedAt` |
   |---|---|---|
   | `marcelo@pesallaccia.com` | **27** ❌ | 2026-10-25 16:12 UTC |
   | resto (9 usuarios) | 60 ✅ | — |

   Un hash bcrypt válido mide **siempre 60** caracteres (`$2b$cost$22+31`). Con 27 chars, `bcrypt.compare` falla con cualquier input → `Invalid password`.

## Causa Raíz
Un `UPDATE users SET "passwordHash" = '$2b$12$…'` ejecutado **inline desde un shell** con el SQL entre **comillas dobles**: bash expandió los fragmentos `$2b`, `$12`, `$nombre…` del hash como variables vacías y a la DB llegó solo la cola del hash (27 chars).

>Firma típica de este bug: un hash bcrypt que mide mucho menos de 60 y cuyo valor restante coincide con la cola del hash original sin los segmentos `$…`.
>
>Es fácil de reproducir por accidente: la primera consulta de diagnóstico de esta investigación (`psql -c "SELECT … '$2b$12$W.78…'"` vía SSH con el SQL entre comillas dobles) devolvió el hash recortado por el mismo mecanismo, lo que confirmó la hipótesis.

El backend es inocente: todos los paths (`usersService.update` → `bcrypt.hash(password, 10)`, `PATCH /users/me/password`, `PATCH /users/:id/reset-password`) hashean correctamente. La corrupción fue **operativa/manual**, durante la sesión de trabajo de FEAT-188-ext (2026-10-25 ~16:12).

## Solución Aplicada (2026-10-26)
1. Generar hash nuevo localmente con la convención del backend: `bcrypt.hash('SuperAdmin123!', 10)` (60 chars).
2. Trasladarlo al servidor **codificado en base64** (base64 no contiene `$` → inmune al mangling).
3. Armar el SQL localmente en archivo y **pasarlo por stdin** a `psql` — el contenido nunca pasa por una línea de comando:
   ```bash
   ssh root@<host> 'cat > /tmp/pw_fix.sql' < pw_fix.sql
   ssh root@<host> 'cat /tmp/pw_fix.sql | docker exec -i orderflow_db psql -U orderflow -d orderflow_db'
   # → UPDATE 1
   ```
4. Verificación: `length("passwordHash") = 60`, `rm /tmp/pw_fix.sql`, y smoke test `POST /api/v1/auth/login` en producción → JWT emitido con `isSuperAdmin: true`.

## Prevención
- **Nunca pegar hashes/tokens con `$` en SQL inline entre comillas dobles.** Usar archivo + stdin (`psql -f` o `cat | docker exec -i … psql`), o generar el hash **dentro** del contenedor (`docker exec orderflow_backend node -e "…bcrypt…"`) evitando el shell del host.
- Documentar procedimiento estándar de reset de password SuperAdmin en el runbook de operaciones.
- Considerar UI/MFA: el reset por DB manual es el vector de riesgo más alto para credenciales.

## Relacionado
- `#19-login-secrets-missing.md` — password `SuperAdmin123!` ya está expuesto en seeds (`backend/prisma/seed-users-test.sql`, `backend/scripts/generate-test-users.js`) e historial de git: **rota en el próximo release**.
- `#138-user-update-password-500-error-fix.md` — endpoint de cambio de password (backend, bug distinto).
- `#163-provecchio-replica-pg_hba-password-fix.md` — credenciales PostgreSQL en réplica Provecchio.
- `docs/plans/omnigastro/plan-actualizacion-v1.43.0-odoo-integrations-auth.md` — sesión FEAT-188-ext (ventana temporal de la corrupción).

## Adenda (2026-10-26) — rotación SuperAdmin (aplicada, ver propuesta en docs/plans/omnigastro)

- **Nueva lección:** al operar vía `ssh ... 'bash -s'`, `env VAR=x ssh` no transmite la variable al remoto (`AcceptEnv` deshabilitado). En esta rotación el hash se generó con la passfrase **vacía** (verificación lo detectó: login viejo 409 + login "nueva" 500 sin credenciales efectivas). Corrección: pasar valores cómo inline-args del shell remoto (`ssh host "VAR='valor' bash -s"`), manteniendo el hash por base64+stdin.
- Nunca verificar con "status diferencial" a ciegas: probar nuevo (200), viejo (rechazo) y payload vación explícitamente.
