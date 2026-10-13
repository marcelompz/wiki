# Troubleshooting #96 — Imágenes WebP de 0 Bytes por Advertencias Metadata JPEG en Sharp (`failOn: 'none'`)

## 📋 Síntomas

1. **Archivos `.webp` de 0 bytes en servidor de producción:**
   Al acceder a ciertas imágenes del catálogo público o social catalog (ej: `https://pesallaccia.com/api/v1/uploads/social-catalog/spa-wellness-001/1788033919475_lemon_prod_full.webp`), el navegador devuelve una imagen rota o archivo vacío de 0 bytes (`Content-Length: 0`).
2. **Archivos `.jpg` originales intactos:**
   En el sistema de archivos del servidor, la imagen original `.jpg` (ej: `1788033919475_lemon_prod_full.jpg`) existe y contiene los datos completos (34–100 KB), pero su versión `.webp` generada tiene 0 bytes.

---

## 🔍 Causa Raíz

1. **Umbral de Error Estricto de `sharp` (libvips):**
   Al procesar imágenes JPEG que contienen pequeñas discrepancias o advertencias no fatales en metadatos (ejemplo: `VipsJpeg: Corrupt JPEG data: 1 extraneous bytes before marker 0xd9`), `sharp` interrumpe el procesamiento y lanza una excepción si no se especifica `failOn: 'none'`.
2. **Escritura Directa no Atómica (`.toFile(fullPath)`):**
   El método `sharp(buffer).toFile(fullPath)` crea un descriptor de archivo de 0 bytes en la ruta de destino antes de volcar los bytes procesados. Si libvips lanza una excepción durante la decodificación del JPEG, el archivo `.webp` queda registrado en disco como un **archivo vacío de 0 bytes**.

---

## 🛠️ Solución Aplicada

1. **Configuración de Tolerancia `failOn: 'none'` & Escritura Atómica (`.tmp` + `fs.renameSync`):**
   Se actualizó [image-processing.service.ts](file:///opt/orderflow/backend/src/common/image-processing.service.ts) y [convert-existing-images-to-webp.ts](file:///opt/orderflow/backend/scripts/convert-existing-images-to-webp.ts) para:
   - Pasar la opción `{ failOn: 'none' }` a `sharp()`, permitiendo ignorar bytes extra o advertencias menores de codificación JPEG.
   - Escribir primero en un archivo temporal (`${fullPath}.tmp`) y mover atómicamente con `fs.renameSync()`, evitando dejar archivos incompletos o de 0 bytes en caso de cualquier error imprevisto.

2. **Reparación Directa de Archivos Afectados en Producción:**
   Se ejecutó la re-conversión de las imágenes JPEG originales afectadas en el contenedor backend de Hetzner:
   - `1788033919475_lemon_prod_full.webp` (36.6 KB ✅)
   - `1788032098768_breath_prod_full.webp` (34.1 KB ✅)
   - `1788032098818_lemon_prod_full.webp` (36.6 KB ✅)
   - `1788032098791_copaiba_prod_full.webp` (46.2 KB ✅)

---

## 🧪 Verificación
- `find /app/uploads -type f -size 0` en el contenedor `orderflow-backend-prod` devolvió 0 archivos.
- Todas las imágenes WebP del tenant `spa-wellness-001` fueron verificadas y devuelven HTTP 200 con contenido válido.
