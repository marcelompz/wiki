# Troubleshooting #180: Provecchio Homepage y Social-Catalog Images

**Fecha:** 2026-10-19  
**Versión:** 1.39.8  
**Estado:** ✅ Resuelto

---

## Problemas Reportados

1. **Homepage incorrecta:** En `/admin/homepage-builder` configurado OmniBio (Bio-Links) como página inicial, pero se veía otra página.
2. **Imágenes faltantes en Social-Catalog:** Logo, banner y fondos de categorías no cargaban en `https://provecchio.com/social-catalog/menudigital`.

---

## Causa Raíz

### 1. Homepage - BrandingProvider no manejaba dominios custom
El `BrandingProvider` en `frontend/src/components/tenant/BrandingProvider.tsx` extraía el subdominio del hostname:
- Para `provecchio.com` → extraía `provecchio` (primer segmento)
- Llamaba a `tenantService.getTenantBySubdomain('provecchio')` 
- El backend no encuentra tenant con subdominio `provecchio` (solo con `customDomain: 'provecchio.com'`)
- Fallback a config por defecto → preset "omnicatalog" → SocialCatalogPage

### 2. Imágenes Social-Catalog - Archivos no sincronizados
Las imágenes configuradas en `tenant.config.instances.*.categoryBackgrounds`, `logoUrl`, `bannerUrl` referenciaban archivos en `/api/v1/uploads/social-catalog/provecchio-dimora-001/` que **no existían en el servidor de producción** (solo en local).

---

## Solución

### 1. Fix BrandingProvider para dominios custom
**Archivo:** `frontend/src/components/tenant/BrandingProvider.tsx`

```typescript
// ANTES: Extraía solo el primer segmento
if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    targetSubdomain = parts[0];  // ❌ 'provecchio' para 'provecchio.com'
  }
}

// DESPUÉS: Usa hostname completo para dominios custom
if (!targetIdentifier) {
  if (hostname.includes('.pesallaccia.com')) {
    // Subdominios de pesallaccia.com
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'orderflow' && parts[0] !== 'staging' && parts[0] !== 'www') {
      targetIdentifier = parts[0];
    }
  } 
  // Dominios custom (no subdominios de pesallaccia.com)
  else if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.endsWith('.pesallaccia.com')) {
    targetIdentifier = hostname;  // ✅ 'provecchio.com'
  }
}
```

### 2. Sincronizar imágenes a producción
```bash
# Desde local
rsync -avz /opt/orderflow/uploads/social-catalog/provecchio-dimora-001/ \
  root@192.168.69.240:/srv/orderflow/uploads/social-catalog/provecchio-dimora-001/
```

### 3. Rebuild y deploy frontend
```bash
cd /opt/orderflow/frontend && npm run build
rsync -avz /opt/orderflow/frontend/dist/ root@192.168.69.240:/srv/orderflow/frontend/dist/
ssh root@192.168.69.240 "docker restart orderflow_frontend"
```

---

## Verificación

### Endpoints funcionando:
- ✅ `GET /api/v1/tenants/public/tenant-by-subdomain/provecchio.com` → retorna config con `homepagePreset: "omnilinks"`
- ✅ `GET /api/v1/uploads/social-catalog/provecchio-dimora-001/*.jpg` → 200 OK
- ✅ `GET /api/v1/bio/dimora` → 200 OK (biolink público)

### Comportamiento esperado:
| URL | Preset | Página Renderizada |
|-----|--------|-------------------|
| `https://provecchio.com/` | `omnilinks` | **PublicBioLinkPage** (OmniBio) |
| `https://provecchio.com/social-catalog/menudigital` | `omnicatalog` (default) | **SocialCatalogPage** con imágenes |
| `https://provecchio.com/bio/dimora` | - | **PublicBioLinkPage** (slug dimora) |

---

## Notas Técnicas

- El preset `"omnilinks"` en `tenant.config.homepagePreset` mapea a `PublicBioLinkPage` (ver `public-storefront-page.tsx:56`)
- El preset `"omnicatalog"` mapea a `SocialCatalogPage`
- El endpoint público `tenant-by-subdomain` busca por `subdomain`, `customDomain`, o `id`
- Para dominios custom, el frontend debe pasar el **hostname completo** al API
