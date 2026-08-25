# 🛠️ Troubleshooting #46 — QR Generator UX Gaps: Selector Faltante, Sin Acceso a Galería, Sin Vista Previa en ImagePicker

## 📅 Fecha
2026-08-19

## 🎯 Síntoma
El modal **Generador de QR** presentaba múltiples problemas de UX:

1. **Sin selector de sección** — El modal mostraba siempre la primera pestaña ("URL personalizada") al abrirse, sin permitir elegir qué tipo de QR generar (OmniCatalog, OmniBio, Producto, etc.)
2. **Campo `catalogSlug` requerido pero inexistente** — Para tipo CATALOG pedía `catalogSlug` obligatorio, pero OmniCatalog **no tiene campo slug**; usa el **subdominio del tenant**
3. **Sin botón "Galería" en logo** — Solo permitía subir archivo (`Upload`), sin acceso a la galería de imágenes del tenant
4. **ImagePicker sin vista previa** — La galería mostraba grid de imágenes pero **no tenía modal de vista previa ampliada** al clickear/doble-clickear una imagen (mismo problema que en OmniBio/Biolinks)

---

## 🔍 Causa Raíz
1. **Tabs hardcodeados** — `Tabs` con `items` fijos, primer tab siempre "URL"; no había lógica para preseleccionar tab según `initialType`
2. **Campo `catalogSlug` hardcodeado** — En `buildPayload` (backend) validaba `catalogSlug` obligatorio para CATALOG, pero OmniCatalog **no tiene slug**; usa **subdominio del tenant** (`/social-catalog`)
3. **Falta botón Galería** — Solo había `Upload` para subir archivo; faltaba botón "Galería" que abra `ImagePicker`
4. **ImagePicker incompleto** — Solo grid de imágenes con selección simple; faltaba **modal de vista previa ampliada** (doble-click + botón zoom), igual que el bug previo en OmniBio/Biolinks

---

## ✅ Solución Aplicada

### 1. QR Modal - Selector dinámico + campo contextual
- **`typeOptions` actualizado**: Labels claros ("📱 Catálogo Social (OmniCatalog)", "🔗 Biolink (OmniBio)")
- **Tabs dinámicos**: Según tipo seleccionado, muestra campo correspondiente:
  - `catalog` → Alerta "Usa el subdominio del tenant. No requiere slug" + campo opcional `catalogSlug`
  - `biolink` → Campo `biolinkSlug` requerido
  - `product` → `productId` requerido
  - `url` → Campo `url`
- **Botón "Galería"** visible junto a "Subir logo" → abre `ImagePicker` modal

### 2. QR Service - CATALOG usa subdominio del tenant
```typescript
case QrType.CATALOG:
  const tenant = await this.prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subdomain: true },
  });
  const subdomain = tenant?.subdomain;
  if (subdomain) {
    const baseDomain = baseUrl.replace(/^https?:\/\//, '');
    return `https://${subdomain}.${baseDomain}/social-catalog`;
  }
  return `${baseUrl}/social-catalog`;
```
- **No requiere `catalogSlug`** → usa subdominio del tenant
- Si no hay subdominio → fallback a `${baseUrl}/social-catalog`

### 3. ImagePicker - Vista previa completa
- **Grid de imágenes** con:
  - **Click** → Selecciona y cierra modal
  - **Doble-click** → Abre **modal de vista previa ampliada** (800px, centrado, 80vh max)
  - **Botón 🔍 (zoom)** en hover → abre vista previa
  - **Checkmark ✓** en imagen seleccionada
- **Modal de vista previa** (800px, centrado, 80vh max, `objectFit: contain`)
- **Upload area** con drag & drop + loading states

---

## 🔗 Referencias
- **Commit**: `6a23110` — `feat: QR Generator integration in OmniCatalog, OmniLinks, Products + sidebar access`
- **Archivos modificados**:
  - `frontend/src/components/admin/QrGeneratorModal.tsx`
  - `frontend/src/components/admin/ImagePicker.tsx`
  - `frontend/src/pages/admin/social-catalog.tsx` (botón "Generar QR Catálogo")
  - `frontend/src/pages/admin/biolinks.tsx` (botón "Generar QR Biolink")
  - `frontend/src/pages/admin/products.tsx` (botón "Generar QR Producto")
  - `backend/src/qr/qr.service.ts` (CATALOG usa subdomain)
- **Relacionado**: #45 (QR Master Key FK), #44 (Social Catalog Tables), #41 (Sharp Alpine Crash)

---

## 🧪 Verificación
1. **Sidebar** → Catálogo & Canales → Generador QR → Modal abre en tab "Configuración"
2. **Selector "Tipo de QR"** → Elige "📱 Catálogo Social (OmniCatalog)" → Muestra alerta "Usa el subdominio del tenant"
3. **Botón "Galería"** → Abre modal con grid → Doble-click → Vista previa ampliada (800px)
3. **Generar QR Catálogo** → Funciona sin `catalogSlug` (usa subdominio tenant)
