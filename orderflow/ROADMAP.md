# Roadmap - OmniFlow / OrderFlow

> **Mantenimiento:** este archivo refleja el plan vivo de producto. Cada Feature ID viene de `featurelist.json`.

## Versión actual: 1.20.5 (en curso)

### 🎯 Objetivo
- Extraer Social Catalog a microservicio standalone con schema Prisma propio.
- Depurar módulo Orders: máquina de estados, cancelación segura y confirmación idempotente.
- Decoupling de schema Prisma: Fase 0 documentada + Fase 1 Giveaways standalone + Fase 2 Social Catalog standalone.

### 🚀 Features activas
| ID | Título | Estado |
|----|--------|--------|
| FEAT-059 | Infrastructure Deploy Manager | `completed` |
| FEAT-060 | Manuales de usuario con Playwright | `completed` |
| FEAT-061 | Mobile Admin UX: Drawer Navigation + Topbar Compacto | `completed` |
| FEAT-062 | Orders Debug: state machine + cancel reversals + confirm idempotency | `completed` |
| FEAT-063 | Orders Debug: create channel validation, /me endpoint, findOne 404, dbClient multi-tier | `completed` |
| FEAT-064 | Schema Decoupling: Fase 0 multi-file layout + Fase 1 Giveaways standalone | `completed` |
| FEAT-065 | Schema Decoupling: Social Catalog + Bio-Links standalone extraction | `completed` |

### 📅 Próximo hito
- `v1.20.5` — Schema decoupling: Social Catalog standalone extraído con schema Prisma propio.
- `v1.21.0` — Extender manuales a otros flujos (Productos, POS, Catálogo Social).

## Versiones anteriores

### v1.20.5 — Schema Decoupling: Social Catalog Standalone
- Schema monolítico: eliminado `MessagingChannel` enum y modelo `CatalogChannelConfig`.
- `RetentionRule.channel` cambiado a `String` + agregado campo `config Json?`.
- Adapters de mensajería desacoplados del Prisma monolítico.
- Social Catalog Standalone (`services/social-catalog-standalone/`): schema Prisma propio, cliente aislado, endpoints CRUD de canales.
- Core usa proxy HTTP hacia standalone para operaciones de canales.
- Validación completa: 580 tests, builds limpios, E2E QA OK.

### v1.20.4 — Schema Decoupling + Orders Debug
- Schema Decoupling Fase 0: bounded contexts documentados en `backend/prisma/schema.prisma`.
- Fase 1 Giveaways standalone: schema creado en `services/giveaways-standalone/prisma/schema.prisma`.
- Schema PostgreSQL `giveaways` creado en producción con tablas migradas.
- Orders Debug: máquina de estados, cancelación segura, confirmación idempotente, create channel validation, /me endpoint.

### v1.20.3 — Mobile Admin UX
- Mobile admin drawer navigation: `Sidebar` como `Drawer` overlay en mobile.
- `Topbar` compacto en mobile: hamburger, tenant name truncado, theme toggle, Ver Tienda icon-only.
- `MobileBottomNav` con 5 destinos frecuentes y `safe-area-inset-bottom`.
- Desktop sin regresiones: `Sider` colapsable mantiene comportamiento.

### v1.20.0 — Infrastructure Deploy Manager
- Deploy multi-sistema desde Super Admin.
- Odoo: ejecución de `deploy.sh` real, post-deploy `orderflow_connect`, informe con credenciales.
- Traefik: rutas dinámicas file provider.
- SSH: ejecución remota real.

### v1.19.0 — Rebranding OmniFlow
- Marca pública OmniFlow.
- Capa técnica preservada como OrderFlow.
