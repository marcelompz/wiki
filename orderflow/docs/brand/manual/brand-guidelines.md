# Manual de Identidad Corporativa: OmniFlow

**Versión:** 2.0  
**Concepto Central:** El Núcleo Conector del Negocio en Tiempo Real

---

## 1. Introducción y Fundamento del Rebranding

El paso de **OrderFlow** a **OmniFlow** representa la maduración estructural del producto. Mientras la marca original limitaba la percepción a la gestión de pedidos y transacciones comerciales, **OmniFlow** define a la plataforma como una red neuronal operativa integral: un sistema de acción (*System of Action*) de alta velocidad capaz de operar en modo *Standalone* o como una capa agnóstica acoplada a sistemas contables preexistentes (*Legacy*).

> **Propósito de Marca:** Sincronizar todos los canales comerciales, puntos de contacto y flujos operativos en una experiencia sin fricción, en tiempo real y accesible para cualquier escala de negocio.

---

## 2. Identidad Visual y Logotipo

```text
          ┌─────────────┐
   ▲      │   OMNI      │   Isotipo Dinámico de Flujo Continuo
 ◄ ● ►    │   FLOW      │   Tipografía Moderna Sans-Serif
   ▼      └─────────────┘
```

- **Construcción del Logotipo:** Se conserva el isotipo y el ADN tipográfico original para mantener el reconocimiento y la continuidad de marca, integrando el nuevo identificador tipográfico OmniFlow en caja alta y baja compacta.
- **Área de Exclusión:** El logotipo debe contar siempre con un espacio libre perimetral equivalente al 50% de la altura de la letra "O" para garantizar legibilidad en interfaces saturadas.
- **Tamaños Mínimos de Reproducción:**
  - **Digital (UI / Favicons / App Icons):** Mínimo 24px (solo isotipo) / 120px (logotipo completo).
  - **Impreso / Merchandising:** Mínimo 15 mm de ancho.
- **Usos Prohibidos:**
  - No deformar ni alterar las proporciones del isotipo ni de la tipografía.
  - No invertir ni intercambiar los colores de la marca fuera de los contrastes normados.
  - No aplicar sombras duras, biselados ni degradados no contemplados en el manual.

---

## 3. Sistema Cromático y Accesibilidad (WCAG AA)

La paleta cromática de OmniFlow está diseñada para garantizar un contraste óptimo en dashboards de datos intensivos y aplicaciones móviles bajo cualquier condición lumínica.

| Rol de Color | Nombre | HEX | RGB | Aplicación Principal |
| :--- | :--- | :--- | :--- | :--- |
| **Dark Primary** | Dark Slate | `#0F0F1A` | `15, 15, 26` | Fondo principal Dark Mode y elementos estructurales. |
| **Primary Accent (Dark)** | Teal Brillante | `#00B4A6` | `0, 180, 166` | Acciones principales, toggles y badges sobre fondos oscuros. |
| **Primary Accent (Light)** | Teal Accesible | `#007A72` | `0, 122, 114` | Botones primarios, enlaces y textos sobre fondos claros (WCAG AA). |
| **Corporate Depth** | Ciruela Profundo | `#3D2235` | `61, 34, 53` | Sidebar de navegación institucional y acentos secundarios. |
| **Light Surface** | Neutral Gray | `#F8F9FA` | `248, 249, 250` | Fondo general de la aplicación en modo claro. |
| **Card Surface** | Pure White | `#FFFFFF` | `255, 255, 255` | Contenedores modulares, tarjetas y tablas con bordes `#E5E7EB`. |

### Píldoras de Estado en UI (Status Pills)
- **Confirmado / Pagado:** Fondo `#E6F4F1` | Texto `#007A72`
- **Pendiente / En Proceso:** Fondo `#FEF3C7` | Texto `#D97706`
- **Cancelado / Alerta:** Fondo `#FEE2E2` | Texto `#DC2626`

---

## 4. Tipografía Oficial y Jerarquías

- **Fuente Primaria (UI & Plataforma Digital):** Plus Jakarta Sans / Inter
- **Fuente Secundaria (Cuerpo Editorial y Documentación):** DM Sans
- **Cifras y Datos Numéricos:** `font-variant-numeric: tabular-nums` (evita saltos visuales en tablas de precios, stock e inventario).

---

## 5. Arquitectura de Nombres de Features (Extensiones "Omni")

Toda funcionalidad, módulo o servicio derivado de la plataforma adopta la convención de nomenclatura `Omni[Feature]` en una sola palabra con capitalización CamelCase:

```text
                          ┌──────────────────────────┐
                          │         OMNIFLOW         │
                          └─────────────┬────────────┘
         ┌───────────────┬──────────────┼──────────────┬──────────────┐
         ▼               ▼              ▼              ▼              ▼
     OmniLinks      OmniCatalog    OmniBookings     OmniPOS        OmniCore
  (Bio-Links PLG) (Catálogo Redes)   (Reservas)    (Punto Venta)   (ERP + CRM)
```

### Módulos y Extensiones

#### 🔗 OmniLinks *(Anteriormente: Bio Links)*
- **Definición:** Plataforma de páginas de enlace y micro-landings optimizadas para perfiles de redes sociales y tráfico móvil.
- **Propósito:** Actuar como el punto de entrada directo del cliente para redirigir tráfico a ventas, catálogos o reservas en 1 clic.
- **Color de Acento:** Teal Brillante (`#00B4A6`).
- **Descriptor de Producto:** Smart Micro-Landing & Bio Links Engine.

#### 🛍️ OmniCatalog *(Anteriormente: Catálogo de Redes Sociales)*
- **Definición:** Catálogo visual interactivo diseñado nativamente para comercio conversacional y redes sociales.
- **Propósito:** Permitir a los clientes armar carritos y cerrar pedidos fluidamente vía WhatsApp sin lidiar con e-commerces pesados.
- **Color de Acento:** Esmeralda Intenso (`#00A896`).
- **Descriptor de Producto:** WhatsApp-First Dynamic Product Catalog.

#### 📅 OmniBookings *(Anteriormente: Bookings / Reservas)*
- **Definición:** Motor de agendamiento y turnos automatizado con gestión tridimensional (profesional + recurso/cabina + tiempos de buffer).
- **Propósito:** Eliminar huecos muertos en agendas de servicios (clínicas, spas, consultorios) mediante autogestión directa del cliente.
- **Color de Acento:** Ciruela Profundo (`#3D2235`).
- **Descriptor de Producto:** Multi-Resource Smart Scheduling Engine.

#### ⚡ OmniPOS *(Anteriormente: Fast Checkout Drawer / POS)*
- **Definición:** Terminal de punto de venta ultra rápido con arquitectura Offline-First.
- **Propósito:** Procesar ventas y cobros en mostrador en menos de 5 segundos, garantizando funcionamiento continuo incluso ante pérdidas de conexión a internet.
- **Color de Acento:** Teal Accesible (`#007A72`).
- **Descriptor de Producto:** High-Velocity Resilient POS System.

#### 🏢 OmniCore *(Anteriormente: ERP + CRM Modular)*
- **Definición:** Núcleo administrativo modular para gestión de inventarios, CRM, facturación y proveedores.
- **Propósito:** Operar como suite completa Standalone para MIPYMEs o desacoplarse en módulos individuales según la necesidad operativa.
- **Color de Acento:** Dark Slate (`#0F0F1A`).
- **Descriptor de Producto:** Modular Business Management & CRM Core.

#### 🔌 OmniSync *(Capa Agnóstica / Middleware)*
- **Definición:** Capa middleware de integración bidireccional asíncrona mediante webhooks y APIs.
- **Propósito:** Conectar las interfaces rápidas de OmniFlow con sistemas contables tradicionales preexistentes (SAP, Odoo, ERPNext, Cbase) sin requerir migraciones del backend.
- **Color de Acento:** Slate Violet (`#4F46E5`).
- **Descriptor de Producto:** Agnostic Legacy Integration Bridge.

---

## 6. Tono y Voz de Marca

- **Ágil, no burocrático:** Foco prioritario en velocidad de ejecución, simplicidad y acción inmediata.
- **Conector, no excluyente:** Posicionado como una capa que potencia y acelera los sistemas existentes en vez de forzar cambios traumáticos.
- **Técnicamente sólido, visualmente limpio:** Comunica robustez tecnológica y estabilidad con un lenguaje claro y orientado al crecimiento del negocio.

