# Troubleshooting #157 — Acceso a Galería perdido en sidebar del admin

## Fecha
2026-09-23

## Síntoma
La entrada **Galería de Imágenes y Multimedia** (`/admin/gallery`) desaparece del sidebar del panel de administración. El usuario pierde acceso rápido a la carga por lote de imágenes, aunque la página y el endpoint siguen existiendo.

## Causa raíz
`Sidebar.tsx` quedó desincronizado de `AdminApp.tsx` y `gallery.tsx`: la ruta y la página existen, pero no hay ítem de menú para `/admin/gallery` dentro de `GROUPS`.

## Solución aplicada
Agregar el ítem en `frontend/src/components/Sidebar.tsx`:

```ts
{ key: '/admin/gallery', label: 'Galería de Imágenes y Multimedia', icon: '🖼️' }
```

## Prevención
- Al agregar rutas en `AdminApp.tsx`, verificar que también existan en `Sidebar.tsx`.
- Incluir la verificación de rutas del sidebar en `scripts/qa_e2e_check.py` si se agrega navegación directa.

## Estado
✅ Resuelto
