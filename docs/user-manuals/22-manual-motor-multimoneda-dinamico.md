# 📘 Manual de Usuario: OmniFlow Dynamic Multi-Currency — Motor Multimoneda Dinámico (`FEAT-103`)

> **Módulo:** Core Finanzas / Motor Multimoneda & Cotizaciones Automáticas  
> **Ubicación del Documento:** `docs/user-manuals/22-manual-motor-multimoneda-dinamico.md`  
> **Versión de OrderFlow / OmniFlow:** v1.20.37+  
> **Monedas Soportadas:** Guaraní (PYG), Dólar (USD), Real (BRL), Peso Argentino (ARS)  
> **Fecha:** 26 de Agosto de 2026

---

## 1. INTRODUCCIÓN Y PROPÓSITO

![Configuración del Motor Multimoneda Dinámico](/home/marcelompz/.gemini/antigravity-cli/brain/81248e19-f485-437b-aa12-83861e977a30/manual_multicurrency_settings_1787744100727.jpg)

Este manual instruye sobre el funcionamiento del **Motor Multimoneda Dinámico (`FEAT-103`)** de OmniFlow, diseñado para la conversión en tiempo real de precios de venta, cobros en registradora POS y presupuestos B2B utilizando cotizaciones bancarias y financieras al día.

El sistema cuenta con:
1. **Sincronización Automática Cron:** Actualización periódica en horario bursátil/bancario (07:00 a 18:00 hs `America/Asuncion`).
2. **Proveedores Financieros Integrados:** Banco Central del Paraguay (BCP), Cambios Chaco, Bonanza Cambios, DolarApi y cotizaciones manuales por tenant.
3. **Caché de Altura Rendimiento:** TTL de 5 minutos con fallback a la última cotización registrada en base de datos en caso de indisponibilidad de red.

---

## 2. PROVEEDORES DE COTIZACIÓN Y CONFIGURACIÓN CRON

| Proveedor | Identificador | Monedas Principales | Tipo de Cotización |
| :--- | :---: | :---: | :--- |
| **Banco Central del Paraguay** | `bcp` | USD, BRL, ARS ➔ PYG | Cotización Referencial Oficial |
| **Cambios Chaco** | `cambioschaco` | USD, BRL, ARS ➔ PYG | Cotización Comercial Compra/Venta |
| **Bonanza Cambios** | `bonanza` | USD, BRL ➔ PYG | Cotización Financiera |
| **DolarApi** | `dolarapi` | USD ➔ ARS / PYG | Cotización Regional LatAm |
| **Manual por Tenant** | `manual` | Todas | Ajuste personalizado por el administrador |

---

## 3. ENDPOINTS DE LA API DE MONEDAS (`/api/v1/currency`)

### 🔹 Endpoint 1: Obtener Cotización de Divisas (`GET /api/v1/currency/rate?from=USD&to=PYG`)

**Respuesta:**
```json
{
  "tenantId": "provecchio-dimora-001",
  "fromCurrency": "USD",
  "toCurrency": "PYG",
  "rate": 7550.00,
  "provider": "bcp",
  "updatedAt": "2026-08-26T08:30:00.000Z"
}
```

### 🔹 Endpoint 2: Convertir Monto entre Divisas (`POST /api/v1/currency/convert`)

**Cuerpo de la Solicitud:**
```json
{
  "amount": 100,
  "fromCurrency": "USD",
  "toCurrency": "PYG"
}
```

**Respuesta:**
```json
{
  "amount": 100,
  "fromCurrency": "USD",
  "toCurrency": "PYG",
  "convertedAmount": 755000.00,
  "rate": 7550.00
}
```
