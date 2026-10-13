# 🛠️ Troubleshooting #134: Módulos de OmniGastro (POS Gastro, Caja Gastro, Mozo, Salones) no Visibles en Sidebar

## 📋 Información General
- **Área:** Frontend / Admin App / Sidebar Navigation / OmniGastro
- **Síntoma:** En la sección **6. OMNIGASTRO** del menú lateral (Sidebar), solo figuraba la opción de **Cocina & Bar (KDS Táctil)**, faltando el **Panel Gastro / POS Gastro**, **POS Cajero (Caja Gastro)**, **Comandero Móvil (Mozo / Waiter App)** y **Salones & Mapa de Mesas**.
- **Estado:** ✅ Resuelto

---

## 🔍 Causa Raíz
En `frontend/src/AdminApp.tsx`, el arreglo de módulos core permitidos por defecto (`defaultCoreModules`) dentro del método `isModuleActive` contenía `'kds'`, pero omitía la clave `'gastro'`.

Dado que las opciones de **Panel Gastro**, **POS Cajero (Caja)**, **Mozo** y **Salones & Mapa de Mesas** están asociadas a `moduleId: 'gastro'`, cuando la API devolvía la lista de módulos instalados (`installedModules`) para el tenant, al no ser `gastro` una extensión standalone instalada individualmente (sino un módulo core de la plataforma), `isModuleActive('gastro')` retornaba `false`. Sin embargo, `isModuleActive('kds')` retornaba `true` al figurar `'kds'` en `defaultCoreModules`.

---

## 🛠️ Solución Aplicada

1. **`frontend/src/AdminApp.tsx`:**
   Se incorporó `'gastro'` a la lista `defaultCoreModules` en `isModuleActive`.

2. **`frontend/src/components/Sidebar.tsx`:**
   Se sincronizó la lista `defaultCoreModules` dentro de `canShowItem` para incluir `'gastro'`, `'kds'` y todos los demás módulos core del sistema.

---

## 🧪 Verificación
- Verificación de tipos limpia mediante `npx tsc --noEmit` en `frontend/` (0 errores de compilación).
- Todos los ítems del menú **6. OMNIGASTRO** (POS Gastro, POS Cajero, Comandero Móvil / Mozo, Salones & Mesas, KDS, Incentivos) quedan habilitados y visibles.
