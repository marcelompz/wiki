# **Informe Técnico: Plan de Desarrollo de Aplicaciones Móviles OmniFlow y OmniGastro**

El presente documento detalla la arquitectura técnica, la estrategia de reutilización de código y el plan de desarrollo por etapas para el ecosistema móvil de **OmniFlow** y **OmniGastro**. El objetivo principal es construir una plataforma modular, altamente escalable y de alto rendimiento que optimice las operaciones gastronómicas e integraciones empresariales.

# **Arquitectura General y Reutilización de Código**

Para garantizar un desarrollo ágil, mantenibilidad a largo plazo y una coherencia estricta entre las distintas aplicaciones del ecosistema, se implementa una arquitectura basada en **Monorepo** administrada con **pnpm** (workspaces) y **Turborepo** como orquestador de build y caché remoto.

Esta estructura permite aislar la lógica de negocio, las comunicaciones de red, los tipos de datos y los componentes de interfaz en paquetes independientes y reutilizables por las aplicaciones móviles (`app-waiter`, `app-customer`, `app-admin`).

## **Paquetes Compartidos Core**

* **`@omniflow/types`**: Contiene las definiciones TypeScript unificadas para todo el ecosistema (modelos de datos de pedidos, mesas, productos, usuarios, eventos de WebSockets y esquemas de respuesta API). Garantiza seguridad de tipos estricta de extremo a extremo (End-to-End Type Safety).  
* **`@omniflow/api-client`**: Capa de abstracción de red centralizada. Implementa clientes HTTP/REST y conectores de WebSockets preparados para operar tanto en red local (LAN) como en la nube. Incluye lógica de reintentos, manejo de autenticación por tokens/PIN, y estrategias de tolerancia a fallos de red.  
* **`@omniflow/ui-core`**: Sistema de diseño unificado y librería de componentes UI para React Native. Proporciona botones, tarjetas de mesa, modales, selectores y primitivas visuales optimizadas con tokens de diseño centralizados (colores, tipografía, espaciado) para asegurar consistencia de marca en todas las aplicaciones.

# **Plan de Desarrollo por Etapas**

# **Fase 1: App Móvil para el Mozo (`app-waiter`)**

Diseñada para un uso intensivo dentro del establecimiento, enfocada en la velocidad de entrada de datos, baja latencia y alta confiabilidad operacional en entornos de red local.

## **Funcionalidades Núcleo**

* **Autenticación rápida por PIN**: Acceso instantáneo por perfil de usuario para agilizar los turnos y la seguridad.  
* **Mapa de mesas dinámico**: Visualización gráfica del estado de las mesas (libre, ocupada, reservada, pidiendo cuenta) actualizada en tiempo real vía WebSockets.  
* **Toma de comandas avanzada**: Selección ágil de productos con soporte para variantes, agregados, término de cocción y notas personalizadas.  
* **Envío directo a KDS y Caja local**: Ruteo inmediato de pedidos a las pantallas de cocina (Kitchen Display System) y a la caja principal sin intermediarios externos.  
* **Solicitud de pre-cuenta**: Activación de la impresión o envío de la pre-cuenta a la mesa desde el dispositivo móvil.

## **Especificaciones Técnicas**

* **Gestión de Estado**: Estado liviano y de alto rendimiento en memoria utilizando **Zustand**, evitando sobrecarga de re-renders.  
* **Rendimiento de Listas**: Implementación de **`@shopify/flash-list`** para el renderizado ultra fluido de catálogos extensos y listas de comandas.  
* **Comunicaciones**: Protocolo dual HTTP y WebSocket en Red de Área Local (LAN) para garantizar operación ininterrumpida y latencia inferior a 50ms.

# **Fase 2: App Móvil para el Cliente (`app-customer`)**

Orientada a mejorar la experiencia del comensal en mesa, reduciendo tiempos de espera y fomentando la recurrencia mediante herramientas digitales autogestionadas.

## **Funcionalidades Núcleo**

* **Escaneo de Código QR**: Identificación automática de la mesa y apertura de la sesión de consumo.  
* **Menú Digital Interactivo**: Exploración de platillos organizada por categorías con soporte para imágenes de alta calidad, alérgenos y filtros.  
* **Auto-pedido en Mesa**: Posibilidad de que el cliente ordene directamente desde su dispositivo a la cocina.  
* **Seguimiento en Tiempo Real**: Notificación del estado de la orden (Recibido, En Preparación, Listo, Servido).  
* **Programa de Fidelidad**: Acumulación y consulta de puntos, medallas de consumo y beneficios canjeables.

## **Especificaciones Técnicas**

* **Optimización del Bundle**: Arquitectura orientada a un tamaño de descarga reducido y tiempo de arranque (TTI) mínimo.  
* **Caché de Assets e Imágenes**: Uso de **MMKV** para almacenamiento persistente ultrarrápido de claves/valores y caché eficiente de imágenes locales para minimizar consumo de datos móviles.

# **Fase 3: App Móvil para el Administrador (`app-admin`)**

Herramienta de control estratégico y operativo para gerentes y dueños de negocio, facilitando la toma de decisiones basada en datos y el control de excepciones.

## **Funcionalidades Núcleo**

* **Dashboard de KPIs**: Visualización en tiempo real de métricas clave como volumen de ventas, ticket promedio, rotación y porcentaje de ocupación.  
* **Monitoreo de Sincronización Odoo**: Panel de estado de la integración ERP (webhooks, colas de procesamiento, detección de fallos de sincronización).  
* **Gestión Rápida de Inventario**: Modificación exprés de precios y marcado instantáneo de productos "Fuera de Stock" (agotados).  
* **Auditoría de Excepciones**: Registro y alertas sobre anulaciones de pedidos, descuentos aplicados y aperturas de cajón.

## **Especificaciones Técnicas**

* **Visualización de Datos**: Gráficos vectoriales livianos optimizados para dispositivos móviles.  
* **Notificaciones Push**: Integración con servicios Push para alertas de eventos críticos (desconexión de ERP, anulaciones sospechosas, metas alcanzadas).

# **Roadmap de Implementación Extensible**

El desarrollo se estructurará de forma iterativa, permitiendo liberar valor funcional de forma continua mientras se asientan las bases para la expansión del ecosistema OmniFlow / OmniGastro.

| Hito | Fase / Módulo | Entregables Principales | Arquitectura / Paquetes |
| :---- | :---- | :---- | :---- |
| **Hito 1** | Infraestructura Monorepo | Configuración de Turborepo, pnpm workspaces, CI/CD base y Setup de `@omniflow/types`, `@omniflow/api-client`, `@omniflow/ui-core`. | Monorepo Base |
| **Hito 2** | `app-waiter` (v1.0) | Login por PIN, plano de mesas en tiempo real, toma de comandas, envío a KDS local. | `@omniflow/ui-core`, Zustand, FlashList |
| **Hito 3** | `app-customer` (v1.0) | Menú QR, auto-pedido, estado de orden en tiempo real y módulo de fidelidad base. | MMKV Cache, WebSockets |
| **Hito 4** | `app-admin` (v1.0) | Dashboard de métricas, alertas push, control de fuera de stock y monitor de colas Odoo. | Victory Native / Push Engine |
| **Hito 5** | Expansión KDS Tablet | App nativa dedicada para pantallas de cocina con gestión de tiempos de preparación y priorización. | React Native (Tablet Layouts) |
| **Hito 6** | App de Repartidores | Módulo de asignación de pedidos delivery, ruteo GPS y confirmación de entrega en cliente. | Geolocation Services, Maps API |
| **Hito 7** | Kioscos de Autoservicio | Interfaz táctil simplificada para tótems de autoservicio con integración a pasarelas de pago. | Kiosk Mode Architecture |

