# Informe de Evaluación — Landing Page OmniFlow / OmniBio

**URL evaluada:** https://orderflow.pesallaccia.com/  
**Referencia:** FEAT-195 (Landing Self-Service Unificada + Esquema Free Path / Pro Subdominio) + Plan Comercial Tridente  
**Medición original:** 11 de noviembre de 2026 (pre-deploy, sitio en 1.40.2)  
**Re-evaluación:** 12 de noviembre de 2026 (post-deploy, sitio en 1.46.3)  
**Delta de publicación:** deploy 1.40.2 → 1.46.3 (11-nov, 19:13–19:23)  
**Enfoque:** Mobile-First + gaps de implementación

> **Nota de consolidación:** este informe absorbe la reevaluación del 12-nov y las
> mediciones mobile verificadas en vivo. El snapshot original quedó archivado en
> [`historico/informe-evaluacion-landing-omniflow-feat195-2026-11-12.md`](historico/informe-evaluacion-landing-omniflow-feat195-2026-11-12.md).

---

## 1. Resumen ejecutivo (actualizado post-deploy)

La medición original se hizo **antes del deploy 1.40.2 → 1.46.3** (11-nov, 19:13). Por eso
reportó como ausentes tres elementos que FEAT-195 ya había implementado en 1.46.0:

1. Hero con “reclamador de URL”.
2. Showcase de casos reales (Provecchio + demo Sushi & Rolls).
3. Tabla de precios Free / Pro / OmniGastro.

**Aclaración de causalidad:** los tres pilares existen desde **1.46.0** (commit `8cf3d374`,
4-nov 13:48). No se desarrollaron en 24 horas: lo que cambió fue la **publicación** con el
deploy del 11-nov. La medición del 11-nov era pre-deploy y por eso los vio ausentes.

| Elemento FEAT-195 | 11 nov (1.40.2) | 12 nov (1.46.3) |
| :--- | :---: | :---: |
| Hero Claim URL (`/bio/[tu-marca]`) | ❌ | ✅ |
| Showcase de casos reales (Provecchio + Sushi Demo) | ❌ | ✅ |
| Tabla de precios Free / Pro / OmniGastro | ❌ | ✅ |
| Calculadora de ahorro | ✅ | ✅ |
| Tabla comparativa vs Linktree/Pency | ✅ | ✅ |
| CTA → registro | ✅ | ✅ |
| CTA → registro con `storeName` en la URL | ❌ | ✅ |
| Prefill efectivo de `storeName` en el formulario | ❌ | ❌ (bug) |

Lo que queda abierto es de otra naturaleza: **prefill roto**, **pulido mobile**,
**redirect post-registro a `/bio/<slug>`**, **upsell de módulos standalone** y **dos sombras
`rgba()` hardcodeadas**.

| Dimensión | Nota (1-10) | Observación |
| :--- | :---: | :--- |
| Mensaje y copy comercial | 8.5 | Muy bueno, orientado a PyME gastronómica/retail. |
| Conversión self-service | 7.5 | Claim, precios y registro presentes; el prefill no aplica. |
| Elementos de persuasión | 9.0 | Calculadora, tabla competitiva y showcase de Provecchio presentes. |
| Completitud vs FEAT-195 | 8.0 | Claim, precios y casos reales publicados; prefill y redirect pendientes. |
| Alineación Plan Comercial | 7.5 | Free/Pro/OmniGastro alineados; falta upsell standalone del Tridente. |
| Calidad visual / responsive | 8.5 (desk) / 6.6 (mobile) | Desktop bien; mobile con header y tablas rotas. |
| **Promedio general** | **~8.0** | Base sólida y publicada; quedan pulidos acotados. |

---

## 2. Evaluación UX/UI orientada a Mobile-First

> **Metodología:** medición en vivo del 12-nov sobre 1.46.3, renderizando la landing en un
> viewport de **375 px** (ancho de cliente efectivo: 360 px). Se midieron `scrollWidth` vs
> `clientWidth` del documento, del header y de las tablas, además del wrapping real de las
> celdas.

### 2.1 Notas por aspecto (Mobile, post-deploy)

| Aspecto | Nota | Comentario |
| :--- | :---: | :--- |
| Jerarquía visual / Hero | 8.5 | Claim URL presente y bien apilado. |
| Legibilidad y tipografía | 8.0 | Buena, títulos claros. |
| Espaciado y densidad | 7.0 | Aceptable, algunos bloques densos. |
| Componentes interactivos | 7.0 | Claim + calculadora bien; tablas mal. |
| Navegación / Header sticky | 5.0 | Sigue sin caber en 375 px. |
| Tabla de precios | 3.5 | Celdas de 65–103 px; texto y URLs partidos. |
| Tabla comparativa | 4.0 | Desborda horizontalmente; OmniFlow queda oculta. |
| Casos reales | 8.0 | Cards legibles (Provecchio + Sushi Demo). |
| CTAs y conversión | 7.0 | Claros en el body; el CTA del header se corta. |
| Consistencia visual | 8.0 | Tokens de tema aplicados; quedan 2 sombras `rgba()`. |
| **Promedio Mobile** | **~6.6** | El hero mejoró, pero la tabla de precios bajó el promedio. |

### 2.2 Mediciones verificadas (375 px, 1.46.3)

| Medición | Valor | Lectura |
| :--- | :--- | :--- |
| Documento: `scrollWidth` vs `clientWidth` | 558 vs 360 px | Overflow horizontal de ~198 px. |
| Header: `scrollWidth` vs `clientWidth` | 480 vs 360 px | Logo + “Iniciar Sesión” (123 px) + CTA (197 px) no caben. |
| Tabla comparativa: `scrollWidth` vs contenedor | 526 vs 319 px | Desborda y oculta la columna OmniFlow. |
| Tabla de precios: ancho de columnas | 65 / 76 / 70 / 103 px | Cuatro columnas comprimidas en 319 px. |
| Tabla de precios: alto de filas | 231–253 px | El contenido se apila en muchas líneas. |
| “Free Forever” | 3 líneas (30 / 30 / 21 px) | `overflow-wrap: break-word` parte la palabra. |
| Placeholder del claim | `tu-marca` | Confirmado en el input. |

### 2.3 Hallazgos concretos en Mobile

**Críticos**

1. **Header sticky sin espacio**
   - Logo + “Iniciar Sesión” + “Crear mi Catálogo Gratis” exceden el ancho del viewport.
   - El CTA principal del header queda cortado o fuera de pantalla.
2. **Tabla de precios rota**
   - Columnas de 65–103 px y filas de 231–253 px.
   - “Free Forever” se parte en tres líneas; las URLs se quiebran carácter por carácter.
   - Solución: cards apiladas en mobile o scroll horizontal controlado con `word-break`
     adecuado.
3. **Tabla comparativa**
   - 526 px de contenido en un contenedor de 319 px.
   - Obliga a scroll horizontal y deja la columna OmniFlow parcialmente oculta.

**Positivos**

- Claim URL bien apilado debajo del H1.
- Calculadora de ahorro clara y usable.
- Cards de casos reales (Provecchio + Sushi Demo) legibles.
- Flujo de registro (`/login?mode=register`) limpio y mobile-friendly.

> Los hallazgos de tabs y del CTA del Hero de la medición pre-deploy no se re-midieron en
> esta pasada; quedan como “a confirmar” antes de cerrarlos.

### 2.4 Recomendaciones UX Mobile prioritarias

| Prioridad | Problema | Solución recomendada |
| :--- | :--- | :--- |
| P0 | Header truncado | CTA corto en mobile (“Crear gratis”) o menú hamburguesa; mover “Iniciar Sesión” al menú. |
| P0 | Prefill roto | Aplicar `storeName` al formulario (ver §4.3) y validar el flujo claim → registro. |
| P0 | Tabla de precios rota | Reemplazar por **cards verticales** en mobile (Plan / Precio / URL / Incluye). |
| P1 | Tabla comparativa | Cards o lista “OmniFlow gana en…” con iconos. |
| P2 | Sombras hardcodeadas | Reemplazar los 2 `rgba(0,0,0,…)` por tokens (Regla #10). |

---

## 3. Cumplimiento punto por punto vs FEAT-195 (post-deploy 1.46.3)

| Objetivo del plan | Estado | Comentario |
| :--- | :---: | :--- |
| Landing comercial en la raíz `/` | ✅ | Existe y es la página principal. Branding OmniBio / OmniFlow. |
| Hero con buscador/reclamador de URL | ✅ | Input `/bio/[slug]` con placeholder `tu-marca` (`landing-biolinks-catalog.tsx`, sección 2). |
| CTA que precargue datos desde slug | ⚠️ | El claim navega a `/login?mode=register&storeName=<slug>` y `login.tsx` intenta prellenar, pero **el campo queda vacío** en producción (ver §4.3). |
| Calculadora de ahorro (vs 12% Linktree) | ✅ | Presente y funcional. |
| Showcase de casos reales (Provecchio + demo) | ✅ | Card de Provecchio con enlace real + demo Sushi & Rolls. |
| Tabla de precios Free / Pro / OmniGastro | ✅ | Sección “Planes y Precios” con `pricingData`; no es mobile-friendly. |
| Esquema de URLs Free (path) vs Pro (subdomain) | ✅ / ⚠️ | La tabla muestra las URLs; falta una explicación narrativa del esquema. |
| Onboarding Express 60 s + auto-instalación módulos | ⚠️ | `registerTenant` instala `biolinks` + `social-catalog` y crea el BioLink; falta devolver el slug y redirigir a `/bio/<slug>`. |
| Eliminar jerga técnica | ⚠️ | Copy principal comercial; quedan menciones a Redis/Rust. |
| Regla #10 – cero colores hardcodeados | ✅ / ⚠️ | Gradientes con tokens; quedan 2 sombras `rgba(0,0,0,…)`. |
| Responsive | ⚠️ | Desktop bien; mobile con header y tablas confirmadamente rotas. |

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
| 1 | Prefill de `storeName` en el registro (query param presente, campo vacío) | Muy Alto | Bajo | Frontend | ❌ Confirmado en vivo |
| 2 | Header + CTAs responsive (textos cortados) | Alto | Bajo | Frontend | ❌ Confirmado en vivo |
| 3 | Tabla de precios mobile-friendly (cards) | Alto | Medio | Frontend | ❌ Confirmado en vivo |
| 4 | Tabla comparativa mobile-friendly | Medio-Alto | Medio | Frontend | ❌ Confirmado en vivo |
| 5 | Redirect post-registro a `/bio/<slug>` | Alto | Medio | Frontend + Backend | ⏳ Pendiente |
| 6 | Precios standalone del Tridente (upsell) | Medio | Bajo | Frontend | ⏳ Pendiente |
| 7 | Explicación narrativa del esquema Free vs Pro | Medio | Bajo | Frontend | ⏳ Pendiente |
| 8 | Sombras `rgba()` hardcodeadas | Bajo | Bajo | Frontend | ⏳ Pendiente |

### 4.2 Gaps cerrados en 1.46.x

| Gap | Evidencia |
| :--- | :--- |
| Hero Claim URL (`/bio/[slug]`) | Implementado en `landing-biolinks-catalog.tsx` y publicado en 1.46.3. |
| Claim encadenado al registro (`?storeName=`) | `handleCreateFreeBio` arma `/login?mode=register&storeName=...`; verificado en vivo. |
| Tabla de precios Free / Pro / OmniGastro | Implementada y publicada. |
| Showcase Provecchio + demo Sushi & Rolls | Implementado y publicado. |
| Auto-instalación `biolinks` + `social-catalog` | `auth.service.ts` (bloques 6 y 6b). |
| Colores de gradiente hardcodeados | Gradientes migrados a tokens del tema. |

### 4.3 Causa probable del prefill roto

- `handleCreateFreeBio` **sí** agrega `storeName` a la URL: verificado en vivo
  (`/login?mode=register&storeName=mi-marca-test`).
- `login.tsx` tiene un `useEffect` que, cuando `mode === "register"`, lee `storeName`/`slug`
  y llama a `form.setFieldsValue({ storeName: slug })`.
- En producción el formulario queda vacío y la validación muestra “Ingresa el nombre de tu
  tienda”. El store de Ant Design devuelve `{}`.
- Causa probable: el `<Form form={form}>` se monta condicionalmente cuando `mode` pasa a
  `register`, y el efecto de precarga no llega a aplicar el valor al campo registrado.
- Fix sugerido: usar `initialValues={{ storeName: slug }}` en el `<Form>` de registro, o
  llamar a `form.setFieldValue` después del montaje (por ejemplo con una `key` que fuerce
  el remount o un efecto dentro del formulario). Validar con el flujo claim → registro.

---

## 5. Plan de implementación recomendado

### Sprint 1 — Mobile polish (prioridad máxima)

**Frontend — `frontend/src/pages/landing-biolinks-catalog.tsx`**

1. Header: logo + CTA corto o menú hamburguesa; mover “Iniciar Sesión” al menú.
2. Tabla de precios: cards apiladas en mobile.
3. Tabla comparativa: cards o lista “OmniFlow gana en…”.
4. Re-medir en viewport 375–390 px sobre 1.46.3 y documentar el resultado.

### Sprint 2 — Onboarding Express completo

**Frontend — `frontend/src/pages/login.tsx`**

- Corregir el prefill de `storeName` (§4.3) y agregar una prueba del flujo
  claim → registro.

**Backend — `backend/src/auth/auth.service.ts`**

- Devolver el `slug` generado en la respuesta de `registerTenant`.

**Frontend — post-registro**

- Consumir el slug y redirigir a `/bio/{slug}` (o a la vista previa) después del registro.

### Sprint 3 — Alineación comercial y calidad

- Mostrar el esquema de URLs (Free path vs Pro subdomain vs Custom) con una explicación
  breve.
- Incorporar el upsell de módulos standalone del Tridente.
- Reemplazar las 2 sombras `rgba()` por tokens de tema (Regla #10).

### Cronograma sugerido

```
Semana 1 (Mobile):
  1. Fixes de header + tabla de precios + tabla comparativa
  2. Re-verificación en 375–390 px
Semana 2 (Onboarding real):
  3. Corregir prefill de storeName
  4. Devolver slug en registerTenant
  5. Redirect post-registro a /bio/{slug}
Semana 3 (Comercial y calidad):
  6. Explicación del modelo de URLs
  7. Upsell de módulos standalone
  8. Sombras a tokens
```

---

## 6. Conclusión

La landing **ya vende y ya implementa el núcleo de FEAT-195** (claim, precios, showcase,
onboarding con módulos). El freno actual no es la propuesta: es el **prefill roto**, el
**pulido mobile** y el **cierre del loop post-registro**. Cerrando los Sprints 1 y 2, la
página queda alineada con el plan comercial y lista para campañas de captación.

---

## 7. Evidencia de la re-evaluación

- Código: `frontend/src/pages/landing-biolinks-catalog.tsx` (secciones 2, 5 y 6),
  `frontend/src/pages/login.tsx` (efecto de prefill), `backend/src/auth/auth.service.ts`
  (instalación de módulos y BioLink inicial).
- Bundle live: `https://orderflow.pesallaccia.com/assets/index-2az_CPSV.js` contiene
  `orderflow.pesallaccia.com/bio/`, placeholder `tu-marca`, “Planes y Precios”,
  `pricingData` Free/Pro/OmniGastro, la card “Provecchio” y el efecto de prefill.
- Versión servida: 1.46.3.
- Medición mobile 12-nov: viewport 375 px; documento 558/360, header 480/360, comparativa
  526/319, tabla de precios 319 px con celdas de 65–103 px.
- Prefill: la URL de destino incluye `storeName`, pero el input `#storeName` queda vacío y
  la validación exige el campo.
- `provecchio.com` contiene “Powered by OmniFlow”.

---

## 8. Referencias internas

- `plan-feat-195-landing-self-service-y-esquema-free.md`
- `plan-comercial-tridente-omnibio-omnicatalog-omnibooking.md`
- `estudio-de-caso-pency.md`
- `02-arquitectura-standalone-vs-enterprise.md`
- `informe-estado-del-arte-estratega-comercial.md`
- Snapshot histórico: `historico/informe-evaluacion-landing-omniflow-feat195-2026-11-12.md`

---

*Medición original: 11 de noviembre de 2026 (pre-deploy 1.40.2). Re-evaluación: 12 de
noviembre de 2026 (post-deploy 1.46.3), con medición mobile en vivo a 375 px.*
