# Plan de Desacoplamiento de Schemas (Schema Decoupling) — OrderFlow / OmniFlow

> **Estado:** En progreso  
> **Versión:** 1.20.9  
> **Última actualización:** 2026-08-14

---

## 1. Objetivo

Separar los bounded contexts del monolito OrderFlow en microservicios standalone con schema Prisma propio, manteniendo retrocompatibilidad en rutas `v1` y permitiendo despliegues independientes.

---

## 2. Bounded Contexts Identificados

| Contexto | Schema Actual | Owner | Tabla Principal |
| :--- | :--- | :--- | :--- |
| **Platform Core** | `backend/prisma/schema.prisma` | Backend | `tenants`, `users`, `roles`, `subscriptions` |
| **Commerce Core** | `backend/prisma/schema.prisma` | Backend | `products`, `orders`, `order_lines`, `payments` |
| **Social Catalog** | Extraído Fase 2 | `social-catalog-standalone` | `catalog_channel_configs` |
| **Bio-Links** | Extraído Fase 3 | `biolinks-standalone` | `bio_links`, `bio_link_clicks` |
| **Giveaways** | Preparado Fase 0 | `giveaways-standalone` | `giveaways`, `giveaway_participants` |

---

## 3. Criterios de Extracción

1. **Schema Ownership:** Cada microservicio debe tener su propio schema PostgreSQL y cliente Prisma aislado.
2. **Zero Downtime:** Usar proxy/core controllers durante la transición.
3. **Data Consistency:** Migración one-way + dual-write opcional.
4. **Retrocompatibilidad:** Mantener rutas legacy `/api/v1/*` mientras se completa la migración.

---

## 4. Fases de Ejecución

### Fase 0 — Giveaways (Preparada)
- Schema standalone creado en `services/giveaways-standalone/prisma/schema.prisma`.
- Cliente Prisma aislado generado (`giveaways-client`).
- Script de migración idempotente en `services/giveaways-standalone/scripts/migrate-from-core.ts`.
- Validación completa: `prisma validate` + `prisma generate` + `init.sh` (580 tests, builds limpios, E2E QA OK).

### Fase 1 — Preparada (pendiente migración de datos + cut-over)
- Schema standalone validado y cliente generado (`giveaways-client`).
- `.env.example` y configuración lista.
- Próximo paso: crear schema PostgreSQL `giveaways`, ejecutar migración y dual-write.

---

## 12. Mapeo de Rebranding OmniFlow en la Arquitectura Standalone (FEAT-066)

Para sincronizar la estrategia de desinstalación/desacoplamiento de schemas con el rebranding oficial de **OmniFlow**, la denominación de los microservicios standalone adoptará los siguientes alias sin romper compatibilidad técnica con las tablas y rutas legacy:

| Módulo Legacy / Monolito | Nombre Comercial Oficial | Directorio Standalone Target | Alias de API Gateway (Traefik/NestJS) | URL de Acceso Directo |
| :--- | :--- | :--- | :--- | :--- |
| Core Monolítico | **OmniCore** | `backend/` / `services/omnicore-standalone/` | `/api/v1/core/*` | `https://<domain>/admin` |
| Social Catalog / WhatsApp Catalog | **OmniCatalog** | `services/omnicatalog-standalone/` *(antes social-catalog-standalone)* | `/api/v1/omnicatalog/*` -> `/api/v1/standalone/social-catalog/*` | `https://<domain>/admin/social-catalog` |
| Bio-Links | **OmniBio** | `services/omnilinks-standalone/` *(antes biolinks-standalone)* | `/api/v1/omnilinks/*` -> `/api/v1/bio/*` | `https://<domain>/admin/biolinks` |
| Bookings | **OmniBookings** | `services/omnibookings-standalone/` | `/api/v1/omnibookings/*` -> `/api/v1/bookings/*` | `https://<domain>/admin/bookings` |
| POS Drawer | **OmniPOS** | `services/omnipos-standalone/` | `/api/v1/omnipos/*` -> `/api/v1/pos/*` | `https://<domain>/admin/pos` |
| Integraciones / Odoo Adapter | **OmniSync** | `services/omnisync-standalone/` *(antes odoo-adapter)* | `/api/v1/omnisync/*` | `https://<domain>/admin/integrations` |

**Nota sobre coexistencia con FEAT-065:**  
FEAT-065 continúa en desarrollo para asegurar que la extracción lógica de esquemas Prisma de Social Catalog y Bio-Links finalice limpiamente. Los renombramientos de carpetas físicas en `services/` se realizarán mediante alias symlink o migración gradual manteniendo retrocompatibilidad en rutas `v1`.

---

## 13. Acceso Directo a Servicios Omni (Redirección sin Configuración Adicional)

Desde el panel admin o Traefik, se puede acceder directamente a cada módulo sin configuración independiente adicional:

| Servicio Omni | Ruta Admin (Frontend) | Ruta API Directa | Puerto Local (Standalone) |
| :--- | :--- | :--- | :--- |
| OmniBio | `/admin/biolinks` | `/api/v1/bio` | `3022` |
| OmniCatalog | `/admin/social-catalog` | `/api/v1/standalone/social-catalog` | `3021` |
| OmniBookings | `/admin/bookings` | `/api/v1/bookings` | `3023` |
| OmniPOS | `/admin/pos` | `/api/v1/pos` | `3010` (core proxy) |
| OmniSync | `/admin/integrations` | `/api/v1/omnisync` | segun config |

**Implementación:**
- Frontend admin mantiene las rutas legacy (`/admin/biolinks`, `/admin/social-catalog`, etc.) como acceso único.
- Backend/Traefik enruta automáticamente al microservicio standalone correspondiente.
- No se requiere configuración adicional por tenant; el acceso es inmediato.

---

*Documento vivo. Actualizar al completar cada fase.*
