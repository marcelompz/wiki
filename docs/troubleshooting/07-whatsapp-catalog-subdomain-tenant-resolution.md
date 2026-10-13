# 🛠️ Registro de Errores Comunes: Diagnóstico y Solución de Carga de Productos en Catálogo por Subdominio (`wellness.pesallaccia.com`)

**Fecha:** 2026-07-30  
**Módulo / Área:** WhatsApp Catalog (`whatsapp-catalog.tsx`) / Tenants Controller / Dynamic Branding & Subdomain Routing  
**Severidad:** Media (Catálogo público mostraba "No se encontraron productos en esta categoría" en subdominios específicos)  
**Estado:** ✅ **RESUELTO & PROBADO EN PRODUCCIÓN**  

---

## 1. Descripción del Problema

Al acceder al catálogo público a través de un subdominio personalizado de tenant como `https://wellness.pesallaccia.com/whatsapp-catalog`, la interfaz cargaba el header y nombre de la tienda ("SPA Wellness S.R.L."), pero el cuerpo principal devolvía el estado vacío:
> *"No se encontraron productos en esta categoría"*

Mientras tanto, en `provecchio.com/whatsapp-catalog` los productos se mostraban correctamente.

---

## 2. Causa Raíz

Se identificaron dos factores principales que causaban la falla:

1. **Subdominio de Tenant No Alineado en Base de Datos**:
   - El tenant `SPA Wellness` (`spa-wellness-001`) tenía registrado su campo `subdomain` de manera diferente en la base de datos de producción (`spa-wellness` en lugar de `wellness`), por lo que al acceder vía `wellness.pesallaccia.com`, el endpoint de resolución pública no asignaba correctamente el contexto del tenant.

2. **Condición de Carrera en Carga de API Key en Frontend (`whatsapp-catalog.tsx`)**:
   - `whatsapp-catalog.tsx` ejecutaba el método `fetchWhatsappConfigAndProducts` al montar el componente (`useEffect([])`), obteniendo una `apiKey` estática desde `localStorage` o el fallback general de demo (`0bb60656b9fbfcc27e38ae444e9e376f`).
   - Cuando el `BrandingProvider` terminaba de resolver de forma asíncrona el tenant por el subdominio de la URL (`getTenantBySubdomain`), el catálogo no volvía a disparar la petición de productos con la `apiKeySecret` propia de ese tenant.

---

## 3. Solución Ejecutada

### A. Sincronización del Subdominio en Base de Datos
Actualizamos la tabla `tenants` en la base de datos de producción para vincular el subdominio exacto:
```sql
UPDATE tenants SET subdomain = 'wellness' WHERE id = 'spa-wellness-001';
```

### B. Inclusión de `apiKeySecret` en el Endpoint Público de Subdominio ([`backend/src/tenants/tenants.controller.ts`](file:///opt/orderflow/backend/src/tenants/tenants.controller.ts#L480-L525))
Actualizamos la consulta `getTenantBySubdomain` para retornar el campo `apiKeySecret` necesario por el `BrandingProvider` al resolver la marca del tenant en entornos multi-tenant:
```typescript
select: {
  id: true,
  name: true,
  businessName: true,
  subdomain: true,
  apiKeySecret: true,
  // ...
}
```

### C. Actualización Reactiva de Carga en Frontend ([`frontend/src/pages/whatsapp-catalog.tsx`](file:///opt/orderflow/frontend/src/pages/whatsapp-catalog.tsx#L38-L50))
Refactorizamos la suscripción de datos en `whatsapp-catalog.tsx` para reaccionar dinámicamente cuando el contexto `tenantConfig` se resuelve:
```typescript
useEffect(() => {
  if (tenantConfig) {
    fetchWhatsappConfigAndProducts();
  }
}, [tenantConfig]);

const fetchWhatsappConfigAndProducts = async () => {
  try {
    setLoading(true);
    const apiKey = tenantConfig?.apiKeySecret || localStorage.getItem('apiKey') || "0bb60656b9fbfcc27e38ae444e9e376f";
    // ...
```

---

## 4. Verificación y Resultados

1. **Test de API**:
   - `GET https://wellness.pesallaccia.com/api/v1/public/products` con la API Key del tenant `wellness` devuelven correctamente los 19 productos en JSON.
2. **Navegación UI**:
   - `https://wellness.pesallaccia.com` y `https://wellness.pesallaccia.com/whatsapp-catalog` renderizan las tarjetas de productos agrupadas por categoría (Aceite Esencial, Difusor, etc.) con sus imágenes, stock y precios en Guaraníes.
