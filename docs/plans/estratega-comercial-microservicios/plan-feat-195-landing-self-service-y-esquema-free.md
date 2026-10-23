# FEAT-195 — Plan de Implementación: Landing Page Self-Service Unificada & Esquema de URLs Free (Path) vs Pro (Subdominio)

> **Feature:** FEAT-195  
> **Versión Objetivo:** v1.39.19  
> **Dominio Activo:** `https://orderflow.pesallaccia.com`  
> **Fecha:** 21 de Octubre de 2026  
> **Estado:** 📋 Propuesto para Aprobación del Usuario  

---

## 1. Contexto y Objetivos

A partir del benchmarking del caso **Pency**, **Linktree** y **Agendit**, y con el caso de éxito en producción de **Provecchio** (`https://provecchio.com`), se detectó la necesidad de contar con una **Landing Page de conversión directa orientada a PyMEs y comercios gastronómicos/retail**, eliminando la jerga técnica (PostgreSQL, Docker, Tauri Rust) y facilitando el registro 100% autogestionado (*Self-Service*).

### Objetivos Clave:
1. **Unificar la experiencia en `https://orderflow.pesallaccia.com/`:**
   - La raíz `/` presentará la nueva Landing Page comercial y conversacional de alto impacto.
   - Hero con buscador/reclamador de URL: `orderflow.pesallaccia.com/bio/[ tu-marca ]` → Botón *"Crear mi Catálogo Gratis"*.
   - Calculadora destructiva de ahorro: Demuestra el ahorro anual al no pagar el 12% de comisión de Linktree.
   - Escaparate con casos reales: Showcase de **Provecchio** (`https://provecchio.com`) y demos interactivas.
   - Tabla de precios escalonada: Plan Free ($0 / 0% comisión), Pro Emprendedor ($15) y OmniGastro & KDS ($35).
2. **Esquema de URLs Seguro y Escalable (Free vs Pro):**
   - **Plan Free ($0):** URL por Path compartido instantáneo (`https://orderflow.pesallaccia.com/bio/<slug>` o `/catalogo/<slug>`). Cero latencia DNS, sin consumo de API de Cloudflare, sin riesgo de rate limits de certificados SSL en Traefik.
   - **Plan Pro ($15):** Subdominio dedicado (`https://<slug>.pesallaccia.com`) + eliminación de marca de agua + turnos OmniBooking.
   - **Plan Gastro / Custom:** Dominio propio CNAME (`https://provecchio.com`).
3. **Onboarding Express de 60 segundos:**
   - El Hero conecta con el endpoint `POST /api/v1/auth/register-tenant`.
   - Crea el Tenant Free, usuario Owner y auto-instala los módulos esenciales (`biolinks` y `social-catalog`) para que el comercio esté listo para vender de inmediato por WhatsApp.
4. **Onboarding del primer cliente piloto (Local de Comida Japonesa):**
   - Habilitar el tenant piloto para la amiga del usuario (rolls, combos, modificadores de soya/palitos, WhatsApp de pedidos) sobre la infraestructura de `orderflow.pesallaccia.com`.

---

## 2. Alcance Técnico y Archivos a Modificar

```
orderflow/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── landing-biolinks-catalog.tsx   # [MODIFICAR] Rediseño integral con tokens de tema (Rule 10), Hero Claim URL, Provecchio showcase y precios Free/Pro/Gastro
│   │   │   └── login.tsx                      # [MODIFICAR] Soporte para recibir ?slug= desde el Hero de la Landing
│   │   ├── main.tsx                           # [VERIFICAR] Rutas / y redirecciones limpias
│   │   └── package.json                       # [VERSION] Bump 1.39.18 -> 1.39.19
│   └── tests/                                 # [TEST] Smoke tests de renderizado
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   └── auth.service.ts                # [MODIFICAR] registerTenant auto-instala también 'social-catalog' junto a 'biolinks'
│   │   └── package.json                       # [VERSION] Bump 1.39.18 -> 1.39.19
├── VERSION                                    # [VERSION] 1.39.18 -> 1.39.19
├── featurelist.json                           # [FEATURE] Registro formal de FEAT-195
└── docs/plans/estratega-comercial-microservicios/
    ├── estudio_de_caso_pency.md              # [ACTUALIZAR] Referencia al plan concluido
    └── plan-feat-195-landing-self-service.md # [CREAR] Este documento
```

---

## 3. Plan Detallado de Implementación

### Fase 1: Backend Onboarding Express
1. **Modificación en [`auth.service.ts`](file:///opt/orderflow/backend/src/auth/auth.service.ts#L125-L145):**
   - En el método `registerTenant`:
     - Asegurar que al provisionar el tenant en modo `FREE_BIOLINKS`, se instalen tanto `biolinks` como `social-catalog`.
     - Crear el `BioLink` inicial por defecto con un botón directo a WhatsApp y enlace a su catálogo social.
     - Garantizar que NO se invoque `CloudflareDnsService` en el registro Free, reservándolo exclusivamente para upgrades de plan.

### Fase 2: Frontend Landing Page (UI/UX Tokenizada)
1. **Refactorización de [`landing-biolinks-catalog.tsx`](file:///opt/orderflow/frontend/src/pages/landing-biolinks-catalog.tsx):**
   - **Cumplimiento estricto de Regla #10 (Cero colores HEX hardcodeados):** Uso de `const { token } = theme.useToken();` para fondos, textos y bordes.
   - **Hero con buscador de enlaces:**
     - Input interactivo: `orderflow.pesallaccia.com/bio/[ ________ ]`
     - Botón CTA: *"Crear mi Catálogo Gratis"*
     - Al tipear el nombre y hacer click, redirige a `/login?mode=register&storeName=X` precargando los datos.
   - **Showcase de Casos Reales:**
     - Tarjeta destacada de **Provecchio** (`https://provecchio.com`): *"Restaurante Italiano de Alta Calidad - Menú QR, Social Catalog y Dominio Propio"*.
     - Tarjeta de demostración interactiva: *"Sushi & Rolls Demo"* con enlace a probar el flujo de pedido por WhatsApp en vivo.
   - **Calculadora Interactiva de Ahorro:**
     - Comparativa visual: $0 comisiones de OrderFlow vs 12% que retiene Linktree Free.
   - **Tabla de Precios Actualizada:**
     - **Free Forever ($0):** Path URL (`orderflow.pesallaccia.com/bio/tunegocio`), hasta 30 productos, pedidos ilimitados a WhatsApp, 0% comisión.
     - **Pro Emprendedor ($15/mes):** Subdominio propio (`tunegocio.pesallaccia.com`), productos ilimitados, variantes, stock, turnos OmniBooking.
     - **OmniGastro ($35/mes):** Basado en el caso Provecchio, KDS pantalla de cocina, POS offline en Rust Tauri, delivery por zonas GPS, facturación electrónica SIFEN/DNIT.

### Fase 3: Tenant Piloto (Comida Japonesa)
1. Asistir en la creación o provisionamiento del tenant de comida japonesa para la amiga del usuario:
   - Registro vía el nuevo flujo autogestionado o seed controlado.
   - Verificación del enlace `/bio/<slug>` en `orderflow.pesallaccia.com`.
   - Carga inicial de categorías sugeridas (Rolls, Sashimi/Nigiris, Combos, Bebidas) y modificadores (Soya, Palitos, Wasabi).

---

## 4. Estrategia de Testing y Verificación

1. **Pruebas Unitarias Backend:**
   - Ejecutar `npm run test -- auth.service.spec.ts` para verificar que `registerTenant` cree tenant, usuario, accesos e instalaciones de módulos sin errores.
2. **Pruebas Frontend:**
   - Verificar compilación limpia con `npm run build` en `frontend/` sin errores de tipos.
   - Verificar responsive en móvil (viewport 375px y 414px) y desktop (1920px).
   - Validar que no existan colores hardcodeados prohibidos (`grep -rn "#[0-9a-fA-F]\{3,6\}"` en el componente).
3. **Smoke Test E2E de Onboarding:**
   - Escribir `sushi-demo` en el input del Hero.
   - Presionar "Crear mi Catálogo Gratis".
   - Completar el registro con email y contraseña.
   - Confirmar redirección automática al panel y apertura correcta de `https://orderflow.pesallaccia.com/bio/sushi-demo`.

---

## 5. Control de Versiones y Sincronización

* Bump de versión: **1.39.18 → 1.39.19** en `VERSION`, `backend/package.json`, `frontend/package.json`.
* Registro de `FEAT-195` en `featurelist.json`.
* Actualización de `CHANGELOG.md` y `ROADMAP.md`.
* Sincronización con la Wiki oficial en `/opt/wiki/orderflow/`.
