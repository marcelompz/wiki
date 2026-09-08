# Plan: Mejoras de Social-Catalog — Ordenamiento, Etiquetas e Inventario

> **Módulo:** `social-catalog`  
> **Alcance:** Backend + Frontend  
> **Objetivo:** Mejorar la experiencia de compra y administración del catálogo social con ordenamiento explícito, etiquetas promocionales editables y alertas de inventario.

---

## 1. Ordenamiento de productos

### Problema actual
- Los productos se muestran en el orden que devuelve la base de datos o por `createdAt`.
- No existe una forma de elegir manualmente el orden ni de ordenar por precio, nombre o stock desde el catálogo público.

### Propuesta
- Reutilizar el campo `order` existente en `Product` para orden manual.
- Agregar ordenamiento por criterios en el catálogo público:
  - **Carta fisica** (usa el orden preestablecido por el Admin)
  - **Manual** (usa `order`)
  - **Precio: menor a mayor**
  - **Precio: mayor a menor**
  - **Nombre: A-Z**
  - **Stock: mayor a menor**

### Cambios técnicos
- **Backend:**
  - Exponer `order` en el DTO de producto del catálogo social.
  - Permitir query param `sortBy=manual|price_asc|price_desc|name|stock_desc` en `GET /api/v1/public/social-catalog/products`.
- **Frontend:**
  - Selector de ordenamiento en el catálogo público.
  - Drag & drop manual en el admin de social-catalog para reordenar productos.

### Criterios de aceptación
- [ ] El admin puede reordenar productos manualmente con drag & drop.
- [ ] El público puede cambiar el orden por precio, nombre o stock.
- [ ] El orden manual se mantiene al recargar la página.

---

## 2. Etiquetas editables en productos

### Problema actual
- No existe un sistema de etiquetas reutilizables.
- Si se quiere marcar un producto como "NUEVO" o "PROMOCIÓN", no hay un campo dedicado.

### Propuesta
- Crear un sistema de etiquetas por tenant, reutilizables en cualquier producto.
- Cada etiqueta tiene:
  - `name` (ej: NUEVO, PROMOCIÓN, AGOTADO)
  - `color` (color de fondo)
  - `textColor` (color del texto)
  - `active`
- Asignación many-to-many entre `Product` y `ProductLabel`.
- En el catálogo público, mostrar la etiqueta en la esquina superior izquierda del producto.
- En el admin, selector múltiple de etiquetas por producto.

### Cambios técnicos
- **Backend:**
  - Nuevos modelos Prisma: `ProductLabel` y `ProductLabelAssignment`.
  - Endpoints CRUD de etiquetas: `GET/POST /api/v1/social-catalog/labels`.
  - Endpoint de asignación: `POST /api/v1/social-catalog/products/:id/labels`.
  - Incluir etiquetas en la respuesta de `GET /api/v1/public/social-catalog/products`.
- **Frontend:**
  - Admin: gestión de etiquetas (crear, editar, eliminar) y selector por producto.
  - Público: mostrar etiquetas como badges en la esquina superior del producto.

### Criterios de aceptación
- [ ] El admin puede crear/editar/eliminar etiquetas.
- [ ] El admin puede asignar una o varias etiquetas a un producto.
- [ ] El público ve las etiquetas en la esquina superior del producto.
- [ ] Las etiquetas se renderizan con el color y texto definidos.

---

## 3. Alertas de inventario

### Problema actual
- El catálogo público muestra el precio, pero no advierte sobre stock bajo o agotado.
- El admin no recibe feedback visual cuando un producto está por agotarse.

### Propuesta
- Usar el campo `stockAvailable` de `Product` para mostrar estados:
  - **Agotado**: `stockAvailable <= 0` → mostrar "AGOTADO" + badge rojo.
  - **Última unidad**: `stockAvailable === 1` → mostrar "¡Última unidad!" + badge naranja.
  - **Stock bajo**: `stockAvailable <= 5` → mostrar "Pocas unidades" + badge amarillo.
  - **Disponible**: `stockAvailable > 5` → sin alerta.
- En el admin, filtrar productos por estado de stock.
- Opcionalmente, enviar notificación cuando un producto llega a 1 unidad.

### Cambios técnicos
- **Backend:**
  - No requiere cambios de schema, usa `stockAvailable`.
  - Agregar helper `getStockStatus(product)` que devuelve `{ status, label, color }`.
  - Incluir `stockStatus` en la respuesta pública de productos.
- **Frontend:**
  - Admin: badge de estado en la tabla de productos + filtro por estado.
  - Público: badge de stock en la tarjeta del producto.

### Criterios de aceptación
- [ ] El público ve "AGOTADO" cuando no hay stock.
- [ ] El público ve "¡Última unidad!" cuando queda 1.
- [ ] El público ve "Pocas unidades" cuando quedan <= 5.
- [ ] El admin puede filtrar productos por estado de stock.
- [ ] (Opcional) Notificación al admin cuando un producto llega a 1 unidad.

---

## Orden de implementación recomendado

1. **Inventario** — rápido, no requiere schema nuevo, impacto alto.
2. **Etiquetas** — requiere schema nuevo, pero es el valor más visible para el cliente.
3. **Ordenamiento** — complementa las dos anteriores, mejora la UX final.

---

## Riesgos y consideraciones

- **Riesgo:** Agregar tablas nuevas en producción requiere migración.
  - **Mitigación:** Generar migración automática con `prisma migrate dev` y probar en staging antes de deploy.
- **Riesgo:** El catálogo público puede crecer en complejidad UI.
  - **Mitigación:** Mantener badges simples y no saturar la tarjeta del producto.
- **Riesgo:** Performance al cargar etiquetas en productos.
  - **Mitigación:** Usar `include` en Prisma y caché de configuración en el frontend.

---

## Referencias

- `backend/prisma/schema.prisma` — modelo `Product`
- `frontend/src/pages/social-catalog.tsx` — catálogo público
- `frontend/src/pages/admin/social-catalog.tsx` — admin de catálogo
- `backend/src/social-catalog/social-catalog.service.ts` — lógica de negocio
