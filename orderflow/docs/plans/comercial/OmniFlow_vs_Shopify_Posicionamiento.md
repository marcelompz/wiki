# OmniFlow como acelerador comercial: comparación con Shopify y estrategia de posicionamiento

## 1. Contexto

En lugar de comparar OmniFlow contra un ERP legacy (SAP Business One, Odoo tradicional, etc.), se plantea un posicionamiento inicial más cercano a **Shopify**: un acelerador comercial que permite empezar a vender rápido, con la profundidad ERP como capa de crecimiento posterior, no como puerta de entrada.

---

## 2. Comparación feature por feature

### Dónde el paralelo con Shopify es acertado

| Dimensión | Shopify | OmniFlow (hoy) |
|---|---|---|
| Comercio unificado (online + POS) | Núcleo del producto: plataforma sincronizada con inventario en tiempo real, códigos de barras y múltiples ubicaciones | POS + e-commerce + B2B + catálogo social (WhatsApp/Telegram/IG) sobre el mismo backend — alcance omnicanal ya más amplio que Shopify en canales conversacionales |
| Omnicanalidad tienda-cliente | Comprar online y recoger en tienda, devolver en tienda lo comprado online, promociones compartidas | Base multicanal ya existe; falta formalizar click&collect y devoluciones cruzadas |
| Gestión de inventario multicanal | Requisito básico de un sistema comercial unificado | Ya trabajado (política de stock, movimientos, POS/ecommerce/B2B) |
| Roles de personal en punto de venta | Gestión del personal como función esperada | Ya definida la separación vendedor vs. cajero en POS/KDS |
| Onboarding rápido / self-service | Modelo estándar: suscripción y tienda lista en minutos | Pendiente clave — el portal SaaS con wizard de compra apunta exactamente a esto |
| App marketplace / extensibilidad | Miles de apps de terceros | Marketplace propio de addons standalone en desarrollo — mismo concepto, ecosistema propio |

### Dónde OmniFlow ya se distancia de Shopify (y se acerca a un ERP)

- **Contabilidad propia (OmniLedger)** — Shopify no lleva libro contable, depende de integraciones externas (QuickBooks, Xero).
- **MRP/manufactura (OmniManufacturing)** — Shopify es comercio, no producción.
- **RRHH/Capital Humano completo** (legajos, asistencia biométrica/NFC) — fuera del alcance de Shopify.
- **Verticales sectoriales** (OmniGastro, OmniRealState) — Shopify cubre esto vía apps de terceros; OmniFlow lo construye nativo.
- **Inteligencia de mercado/pricing dinámico** (OmniPulse, OmniPricing) — no forma parte del ADN de Shopify.

### Punto de fricción del paralelo

Shopify vende **una app** (la tienda) con un ecosistema de apps alrededor. OmniFlow es **un ERP modular** que se comporta como acelerador comercial en su capa de entrada (POS + catálogo + e-commerce), pero cuyo peso real está en los módulos de gestión interna. El pitch inicial puede ser "arrancá a vender en minutos, como Shopify", pero la retención y el upsell vendrán de la profundidad ERP que Shopify no tiene.

Además, Shopify es SaaS puro sin infraestructura propia del cliente. El modelo de licenciamiento dual de OmniFlow (Community/Enterprise, open core) es más cercano a Odoo que a Shopify — el paralelo aplica a la **experiencia comercial de entrada**, no al modelo de distribución/negocio completo.

---

## 3. El pitch: "Arrancá como Shopify, crecé como ERP"

La entrada debe sonar liviana y con resultado inmediato, sin vender la profundidad ERP por adelantado:

- **Gancho de entrada (etapa Shopify):** "Subí tu catálogo, empezá a vender por WhatsApp, web y mostrador — hoy." Habilitado por el wizard de compra + catálogo social + POS.
- **Gancho de retención (etapa ERP, sin decirlo así):** no se vende como "activá el módulo de RRHH" sino como respuesta a un dolor puntual — "¿tus vendedores fichan con papel? activá asistencia con NFC en un clic." La complejidad ERP se revela como solución a fricciones reales, nunca como catálogo de funciones.
- **Diferenciador honesto frente a Shopify:** Shopify lleva rápido a vender, pero al crecer el negocio necesita un Frankenstein de apps de terceros (contabilidad, RRHH, producción) que no se hablan entre sí. Mensaje natural: "todo lo que armaste con apps sueltas, acá ya nace conectado."
- **Verticales como acelerador de confianza:** un caso de uso específico ("el POS que entiende un restaurante") es más vendible que un pitch genérico ("el ERP configurable").

---

## 4. Secuencia de roadmap para sostener el pitch

1. **Cerrar el wizard de compra self-service**
   Es el punto de entrada literal del pitch tipo Shopify: sin esto, "arrancá en minutos" es falso. Prerrequisito bloqueante: cerrar el guard faltante en `POST /api/v1/tenants` antes de exponer nada públicamente.

2. **Empaquetar el combo mínimo "vender ya"**
   POS + catálogo social (WhatsApp/QR) + e-commerce básico como paquete único de onboarding, sin exponer todavía RRHH, MRP, contabilidad avanzada ni licenciamiento dual. El cliente nuevo no debe ver la complejidad ERP en la primera pantalla.

3. **Usar OmniGastro como vertical de prueba del modelo**
   La alfa en curso (cafetería) es terreno ideal para validar el pitch "especializado, no genérico" antes de generalizarlo a otros rubros — da un testimonio concreto en vez de una promesa abstracta.

4. **Activar el Marketplace de addons como capa de expansión**
   Una vez que el cliente ya está vendiendo, el Marketplace es el mecanismo natural para ofrecer profundidad ERP a demanda (RRHH, MRP, real estate) sin que se sienta como upsell forzado — más parecido a instalar una app de Shopify que a "activar un módulo de ERP".

5. **Recién ahí, exponer el licenciamiento Community/Enterprise**
   El modelo dual (AGPLv3 + Enterprise) tiene sentido para partners, integradores y clientes grandes — no para el cliente que recién está probando el wizard. Introducirlo antes de tiempo reintroduce la percepción de "esto es un ERP complejo".

**Lógica del orden:** cada paso desbloquea al siguiente sin exponer complejidad antes de que el cliente la necesite. El bloqueante de seguridad del wizard es lo único verdaderamente urgente — todo lo demás es secuencia de mensaje, no de código.
