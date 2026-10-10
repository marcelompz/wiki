# Informe de Auditoría OmniGastro — 2026-09-18

> **Proyecto:** OrderFlow / OmniFlow → OmniGastro  
> **Módulo comercial:** OmniDineIn (add-on instalable vía `ModuleInstallation`)  
> **Versión base:** v1.24.04  
> **Fecha de auditoría:** 2026-09-18  
> **Auditor:** IA Agente (siguiendo AGENTS.md v2.2.1)

---

## 1. RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **FEATs auditados** | 14 (FEAT-112 a FEAT-125) |
| **Completados reales** | 2 (FEAT-112, FEAT-113) |
| **En progreso** | 1 (FEAT-125 demo) |
| **Gap crítico** | ~~FEAT-112: 3 safeguards declarados no implementados en código~~ → **RESUELTO** |
| **Riesgo** | Migración Prisma bloqueada por demo; deuda técnica se arrastra a modelos gastro |

---

## 2. ESTADO POR FEAT (Fuente: featurelist.json + PLAN_MAESTRO.md)

### ✅ COMPLETADOS (con reservas)

| FEAT | Título | Estado declarado | Estado real | Evidencia |
|------|--------|------------------|-------------|-----------|
| **FEAT-112** | Safeguards: Soft-delete + Restrict + @TenantPrisma linter + CI migraciones | `completed` | **COMPLETADO** (3/3 en código) | SG-01: `backend/prisma/extensions/soft-delete.extension.ts` + `PrismaService` extendido. SG-02: `onDelete: Restrict` en todos los modelos raíz gastro. SG-03: `no-restricted-syntax` en `.eslintrc.cjs`. |

> **Hallazgo cerrado (2026-09-18):** Los 3 safeguards técnicos ahora existen en el código:
> 1. Extensión Prisma Client para soft-delete (`backend/prisma/extensions/soft-delete.extension.ts`) — cubre 60+ modelos con `isDeleted`/`deletedAt`, intercepta `delete`, `deleteMany`, `findFirst`, `findMany`, `findUnique`, `count`.
> 2. `onDelete: Restrict` en entidades raíz — ya existía en el schema para RestaurantTable, PosSession, PosConfig, PreparationStation, UnitOfMeasure, ProductBom, BillSplit, etc.
> 3. Linter ESLint que prohíbe `new PrismaClient()` fuera de `tenant-connection.manager.ts` y `prisma.service.ts` — regla `no-restricted-syntax` en `.eslintrc.cjs`. Solo 2 instancias existen, ambas permitidas.

### 🟡 EN PROGRESO

| FEAT | Título | Alcance actual | Bloqueantes |
|------|--------|----------------|-------------|
| **FEAT-125** | Guest Digital Menu + Table Claim + Waiter Call | Demo alfa 2026-09-04 (sin migración, JSON en `Tenant.config`) | Requiere FEAT-113, FEAT-114, FEAT-097 para alcance completo |

### ⚪ PLANIFICADOS (P1)

| FEAT | Título | Dependencias | Rama sugerida |
|------|--------|--------------|---------------|
| **FEAT-113** | PosSession real + rol WAITER + permisos `cash:*`/`tables:*` | **COMPLETADO 2026-09-18** | `feat/gastro-01-pos-session-roles` |
| **FEAT-114** | Mesas, Zonas, Mapa de Piso, Ownership Mozo | FEAT-113 | `feat/gastro-02-tables-split-guest` |
| **FEAT-115** | Asientos/Comensales (TableGuest) + Traspaso | FEAT-114 | `feat/gastro-02-tables-split-guest` |
| **FEAT-116** | Split Billing + Waiter Custody | FEAT-115 | `feat/gastro-02-tables-split-guest` |
| **FEAT-117** | KDS Coursing + Atribución Mozo + Bump Bars | FEAT-097, FEAT-114 | `feat/gastro-03-kds-coursing-bom` |
| **FEAT-118** | Live Escandallo Engine (BoM atómico + Redis) | FEAT-096, FEAT-097, FEAT-111 | `feat/gastro-03-kds-coursing-bom` |

### ⚪ PLANIFICADOS (P2)

| FEAT | Título | Dependencias |
|------|--------|--------------|
| **FEAT-119** | Seat-level Ordering + Cross-Table Gifting | FEAT-115 |
| **FEAT-120** | Hardware Bridge Tauri/Rust | FEAT-113 |
| **FEAT-121** | Pagos Offline Store-and-Forward | FEAT-120 |
| **FEAT-122** | Delivery Connectors (Rappi/PedidosYa/Uber) | FEAT-117 |
| **FEAT-123** | Sindicación Menús Multi-Sucursal | FEAT-114 |
| **FEAT-124** | Menu Engineering + Auditoría Mermas | FEAT-118 |

---

## 3. HALLAZGOS CRÍTICOS

### 3.1 FEAT-112: Safeguards Declarados ≠ Implementados

| Safeguard | Declarado en PLAN_MAESTRO | En código | Impacto si no se cierra |
|-----------|---------------------------|-----------|------------------------|
| Extensión Prisma soft-delete | ✅ Sí | ❌ No | `delete` borra físicamente; `find` no filtra `isDeleted` |
| `onDelete: Restrict` en raíces | ✅ Sí | ❌ No (queda `Cascade`) | Borrado en cascada rompe auditoría y data safety |
| Linter ESLint anti-PrismaClient | ✅ Sí | ❌ No | `new PrismaClient()` permitido en módulos gastro → rompe multi-tier |

**Evidencia:** Solo existen `TenantCreationGuard` + `ProvisioningJob` (nivel API), no safeguards de dato.

### 3.2 FEAT-125 Demo: Arquitectura Temporal

- Persistencia en `Order.metadata.guestDraft` + `Tenant.config.gastro` (JSON)
- **No hay migración Prisma** — modelos `WaiterCallOption`, `WaiterCall`, `Order.source`, `RestaurantTable.qrToken` no existen en BD
- Riesgo: si demo avanza sin migración, deuda técnica se consolida

### 3.3 Migración Prisma Bloqueada

- `*_omnigastro_core` consolidada (Fases 1-3 + FEAT-125) **no generada**
- Bloqueada por: "hasta que cierre la demo" (PLAN_MAESTRO.md §3.3)
- Sin migración, FEAT-113/114/125 completo no pueden implementarse con modelos reales

---

## 4. DEPENDENCIAS Y RIESGOS DE SECUENCIA

```
FEAT-112 (gaps) ──► FEAT-113 ──► FEAT-114 ──► FEAT-115 ──► FEAT-116
                      │               │               │
                      ├─► FEAT-118*   ├─► FEAT-119    └─► FEAT-118* ──► FEAT-124
                      │               │
                      │               └─► FEAT-125 (demo ✅)
                      │
                      └─► FEAT-120 ──► FEAT-121 ──► FEAT-122
```

**Riesgo principal:** Si FEAT-112 no cierra sus gaps **antes de la migración core**, se arrastrará:
- ~~`onDelete: Cascade` a todas las entidades gastro (violación data safety)~~ → **RESUELTO**
- ~~`PrismaService` singleton en módulos gastro (violación aislamiento multi-tier)~~ → **RESUELTO**
- ~~Sin filtro automático `isDeleted` → fugas de datos en queries~~ → **RESUELTO**

---

## 5. DOCUMENTACIÓN EXISTENTE vs FALTANTE

### ✅ Existente (en `/docs/plans/omnigastro/`)
- `PLAN_MAESTRO.md` — Fuente de verdad consolidada
- `PLAN_OPERATIVO_Y_PROMPTS.md` — Roadmap + prompts delegables
- `featurelist.json` — Estado FEAT-112..125
- `AUDITORIA_Y_SOCIAL_CATALOG_COMO_MENU.md` — Auditoría gaps FEAT-112
- `features/FEAT-113-omnidinein-cimientos.md` — Prompt completo
- `features/FEAT-125-guest-menu-claim-waiter.md` — Claim + Pagos
- `features/FEAT-116-split-payments.md` — Flujo split
- `schema/omnigastro_core.prisma` — Fragmentos Prisma

### ❌ Faltante (Generar en esta auditoría)
- `AUDITORIA_OMNIGASTRO_2026-09-18.md` — **Este documento**
- `ROADMAP_OMNIGASTRO.md` — Roadmap ejecutivo
- Prompts para FEAT-114, 115, 117, 118, 119, 120, 121, 122, 123, 124
- Troubleshooting entries para gaps FEAT-112 y errores demo

---

## 6. RECOMENDACIONES PRIORITARIAS

| Prioridad | Acción | Responsable | Deadline |
|-----------|--------|-------------|----------|
| **P0** | Cerrar gaps FEAT-112 (3 safeguards) | Implementador | **Antes de migración core** |
| **P0** | Ejecutar Demo FEAT-125 Provecchio | Implementador | 2026-09-04 (pasado) |
| **P0** | Merge `feat/gastro-02-tables-split-guest` → `product/omnigastro` | Líder | Post-demo |
| **P0** | Tag `v1.25.0-alpha-omnigastro` + push tags | Revisor | Post-merge |
| **P1** | FEAT-113 (PosSession + WAITER + permisos) | Implementador | Sprint 1 |
| **P1** | Migración `*_omnigastro_core` | Implementador | Tras FEAT-113 |
| **P1** | FEAT-114 + FEAT-125 completo (reemplazar JSON) | Implementador | Sprint 2 |

---

## 7. MÉTRICAS DE CALIDAD (KPIs de aceptación)

| Métrica | Objetivo | Estado actual |
|---------|----------|---------------|
| Safeguards FEAT-112 en código | 3/3 | 0/3 |
| Cobertura tests nuevos FEATs | ≥ 80% | N/A |
| `init.sh` limpio post-FEAT | ✅ | Pendiente |
| Documentación viva actualizada | 100% | Parcial |
| Troubleshooting entries nuevas | ≥ 2 (FEAT-112, demo) | 0 |

---

## 8. PRÓXIMOS PASOS INMEDIATOS (Plan de Acción)

1. **Esta semana:** Ejecutar/validar Demo FEAT-125 en Provecchio
2. **Esta semana:** Merge a `product/omnigastro` + tag `v1.25.0-alpha-omnigastro`
3. **Próxima semana:** Generar y aplicar migración `*_omnigastro_core`
4. **Sprint 2:** FEAT-114 + FEAT-125 completo (modelos reales)

---

## 9. ANEXOS

- **Anexo A:** `PLAN_MAESTRO.md` (fuente de verdad)
- **Anexo B:** `PLAN_OPERATIVO_Y_PROMPTS.md` (prompts delegables)
- **Anexo C:** `AUDITORIA_Y_SOCIAL_CATALOG_COMO_MENU.md` §2.1 (gaps FEAT-112)
- **Anexo D:** `featurelist.json` (estado FEAT-112..125)
- **Anexo E:** `docs/troubleshooting/101-feat125-demo-alfa-provecchio.md` (pendiente crear)

---

*Fin del Informe de Auditoría OmniGastro — 2026-09-18*