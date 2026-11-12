# Informe de Evaluación — Landing Page OmniFlow / OmniBio

**URL evaluada:** https://orderflow.pesallaccia.com/  
**Referencia:** FEAT-195 (Landing Self-Service Unificada + Esquema Free Path / Pro Subdominio) + Plan Comercial Tridente  
**Medición original:** 11 de noviembre de 2026 (pre-deploy, sitio en 1.40.2)  
**Re-evaluación:** 12 de noviembre de 2026 (post-deploy, sitio en 1.46.3)  
**Enfoque:** Mobile-First + gaps de implementación

---

## 1. Resumen ejecutivo (actualizado post-deploy)

La medición original se hizo **antes del deploy 1.40.2 → 1.46.3** (11-nov, 19:13). Por eso
reportó como ausentes tres elementos que FEAT-195 ya había implementado en 1.46.0:

1. Hero con “reclamador de URL”.
2. Showcase de casos reales (Provecchio + demo).
3. Tabla de precios Free / Pro / OmniGastro.

La re-evaluación contra el código en `main` y el bundle servido en vivo (1.46.3) confirma
que los tres están implementados y publicados. Lo que queda abierto es de otra naturaleza:
**pulido mobile**, **redirect post-registro a `/bio/<slug>`**, **upsell de módulos
standalone** y **dos sombras `rgba()` hardcodeadas**.

| Dimensión | Nota (1-10) | Observación |
| :--- | :---: | :--- |
| Mensaje y copy comercial | 8.5 | Muy bueno, orientado a PyME gastronómica/retail. |
| Conversión self-service | 8.5 | Claim de URL, precios y registro presentes; falta feedback post-registro. |
| Elementos de persuasión | 8.5 | Calculadora, tabla competitiva y showcase de Provecchio presentes. |
| Completitud vs FEAT-195 | 8.5 | Claim, precios y casos reales implementados; redirect pendiente. |
| Alineación Plan Comercial | 7.5 | Free/Pro/OmniGastro alineados; falta upsell standalone del Tridente. |
| Calidad visual / responsive | 8.0 (desk) / 6.6 (mobile, pre-deploy) | Desktop bien; mobile pendiente de re-verificación en 1.46.3. |
| **Promedio general** | **~8.0** | Base sólida y publicada; quedan pulidos acotados. |

---

## 2. Evaluación UX/UI orientada a Mobile-First

> Los hallazgos de esta sección provienen de la **medición pre-deploy**. No se re-renderizó
> el sitio en viewport móvil durante la re-evaluación; deben confirmarse contra 1.46.3
> antes de cerrarlos.

### 2.1 Notas por aspecto (Mobile, pre-deploy)

| Aspecto | Nota | Comentario |
| :--- | :---: | :--- |
| Jerarquía visual / Hero | 7.5 | Mensaje fuerte, pero header y CTA se cortan. |
| Legibilidad y tipografía | 8.0 | Buena, títulos claros. |
| Espaciado y densidad | 7.0 | Aceptable, algunos bloques densos. |
| Componentes interactivos | 6.5 | Calculadora bien; tabs y tabla mal. |
| Navegación / Header sticky | 5.0 | Truncado en móvil. |
| Tabla comparativa | 4.0 | Casi inutilizable en viewport estrecho. |
| CTAs y conversión | 7.0 | Claros, pero se cortan textos. |
| Consistencia visual | 8.0 | Moderna; tokens de tema aplicados. |
| **Promedio Mobile** | **6.6** | Funcional, con fricciones claras. |

### 2.2 Hallazgos concretos en Mobile (~375–390 px, pre-deploy)

#### Problemas a re-verificar

1. **Header sticky truncado**
   - Logo + “Iniciar Sesión” + botón “Crear mi Catálogo Gratis” no caben.
   - El botón principal del header se corta en “Crear mi Ca…”.
2. **Tabla comparativa (competencia)**
   - Tabla de 4 columnas que se desborda horizontalmente.
   - La columna de **OmniFlow** queda parcialmente oculta.
   - En mobile-first debería convertirse en cards apiladas o accordion.
3. **Tabs de experiencia interactiva**
   - “Tab B: Social-Catalog (WhatsApp)” se corta.
   - El segmented control no es fully responsive.
4. **Botón principal del Hero**
   - “Crear mi Catálogo Gratis en 3 Minutos” se corta en algunos anchos.

#### Aspectos positivos

- Calculadora de ahorro funcional (slider + resultados claros).
- Tipografía legible y contraste bueno.
- FAQ colapsable correcta.
- Flujo de registro (`/login?mode=register`) limpio y mobile-friendly.
- Mensaje de valor directo y orientado a comercio local.

### 2.3 Recomendaciones UX Mobile prioritarias

| Prioridad | Problema | Solución recomendada |
| :--- | :--- | :--- |
| P0 | Header truncado | Logo + CTA corto o menú hamburguesa; mover “Iniciar Sesión” al menú. |
| P0 | Tabla comparativa | Reemplazar por cards verticales o lista “OmniFlow gana en…”. |
| P1 | Tabs truncados | Tabs full-width o pills cortos (“Bio” / “Catálogo WA”). |
| P1 | Texto de CTA largo | Versión corta mobile: “Crear mi Catálogo Gratis”. |
| P2 | Sombras hardcodeadas | Reemplazar los 2 `rgba(0,0,0,…)` por tokens (Regla #10). |

---

## 3. Cumplimiento punto por punto vs FEAT-195 (post-deploy 1.46.3)

| Objetivo del plan | Estado | Comentario |
| :--- | :---: | :--- |
| Landing comercial en la raíz `/` | ✅ | Existe y es la página principal. Branding OmniBio / OmniFlow. |
| Hero con buscador/reclamador de URL | ✅ | Input `/bio/[slug]` con placeholder `tu-marca` (`landing-biolinks-catalog.tsx`, sección 2). |
| CTA que precargue datos desde slug | ✅ | `login.tsx` lee `?storeName` / `?slug` y prellena el formulario. |
| Calculadora de ahorro (vs 12% Linktree) | ✅ | Presente y funcional. |
| Showcase de casos reales (Provecchio + demo) | ✅ | Card de Provecchio con enlace real + demo. |
| Tabla de precios Free / Pro / OmniGastro | ✅ | Sección “Planes y Precios” con `pricingData`. |
| Esquema de URLs Free (path) vs Pro (subdomain) | ✅ / ⚠️ | La tabla muestra las URLs; falta una explicación narrativa del esquema. |
| Onboarding Express 60 s + auto-instalación módulos | ⚠️ | `registerTenant` instala `biolinks` + `social-catalog` y crea el BioLink; falta devolver el slug y redirigir a `/bio/<slug>`. |
| Eliminar jerga técnica | ⚠️ | Copy principal comercial; quedan menciones a Redis/Rust. |
| Regla #10 – cero colores hardcodeados | ✅ / ⚠️ | Gradientes con tokens; quedan 2 sombras `rgba(0,0,0,…)`. |
| Responsive | ✅ / ⚠️ | Desktop bien; mobile pendiente de re-verificación. |

### Elementos que están bien resueltos

- Propuesta de valor clara: “Tu biografía no es solo un directorio de links: es tu nueva
  caja registradora”.
- CTAs prioritarios y flujo de registro limpio.
- Calculadora de ahorro interactiva.
- Tabla comparativa vs Linktree Free y Pency.
- Sección de experiencia interactiva con tabs (Bio-Links vs Social-Catalog).
- FAQ básica.
- Caso real externo: `https://provecchio.com` funciona y muestra “Powered by OmniFlow”.
- Infraestructura de path `/bio/<slug>` ya responde.

---

## 4. Informe de gaps priorizado (actualizado)

### 4.1 Gaps abiertos

| # | Gap | Impacto | Esfuerzo | Tipo | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Header + CTAs responsive (textos cortados) | Alto | Bajo | Frontend | ⚠️ Re-verificar en 1.46.3 |
| 2 | Tabla comparativa mobile-friendly | Medio-Alto | Medio | Frontend | ⚠️ Re-verificar en 1.46.3 |
| 3 | Redirect post-registro a `/bio/<slug>` | Alto | Medio | Frontend + Backend | ⏳ Pendiente |
| 4 | Precios standalone del Tridente (upsell) | Medio | Bajo | Frontend | ⏳ Pendiente |
| 5 | Sombras `rgba()` hardcodeadas | Bajo | Bajo | Frontend | ⏳ Pendiente |
| 6 | Explicación narrativa del esquema Free vs Pro | Medio | Bajo | Frontend | ⏳ Pendiente |

### 4.2 Gaps cerrados en 1.46.x

| Gap | Evidencia |
| :--- | :--- |
| Hero Claim URL (`/bio/[slug]`) | Implementado en `landing-biolinks-catalog.tsx` y publicado en 1.46.3. |
| Tabla de precios Free / Pro / OmniGastro | Implementada y publicada. |
| Showcase Provecchio + demo | Implementado y publicado. |
| Auto-instalación `biolinks` + `social-catalog` | `auth.service.ts` (bloques 6 y 6b). |
| Prefill de `storeName` desde el Hero | `login.tsx` (`?storeName` / `?slug`). |
| Colores de gradiente hardcodeados | Gradientes migrados a tokens del tema. |

---

## 5. Plan de implementación recomendado

### Sprint 1 — Mobile polish (prioridad máxima)

**Frontend — `frontend/src/pages/landing-biolinks-catalog.tsx`**

1. Header: logo + CTA corto o menú hamburguesa; mover “Iniciar Sesión” al menú.
2. Tabla comparativa: versión mobile en cards apiladas o accordion.
3. Acortar textos de botones en mobile.
4. Re-verificar en viewport 375–390 px sobre 1.46.3.

### Sprint 2 — Onboarding Express completo

**Backend — `backend/src/auth/auth.service.ts`**

- Devolver el `slug` generado en la respuesta de `registerTenant`.

**Frontend — `frontend/src/pages/login.tsx`**

- Consumir el slug y redirigir a `/bio/{slug}` (o a la vista previa) después del registro.

### Sprint 3 — Alineación comercial y calidad

- Mostrar el esquema de URLs (Free path vs Pro subdomain vs Custom) con una explicación
  breve.
- Incorporar el upsell de módulos standalone del Tridente.
- Reemplazar las 2 sombras `rgba()` por tokens de tema (Regla #10).

### Cronograma sugerido

```
Semana 1 (Mobile):
  1. Fixes de header + tabla comparativa
  2. Re-verificación en 375–390 px
Semana 2 (Onboarding real):
  3. Devolver slug en registerTenant
  4. Redirect post-registro a /bio/{slug}
Semana 3 (Comercial y calidad):
  5. Explicación del modelo de URLs
  6. Upsell de módulos standalone
  7. Sombras a tokens
```

---

## 6. Conclusión

La landing **ya vende y ya implementa el núcleo de FEAT-195** (claim, precios, showcase,
onboarding con módulos). El freno actual no es la propuesta: es el **pulido mobile** y el
**cierre del loop post-registro**. Cerrando los Sprints 1 y 2, la página queda alineada con
el plan comercial y lista para campañas de captación.

---

## 7. Evidencia de la re-evaluación

- Código: `frontend/src/pages/landing-biolinks-catalog.tsx` (secciones 2, 5 y 6),
  `frontend/src/pages/login.tsx` (prefill), `backend/src/auth/auth.service.ts`
  (instalación de módulos y BioLink inicial).
- Bundle live: `https://orderflow.pesallaccia.com/assets/index-2az_CPSV.js` contiene
  `orderflow.pesallaccia.com/bio/`, placeholder `tu-marca`, “Planes y Precios”,
  `pricingData` Free/Pro/OmniGastro y la card “Provecchio”.
- Versión servida: 1.46.3.
- `provecchio.com` contiene “Powered by OmniFlow”.

---

## 8. Referencias internas

- `plan-feat-195-landing-self-service-y-esquema-free.md`
- `plan-comercial-tridente-omnibio-omnicatalog-omnibooking.md`
- `estudio-de-caso-pency.md`
- `02-arquitectura-standalone-vs-enterprise.md`
- `informe-estado-del-arte-estratega-comercial.md`

---

*Medición original: 11 de noviembre de 2026 (pre-deploy 1.40.2). Re-evaluación: 12 de
noviembre de 2026 (post-deploy 1.46.3).*
