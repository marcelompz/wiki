# Roadmap - OmniFlow / OrderFlow

> **Mantenimiento:** este archivo refleja el plan vivo de producto. Cada Feature ID viene de `featurelist.json`.

## Versión actual: 1.20.6 (en curso)

### 🎯 Objetivo
- Fix root domain landing: root `/` renders `LandingBioLinksCatalog` instead of e-commerce catalog when logged in.
- Troubleshooting entry for BUG #36 documented.

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
| FEAT-066 | Rebranding OmniFlow: Mapeo de Nombres & Microservicios Standalone | `completed` |
| FEAT-067 | Backups & Disaster Recovery: SFTP Explorer, Restauración & Purga | `completed` |
| FEAT-068 | Multi-Tenant User Management: Asignación Masiva de Tenants & Roles | `completed` |
| FEAT-069 | Personalización de UX/UI Multi-Nivel: Defaults de Tenant & Perfil de Usuario | `completed` |
| FEAT-070 | Sistema Híbrido de Íconos Sociales: Sincronización CDN, Almacenamiento Local Offline & Componentes React | `completed` |
| FEAT-071 | Módulo OmniFlow BI (Analytics Hub: Ingesta Histórica Odoo 14 Provecchio - Caballo de Troya) | `in_progress` (Primera tarea mañana) |

### 📅 Próximo hito
- `v1.20.10` — Backups SFTP (FEAT-067) + Usuarios Multi-Tenant (FEAT-068) + UX/UI Multi-Nivel (FEAT-069) + Íconos Sociales Offline/CDN (FEAT-070).
- `v1.21.0` — Extender manuales a otros flujos (Productos, POS, Catálogo Social) + Módulo OmniFlow BI (Analytics & Decision Intelligence) (FEAT-071).

## Versiones anteriores

### v1.20.6 — Root Domain Landing Fix + Troubleshooting
- Fixed root domain `/` rendering e-commerce catalog instead of spearhead landing `LandingBioLinksCatalog` when user is logged in.
- Added troubleshooting entry `36-root-domain-ecommerce-vs-landing-bug` with symptoms, root cause, and solution.

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
