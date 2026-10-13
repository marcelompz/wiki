# 🛠️ Troubleshooting — Galería Unificada de Imágenes del Tenant

> **Estado:** ✅ Resuelto  
> **Área:** Frontend / Backend / Arquitectura  
> **Módulos afectados:** social-catalog, biolinks, products, suppliers  

---

## 🩺 Síntoma

- En **social-catalog** la galería de imágenes del tenant está vacía o no coincide con las imágenes usadas en otros módulos.
- En **OmniBio (biolinks)** se mostraban correctamente las imágenes compartidas, pero **social-catalog** usaba un endpoint aislado.
- Al subir una imagen en un módulo, no aparecía en la galería de otro módulo del mismo tenant.

---

## 🔎 Causa Raíz

**Aislamiento innecesario de galería por módulo.**

- **OmniBio** usaba la galería unificada: `/api/v1/uploads/gallery` (backend común).
- **social-catalog** tenía su propio endpoint aislado: `/api/v1/social-catalog/images` que lee solo de `uploads/social-catalog/{tenantId}/`.
- Biolinks lee de `uploads/biolinks/{tenantId}/`, products de `uploads/products/{tenantId}/`, etc.

Cada módulo estaba leyendo solo su propia carpeta, generando silos de almacenamiento innecesarios.

---

## ✅ Solución Aplicada

1. **Unificar endpoint de galería**: Usar `/api/v1/uploads/gallery` (ya existente en `backend/src/common/uploads.controller.ts`) como fuente única de verdad para todos los módulos.
2. **Actualizar frontend de social-catalog**: Cambiar llamadas de `/api/v1/social-catalog/images` a `/api/v1/uploads/gallery`.
3. **Directriz técnica**: Todo módulo nuevo debe consumir `/api/v1/uploads/gallery` y no crear endpoints de imágenes aislados.

---

## 📋 Directriz para Nuevos Módulos

**OBLIGATORIO:** Todo módulo nuevo debe usar la galería unificada del tenant.

### Frontend
```typescript
// ✅ Correcto: galería unificada
const res = await api.get("/api/v1/uploads/gallery");
const images = res.data; // [{ filename, url, category, size, createdAt }]

// ❌ Incorrecto: endpoint aislado por módulo
const res = await api.get("/api/v1/social-catalog/images");
```

### Backend
```typescript
// ✅ Correcto: usar el controlador común
// GET /api/v1/uploads/gallery
// Ya implementado en backend/src/common/uploads.controller.ts

// ❌ Incorrecto: crear endpoint propio de imágenes
@Get('images')
async listTenantImages(...) { ... }
```

### Categorías de la Galería Unificada

El endpoint devuelve archivos organizados por categoría:
- `biolinks` — Imágenes de biolinks/avatar
- `social-catalog` — Imágenes de catálogo social
- `products` — Imágenes de productos
- `suppliers` — Imágenes de proveedores

Cada módulo puede filtrar por `category` si necesita mostrar solo sus propias imágenes, pero **siempre debe leer desde el endpoint unificado**.

---

## 🔗 Referencias

- **Backend unificado:** `backend/src/common/uploads.controller.ts` — `getUnifiedGallery()`
- **Social-catalog (frontend):** `frontend/src/pages/admin/social-catalog.tsx` — reemplazar `/api/v1/social-catalog/images` por `/api/v1/uploads/gallery`
- **OmniBio (referencia):** `frontend/src/pages/admin/biolinks.tsx` — ya usa `/v1/uploads/gallery`

---

## 📝 Historial

| Fecha | Cambio |
|-------|--------|
| 2026-08-21 | Diagnóstico: social-catalog usa galería aislada; se registra directriz de galería unificada |
