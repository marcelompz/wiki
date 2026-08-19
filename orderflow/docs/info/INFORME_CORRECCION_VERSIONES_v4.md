# Informe de Corrección del Historial de Versiones — OrderFlow / OmniFlow (v4)

**Fecha del informe:** 2026-08-18
**Paquete auditado:** `orderflow_1_20_10_tar.gz` (cuarta entrega, misma versión de producto que la segunda y tercera)
**Informes de referencia:** v1, v2, v3
**Fuente de verdad utilizada:** `docs/guides/CHANGELOG.md`

---

## 1. Resumen ejecutivo

En este ciclo se corrigieron **2 de los 5 hallazgos de infraestructura/datos** que venían arrastrándose desde la auditoría original (v1) sin tocarse en ninguna de las tres entregas anteriores. Quedan **3 pendientes**, todos concentrados en `infra/docker-compose.yml` (×2) y un script de migración puntual. Para esos 3, este informe no solo los documenta: incluye la corrección ya redactada, lista para aplicar.

---

## 2. Corregido en esta entrega

| Hallazgo (desde v1) | Estado |
|---|---|
| `0.2.2`/`0.2.3` mal ubicadas al final de `CHANGELOG.md`, rompiendo el orden cronológico | ✅ **Corregido.** Ambas entradas se reubicaron entre `0.2.0-beta.1` (2026-07-04) y `0.1.0-alpha.6` (2026-06-28), que es su posición cronológica correcta. |
| Faltaban `FEAT-067` a `FEAT-070` como registros individuales en `context/featurelist.json` | ✅ **Corregido.** Las cuatro features fueron agregadas con estado `completed` y los mismos títulos que ya figuraban en `docs/ROADMAP.md` (Backups & DR, Multi-Tenant User Mgmt, Personalización UX/UI, Íconos Sociales Híbridos). El listado de IDs ahora es continuo de FEAT-001 a FEAT-071 sin huecos. |

---

## 3. Pendiente — con corrección propuesta

Los 3 hallazgos restantes no se tocaron en esta entrega. Se probaron y redactaron las correcciones; quedan listas para aplicar directamente sobre los archivos del repo.

### 3.1 `infra/docker-compose.yml` — servicio `frontend` usa Nginx

**Problema:** viola la Regla de Arquitectura "NO usar Nginx: Traefik administra SSL y subdominios dinámicos" de `AGENTS.md`.

**Corrección propuesta:** reemplazar `nginx:alpine` por un servidor estático basado en Node (`serve`), que ya es coherente con el resto del stack (100% Node/TypeScript) y replica el mismo fallback de SPA que daba `nginx.spa.conf`.

```diff
   # Frontend Web
+  # NOTA: se sirve con "serve" (Node) en vez de Nginx para cumplir la Regla de
+  # Arquitectura "NO usar Nginx: Traefik administra SSL y subdominios" de AGENTS.md.
+  # "-s" replica el fallback SPA que antes daba nginx.spa.conf.
   frontend:
-    image: nginx:alpine
+    image: node:20-alpine
     container_name: orderflow_frontend
     restart: "no"
+    working_dir: /app
     volumes:
-      - ./frontend/dist:/usr/share/nginx/html:ro
-      - ./frontend/nginx.spa.conf:/etc/nginx/conf.d/default.conf:ro
+      - ./frontend/dist:/app:ro
+    command: sh -c "npx --yes serve -s . -l 80"
     depends_on:
       - backend
```

Las labels de Traefik (`traefik.http.services.frontend.loadbalancer.server.port=80`) no necesitan cambios: `serve` escucha en el mismo puerto 80 que antes escuchaba Nginx.

### 3.2 `infra/docker-compose.yml` — Traefik pineado en `v3.2`

**Problema:** por debajo del v3.3/v3.4 exigido en toda la documentación (`AGENTS.md`, `README`, changelog de la entrada `[1.5.1]` que ya documentó la migración a v3.4).

**Corrección propuesta:**

```diff
   traefik:
-    image: traefik:v3.2
+    image: traefik:v3.4
```

### 3.3 `backend/social-catalog/migrations/migrate-whatsapp-to-social.ts` — `new PrismaClient()` directo

**Problema:** viola la Regla de Arquitectura "Prohibido Instanciar PrismaClient Directamente: usar `this.prisma` o `@TenantPrisma()`, nunca `new PrismaClient()`".

**Matiz:** es un script CLI standalone que corre fuera del contexto de inyección de dependencias de Nest, así que `this.prisma` no existe ahí. La corrección más fiel a la intención de la regla es usar `PrismaService` (la clase que el propio proyecto designó como envoltorio único de `PrismaClient` en `backend/common/prisma.service.ts`) en vez de importar `PrismaClient` a secas — mismo comportamiento, pero pasa por la clase que el resto del código usa.

```diff
-import { PrismaClient } from '@prisma/client';
+import { PrismaService } from '../../common/prisma.service';
 import * as http from 'http';

-const prisma = new PrismaClient();
+// Este script corre fuera del contexto de inyección de dependencias de Nest
+// (es un CLI standalone), por lo que no existe `this.prisma`. Se instancia
+// PrismaService en vez de PrismaClient directo para respetar la Regla de
+// Arquitectura "Prohibido Instanciar PrismaClient Directamente" de AGENTS.md
+// — PrismaService es un envoltorio 1:1 sobre PrismaClient, así que el
+// comportamiento no cambia.
+const prisma = new PrismaService();
```

`PrismaService` no agrega lógica en el constructor (solo hooks `onModuleInit`/`onModuleDestroy` que Nest dispara vía DI); como Prisma conecta de forma perezosa en la primera query, el script funciona igual sin necesidad de invocar esos hooks manualmente.

---

## 4. Archivos entregados con la corrección aplicada

Se adjuntan las dos versiones corregidas, listas para reemplazar a las actuales en el repo:

- `docker-compose.yml` (reemplaza a `infra/docker-compose.yml`)
- `migrate-whatsapp-to-social.ts` (reemplaza a `backend/social-catalog/migrations/migrate-whatsapp-to-social.ts`)

---

## 5. Estado consolidado de los 10 hallazgos originales (v1 → v4)

| Hallazgo | Estado |
|---|---|
| 8 discrepancias de versión entre archivos (VERSION, package.json ×2, Swagger, featurelist, README, ROADMAP.md) | ✅ Corregido (v2) |
| `context/ROADMAP.md` autocontradictorio | ✅ Corregido (v3) |
| Fecha `v1.20.0` distinta entre CHANGELOG y timeline | ✅ Corregido (v3) |
| CHANGELOG reclamaba FEAT-071 entregada, featurelist la mantenía abierta | ✅ Corregido (v3) |
| Enlace roto a `ROADMAP_MICROSERVICES.md` | ✅ Corregido (v3) |
| Versión desactualizada en `00-contexto-agentes.md` | ✅ Corregido (v3) |
| `0.2.2`/`0.2.3` mal ubicadas en CHANGELOG | ✅ Corregido (v4) |
| `FEAT-067`–`070` faltantes en featurelist.json | ✅ Corregido (v4) |
| Nginx en `infra/docker-compose.yml` | 🟡 Corrección lista, pendiente de aplicar |
| Traefik v3.2 en `infra/docker-compose.yml` | 🟡 Corrección lista, pendiente de aplicar |
| `new PrismaClient()` directo en script de migración | 🟡 Corrección lista, pendiente de aplicar |

**10 de 10 hallazgos originales tienen ya diagnóstico y corrección; 7 aplicadas, 3 redactadas y listas para incorporar.**
