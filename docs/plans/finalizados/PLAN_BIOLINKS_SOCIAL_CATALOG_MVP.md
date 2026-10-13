# Plan: BioLinks + Social Catalog — primer MVP comercial

## 1. Objetivo

Tener un producto **vendible ya** que:

1. Entra gratis con **BioLinks** (punta de lanza).
2. Convierte a pago con **Social Catalog** (catálogo + pedido).
3. Deja el camino abierto a OmniFlow completo por módulos (turnos, POS, etc.) **sin** construirlos en este MVP.

**Éxito del MVP:** un comercio publica su bio, recibe pedidos por catálogo/WhatsApp, y vos podés cobrar un plan Starter de forma repetible.

---

## 2. Posicionamiento (una frase)

> “Un link en tu Instagram que no solo lista botones: muestra tu catálogo y toma pedidos.”

No vender “SaaS omnicanal” en el primer contacto. Vender **presencia + pedido**.

---

## 3. Alcance del MVP

### Incluido

| Pieza | Free (BioLinks) | Starter (Social Catalog) |
|-------|-----------------|---------------------------|
| Bio page (links, logo, colores básicos) | Sí | Sí |
| Branding OmniFlow | Obligatorio | Opcional / reducido |
| Custom domain | No | Sí (o add-on) |
| Analytics básicos (clicks) | Limitado | Más detalle |
| Catálogo productos (fotos, precio, categorías) | No / teaser | Sí |
| Carrito + pedido | No | Sí |
| Envío pedido por WhatsApp y/o estado DRAFT en backend | No | Sí |
| Panel web mínimo (productos, pedidos, links de la bio) | Bio only | Bio + catálogo + pedidos |
| Multi-tenant + subdominio/link propio | Sí | Sí |

### Excluido (fase 2+)

POS, KDS, turnos, loyalty completo, FacturaSend, Odoo, app staff, Super Admin, Deploy, app stores como *bloqueante* del lanzamiento (Play/iOS pueden ir en paralelo después de la PWA).

### Forma de entrega móvil

1. **PWA / web móvil** del catálogo + bio (prioridad comercial).
2. Opcional después: Expo en Play con el mismo flujo.

---

## 4. Empaque comercial

| Plan | Precio (definir moneda local) | Límite orientativo | Objetivo |
|------|-------------------------------|--------------------|----------|
| **Free – Bio** | $0 | 1 bio, N links (ej. 5–7), sin dominio propio, con marca OmniFlow | Adquisición |
| **Starter – Social Catalog** | Ticket bajo–medio / mes | Catálogo + pedidos + bio, menos marca, soporte por canal | Primer ingreso |
| **Business** (roadmap) | Medio | + turnos / más usuarios / menos límites | Expansión |
| **Omni** (roadmap) | Alto | POS, integraciones, etc. | Cuenta grande |

**Regla de oro del free:** debe ser útil en Instagram, pero el CTA principal del producto (y del marketing) es “Activá catálogo y recibí pedidos”.

---

## 5. Fases de ejecución

### Fase 0 — Criterios de salida (3–5 días)

- [ ] Confirmar endpoints públicos estables: bio, productos públicos, crear pedido `DRAFT`, config del tenant (WhatsApp, moneda, branding).
- [ ] Tenant demo impecable (fotos reales, precios, WhatsApp de prueba).
- [ ] Decisión: ¿pedido solo WhatsApp, solo app, o ambos en Starter?
- [ ] Nombre comercial del producto (Social Catalog / marca blanca) vs OmniFlow.

**Gate:** un flujo manual E2E en staging: abrir bio → catálogo → pedido → llega al comercio.

---

### Fase 1 — Producto mínimo unificado (1–3 semanas)

**Backend / producto**

- [ ] Módulos: `biolinks` activo por defecto en signup free; `catalog` / `whatsapp_catalog` en plan pago (aunque el flag se active manual al inicio).
- [ ] Un solo “hub” del comercio: editar bio + (si paga) productos y ver pedidos.
- [ ] Límites free en config (max links, branding forzado).

**Frontend público (móvil first)**

- [ ] Bio responsive excelente (esto es la vidriera free).
- [ ] Catálogo móvil: lista/grid, detalle, carrito, checkout corto.
- [ ] CTAs en bio: “Ver catálogo” / “Pedir” solo si el módulo catálogo está activo; si no, upsell visual suave (“Activá tu catálogo”).

**Admin mínimo**

- [ ] CRUD links bio.
- [ ] CRUD productos básicos (o reutilizar el que ya exista, limpio).
- [ ] Lista de pedidos entrantes + link WhatsApp.

**Gate:** 3 comercios piloto (amigos/beta) publican bio; al menos 1 genera pedidos reales de prueba.

---

### Fase 2 — Comercialización (en paralelo a Fase 1 final / +1–2 semanas)

- [ ] Landing de producto (no la de OmniFlow enterprise): beneficio, ejemplos, CTA “Crear mi bio gratis”.
- [ ] Onboarding: registro → bio publicada en < 10 minutos.
- [ ] Precios publicados + medio de cobro (MP/Stripe según lo que ya tengan).
- [ ] Política de privacidad + términos (obligatorio si hay stores después; útil igual en PWA).
- [ ] Script de ventas / WhatsApp: demo en 5 minutos con tenant demo.

**Gate:** primer pago Starter real o 5 trials activos con catálogo.

---

### Fase 3 — Refuerzo y distribución (2–4 semanas)

- [ ] Analytics de embudo: signup → bio live → click catálogo → pedido → upgrade.
- [ ] Mejoras UX solo donde el embudo se rompe.
- [ ] Play Store (Expo) si la PWA ya convierte; iOS después.
- [ ] Material: 3 casos de uso (resto, estética, tienda).
- [ ] Preparar upsell a turnos/POS solo como mensaje, sin implementar aún.

---

## 6. Embudo y métricas

```
Visita landing → Signup free → Bio publicada → Click a catálogo
    → Primer pedido → Upgrade Starter → Retención 30 días
```

| Métrica | Señal sana (orientativa) |
|---------|---------------------------|
| Tiempo a bio publicada | < 10 min |
| % signup → bio live (7 días) | > 40 % |
| % bio live → abrió catálogo | Sube con CTAs claros |
| % catálogo → pedido | Depende del rubro; medir y mejorar checkout |
| % free → Starter (30 días) | Objetivo inicial 3–8 %; iterar |
| Churn Starter mes 1 | Vigilar soporte y “no me llegan pedidos” |

Si free no publica bio, el problema es onboarding.  
Si publica bio y no activa catálogo, el problema es el puente de upsell.  
Si activa catálogo y no hay pedidos, el problema es oferta del comercio o checkout.

---

## 7. Dependencias técnicas (orden)

1. **Estabilidad canal catálogo** (precios, tenant, pedido DRAFT) — alineado a depurar orders en canal `catalog`.
2. **BioLinks público + admin links** (ya en roadmap como completo; validar E2E).
3. **Feature flag simple:** free = solo biolinks; Starter = biolinks + catalog.
4. **PWA instalable** del storefront/catálogo (manifest, móvil).
5. Cobro de suscripción (reutilizar billing si está; si no, cobro manual al inicio).

No bloquear el MVP por: máquina de estados KDS, app staff, ni menú admin web completo.

---

## 8. Roles y trabajo (si hay equipo chico)

| Rol | Foco |
|-----|------|
| Producto | Límites free, precios, copy, demo |
| Backend | Flags, límites, pedidos canal catalog, hardening público |
| Frontend | Bio + catálogo móvil + admin mínimo |
| Comercial | 5 betas, landing, cierre Starter |

Una sola persona: secuencia Fase 0 → bio pulida → catálogo → 3 betas → precio.

---

## 9. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Free eterno sin upgrade | Límites + CTA catálogo + marca OmniFlow |
| Competir solo con Linktree | Demo siempre termina en **pedido** |
| Pedidos que no llegan al comercio | WhatsApp claro + panel de pedidos + notificación mínima |
| Scope creep (POS, turnos…) | Lista “excluido” visible en cada sprint |
| Mala calidad de fotos/productos del cliente | Templates y tenant demo que se vea premium |

---

## 10. Roadmap de 30–60–90 días (resumen)

| Plazo | Entregable |
|-------|------------|
| **30 días** | Bio free estable + catálogo/pedido en staging + 3 betas + pricing |
| **60 días** | Starter de pago (aunque sea cobro semi-manual) + embudo medido + mejoras checkout |
| **90 días** | Play opcional + 1 upsell documentado (ej. turnos) + proceso Starter/Business |

---

## 11. Próximo paso inmediato

1. Cerrar **decisión de pedido Starter** (WhatsApp only vs WhatsApp + panel).
2. Correr **Fase 0** (E2E staging con tenant demo).
3. Redactar **límites del Free** en una tabla fija (links, branding, dominio).
4. Si querés ejecución por agentes/dev: pedir el **prompt MD del MVP BioLinks + Social Catalog** (producto + PWA + criterios de “listo para vender”).

---

## Resumen

Este plan prioriza **ingresos y aprendizaje de mercado** con la menor superficie técnica posible, usando BioLinks como anzuelo y Social Catalog como primer producto de pago hacia OmniFlow por features.
```