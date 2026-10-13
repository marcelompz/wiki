# **Prompt 05: QA & DevOps — Testing Integral, Benchmarks de Carga y Guía de Rollout**

**Código:** PROMPT-VIEW-05  
**Módulo:** Testing / Performance / Rollout  
**Ecosistema:** OmniFlow (Playwright, Jest, Artillery, Docker, GitHub Actions)  
**Propósito:** Validar de forma exhaustiva la integridad transaccional, el rendimiento bajo alta carga de datos y la cobertura E2E de toda la suite de gestión de vistas.

---

## **🤖 Rol y Contexto de Ingeniería**

Actúa como **QA Lead & Release Engineer** de OmniFlow. Vas a crear la suite de pruebas automatizadas en `frontend/e2e/data-view.spec.ts` y las pruebas de carga en `backend/test/load/data-view-load.yml`.

---

## **📋 Tareas de Implementación**

### ***1\. Pruebas End-to-End con Playwright (`frontend/e2e/data-view.spec.ts`)***

Implementar los siguientes flujos de prueba automatizados:

import { test, expect } from '@playwright/test';

test.describe('OmniFlow DataView Suite E2E', () \=\> {

  test.beforeEach(async ({ page }) \=\> {

    // Autenticación como Administrador

    await page.goto('/login');

    await page.fill('input\[name="email"\]', 'admin@provecchio.com');

    await page.fill('input\[name="password"\]', 'Password123\!');

    await page.click('button\[type="submit"\]');

    await page.waitForURL('/admin/products');

  });

  test('Flujo 1: Filtrado dinámico y sincronización con URL', async ({ page }) \=\> {

    // 1\. Abrir FilterBuilder y aplicar filtro de precio \>= 50000

    await page.click('\[data-testid="btn-open-filter-builder"\]');

    await page.selectOption('\[data-testid="filter-field-select"\]', 'price');

    await page.selectOption('\[data-testid="filter-operator-select"\]', 'gte');

    await page.fill('\[data-testid="filter-value-input"\]', '50000');

    await page.click('\[data-testid="btn-apply-filters"\]');

    // 2\. Verificar que la URL contiene el query param

    await expect(page).toHaveURL(/filter%5Bprice%5D%5Bgte%5D=50000/);

    // 3\. Recargar la página y verificar que el filtro persiste en la tabla

    await page.reload();

    const rows \= page.locator('.ant-table-row');

    await expect(rows.first()).toBeVisible();

  });

  test('Flujo 2: Selección global ("Select All Across Pages") y Exportación', async ({ page }) \=\> {

    // 1\. Marcar checkbox maestro de cabecera

    await page.click('.ant-table-thead input\[type="checkbox"\]');

    // 2\. Verificar aparición del SelectionBanner

    const banner \= page.locator('.selection-banner');

    await expect(banner).toContainText('están seleccionados');

    // 3\. Activar selección total de la base de datos

    await page.click('\[data-testid="btn-select-entire-database"\]');

    await expect(banner).toContainText('todos los');

    // 4\. Ejecutar acción de exportación

    await page.click('\[data-testid="bulk-action-export\_catalog"\]');

    await expect(page.locator('.ant-message-success')).toBeVisible();

  });

  test('Flujo 3: Persistencia de Columnas Visibles y Reordenamiento', async ({ page }) \=\> {

    // 1\. Abrir menú de visibilidad y desmarcar la columna "SKU"

    await page.click('\[data-testid="btn-column-visibility"\]');

    await page.uncheck('input\[value="sku"\]');

    // 2\. Verificar que la columna desaparece

    await expect(page.locator('.ant-table-cell:has-text("SKU")')).not.toBeVisible();

    // 3\. Recargar y comprobar persistencia desde LocalStorage

    await page.reload();

    await expect(page.locator('.ant-table-cell:has-text("SKU")')).not.toBeVisible();

  });

  test('Flujo 4: Guardar y restaurar Vistas Personalizadas (SavedViews)', async ({ page }) \=\> {

    // 1\. Aplicar filtro

    await page.fill('input\[placeholder="Buscar..."\]', 'Espresso');

    

    // 2\. Guardar vista

    await page.click('\[data-testid="btn-saved-views-dropdown"\]');

    await page.click('\[data-testid="btn-save-current-view"\]');

    await page.fill('\[data-testid="input-saved-view-name"\]', 'Filtro Espresso E2E');

    await page.click('\[data-testid="btn-confirm-save-view"\]');

    // 3\. Limpiar filtros y restaurar desde la vista guardada

    await page.click('\[data-testid="btn-clear-all-filters"\]');

    await page.click('\[data-testid="btn-saved-views-dropdown"\]');

    await page.click('text="Filtro Espresso E2E"');

    await expect(page.locator('input\[placeholder="Buscar..."\]')).toHaveValue('Espresso');

  });

});

---

### ***2\. Benchmarks de Rendimiento y Memoria***

Ejecutar pruebas con 100.000 registros sintéticos en PostgreSQL para garantizar:

| Métrica de Rendimiento | Umbral Máximo Permitido |
| :---- | :---- |
| **Tiempo de Respuesta API (GET con filtros compuestos)** | `< 180 ms` (p95) |
| **Consumo de Memoria RAM durante Exportación (50k filas)** | `< 120 MB` constantes |
| **Tiempo de Renderizado Inicial en Frontend (100 filas)** | `< 80 ms` |
| **Latencia de Sincronización WebSocket (Export Done)** | `< 100 ms` |

---

### ***3\. Checklist de Rollout a Producción***

- [ ] Migración Prisma `saved_views` ejecutada en staging y producción.  
- [ ] Índices compuestos en PostgreSQL creados para campos frecuentes (`tenant_id`, `created_at`, `status`, `sku`).  
- [ ] Worker BullMQ de exportación desplegado con concurrency=4 y Redis persistente.  
- [ ] Tests de regresión en POS y App Móvil para asegurar que ningún endpoint existente fue alterado.

