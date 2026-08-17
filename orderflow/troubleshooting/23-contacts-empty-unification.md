# Troubleshooting — Contactos no aparecen en la lista (Unificación Usuarios + Clientes)

**Fecha:** 2026-08-05  
**Versión:** v1.16.0  
**Alcance:** módulo de Contactos vacío en producción; usuarios asignados a tenants no visibles

---

## 1. Síntoma

El módulo de **Contactos** (`/admin/contacts`) aparece vacío aunque existen usuarios asignados a tenants. El usuario actual (SuperAdmin / ADMIN) no se ve reflejado en la lista de Contactos, a pesar de que la idea de diseño es **unificar Usuarios + Clientes + Proveedores + Empleados en un solo módulo** (un Contacto puede ser varias cosas simultáneamente).

```sql
SELECT count(*) FROM contacts;  -- 0 filas
```

## 2. Causa Raíz

El módulo de Contactos consulta la tabla `contacts` filtrando por `tenantId` + `active: true` (`backend/src/contacts/contacts.controller.ts` y `contacts.service.ts`). Pero los usuarios se crean/seedean vía `scripts/create-production-tenants.sql`, que inserta en `user_tenant_access` **directamente sin crear el `Contact` ni setear `user_tenant_access.contactId`**.

Resultado:
- `contacts` queda vacía (0 filas).
- `user_tenant_access.contactId` es `NULL` para todos los usuarios.
- El listado de Contactos no devuelve ningún registro.

La lógica correcta existe en `auth.service.ts → createUserWithContact()` (crea el Contact + rol `USER` y lo linkea), pero el seed SQL la eludía.

## 3. Solución Aplicada

### 3.1 Backfill en producción (datos existentes)
Script idempotente que, para cada `user_tenant_access` con `contactId IS NULL`, crea el `Contact` (`type='USER'`), inserta `contact_roles` (`role='USER'`, `isPrimary=true`) y actualiza `user_tenant_access.contactId`.

```sql
DO $$
DECLARE r RECORD; new_contact_id TEXT;
BEGIN
  FOR r IN
    SELECT uta.id AS uta_id, uta."tenantId" AS tenant_id,
           u.id AS user_id, u.email AS user_email, u.name AS user_name
    FROM user_tenant_access uta
    JOIN users u ON u.id = uta."userId"
    WHERE uta."contactId" IS NULL
  LOOP
    new_contact_id := gen_random_uuid()::TEXT;
    INSERT INTO contacts (id,"tenantId",type,name,email,"isCompany","supplierRank","customerRank","leadScore","leadStatus",active,"createdAt","updatedAt")
    VALUES (new_contact_id, r.tenant_id, 'USER', r.user_name, r.user_email, FALSE, 0,0,0,'NEW', TRUE, NOW(), NOW());
    INSERT INTO contact_roles (id,"contactId","tenantId",role,"isPrimary","createdAt")
    VALUES (gen_random_uuid()::TEXT, new_contact_id, r.tenant_id, 'USER', TRUE, NOW());
    UPDATE user_tenant_access SET "contactId" = new_contact_id WHERE id = r.uta_id;
  END LOOP;
END $$;
```

Resultado tras el backfill: 3 contactos creados y linkeados (incluido `marcelo@pesallaccia.com` en `provecchio-dimora-001`).

### 3.2 Fix en el seed (`scripts/create-production-tenants.sql`)
Se agregó el mismo bloque `DO $$` idempotente al final del seed, de modo que un redeploy/reseed nunca vuelva a dejar usuarios sin su Contact.

## 4. Verificación

```sql
SELECT c.name, c.email, c.type, c."tenantId", uta."contactId" IS NOT NULL AS linked, cr.role
FROM contacts c
JOIN user_tenant_access uta ON uta."contactId" = c.id
LEFT JOIN contact_roles cr ON cr."contactId" = c.id;
-- 3 filas: Marcelo, Admin SPA Wellness, Super Admin (todas type=USER, role=USER)
```

El listado `/admin/contacts` ahora muestra a los usuarios del tenant correspondiente.

## 5. Notas de diseño

- Un **Contacto** puede ser `USER`, `CUSTOMER`, `SUPPLIER`, `EMPLOYEE` a la vez → el `type` del Contact es el más genérico (`USER` para usuarios del sistema) y los roles específicos viven en `contact_roles` (`ContactRoleType` incluye `EMPLOYEE` para el futuro módulo de Capital Humano).
- `ContactType` (enum del campo `type`) NO incluye `EMPLOYEE`; ese rol va en `contact_roles`.

---

**Archivos afectados:** `scripts/create-production-tenants.sql`  
**Referencia:** `backend/src/contacts/contacts.controller.ts`, `backend/src/auth/auth.service.ts` (`createUserWithContact`)
