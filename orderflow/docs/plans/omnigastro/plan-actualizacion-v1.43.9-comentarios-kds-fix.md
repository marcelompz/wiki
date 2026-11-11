# Plan de Actualización v1.43.9 — Comentarios en POS + KDS Fixes

**Fecha:** 2026-10-27
**Rama:** `fix/omnigastro-comentarios-kds`
**Versión target:** 1.43.9 (patch)
**Origen:** `docs/info/OmniGastro.md` - prueba en producción v1.43.8

---

## 1. Análisis del Problema

Durante la prueba en producción v1.43.8 (desplegada en `provecchio.com`, host `192.168.69.240`), se reportaron 4 problemas:

| # | Síntoma | Módulo | Severidad |
|---|---------|--------|-----------|
| 1 | El mozo no puede volver a abrir el POS desde la lista de mesas atendidas | `gastro.tsx` | Media |
| 2 | El POS no permite agregar comentarios a los pedidos | `gastro-pos.tsx` | Alta |
| 3 | El KDS no muestra el número de mesa | `kds.tsx` | Media |
| 4 | Filtro incorrecto en el KDS (muestra comidas en barra, bebidas en cocina) | `kds.tsx` | Media |

---

## 2. Alcance de los Cambios

### 2.1 Frontend
| Archivo | Cambio |
|---------|--------|
| `frontend/src/pages/admin/gastro.tsx` | Agregar botón "Reabrir POS" en cada mesa atendida |
| `frontend/src/pages/admin/gastro-pos.tsx` | Agregar/comments rápidos + campo de texto libre |
| `frontend/src/pages/admin/kds.tsx` | Mostrar número de mesa + corregir filtro por estación |

### 2.2 Backend
| Archivo | Cambio |
|---------|--------|
| `backend/src/orders/orders.service.ts` | Persistir comentarios en `Order.metadata.comments` |
| `backend/prisma/schema.prisma` | Nueva tabla `OrderComment` (opcional, metadata es suficiente por ahora) |

### 2.3 Documentación
| Archivo | Cambio |
|---------|--------|
| `docs/troubleshooting/211-comentarios-kds-fix.md` | Causa raíz y solución |
| `docs/plans/omnigastro/PLAN_FEAT-211-comentarios-y-kds-fix.md` | Este documento |

---

## 3. Estrategia de Testing

- **Unitarios:** OrdersService - saveComments
- **E2E:** Flujo de comentarios + KDS
- **Smoke:** Health endpoint + endpoints críticos

---

## 4. Dependencias y Riesgos

- Sin dependencias externas
- Riesgo bajo: cambios solo en frontend y metadata de órdenes
- Sin migraciones de BD requeridas (usamos `Order.metadata` JSON existente)

---

## 5. Aprobación

**Estado:** ✅ Aprobado por el usuario (2026-10-27 21:30)
**Implementador:** Kilo (IA)