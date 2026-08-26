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

---

## 📦 Acceso Rápido por Rol

| Rol | Manuales Recomendados |
|-----|----------------------|
| **Admin / Owner** | Todos (01 a 16) |
| **Cajero / POS** | 02 (POS/KDS), 05 (Fidelización), 12 (Crédito), 14 (Cierre Caja) |
| **Mozo / Vendedor** | 02 (POS), 03 (Turnos), 04 (Catálogo WhatsApp), 13 (KUDE WA) |
| **Gestor de Marketing** | 01 (Portada), 04 (Catálogo), 05 (Sorteos), 09 (QR Generator) |
| **Especialista / Spa** | 03 (Turnos), 02 (Comandas) |
| **DevOps / Técnico** | 07 (Flujo E2E), 08 (Deploy Manager), 11 (Odoo Webhooks), 15 (Multibodega), 16 (SSO) |

---

## 🔄 Actualizaciones

Este índice se actualiza con cada nueva feature. La numeración sigue el orden de implementación (FEAT-XXX).

**Última actualización**: 2026-08-25 — Agregados manuales 12 a 16 (FEAT-091 a FEAT-095 v1.20.30)
