# Guía de Troubleshooting: Resolución de Subdominios y Fallbacks de Branding Multi-Tenant

> **Módulo / Componente:** Multi-Tenancy Core, `BrandingProvider`, `PublicCatalogController`  
> **Fecha de Actualización:** 2026-07-30  
> **Versión Afectada:** v1.1.5 → **v1.1.7 (Resuelto)**  

---

## 1. Descripción del Problema

Al ingresar a un subdominio específico de un tenant (ej. `spa-wellness.pesallaccia.com`), la interfaz en ocasiones mostraba temporalmente la marca de otro tenant (ej. **"DIMORA S.R.L."** o verduras de verdulería por defecto), o no cargaba el logo/banner personalizado subido en el módulo de WhatsApp Catalog.

---

## 2. Diagnóstico & Causa Raíz

Tras investigar la traza de ejecución y verificar con `shot-scraper` y Playwright:

1. **Desalineación de Subdominio en Base de Datos vs. URL:**
   - El tenant `SPA Wellness` (`spa-wellness-001`) tenía registrado `subdomain = 'wellness'` en la DB, mientras la solicitud HTTP provenía de `spa-wellness.pesallaccia.com`.
2. **Fallback Indebido en `BrandingProvider.tsx`:**
   - Si la API respondía `404 (Tenant no encontrado por subdominio)`, el componente `BrandingProvider` recurría automáticamente a una API Key de fallback hardcodeada (*Provecchio / Dimora S.R.L.*).
3. **Imágenes de Catálogo Inaccesibles:**
   - El avatar del catálogo utilizaba `objectFit: cover`, lo que recortaba logos vectoriales y mostraba textos cortados en los bordes.

---

## 3. Solución Aplicada (Paso a Paso)

### 3.1 Eliminación de Fallbacks Rígidos en Frontend
En `frontend/src/components/tenant/BrandingProvider.tsx`:
```typescript
// Si no se encontró por subdominio y NO había un subdominio explícito en la URL, usar API Key guardada
if (!config && !targetSubdomain) {
  let apiKey = import.meta.env.VITE_TENANT_API_KEY || localStorage.getItem('apiKey');
  if (apiKey) {
    config = await tenantService.getConfigByApiKey(apiKey);
  }
}
```

### 3.2 Homologación Dinámica en DB
Se actualizó la base de datos de producción:
```sql
UPDATE tenants SET subdomain = 'spa-wellness' WHERE id = 'spa-wellness-001';
```

### 3.3 Integración de Validación QA E2E en el Pipeline (`init.sh`)
Se creó `scripts/qa_e2e_check.py` con Playwright Python para automatizar el renderizado del DOM en headless browser antes de cada deploy:
```bash
# Integrado como paso [5/5] en ./scripts/init.sh
python3 scripts/qa_e2e_check.py https://spa-wellness.pesallaccia.com/whatsapp-catalog
```

---

## 4. Verificación de Éxito
- 50/50 Jest Test Suites Aprobadas.
- Compilaciones sin advertencias en NestJS Backend y Vite Frontend.
- Renderizado verificado vía Playwright E2E y `shot-scraper`.
