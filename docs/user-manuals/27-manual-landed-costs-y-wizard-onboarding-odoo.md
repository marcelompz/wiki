# 📘 Manual de Usuario: Landed Costs en Compras & Wizard de Onboarding Odoo 1-Click (`v1.20.41`)

> **Módulo:** Compras / Estandarización de Inventario (Paso 8: Landed Costs) & Deploy Manager (Wizard Onboarding 1-Click)  
> **Ubicación del Documento:** `docs/user-manuals/27-manual-landed-costs-y-wizard-onboarding-odoo.md`  
> **Versión de OrderFlow / OmniFlow:** v1.20.41+  
> **Fecha:** 26 de Agosto de 2026

---

## 1. INTRODUCCIÓN Y PROPÓSITO

![Landed Costs & Onboarding Wizard](/home/marcelompz/.gemini/antigravity-cli/brain/81248e19-f485-437b-aa12-83861e977a30/manual_landedcosts_onboarding_wizard_1787790962523.jpg)

En esta versión **`v1.20.41`**, OmniFlow completa dos piezas clave del ecosistema comercial y de infraestructura:

1. **Landed Costs / Costes en Destino en Recepción de Órdenes de Compra (Paso 8 de Inventario):** Prorrateo proporcional del flete, aranceles y flete local sobre los ítems comprados, recalculando automáticamente el **Precio Medio Ponderado (PMP)** del producto (`costPricePmp` y `costPrice`) e impactando el Kardex.
2. **Wizard Visual de Onboarding Odoo 1-Click (`<OdooOnboardingWizardModal>`):** Asistente guiado de 4 pasos en el Dashboard SuperAdmin (`/admin/deploy`) para auto-configurar empresas, categorías, almacenes y vinculación Odoo con descarga directa o ingesta del manifest JSON (`tenant_manifest.json`).

---

## 2. COSTES EN DESTINO (LANDED COSTS) EN RECEPCIÓN DE COMPRAS

```mermaid
graph TD
    PO["Orden de Compra (OC) + Landed Costs"]
    Prorrateo["Prorrateo Proporcional por Subtotal Item"]
    Kardex["Invocación executeStockMove (Doble Entrada)"]
    PMP["Recálculo PMP (costPricePmp)"]
    Bill["Factura Proveedor (SupplierBill)"]

    PO -->|1. POST /orders/:id/receive { landedCosts: 50000 }| Prorrateo
    Prorrateo -->|2. Asigna Landed Cost a cada Item| Kardex
    Prorrateo -->|3. Actualiza Valor PMP Producto| PMP
    Prorrateo -->|4. Genera Factura con Monto Total + Landed Costs| Bill
```

### 🔹 Fórmula de Recálculo de PMP:
$$\text{PMP}_{\text{nuevo}} = \frac{(\text{Stock}_{\text{actual}} \times \text{PMP}_{\text{actual}}) + \text{Costo}_{\text{item}} + \text{LandedCost}_{\text{asignado}}}{\text{Stock}_{\text{actual}} + \text{Cantidad}_{\text{recibida}}}$$

---

## 3. WIZARD VISUAL DE ONBOARDING ODOO EN SUPERADMIN

El asistente visual desplegable en `/admin/deploy` guía la configuración en 4 pasos:

1. **Empresa & Moneda:** Razón social, RUC/taxId, símbolo de moneda y logo.
2. **Estructura Inicial:** Categorías de productos y depósitos/almacenes iniciales.
3. **Odoo Binding:** Nombre de la base de datos de Odoo (`odooDbName`) y URL del servidor.
4. **Confirmación & Ingesta:** Muestra el archivo `tenant_manifest.json` generado con botones de **Descargar JSON** y **Aprovisionar Tenant (1-Click)**.
