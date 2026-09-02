# 📚 Índice General de Manuales de Usuario de OrderFlow

Bienvenidos al Centro de Documentación Operativa de **OrderFlow**. Los siguientes manuales están diseñados paso a paso para la capacitación de administradores, cajeros, vendedores y operadores del sistema.

---

## 📂 Colección de Manuales por Módulo

1. 🎨 **[01. Manual del Diseñador Visual de Portada](01-manual-disenador-portada.md)**
   - Configuración de la Landing Page del tenant.
   - Selección de plantillas por rubro (Retail, Gastronomía, Spa, B2B).
   - Ajuste de colores, tipografías e integración de bloques.

2. 🏪 **[02. Manual de Punto de Venta (POS) & Cocina (KDS)](02-manual-pos-kds.md)**
   - Operación de cobro en caja y modo mozo.
   - Emisión de comandas e integración con comandera fiscal.
   - Control en tiempo real de la pantalla de cocina (KDS).

3. 📅 **[03. Manual de Gestión de Turnos & Spa](03-manual-turnos-spa.md)**
   - Agendamiento de citas en línea desde la tienda.
   - Calendario diario y semanal por especialista.
   - Confirmación de reservas y comisiones de personal.

4. 💬 **[04. Manual de Catálogo Express por WhatsApp](04-manual-catalogo-whatsapp.md)**
   - Configuración del menú o catálogo digital.
   - Personalización del banner y mensajes de anuncio.
   - Flujo de compra y envío de pedidos formateados a WhatsApp.

5. 🎖️ **[05. Manual de Fidelización de Clientes & Sorteos](05-manual-fidelizacion-sorteos.md)**
   - Reglas de acumulación y redención de puntos.
   - Tiers de clientes (Bronze a Platinum).
   - Creación de concursos y selección transparente de ganadores.

6. 💱 **[06. Manual de Gestión Multimoneda & Conectores ERP](06-manual-multimoneda-erps.md)**
   - Configuración de la divisa base por tenant (PYG, ARS, USD, etc.) e IVA.
   - Fijación de precios en divisas secundarias y conversión automatizada.
   - Enlace y mapeo con sistemas ERP (Tango ERP, Odoo, Contabilium, Xubio).

7. 🚀 **[07. Guía Técnica & Protocolo E2E del Flujo Comercial](07-flujo-comercial-end-to-end.md)**
   - Caso de uso completo: Prospecto Landing → Registro FREE → BioLinks → Social Catalog → Venta WhatsApp.
   - Arquitectura de componentes, eventos de invalidación en Redis y script de prueba Playwright.

8. 🛠️ **[08. Manual de Deploy Manager & Provisioning Zero-Touch de Odoo 18](08-manual-deploy-manager-odoo.md)**
   - Orquestación de servidores VPS y Docker Odoo 18 (CE/EE).
   - Escáner dinámico SSH de módulos en `/srv/odoo-addons/` y sincronización Git automática.
   - Ingesta guiada de CSVs: Categorías (FIFO/PPP), Categorías POS, Productos, Recetas y Mesas.
   - Monitoreo en tiempo real de logs y llaves SSH.

9. 📱 **[09. Manual del Generador de Códigos QR](09-manual-generador-qr.md)**
    - Generación de QRs para URL, Productos, Catálogos, Biolinks, vCard, WiFi, Archivos, Contacto.
    - Personalización: color, logo central, tamaño, corrección de error, margen.
    - Historial por tenant, modal embebible, integración en Productos/Catálogo/Biolinks.
    - Permisos RBAC: `qr:generate`, `qr:read`, `qr:manage`.

10. 📦 **[10. Manual de Gestión de Inventario & Reservas de Stock](10-manual-inventario-reservas.md)**
     - Estructura multi-depósito: Depósitos, Ubicaciones y Stocks (`Warehouse`, `Location`, `StockQuant`).
     - Flujo normal de stock en ventas, devoluciones y cancelaciones.
     - Nueva funcionalidad: reserva automática de stock en pedidos pendientes (`USE_DOUBLE_ENTRY_STOCK`).
     - Ajustes de stock, sincronización ERP e importaciones masivas.
     - Kardex de movimientos y endpoints de la API de inventario.

11. 🔄 **[11. Manual de Sincronización de Webhooks Odoo en Tiempo Real](11-manual-sincronizacion-webhooks-odoo.md)**
     - Configuración e instalación del addon oficial `orderflow_integration` en Odoo CE.
     - Sincronización en tiempo real (< 100ms) de Productos, Categorías y Clientes.

12. 💳 **[12. Manual de Cartera de Clientes, Cuentas por Cobrar & Límite de Crédito Odoo](12-manual-cartera-clientes-limite-credito-odoo.md)**
     - Captura de crédito asignado (`credit_limit`), saldo pendiente (`total_due`) y mora.
     - Validación pre-venta a crédito en app POS y tienda web (`FEAT-091`).

13. 🧾 **[13. Manual de Facturación Legal `account.move` & Notificación SIFEN por WhatsApp](13-manual-facturacion-legal-notificacion-sifen-whatsapp.md)**
     - Sincronización de comprobantes fiscales legales desde Odoo CE y Facturasend.
     - Envío automático del comprobante KUDE PDF al cliente por WhatsApp (`FEAT-092`).

14. 🏪 **[14. Manual de Cierre de Caja Híbrido & Rendición POS ➔ Odoo](14-manual-cierre-caja-rendicion-pos-odoo.md)**
     - Arqueo diario de caja en POS con desglose multi-medio de pago (`cash`, `card`, `transfer`, `credit`).
     - Despacho de asiento contable a `account.journal` de Odoo CE (`FEAT-093`).

15. 📦 **[15. Manual de Sincronización Multibodega & Albaranes de Entrega Odoo](15-manual-inventario-multibodega-albaranes-odoo.md)**
     - Control físico de existencias por depósito y ubicación (`stock.quant`).
     - Notificación y registro de albaranes de salida (`stock.picking`) (`FEAT-094`).

16. 🔑 **[16. Manual de Autenticación Unificada SSO & Mapeo de Roles Odoo OAuth2](16-manual-autenticacion-sso-odoo-oauth2.md)**
     - Inicio de sesión unificado (SSO via Odoo CE / Keycloak) y emisión de JWT tokens.
     - Resolución automática de `tenantId` y mapeo de permisos RBAC (`FEAT-095`).

17. 🏭 **[17. Manual de OmniManufacturing MRP, Escandallos BoM & Conversión UoM](17-manual-manufactura-mrp-escandallos-uom.md)**
     - Formulación de recetas/escandallos con mermas ($scrap$) y cálculo de costo unitario real.
     - Conversión de Unidades de Medida ($g \leftrightarrow kg \leftrightarrow ml$) y ejecución de Órdenes de Fabricación (`FEAT-096`).

18. 🖥️ **[18. Manual de OmniPOS & KDS Multi-Estación con Explosión Atómica de Recetas](18-manual-omnipos-kds-recetas-bom.md)**
     - Despacho visual de comandas en cocina por estaciones (`KITCHEN`, `GRILL`, `BAR`, `PASTRY`).
     - Semáforo SLA de tiempos (`GREEN`, `YELLOW`, `RED`) y descuento atómico de ingredientes al enviar el pedido (`FEAT-097`).

19. 💼 **[19. Manual de Fuerza de Ventas B2B, Presupuestos & Descuentos por Volumen](19-manual-fuerza-de-ventas-b2b-presupuestos.md)**
     - Formulación de cotizaciones B2B vinculadas a listas de precios mayoristas de Odoo (`product.pricelist`).
     - Cálculo automático de escalas por volumen y conversión de presupuesto a pedido confirmado (`FEAT-098`).

20. 🎨 **[20. Manual de Storefront & Web Builder Standalone](20-manual-storefront-builder-standalone.md)**
     - Diseñador visual Drag & Drop desacoplado (`:3026` / `diseno.<domain>`) para Landing Pages, Catálogo WhatsApp y Bio-Links.
     - Bloques componibles (`HERO`, `CATALOG_GRID`, `PROMO_BANNER`), personalizador de temas y exportación de plantillas JSON (`FEAT-099`).

21. 📊 **[21. Manual de OmniBI Analytics Standalone — Ingesta YoY y BI de Rentabilidad](21-manual-omnibi-analytics-yoy.md)**
     - Ingesta histórica read-only de Odoo 14 CE vía XML-RPC y persistencia aislada multi-tenant.
     - Consolidación analítica comparativa Año contra Año (YoY), crecimiento porcentual y ticket promedio omnicanal (`FEAT-100`).

22. 💱 **[22. Manual de OmniFlow Dynamic Multi-Currency — Motor Multimoneda Dinámico](22-manual-motor-multimoneda-dinamico.md)**
     - Conversión de divisas en tiempo real (PYG, USD, BRL, ARS) con cotizaciones automáticas (BCP, Cambios Chaco, DolarApi).
     - Cron automatizado en horario bursátil (07:00 - 18:00 hs Asunción), caché LRU con TTL de 5 minutos y resiliencia en base de datos (`FEAT-103`).

23. 🛍️ **[23. Manual de Compras (Purchases) y Finanzas Operativas Multi-Moneda](23-manual-compras-y-finanzas-multimoneda.md)**
     - Creación y recepción de Órdenes de Compra con impacto atómico en el Kardex (`executeStockMove`).
     - Generación automática de Facturas de Proveedor (`SupplierBill`), cuentas por pagar (AP) y flujo de caja consolidado (`FEAT-104`).

24. 📄 **[24. Manual de OmniFlow Workspace Documental & Edición Collabora Online](24-manual-workspace-documental-collabora.md)**
     - Gestión de documentos y carpetas multi-tenant con auto-provisionamiento de raíz.
     - Sesiones de edición interactiva WOPI en tiempo real y previsualización de hojas de cálculo con Collabora Online (`FEAT-083`).

25. 📊 **[25. Manual de OmniFlow DataView Suite — Gestión Estándar de Vistas & Selección Global](25-manual-gestion-vistas-dataview-suite.md)**
     - Motor de consulta `DynamicQueryBuilder`, selección global `mode: all` sin límite de páginas y filtros dinámicos.
     - Presets `SavedViews` en base de datos con visibilidad Privada/Pública y DataView UI Kit (`v1.20.39`).

26. 🤖 **[26. Manual de Motor LLM Local (OmniAI) & Onboarding Zero-Touch Odoo](26-manual-integracion-llm-local-y-onboarding-odoo.md)**
     - Conexión con LLM local (`Ollama / vLLM`) vía Traefik SSL (`ai.provecchio.com`) para inferencia e Inteligencia Artificial.
     - Onboarding Zero-Touch de tenants Odoo en 1-Click mediante manifest JSON (`tenant_manifest.json`) (`v1.20.40`).

27. 🚢 **[27. Manual de Landed Costs en Compras & Wizard de Onboarding Odoo 1-Click](27-manual-landed-costs-y-wizard-onboarding-odoo.md)**
     - Landed Costs / Costes en Destino en recepción de Órdenes de Compra (Paso 8 de Inventario) con recálculo de PMP (`costPricePmp`).
     - Wizard visual de onboarding Odoo 1-Click (`<OdooOnboardingWizardModal>`) en el Dashboard SuperAdmin (`v1.20.41`).

28. 👔 **[28. Manual de Capital Humano & Asistencia](28-manual-capital-humano-y-asistencia.md)**
     - Legajo Digital de Colaboradores (`Employee`), vinculación tripartita `Contact` ↔ `Employee` ↔ `User`.
     - Fichaje de asistencia multi-método (NFC, QR, PIN, App Móvil con biometría nativa y terminales ZKTeco/Hikvision).
     - RBAC con permisos `hr:employees:*` y `hr:attendance:*`, auditoría de cambios inmutable (`EmployeeAuditLog`) y geocercas Haversine (`v1.21.01`).

29. 🍕 **[29. Manual de Agregados, Modificadores & Galería Unificada](29-manual-agregados-y-modificadores-de-producto.md)**
     - Configuración de grupos y opciones de agregados (`ModifierGroup` / `ModifierOption`) con recargos de precio `priceDelta` y descuentos de materia prima (`ingredientVariantId` / `qtyDelta`).
     - Selección de imágenes desde la Galería Unificada del Tenant (`ImagePicker` / `/api/v1/uploads/gallery`) en la ficha de producto.
     - Selector táctil `ModifierSelector` en el catálogo público (`social-catalog`), snapshots inmutables `OrderLineModifier` y movimientos de stock MRP (`v1.21.01`).

30. 🔑 **[30. Manual de Configuración de Google Auth, Sincronización de Calendario & Google Places](30-manual-integracion-google-auth-calendar.md)**
     - Guía paso a paso para configurar proyectos y credenciales OAuth 2.0 en Google Cloud Console.
     - Autenticación SSO en 1-Clic (`POST /api/v1/auth/google`), Google One Tap y sincronización con contactos Odoo.
     - Sincronización bidireccional de turnos (`Bookings ↔ Google Calendar`), salones de videollamada **Google Meet** automáticos (`conferenceDataVersion: 1`) y autocompletado de direcciones de delivery (`v1.24.02`).

---

## 📦 Acceso Rápido por Rol

| Rol | Manuales Recomendados |
|-----|----------------------|
| **Admin / Owner / C-Level** | Todos (01 a 30) |
| **Cajero / POS** | 02 (POS/KDS), 05 (Fidelización), 12 (Crédito), 14 (Cierre Caja), 18 (POS BoM), 22 (Multimoneda), 23 (Tesoreria POS), 25 (DataView Suite), 29 (Agregados & POS), 30 (Google Auth) |
| **Mozo / Vendedor B2B** | 02 (POS), 03 (Turnos), 04 (Catálogo WA), 13 (KUDE WA), 19 (Presupuestos B2B), 22 (Cotización Divisas), 25 (DataView Suite), 29 (Agregados Catálogo), 30 (Google Places) |
| **Encargado de Compras / Depósito** | 15 (Multibodega), 17 (MRP Manufactura), 23 (Órdenes de Compra & Proveedores), 24 (Workspace Documental), 25 (DataView Suite), 27 (Landed Costs), 29 (Insumos Agregados MRP) |
| **Encargado de RRHH / Personal** | 28 (Capital Humano & Asistencia), 03 (Turnos), 24 (Workspace Documental), 30 (Google Auth & Calendar) |
| **Chef / Personal de Cocina** | 02 (KDS), 18 (KDS Multi-Estación & SLA), 29 (Modificadores Comanda) |
| **Gestor de Marketing / Diseñador** | 01 (Portada), 04 (Catálogo), 05 (Sorteos), 09 (QR Generator), 20 (Storefront Builder), 29 (Galería Unificada & Agregados), 30 (Google Auth) |
| **Especialista / Spa** | 03 (Turnos), 02 (Comandas), 30 (Google Calendar & Meet) |
| **DevOps / Analista BI / CFO** | 07 (Flujo E2E), 08 (Deploy Manager), 11 (Odoo Webhooks), 15 (Multibodega), 16 (SSO), 17 (MRP Manufactura), 18 (KDS WebSockets), 19 (Fuerza de Ventas B2B), 20 (Storefront Builder Standalone), 21 (OmniBI Analytics), 22 (Engine Multimoneda), 23 (Compras & Finanzas Multi-Moneda), 24 (Collabora Workspace), 25 (DataView Suite), 26 (OmniAI LLM Local & Zero-Touch Odoo), 27 (Landed Costs & Onboarding Wizard), 28 (Capital Humano & Asistencia), 29 (Agregados & MRP), 30 (Google Cloud Auth & Calendar Engine) |

---

## 🔄 Actualizaciones

Este índice se actualiza con cada nueva feature. La numeración sigue el orden de implementación (FEAT-XXX).

**Última actualización**: 2026-09-02 — Agregado manual 30 (Configuración de Google Auth, Sincronización de Calendario & Google Places v1.24.02)
