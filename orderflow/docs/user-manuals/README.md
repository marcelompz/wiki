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
