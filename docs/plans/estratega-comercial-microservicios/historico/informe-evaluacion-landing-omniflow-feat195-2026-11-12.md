# Informe de Evaluación — Landing Page OmniFlow / OmniBio (snapshot 2026-11-12)

> **Documento histórico — superado.**  
> Este archivo conserva la reevaluación del 12-nov-2026 tal como se publicó. El informe
> vigente es
> [`../informe-evaluacion-landing-omniflow-feat195.md`](../informe-evaluacion-landing-omniflow-feat195.md),
> que consolida el delta, las mediciones mobile verificadas y las correcciones.
>
> Correcciones aplicadas al consolidar:
>
> - **Prefill de `storeName`:** el snapshot acierta en que el campo queda vacío, pero el
>   motivo no es “sin query params”. La URL **sí** incluye `?storeName=...`; el valor no se
>   aplica al formulario (bug de montaje/`setFieldsValue`).
> - **“En menos de 24 horas”:** los tres pilares existen desde 1.46.0 (commit `8cf3d374`,
>   4-nov). Se publicaron con el deploy 1.40.2 → 1.46.3 del 11-nov.
> - **Regla #10:** no está en ❌. Los gradientes usan tokens; quedan 2 sombras `rgba()`.
> - **Referencias:** los nombres de archivo ya son kebab-case
>   (`plan-comercial-tridente-omnibio-omnicatalog-omnibooking.md`,
>   `estudio-de-caso-pency.md`).

**URL evaluada:** https://orderflow.pesallaccia.com/  
**Referencia:** FEAT-195 (Landing Self-Service Unificada + Esquema Free Path / Pro Subdominio) + Plan Comercial Tridente  
**Fechas de evaluación:**  
- Primera: 11 de noviembre de 2026  
- Reevaluación: 12 de noviembre de 2026  
**Enfoque:** Mobile-First + Gaps de implementación + Delta de avance

---

## 1. Resumen Ejecutivo (Reevaluación 12 nov 2026)

En menos de 24 horas la landing incorporó los **tres pilares críticos** que faltaban de FEAT-195:

| Elemento FEAT-195 | 11 nov | 12 nov |
| :--- | :---: | :---: |
| Hero Claim URL (`/bio/[tu-marca]`) | ❌ | ✅ Presente |
| Showcase casos reales (Provecchio + Sushi Demo) | ❌ | ✅ Presente |
| Tabla de precios Free / Pro / OmniGastro | ❌ | ✅ Presente |
| Calculadora de ahorro | ✅ | ✅ |
| Tabla comparativa vs Linktree/Pency | ✅ | ✅ |
| CTA → registro | ✅ | ✅ (sin precarga de slug) |

La landing pasó de “pitch incompleto” a **estructura alineada con FEAT-195**.

Lo que falta para cerrar el loop de captación self-service es:

1. Que el claim **arrastre el slug al registro** (precarga de `storeName`).
2. Que las tablas (precios y comparativa) y el header se comporten bien en mobile.
3. Confirmar onboarding post-registro (redirect a `/bio/{slug}` + auto-install de módulos).

| Dimensión | Nota 11 nov | Nota 12 nov | Observación |
| :--- | :---: | :---: | :--- |
| Mensaje y copy comercial | 8.5 | 8.5 | Sin cambios relevantes |
| Conversión self-service | 7.0 | **7.5** | Claim visible; falta precarga de slug |
| Elementos de persuasión | 8.0 | **9.0** | Precios + casos reales añadidos |
| Completitud vs FEAT-195 | 5.0 | **8.0** | Tres pilares principales en producción |
| Alineación Plan Comercial | 4.5 | **7.5** | Precios Free/Pro/OmniGastro visibles |
| Calidad visual desktop | 8.0 | 8.5 | Más completa |
| Calidad visual mobile | 6.6 | **6.8** | Hero mejoró; tablas y header siguen rotos |
| **Promedio general** | **~6.8** | **~8.0** | Salto claro de madurez |

---

## 2. Delta de cambios (11 → 12 nov)

### 2.1 Lo que se agregó

1. **Hero Claim URL**
   - Input: `orderflow.pesallaccia.com/bio/` + placeholder `tu-marca`
   - Botón “Crear mi Catálogo Gratis” debajo del input
   - En mobile el input se apila correctamente

2. **Sección “Casos Reales en Producción”**
   - Card **Provecchio** (Restaurante Italiano) con enlace a provecchio.com
   - Card **Sushi & Rolls Demo** con CTA “Probar demo”

3. **Sección “Planes y Precios”** (alineada a FEAT-195)
   - **Free Forever** — $0 — path `orderflow.pesallaccia.com/bio/tunegocio` — hasta 30 productos, WhatsApp, 0% comisión, biolink + catálogo social
   - **Pro Emprendedor** — $15/mes — subdomain `tunegocio.pesallaccia.com` — productos ilimitados, variantes, stock, turnos OmniBooking, sin marca de agua
   - **OmniGastro** — $35/mes — dominio propio (ej. provecchio.com) — KDS cocina, POS offline Rust Tauri, delivery por zonas GPS, facturación SIFEN/DNIT

### 2.2 Lo que sigue igual / con fricción

| Gap | Severidad | Detalle |
| :--- | :---: | :--- |
| Claim → precarga de `storeName`/`slug` en registro | Alta | Al llenar slug y hacer click va a `/login?mode=register` **sin** query params. Campo “Nombre del Comercio” queda vacío. |
| Header mobile truncado | Alta | “Crear mi Catálogo Gratis” del header se corta en “Crear mi C…” |
| Tabla de precios en mobile | Alta | Columnas se rompen; URLs se parten letra por letra; nombres de plan truncados |
| Tabla comparativa en mobile | Media-Alta | Sigue desbordando; columna OmniFlow parcialmente oculta |
| Onboarding post-registro | Media | No verificable solo desde landing; circuito claim→slug→bio aún no cierra |
| Regla #10 (tokens de tema) | Baja | Siguen estilos con colores hardcodeados en botones |

---

## 3. Evaluación UX/UI Mobile-First (actualizada 12 nov)

### 3.1 Notas por aspecto (Mobile ~375–390 px)

| Aspecto | Nota 11 nov | Nota 12 nov | Comentario |
| :--- | :---: | :---: | :--- |
| Jerarquía visual / Hero | 7.5 | **8.5** | Claim URL presente y bien apilado |
| Legibilidad y tipografía | 8.0 | 8.0 | Sin cambios |
| Espaciado y densidad | 7.0 | 7.0 | Aceptable |
| Componentes interactivos | 6.5 | **7.0** | Claim + calculadora bien; tablas mal |
| Navegación / Header sticky | 5.0 | **5.0** | Sigue truncado |
| Tabla de precios | — | **3.5** | Rota (texto partido, truncado) |
| Tabla comparativa | 4.0 | **4.0** | Sigue problemática |
| Casos reales | — | **8.0** | Cards legibles |
| CTAs y conversión | 7.0 | 7.0 | Claros en body; mal en header |
| Consistencia visual | 7.5 | 7.5 | Hardcode de colores |
| **Promedio Mobile** | **6.6** | **~6.8** | Hero mejoró; tablas/header son el cuello de botella |

### 3.2 Hallazgos concretos Mobile

**Críticos**

1. **Header sticky truncado**  
   Logo + “Iniciar Sesión” + botón “Crear mi Catálogo Gratis” no caben. El CTA del header se corta.

2. **Tabla de precios rota**  
   En viewport estrecho las columnas se comprimen:  
   - “Free Forever” → “Free Fore ver”  
   - “OmniGastro” → “Omn iGast”  
   - URLs se parten carácter por carácter  
   Solución: cards apiladas en mobile o scroll horizontal controlado + `word-break` adecuado.

3. **Tabla comparativa**  
   Sigue obligando a scroll horizontal; la columna OmniFlow queda parcialmente oculta.

**Positivos**

- Claim URL se apila bien debajo del H1.
- Calculadora de ahorro sigue clara y usable.
- Cards de casos reales (Provecchio + Sushi Demo) se leen bien.
- Flujo de registro sigue limpio.

### 3.3 Recomendaciones UX Mobile prioritarias

| Prioridad | Problema | Solución recomendada |
| :--- | :--- | :--- |
| P0 | Header truncado | CTA corto en mobile (“Crear gratis”) o menú hamburguesa. Mover “Iniciar Sesión” al menú. |
| P0 | Claim no precarga slug | Redirigir a `/login?mode=register&storeName={slug}` y prellenar el formulario. |
| P0 | Tabla de precios rota | Reemplazar por **cards verticales** en mobile (Plan / Precio / URL / Incluye). |
| P1 | Tabla comparativa | Cards o lista “OmniFlow gana en…” con iconos. |
| P2 | Tokens de tema | Migrar a `theme.useToken()` (Regla #10). |

---

## 4. Cumplimiento punto por punto vs FEAT-195 (12 nov)

| Objetivo del plan | Estado 11 nov | Estado 12 nov | Comentario |
| :--- | :---: | :---: | :--- |
| Landing comercial en la raíz `/` | ✅ | ✅ | — |
| Hero con buscador/reclamador de URL | ❌ | ✅ | Input `tu-marca` visible |
| CTA que precargue datos desde slug | ❌ | ⚠️ | Va a registro, pero **sin** precarga |
| Calculadora de ahorro | ✅ | ✅ | — |
| Showcase de casos reales | ❌ | ✅ | Provecchio + Sushi & Rolls Demo |
| Tabla de precios Free / Pro / OmniGastro | ❌ | ✅ | Contenido alineado al plan |
| Esquema de URLs explicado en la UI | ❌ | ⚠️ | Visible en tabla de precios; no hay copy explicativo dedicado |
| Onboarding Express + auto-install módulos | ⚠️ | ⚠️ | No verificado end-to-end |
| Eliminar jerga técnica | ⚠️ | ⚠️ | Siguen menciones técnicas (Redis, Rust, etc.) |
| Regla #10 – cero colores hardcodeados | ❌ | ❌ | Sin cambios |
| Responsive (tablas + header) | ⚠️ | ⚠️ | Hero mejoró; tablas y header siguen rotos |

---

## 5. Gaps residuales priorizados (post-reevaluación)

| # | Gap | Impacto | Esfuerzo | Tipo | Estado |
| :---: | :--- | :---: | :---: | :--- | :--- |
| 1 | Claim → precarga `storeName`/`slug` en registro | Muy Alto | Bajo | Frontend | ⚠️ Parcial |
| 2 | Header mobile truncado | Alto | Bajo | Frontend | ❌ |
| 3 | Tabla de precios mobile-friendly (cards) | Alto | Medio | Frontend | ❌ |
| 4 | Tabla comparativa mobile-friendly | Medio-Alto | Medio | Frontend | ❌ |
| 5 | Onboarding post-registro → `/bio/{slug}` | Alto | Medio | Frontend + Backend | ⚠️ No verificado |
| 6 | Auto-instalación `biolinks` + `social-catalog` | Alto | Medio | Backend | ⚠️ No verificado |
| 7 | Copy explicativo del esquema Free path vs Pro subdomain | Medio | Bajo | Frontend | ⚠️ Parcial |
| 8 | Regla #10 (tokens de tema) | Bajo | Bajo | Frontend | ❌ |

---

## 6. Checklist técnico prioritario (P0 / P1)

### P0 — Cerrar el loop de conversión

**Frontend — `landing-biolinks-catalog.tsx`**
- [ ] Al hacer submit del claim, redirigir a:  
  `/login?mode=register&storeName={slug}` (o `slug={slug}&ref=landing`)
- [ ] Validación básica de slug (minúsculas, guiones, sin espacios, longitud razonable)
- [ ] Header mobile: versión corta del CTA o menú; que el texto no se corte

**Frontend — `login.tsx`**
- [ ] Leer `storeName` / `slug` de query params
- [ ] Prellenar el campo “Nombre de tu Comercio / Tienda”
- [ ] (Opcional) Usar el slug como sugerencia de handle del bio

**Frontend — Tabla de precios**
- [ ] En viewport mobile: renderizar **cards apiladas** (una por plan) en lugar de tabla de 4 columnas
- [ ] Evitar `word-break` que parta URLs carácter a carácter

### P1 — Mobile de tablas + onboarding

**Frontend — Tabla comparativa**
- [ ] Versión mobile: cards o lista por característica con badge “OmniFlow gana”

**Backend — `auth.service.ts` (verificar / completar)**
- [ ] `registerTenant` en modo Free instala `biolinks` **y** `social-catalog`
- [ ] Crea BioLink por defecto con botón WhatsApp + enlace al catálogo
- [ ] No invoca Cloudflare DNS en plan Free
- [ ] Devuelve el `slug` generado

**Frontend — Post-registro**
- [ ] Tras registro exitoso → redirect al panel y/o apertura de `/bio/{slug}`

### P2 — Pulido

- [ ] Migrar colores hardcodeados a tokens de tema (Regla #10)
- [ ] Microcopy breve del esquema de URLs (Free path vs Pro subdomain vs Custom)
- [ ] Smoke test E2E: claim `sushi-demo` → registro → `/bio/sushi-demo` visible

---

## 7. Cronograma residual sugerido

```
Día 1–2 (P0):
  1. Conectar claim → storeName en registro + prefill
  2. Fix header mobile
  3. Precios en cards para mobile

Día 3–4 (P1):
  4. Comparativa mobile-friendly
  5. Verificar/completar auto-install + redirect post-registro

Día 5 (P2):
  6. Tokens de tema
  7. Copy esquema de URLs
  8. Smoke test E2E del flujo completo
```

---

## 8. Conclusión

**11 nov:** Landing con buen mensaje y calculadora, pero sin claim URL, sin precios y sin casos reales → completitud FEAT-195 ~5/10.

**12 nov:** Los tres pilares de FEAT-195 están en producción. Completitud estructural ~8/10.  
El cuello de botella pasó de “falta de secciones” a **fricción de conversión y mobile**:

- el claim no arrastra el slug al formulario, y  
- las tablas (precios sobre todo) y el header se rompen en móvil.

Cerrar P0 (precarga de slug + header + precios mobile) convierte la página en una máquina de captación self-service alineada con el plan.

---

## 9. Referencias

- `plan-feat-195-landing-self-service-y-esquema-free.md`
- `plan-comercial-tridente-omnibio-omnicatalog-omnibooking.md`
- `estudio-de-caso-pency.md`
- Inspección live: https://orderflow.pesallaccia.com/ (desktop + mobile, 11 y 12 nov 2026)

---

*Informe actualizado el 12 de noviembre de 2026 con reevaluación live de la landing.*
