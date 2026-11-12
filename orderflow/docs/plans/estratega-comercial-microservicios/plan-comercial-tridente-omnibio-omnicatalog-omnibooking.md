# Plan comercial integrado: Tridente standalone (OmniBio + OmniCatalog + OmniBooking) & estrategia go-to-market

> **Estado:** propuesta comercial vigente — revisada 2026-11-12 sobre v1.46.3.
> **Matriz canónica de precios:** la de este documento. La landing implementa hoy los
> planes Free / Pro Emprendedor / OmniGastro; los módulos standalone se ofrecen como
> upsell.

## 1. Resumen ejecutivo y propuesta de valor

El Tridente (OmniBio, OmniCatalog y OmniBooking) se consolida como la suite modular de
interacción, captura y conversión orientada a PyMEs, comercios gastronómicos y
prestadores de servicios.

Al operar de forma independiente (standalone) o integrarse mediante microservicios y
conectores API (OmniConnect, **planificado**), permite capturar clientes que necesitan
soluciones ágiles de cara al público sin requerir un despliegue ERP complejo desde el
primer día.

### Propuesta de valor por módulo

- **OmniBio (punto de contacto y perfil optimizado):** enlace dinámico centralizado
  (link-in-bio) con identidad de marca, micro-landing pages y analítica de conversión.
- **OmniCatalog (catálogo digital interactivo multicanal):** muestrario de
  productos/servicios integrado a WhatsApp y redes sociales, con gestión de disponibilidad
  e intenciones de compra.
- **OmniBooking (motor de reservas y agenda de citas):** agendamiento online en tiempo
  real, asignación por recurso/profesional, recordatorios y cobros integrados.

---

## 2. Esquema técnico y modelo de despliegue dual (PyME vs Enterprise)

El sistema aprovecha una arquitectura modular bajo un monorepo optimizado, con un doble
enfoque comercial:

- **Modo Standalone (PyME):** microservicios aislados con bases de datos independientes o
  compartidas ligeras, ideales para comercios que buscan autoservicio inmediato con
  consumo mínimo de recursos. **Es una propuesta de arquitectura**: el flag
  `STANDALONE_MODE` aún no está implementado (ver
  `02-arquitectura-standalone-vs-enterprise.md`).
- **Modo Enterprise (ERP):** integración total con Odoo y módulos avanzados de analítica,
  adaptado para operaciones corporativas y franquicias.

---

## 3. Modelo de URLs: estrategia de entrada (Free vs Pro)

Inspirado en el benchmarking de plataformas de conversión y en casos de éxito en
producción (como Provecchio), el modelo introduce una estrategia de URLs para reducir la
fricción de entrada:

1. **Plan Free ($0 / 0% comisión):**
   - **Estructura:** URL por path compartido instantáneo
     (`https://orderflow.pesallaccia.com/bio/<slug>` o `/catalogo/<slug>`).
   - **Ventaja:** cero latencia DNS, despliegue inmediato sin costo de infraestructura por
     subdominio y provisión automática en 60 segundos desde la landing principal.
2. **Plan Pro Emprendedor ($15/mes):**
   - **Estructura:** subdominio dedicado (`https://<slug>.pesallaccia.com`).
   - **Ventaja:** eliminación de marca de agua, inclusión de **OmniBooking Lite** (1 agenda,
     sin cobros online) y gestión avanzada de analíticas.
3. **Plan Gastro / Enterprise Custom (dominio propio):**
   - **Estructura:** dominio personalizado mediante CNAME (`https://provecchio.com`).

---

## 4. Matriz de empaquetamiento y precios (canónica)

### 4.1 Planes de entrada (los que muestra la landing)

| Plan | Precio | Incluye | URL |
| :--- | :--- | :--- | :--- |
| **Free Forever** | $0 USD | 1 perfil/catálogo básico, hasta 30 productos, pedidos ilimitados a WhatsApp, 0% comisiones, marca de agua. | `orderflow.pesallaccia.com/bio/<slug>` |
| **Pro Emprendedor** | $15/mes | Subdominio propio, productos ilimitados, variantes y stock, **OmniBooking Lite** (1 agenda, sin cobros online), sin marca de agua. | `<slug>.pesallaccia.com` |
| **OmniGastro** | $35/mes | KDS de cocina, POS offline, delivery por zonas GPS, facturación SIFEN/DNIT, dominio propio (caso Provecchio). | Dominio custom (CNAME) |

### 4.2 Módulos standalone (upsell)

| Módulo | Precio mensual | Precio anual | Incluye |
| :--- | :--- | :--- | :--- |
| **OmniBio Standalone** | $12/mes | $9/mes | 1 dominio/perfil Pro, creador visual, analítica de clics, links ilimitados, subdominio. |
| **OmniCatalog Standalone** | $19/mes | $15/mes | 1 catálogo activo Pro, productos ilimitados, pasarela de pedidos a WhatsApp. |
| **OmniBooking Standalone** | $25/mes | $20/mes | Hasta 3 agendas/recursos, reservas online, recordatorios automáticos y cobros. |
| **Pack Tridente Full** | $45/mes | $35/mes | 1 sucursal/marca con OmniBio + OmniCatalog + OmniBooking integrados. |

### 4.3 Regla de reconciliación (evita arbitraje)

- **Pro Emprendedor ($15)** incluye **OmniBooking Lite**: 1 agenda y sin cobros online.
- **OmniBooking Standalone ($25)** incluye la versión completa: hasta 3 agendas,
  recordatorios y cobros.
- **Pack Tridente Full ($45)** incluye los tres módulos en su versión completa.
- Por lo tanto, un cliente que necesita cobros online o más de una agenda debe ir a
  OmniBooking Standalone o al Pack; el plan Pro no compite con el módulo completo.

---

## 5. Estrategia de Go-to-Market (GTM) y autoservicio

1. **Landing Page Self-Service unificada (`orderflow.pesallaccia.com`):**
   - Incorpora un buscador en el Hero ("Reclama tu URL") que permite al comerciante crear
     su tenant en menos de 60 segundos. **Ya desplegado en v1.46.3.**
   - Presenta una calculadora de ahorro frente a alternativas de mercado (Linktree, Pency)
     y muestra casos de éxito reales (Provecchio). **Ya desplegado.**
   - Pendiente: redirect post-registro a `/bio/<slug>` y pulido mobile.
2. **Estrategia "Trojan Horse":**
   - Captación masiva mediante el plan gratuito o módulos de entrada (OmniBio /
     OmniBooking). Una vez que el comercio digitaliza sus operaciones y valida el canal de
     ventas, se activa el upsell hacia el pack completo del Tridente o la migración al ERP
     Enterprise.
3. **Canal de agencias e integradores:**
   - Alianzas con agencias de marketing y consultores Odoo que implementan la capa
     front-facing del Tridente para sus clientes finales, con esquemas de comisión
     recurrente (MRR).

---

## 6. Hoja de ruta técnica y comercial

- **Fase 1 (Estandarización y Onboarding Express):**
  - `@orderflow/auth-shared` disponible; utilidades de DB/multi-tenant planificadas.
  - `registerTenant` ya crea el tenant Free, instala `biolinks` + `social-catalog` y genera
    el BioLink inicial.
  - Pendiente: devolver el slug y redirigir a `/bio/<slug>`.
- **Fase 2 (Optimización de infraestructura):**
  - Migración pnpm fase 1 **completada** (FEAT-212, v1.46.3): checkout de ~4.2 GB a
    ~1.7 GB; store global ~1.5 GB.
  - El objetivo original de "<600 MB" **no se alcanzó**; la fase 2 de pnpm (CI, Docker y
    patrón Prisma) queda como trabajo futuro.
- **Fase 3 (Lanzamiento comercial y pilotos):**
  - Landing autogestionada **ya desplegada** en producción (v1.46.3).
  - Pendiente: validación con marcas piloto gastronómicas y de servicios en la región, y
    cierre del onboarding.

---

## 7. Decisiones abiertas

1. Confirmar la regla de reconciliación Pro ($15) vs OmniBooking Standalone ($25).
2. Definir si el plan anual se muestra en la landing (hoy solo se muestra mensual).
3. Resolver las fricciones mobile del header y la tabla comparativa antes de campañas
   pagas.
4. Cerrar el redirect post-registro a `/bio/<slug>` para completar el onboarding de 60 s.
