# Plan de Actualización v1.43.10 — Mejoras de UX en OmniGastro (botones y visibilidad de propinas/incentivos)

**Fecha:** 2026-10-28
**Rama:** `feat/omnigastro-ux-improvements`
**Versión target:** 1.43.10 (patch)
**Origen:** `docs/info/OmniGastro.md` - nuevas mejoras post v1.43.9

---

## 1. Análisis del Problema

Durante la prueba en producción v1.43.9, se reportaron 2 mejoras de UX:

| # | Síntoma | Módulo | Severidad |
|---|---------|--------|-----------|
| 1 | Botones en `/admin/gastro/mozos` necesitan mejoras de UX (iconos, colores) | `gastro.tsx` | Baja |
| 2 | El administrador puede habilitar/deshabilitar visibilidad de [Propinas Hoy: 0 Gs] e [Incentivos: 0 Gs] en `/admin/settings` | `settings.tsx`, `gastro.tsx` | Media |

---

## 2. Alcance de los Cambios

### 2.1 Mejora #1 — Botones con mejor UX en `/admin/gastro/mozos`

**Cambios:**
- 'Gestión de mesas y código QR' → 'Gestionar mesas' (texto más corto, mantener icono)
- 'Cargar pedidos' → color verde para resaltar
- 'Sincronizar' → color naranja

**Archivos:**
- `frontend/src/pages/admin/gastro.tsx` — Modificar labels y colores de botones

---

### 2.2 Mejora #2 — Visibilidad de Propinas e Incentivos configurable

**Cambios:**
- Agregar switch en `/admin/settings` → OmniGastro para habilitar/deshabilitar visibilidad de Propinas e Incentivos
- Almacenar en `tenant.config.gastro.showTips` y `tenant.config.gastro.showIncentives`
- En `/admin/gastro/mozos`, condicionar renderizado de [Propinas Hoy: 0 Gs] e [Incentivos: 0 Gs] según config

**Archivos:**
- `frontend/src/pages/admin/settings.tsx` — Agregar switches de visibilidad
- `frontend/src/pages/admin/gastro.tsx` — Condicionar renderizado de propinas/incentivos
- `backend/src/tenants/tenants.service.ts` — Asegurar que config.gastro se persista correctamente (ya soportado)

---

## 3. Estrategia de Testing

- **Unitarios:** Ninguno requerido (cambios de UI)
- **E2E:** Verificar que switches funcionan y que propinas/incentivos se muestran/ocultan
- **Smoke:** Health endpoint + endpoints críticos

---

## 4. Dependencias y Riesgos

- Sin dependencias externas
- Riesgo bajo: cambios solo de UI y config
- Sin migraciones de BD requeridas

---

## 5. Aprobación

**Estado:** ⏳ Pendiente de aprobación del usuario
**Implementador:** Kilo (IA)