# Informe de Prueba E2E — OmniGastro Field Flow
**Fecha:** 2026-09-30  
**Versión:** 1.37.3  
**Ambiente:** `https://provecchio.local` (réplica local de Provecchio)  
**Ejecutor:** Playwright (chromium)  
**Duración:** 32.5s  
**Resultado:** ✅ PASSED

---

## Flujo Probado

Cliente (catálogo público) → Mozo (panel acceso + pedidos) → Cocina (KDS) → Admin (mesas)

### 1. Catálogo público — sin sesión
- **URL:** `/social-catalog`
- **Resultado:** Página carga correctamente.
- **Captura:** `e2e/screenshots/01-social-catalog.png`

### 2. Menú digital por mesa — sin sesión
- **URL:** `/social-catalog/menudigital?t=M01`
- **Resultado:** Página carga correctamente.
- **Captura:** `e2e/screenshots/02-menu-digital-m01.png`

### 3. Panel de acceso mozos — requiere autenticación
- **URL:** `/admin/gastro/mozos`
- **Resultado:** Página carga correctamente con panel de acceso.
- **Captura:** `e2e/screenshots/03-gastro-mozos-login.png`

### 4. Inicio de turno mozo (PIN)
- **Acción:** Ingreso de PIN en panel de mozos.
- **Resultado:** Flujo de PIN completado. Turno activo.
- **Captura:** `e2e/screenshots/05-gastro-mozos-active.png`

### 5. Panel gastro (pedidos)
- **URL:** `/admin/gastro`
- **Resultado:** Página carga correctamente.
- **Captura:** `e2e/screenshots/06-gastro-panel.png`

### 6. Pantalla KDS (cocina)
- **URL:** `/admin/kds`
- **Resultado:** Página carga correctamente con elementos de KDS.
- **Captura:** `e2e/screenshots/07-kds-panel.png`

### 7. Panel de mesas (admin)
- **URL:** `/admin/gastro/tables`
- **Resultado:** Página carga correctamente.
- **Captura:** `e2e/screenshots/08-gastro-tables.png`

---

## Capturas de Pantalla

### 1. Catálogo público
![01-social-catalog](e2e/screenshots/01-social-catalog.png)

### 2. Menú digital M01
![02-menu-digital-m01](e2e/screenshots/02-menu-digital-m01.png)

### 3. Panel acceso mozos
![03-gastro-mozos-login](e2e/screenshots/03-gastro-mozos-login.png)

### 4. Turno activo mozo
![05-gastro-mozos-active](e2e/screenshots/05-gastro-mozos-active.png)

### 5. Panel gastro
![06-gastro-panel](e2e/screenshots/06-gastro-panel.png)

### 6. KDS cocina
![07-kds-panel](e2e/screenshots/07-kds-panel.png)

### 7. Panel mesas admin
![08-gastro-tables](e2e/screenshots/08-gastro-tables.png)

---

## Notas

- El test ejecuta contra `https://provecchio.local` con SSL autofirmado (`ignoreHTTPSErrors: true`).
- Las capturas se almacenan en `frontend/e2e/screenshots/`.
- El flujo completo cliente → mozo → cocina → admin se verificó sin errores de navegación.
- Pendiente: completar interacciones de llamada al mozo, cobro y cierre de mesa cuando el flujo de Odoo POS esté disponible en el ambiente local.
- Reporte HTML interactivo: `frontend/playwright-report/index.html`
