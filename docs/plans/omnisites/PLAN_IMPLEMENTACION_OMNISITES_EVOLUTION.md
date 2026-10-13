# Plan de Implementación: Evolución OmniSites PRO & Site-Builder

> **Basado en la especificación técnica:** [`docs/plans/omnisites_ajuste.md`](file:///opt/orderflow/docs/plans/omnisites_ajuste.md)  
> **Versión:** 1.25.00  

---

## 🎯 Objetivos Principales

1. **Evolución del Motor de IA Gemini en OmniSites (PRO):**
   - Incorporar el System Prompt holístico de `omnisites_ajuste.md` en el servidor backend/service de OmniSites (`services/omnisites-standalone/server.ts` y `AiSiteGeneratorModal.tsx`).
   - Soportar generación transaccional con parámetros del tenant (`TARGET_AUDIENCE`, `VALUE_PROPOSITION`, `BRAND_VOICE`, etc.).

2. **Componentes y UX Transaccional (Site-Builder + OmniSites):**
   - **Sticky OmniBar (Mobile-First):** Barra fija en la parte inferior para dispositivos móviles con resumen del pedido/carrito, slots de horarios y CTA directo a Checkout o WhatsApp con mensaje preformateado conteniendo SKU.
   - **Badges de Confianza Operativa:** Integración del estado del comercio en tiempo real (*"Abierto"*, *"Envíos en 30 min"*).
   - **Zero-CLS Asset Placeholders:** Reserva de espacio estricto con `aspect-ratio` e integración de prompts de fallback para generación de imágenes vía Fal AI / Flux.

3. **Contrato Decoupled de Handlers JavaScript:**
   - Estandarización de `handleAddToCart(sku, variantId)`, `handleQuickOrderWhatsApp(orderPayload)` y `handleCategoryFilter(categoryId)` en las plantillas exportables e integradas.

---

## 📋 Fases del Plan

### Fase 1: Integración del Motor de IA (omnisites_ajuste.md Prompt)
- [ ] Actualizar `services/omnisites-standalone/server.ts` con los nuevos endpoints `/api/gemini/generate-site` consumiendo el prompt de `omnisites_ajuste.md`.
- [ ] Conectar el modal `AiSiteGeneratorModal.tsx` con la recolección de contexto del Tenant (`TENANT_COMMERCIAL_NAME`, `TENANT_INDUSTRY`, `VALUE_PROPOSITION`, `PRIMARY_COLOR`).

### Fase 2: Componentes Transaccionales & UI Kit (React + Tailwind)
- [ ] Crear componente `StickyOmniBar.tsx` en `frontend/src/components/sites/` y `services/omnisites-standalone/src/components/canvas/`.
- [ ] Incorporar `OperationalBadges.tsx` (Horarios y Estado en Vivo).
- [ ] Implementar micro-interacciones de feedback háptico (`active:scale-95`, transiciones CSS ultraligeras).

### Fase 3: Site-Builder Core & OmniSites PRO Feature Gate
- [ ] Añadir selector de preset con soporte para la nueva arquitectura en `frontend/src/pages/admin/homepage-builder.tsx`.
- [ ] Validar compatibilidad y feature-gate para tenants sin OmniSites PRO.

### Fase 4: Pruebas, QA & Registro
- [ ] Ejecutar compilaciones y auditorías de tipos (`tsc`).
- [ ] Verificar rendimiento Core Web Vitals (LCP < 1.2s, CLS = 0).
- [ ] Documentar y registrar la nueva feature en `featurelist.json` como **FEAT-129**.
