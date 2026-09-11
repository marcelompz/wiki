# Plan: Mejoras de OmniBio (Bio-Links) — v1

> **Módulo:** `biolinks` (monolito `backend/biolinks/`, standalone `services/biolinks-standalone/`)
> **Alcance:** Backend + Frontend
> **Base:** auditoría de código real (2026-08-25) sobre `frontend/public-biolink.tsx`, `frontend/biolinks-admin.tsx`, `backend/biolinks/biolinks.controller.ts`/`.service.ts`, `services/biolinks-standalone/src/*`.
> **Principio:** OmniBio no es un catálogo filtrable — es una lista de bloques ordenados. No se importan 1:1 las secciones de OmniCatalog (ordenamiento por criterios, banner de destacados, toolbar de búsqueda) porque no tienen equivalente funcional acá. Sí se importa el estándar de tokens/contraste y el patrón de auditoría.

---

## 0. Estado auditado (2026-08-25)

| Capacidad | Estado |
|-----------|--------|
| Rutas públicas `click` / `order` | 🔴 **Rotas**: frontend llama sin prefijo `public/`, backend lo exige — 404 en producción |
| Precio en Fast Checkout | 🔴 Sin validar server-side — el cliente manda `item.price` y se persiste tal cual |
| Moneda en bio pública | 🟡 `$` hardcodeado; `tenant.currency` disponible en el payload y sin usar |
| Tema/tokens — Admin (`biolinks-admin.tsx`) | ✅ Ya integrado: dark mode funciona, DnD nativo ya usa `var(--bg-elevated)`, `var(--border)`, `var(--success)` |
| Tema/tokens — Página pública | 🟡 Cero uso de `cssVars`; 100% inline atado a `themeColor`/`textColor` del tenant (esperado), pero el Drawer de checkout (AntD) no seatan a nada — sale siempre en blanco por defecto |
| Contraste `themeColor`/`textColor` | 🔴 Sin validación en el admin — se puede guardar una combinación ilegible |
| Reordenamiento de bloques | ✅ Ya funciona (drag & drop nativo HTML5 en el admin) |
| Ribbon/Tag/Stock en bloques tipo `product` | 🟡 Ausente — el bloque solo muestra ícono + precio, sin estado de stock |
| Analítica de clics (backend) | ✅ Implementada (`registerClick`/`getClicksByBioLink`), pero inalcanzable por el bug #1 |
| `/omnilinks` vs `/bio` (standalone) | ✅ Alias intencional (mismo servicio, dos prefijos) — no es duplicación a limpiar |

---

## 1. Fix crítico: rutas públicas de click y checkout

### Problema
`frontend/public-biolink.tsx` (líneas ~149 y ~187):
```ts
await axios.post(`${API_URL}/v1/bio/${slug}/click`, {...});
const res = await axios.post(`${API_URL}/v1/bio/${slug}/order`, payload);
```
Backend (monolito y ambos standalone) define:
```ts
@Post('public/:slug/click')
@Post('public/:slug/order')
```
Sin el segmento `public/`, ambas requests caen fuera de cualquier ruta definida.

### Impacto
- Cero clics registrados → analítica de OmniBio vacía sin que nadie lo note (no hay error visible para el admin, solo un `console.warn` silencioso en el click).
- **El botón "Confirmar Pedido Ahora" del In-Bio Fast Checkout probablemente no crea ninguna orden** — el flujo de venta insignia del producto (mencionado en el propio marketing: "In-Bio Fast Checkout nativo") está roto.

### Fix
Un cambio de dos líneas en `public-biolink.tsx`, agregando `public/` a ambas URLs. Prioridad máxima — desbloquea el flujo de venta antes de tocar cualquier otra cosa de este plan.

### Criterios de aceptación
- [ ] Un clic en un bloque de tipo `link` registra el evento en `BioLinkClick` (verificar en DB o en `getClicksByBioLink`).
- [ ] Un pedido de Fast Checkout completa el flujo y devuelve `orderId`.
- [ ] Probado contra el monolito y contra el standalone (si el frontend público apunta al standalone en algún entorno).

---

## 2. Integridad de precio en Fast Checkout

### Problema
`backend/biolinks/biolinks.controller.ts`, `createOrderFromBioLink`:
```ts
price_at_sale: item.price || item.price_at_sale || 0,
```
El precio viene del `body` que manda el navegador (`selectedBlock.price` en el frontend) y se persiste sin cruzarlo contra el precio real del producto/servicio.

### Riesgo
Cualquiera con las devtools abiertas puede interceptar el POST y mandar el `price` que quiera antes de que se cree la orden.

### Propuesta
- Si `item.productId` corresponde a un `Product` real: ignorar `item.price` del body y resolver el precio server-side desde `Product.price` (mismo patrón que ya debe existir en `orders.service.ts` para otros canales — auditar antes de reimplementar).
- Si el bloque es de tipo `booking` o no tiene `Product` asociado (precio libre configurado en el bloque de BioLink), documentar explícitamente que ese precio es de confianza del propio tenant (lo definió el admin al crear el bloque, no el visitante) — y validar que efectivamente venga del `BioLink.blocks` guardado en backend, no del `body` del checkout.

### Criterios de aceptación
- [ ] Un POST con `price` manipulado en un bloque de tipo `product` no cambia el `price_at_sale` final.
- [ ] Los bloques sin producto asociado siguen funcionando con el precio que definió el admin en el bloque.

---

## 3. Consistencia de moneda

### Problema
`public-biolink.tsx` muestra `${block.price}` y `${selectedBlock.price}` con el símbolo `$` fijo, mientras que `social-catalog.tsx` (mismo tenant) usa `₲` en todos lados. El payload de `getPublicBySlug` ya incluye `tenant.currency`.

### Propuesta
- Reemplazar el `$` hardcodeado por un formateo basado en `tenant.currency` (mismo helper que use o se extraiga de `social-catalog.tsx`, para no duplicar lógica de formato entre ambos módulos).

### Criterios de aceptación
- [ ] El precio en los bloques y en el Drawer de checkout usa el símbolo/formato de `tenant.currency`.
- [ ] Un tenant en otra moneda (si existiera) no ve `₲` ni `$` fijo.

---

## 4. Tema: chrome de UI del checkout + validación de contraste en el admin

> Distinción importante: OmniBio tiene **dos conceptos de tema** que no hay que mezclar.
> - **Marca del tenant** (`themeColor`/`textColor`): elegida por el admin, es la identidad visual de la bio pública — no debe adaptarse a un "modo oscuro del sistema", es intencionalmente fija.
> - **Chrome de UI del sistema** (el Drawer de checkout, los inputs del formulario, los botones AntD): hoy no usa ni la marca del tenant ni `cssVars` — sale siempre con los valores por defecto de AntD.

### 4.1 — Drawer de checkout coherente con la marca
- El Drawer (`placement="bottom"`) y su contenido (`Form`, inputs, botón de confirmar) deberían tomar como mínimo el color de acento (`themeColor`) para el botón primario y mantener buen contraste interno — hoy el botón usa `backgroundColor: "#3D2235"` hardcodeado (el color por defecto, no el `themeColor` real del tenant que está siendo mostrado en la página).
- No es necesario aplicar `cssVars` del sistema acá (el Drawer ya es legible con los defaults de AntD) — el bug real es que ignora el `themeColor` del tenant que se está mostrando.

### 4.2 — Validación de contraste en el picker de marca (admin)
- En `biolinks-admin.tsx`, al lado de los inputs "Color de Fondo" / "Color de Texto", mostrar el ratio de contraste calculado en vivo (reusar o portar `getContrastingTextColor`, que ya existe en `social-catalog.tsx`) y una advertencia si cae por debajo de 4.5:1.
- No bloquear el guardado (es una elección de marca del tenant, no un error del sistema) — solo advertir.

### Criterios de aceptación
- [ ] El botón de confirmar del checkout usa el `themeColor` real del tenant, no un valor fijo.
- [ ] El admin ve una advertencia de contraste al elegir una combinación de color de fondo/texto por debajo de 4.5:1.

---

## 5. Bloques tipo "product": Ribbon / Tag / Stock

### Problema
Un bloque de tipo `product` en la bio solo muestra ícono de carrito + precio. No hay forma de saber si el producto está agotado antes de iniciar el Fast Checkout.

### Propuesta
- Si el bloque referencia un `productId` real, incluir en la respuesta pública el `stockStatus` (reusando `getStockStatus`/el helper ya definido para social-catalog, sección 3 del plan de OmniCatalog).
- Renderizar el mismo badge (AGOTADO / Pocas unidades / disponible) que ya existe en el catálogo, con los mismos `cssVars`.
- Si está agotado, deshabilitar el bloque o redirigir a un estado "no disponible" en vez de abrir el Drawer de Fast Checkout.

### Criterios de aceptación
- [ ] Un bloque `product` vinculado a un producto agotado lo muestra visualmente y no permite iniciar el checkout.
- [ ] Cero tablas nuevas — se reusa el mismo `stockStatus` de Product/social-catalog.

---

## Fuera de alcance (y por qué)

- **Ordenamiento por criterios (precio/nombre/stock), toolbar de búsqueda, banner de destacados**: no tienen equivalente en OmniBio — es una lista corta de bloques curados a mano por el admin, no un catálogo a explorar. El drag & drop manual que ya existe cubre la necesidad real.
- **Tema claro/oscuro del sistema aplicado a la página pública**: la página pública ya tiene su propio sistema de "tema" (marca del tenant) — aplicarle además el `data-theme` del sistema generaría dos fuentes de verdad compitiendo por los mismos colores.
- **Deduplicar `/omnilinks` vs `/bio` en el standalone**: es un alias intencional, no deuda técnica.

---

## Orden de implementación recomendado

| # | ID | Entrega | Prioridad |
|---|-----|----------|-----------|
| 1 | BL-01 | Fix rutas públicas click/order | P0 — bloqueante de ventas |
| 2 | BL-02 | Precio validado server-side en Fast Checkout | P0 — integridad |
| 3 | BL-03 | Moneda `tenant.currency` en vez de `$` fijo | P1 |
| 4 | BL-04 | Botón de checkout usa `themeColor` real | P2 |
| 5 | BL-05 | Validación de contraste en picker de marca (admin) | P2 |
| 6 | BL-06 | Ribbon/Tag/Stock en bloques tipo product | P2 — depende de que social-catalog ya exponga `stockStatus` |

```
BL-01 (fix rutas) ── bloqueante de todo lo demás relacionado a checkout
BL-02 (precio server-side)
BL-03 (moneda)
BL-04 (checkout con themeColor)
BL-05 (contraste picker)
BL-06 (stock en bloques) ← depende de SC-03/SC-04 de OmniCatalog ya desplegados
```

---

## Riesgos

- **BL-01 y BL-02 tocan el flujo de venta real** — probar en staging con una orden de punta a punta antes de deploy a producción, no solo el fix de ruta en aislado.
- **BL-02** puede requerir tocar `orders.service.ts` si la resolución de precio server-side no está ya centralizada ahí — auditar antes de estimar.
- **BL-06** depende de que el contrato de `stockStatus` de OmniCatalog (SC-03) esté estable antes de reusarlo acá — no paralelizar.

---

## Referencias

- `frontend/public-biolink.tsx` — página pública (foco de este plan)
- `frontend/biolinks-admin.tsx` — admin (ya sólido, sin cambios estructurales)
- `backend/biolinks/biolinks.controller.ts`, `biolinks.service.ts`
- `services/biolinks-standalone/src/{omni-bio,bio-links}.controller.ts`
- `frontend/social-catalog.tsx` — fuente de `getContrastingTextColor` y `stockStatus` a reusar
- `docs/guides/BioLinks.md`, `docs/guides/sugerencias_bio-links.md` — spec original del módulo
