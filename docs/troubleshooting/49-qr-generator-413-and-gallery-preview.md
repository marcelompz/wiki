# 🛠️ Troubleshooting — QR Generator: 413 Request Entity Too Large y Galería sin Preview

> **Estado:** ✅ Resuelto  
> **Área:** Frontend / Backend / QR  
> **Módulos afectados:** QrGeneratorModal, ImagePicker, qr.controller  

---

## 🩺 Síntoma

- Al generar un QR **con imagen/logo**, el backend responde **`413 Request Entity Too Large`**.
- Si el logo se elige desde la **galería unificada**, la vista previa del QR **no muestra el logo**.
- Si el logo se **sube desde dispositivo**, el QR se genera, pero con el mismo riesgo de 413 si la imagen es grande.

---

## 🔎 Causa Raíz

1. **Frontend enviaba `logoBase64` al backend** dentro del body JSON del POST a `/api/v1/qr/generate` y `/api/v1/qr/preview`.
   - Cuando el usuario sube una imagen desde dispositivo, `handleLogoUpload` convierte el archivo a `data:image/...;base64,...` y lo guarda en el campo del form.
   - `handleGenerate` enviaba `values` completos, incluyendo ese base64, al backend.
   - Express, por defecto, limita el body JSON a **100KB**. Una imagen mediana en base64 supera ese límite y responde **413**.

2. **Backend no necesita `logoBase64`**. El servicio `qr.service.ts` genera el QR y devuelve el `dataUrl`. El overlay del logo se aplica **100% en el cliente** con `applyLogoToQr`. Por tanto, mandar `logoBase64` al backend es innecesario y contraproducente.

3. **Galería sin preview**: el `ImagePicker` del modal QR devolvía URLs directas del endpoint anterior (`/api/v1/social-catalog/images`), no base64. `handleImageSelect` guardaba la URL tal cual en `logoBase64`, pero `handleGenerate` solo aplicaba el logo si la cadena empezaba con `data:image`. Las URLs de galería no cumplían esa condición, así que el logo nunca se aplicaba en la preview.

---

## ✅ Solución Aplicada

### Frontend (`QrGeneratorModal.tsx`)

1. **No enviar `logoBase64` al backend**:
   - En `handleGenerate`, se descarta `logoBase64` y `logoSizePercent` del payload antes de hacer `api.post(...)`.
   - El backend solo recibe los campos que realmente necesita para generar el QR.

2. **Soportar galería unificada en preview**:
   - `handleImageSelect` ahora detecta URLs de galería (`http` o relativas) y las convierte a base64 localmente usando `fetch` + `FileReader`.
   - Si la conversión falla, hace fallback a la URL original, pero el caso normal es que el logo llegue como base64 al cliente.
   - Además, se amplió la condición de aplicación de logo para aceptar URLs `http` además de `data:image`.

3. **ImagePicker actualizado**:
   - El componente pasó a usar `/api/v1/uploads/gallery` como fuente única de imágenes del tenant.

### Backend (`qr.controller.ts`)

- Se agregó `FileInterceptor` en los imports para permitir extender el endpoint a multipart en el futuro si hace falta, aunque el flujo actual de QR no requiere files.
- La lógica del servicio no cambia porque nunca usó `logoBase64`.

---

## 📋 Lecciones Aprendidas

- **No mandes binarios/base64 al backend si el procesamiento es cliente-side.** El overlay de logo es responsabilidad del frontend; el backend solo debe generar el QR crudo.
- **Galería unificada**: cuando un módulo usa `/api/v1/uploads/gallery`, las imágenes vienen como URLs. Si el flujo cliente necesita base64 (para canvas, por ejemplo), hay que convertirla explícitamente.
- **Límites de body en Express**: el default de `express.json()` es ~100KB. Si algún día un endpoint sí necesita recibir algo pesado, aumentar el límite explícitamente con `express.json({ limit: '10mb' })`.

---

## 🔗 Referencias

- Frontend: `frontend/src/components/admin/QrGeneratorModal.tsx`
- ImagePicker: `frontend/src/components/admin/ImagePicker.tsx`
- Backend: `backend/src/qr/qr.controller.ts`
- Troubleshooting relacionado: [`docs/troubleshooting/46-qr-generator-ux-gaps.md`](../troubleshooting/46-qr-generator-ux-gaps.md)
- Troubleshooting galería unificada: [`docs/troubleshooting/48-shared-tenant-gallery.md`](../troubleshooting/48-shared-tenant-gallery.md)

---

## 📝 Historial

| Fecha | Cambio |
|-------|--------|
| 2026-08-21 | QR Generator 413 con logo; galería no alimenta preview. Solución: no enviar logoBase64 al backend, convertir URLs de galería a base64 localmente. |
