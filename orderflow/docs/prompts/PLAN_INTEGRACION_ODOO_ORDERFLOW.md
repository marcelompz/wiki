# OrderFlow — Plan de Acción Estratégico de Integración Odoo CE & Control Plane Único

**Fecha de creación:** 08 de Agosto, 2026  
**Documento de referencia:** `/opt/orderflow/docs/PLAN_INTEGRACION_ODOO_ORDERFLOW.md`  
**Estado:** 🟢 APROBADO

---

## 1. Alineación de Arquitectura y Lineamientos de AGENTS.md

Este plan de acción garantiza el cumplimiento estricto de las reglas establecidas en `/opt/odoo/AGENTS.md` y la arquitectura desacoplada orientada a eventos definida en `IncluirOdooCE.md`:

### 🛡️ Reglas Inviolables de Infraestructura y Código (AGENTS.md):
1. **Despliegue Productivo:** Referenciar siempre `/srv/odoo/addons/18.0` o `19.0` y `/srv/odoo-modules/l10n_py`.
2. **Workspace Local:** Mantener `/opt/odoo` como desarrollo local sin modificar rutas relativas.
3. **No Duplicar Addons:** Todos los módulos custom viven exclusivamente en el repositorio central `odoo-addons.git` (`18.0` / `19.0`).
4. **Nombres Docker Estándar:** `odoo_web_{puerto}` y `odoo_db_{puerto_externo}`.
5. **Proxy & SSL:** Traefik v3.4 como proxy inverso nativo sobre la red `traefik-public`.
6. **Odoo 19 XML Standards:** `tree` → `list`, sin `<data>` wrappers ni `attrs`.

---

## 2. Visión del Control Plane Único ("Single Control Plane")

### 👑 Tenant Master & Super Administrador (`orderflow.pesallaccia.com`)
* **Tenant Master:** `OrderFlow` (`orderflow.pesallaccia.com`).
* **Super Administrador:** Usuario maestro con permisos globales para supervisar, monitorear y gestionar todos los Tenants y Tiers del ecosistema.
* **Wizard de Despliegue OrderFlow + Odoo:** Sección exclusiva en la consola web del Super Administrador para orquestar la creación, provisioning, asignación de planes y vinculación de Odoo CE para cualquier cliente.

### 🗄️ Arquitectura Multi-Database por Tenant (Odoo en `pesallaccia.com`)
* **Multi-DB en Instancia Compartida Odoo:** En una misma instancia de Odoo (ej. `pesallaccia.com`), convivirán múltiples bases de datos de Odoo (una DB independiente por tenant: `db_provecchio`, `db_cliente2`, etc.).
* **Parámetros de Conexión en la DB de cada Tenant (OrderFlow):** Cada Tenant en la base de datos de OrderFlow almacenará sus parámetros de vinculación con su DB de Odoo:
  * `odoo_db_name` (Nombre exacto de su base de datos en Odoo).
  * `odoo_url` (Endpoint o URL de su Odoo).
  * `odoo_api_key` / `odoo_token` (Token de autenticación único por tenant).
  * `tenant_id` (Identificador del tenant en OrderFlow enviado como cabecera `x-tenant-id` en cada webhook de Odoo).

---

## 3. Plan de Acción Faseado (Fases 1 a 4)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Sincronización Bidireccional Completa en orderflow_connector      │
│  (Contactos ✅ -> Productos ✅ -> Sale Orders ⏳ -> Stock/Inventario ⏳)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 2: Estandarización del Payload Inicial ("Tenant Initial Payload")      │
│  (Formato JSON único tenant_manifest.json para Onboarding Zero-Touch)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 3: Motor de Auto-Aprovisionamiento en OrderFlow Backend (NestJS)       │
│  (Módulo Orchestrator: deploy.sh + Docker Compose + Traefik SSL automáticos)│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 4: Wizard de Despliegue OrderFlow + Odoo (SuperAdmin Dashboard)        │
│  (Consola Master en orderflow.pesallaccia.com para aprovisionamiento global)│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 📌 FASE 1: Completar Sincronización en `orderflow_connector` (Odoo Side)
- **1.1 Venta y Pedidos (`sale.order`):**
  - Evento Push: Al confirmar un pedido en Odoo (`action_confirm`), notificar a OrderFlow KDS/POS (`order.confirmed`).
  - Evento Pull/Webhook: Recibir pedidos emitidos en OrderFlow e insertarlos en `sale.order` con sus líneas y cliente.
- **1.2 Stock e Inventario (`stock.quant`):**
  - Notificar cambios de stock disponible en Odoo hacia el catálogo de OrderFlow cuando se realice una validación de inventario (`stock.picking`).

---

### 📌 FASE 2: Estandarización del Payload de Onboarding (`tenant_manifest.json`)
- Definir un contrato JSON estándar que consolide en un solo archivo/payload:
  - Datos de Empresa (`res.company`) + RUC + Moneda + Logo.
  - Usuarios Administradores (`res.users`).
  - Planos y Pisos de Restaurante (`restaurant.floor` / `restaurant.table`).
  - Datos de conexión con el SaaS OrderFlow (`api_key`, `webhook_url`).

---

### 📌 FASE 3: Orchestrator de Aprovisionamiento en OrderFlow (NestJS Side)
- Crear el servicio `OdooProvisioningService` en NestJS:
  - Asignación dinámica de puerto (`8085`, `8086`, etc.) y red `traefik-public`.
  - Generación automatizada del archivo `.env.production` desde plantillas estandarizadas.
  - Ejecución asíncrona mediante BullMQ de `deploy.sh` e `init_prod_db.sh`.
  - Configuración automática del Router en Traefik para SSL instantáneo (`https://odoo-tenant.orderflow.com`).

---

### 📌 FASE 4: Wizard de Despliegue OrderFlow + Odoo (SuperAdmin Console)
- Construir en la consola del Super Administrador (`orderflow.pesallaccia.com`):
  - Wizard guiado paso a paso para dar de alta nuevos Tenants.
  - Asignación de Tiers (Starter vs Professional ERP Odoo).
  - Estado del provisioning en vivo (Logs de Docker Build / DB Init).
  - Botón de **"Sincronización Forzada de Catálogo"** y gestión de suscripciones.

---

## 4. Integración en el ROADMAP Oficial de OrderFlow

Este plan de acción ha quedado incorporado formalmente en `/opt/orderflow/docs/guides/analisis_roadmap.md` bajo la sección **Roadmap v1.6.0 (Integración Odoo CE & Auto-Provisioning)**.
