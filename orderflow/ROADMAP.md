# Roadmap - OmniFlow / OrderFlow

> **Mantenimiento:** este archivo refleja el plan vivo de producto. Cada Feature ID viene de `featurelist.json`.

## Versión actual: 1.20.3 (en curso)

### 🎯 Objetivo
- Mejorar la navegación mobile del Admin: drawer overlay, topbar compacto y bottom nav sin duplicación.
- Gestionar instancias Odoo y otros sistemas exclusivamente desde `/admin/deploy` (Infrastructure Deploy Manager).
- Depurar módulo Orders: máquina de estados, cancelación segura y confirmación idempotente.

### 🚀 Features activas
| ID | Título | Estado |
|----|--------|--------|
| FEAT-059 | Infrastructure Deploy Manager | `completed` |
| FEAT-060 | Manuales de usuario con Playwright | `completed` |
| FEAT-061 | Mobile Admin UX: Drawer Navigation + Topbar Compacto | `completed` |
| FEAT-062 | Orders Debug: state machine + cancel reversals + confirm idempotency | `completed` |

### 📅 Próximo hito
- `v1.20.3` — Orders debug: state machine, cancel reversals, confirm idempotent.
- `v1.21.0` — Extender manuales a otros flujos (Productos, POS, Catálogo Social).

## Versiones anteriores

### v1.20.3 — Orders Debug
- Máquina de estados en `updateStatus`: transiciones validadas (`DRAFT → CONFIRMED/CANCEELLED`, etc.).
- `cancel` seguro: bloquea cancelación de `DELIVERED`, repone stock, genera `cashMovement` de reversión (`OUT`), emite WS.
- `confirm` idempotente: si ya está `CONFIRMED`, devuelve el pedido sin error ni doble stock/caja.
- Tests ampliados: 17 casos en `orders.service.spec.ts`.

### v1.20.2 — Mobile Admin UX
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
