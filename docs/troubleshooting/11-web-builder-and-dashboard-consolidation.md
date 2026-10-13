# 11 — Unificación de Dashboards y Posicionamiento del Diseñador Web Omnicanal Desacoplado

> **Área:** Frontend / Admin App / Arquitectura  
> **Fecha:** 2026-07-31  
> **Estado:** ✅ Resuelto  

---

## 🛑 Necesidad Técnica & Requerimiento

1. **Unificación de Dashboards:** Evitar duplicidad de dashboards redundantes (Dashboard General vs. Spa Dashboard) consolidando la gestión de turnos dentro del módulo de agendas.
2. **Posicionamiento del Diseñador Web:** Habilitar el módulo de **Diseño Web & Portada** (`/admin/homepage-builder`) como un centro de control visual omnicanal desacoplado, capaz de gestionar la experiencia pública (Portada Institucional, Catálogo WhatsApp y Bio-Links).

---

## 🛠️ Soluciones Aplicadas

1. **Reestructuración del Menú en `AdminApp.tsx`:**
   - Se removió la entrada independiente "Spa Dashboard" y se consolidó como **"Turnos & Agendas Spa"** (`/admin/bookings`).
   - Se otorgó máxima relevancia al ítem **🎨 Diseño Web & Portada** (`/admin/homepage-builder`).
2. **Acciones Rápidas en Diseñador Web (`homepage-builder.tsx`):**
   - Agregados botones directos en la barra superior para abrir en vivo la **Portada Pública (`/`)** y el **Catálogo WhatsApp (`/whatsapp-catalog`)**.
3. **Inclusión en Roadmap Standalone (`docs/ROADMAP_MICROSERVICES.md`):**
   - Registrado **Storefront & Web Builder Standalone** (`services/storefront-builder-standalone`) en el roadmap para su futura profundización vertical.

---

## 📌 Resultado E2E

```bash
🔍 [QA] Iniciando validación E2E para catálogo público: https://spa-wellness.pesallaccia.com/whatsapp-catalog
🖼️ [QA] Se encontraron 10 imágenes en el catálogo público.
✅ [QA SUCCESS] Catálogo público verificado sin imágenes rotas.
🔍 [QA] Iniciando validación E2E para dominio Provecchio: https://provecchio.com
✅ [QA SUCCESS] Dominio Provecchio verificado sin errores JS en consola.
```
