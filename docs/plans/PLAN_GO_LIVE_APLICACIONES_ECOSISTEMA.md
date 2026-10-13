# 🚀 Plan Maestro Go-to-Live: Aplicaciones, Microservicios & OmnIoT Hardware Gateway

**Ecosistema:** OmniFlow (Capa técnica interna: OrderFlow)  
**Fecha:** 11 de Septiembre de 2026  
**Versión Baseline:** `v1.33.0`  
**Servidores Objetivo:** Producción Hetzner VPS (`/srv/orderflow`), Producción Provecchio (`/srv/orderflow`), Nodos Edge OmnIoT Debian/Radxa.

---

## 📐 1. Visión General del Ecosistema

El ecosistema **OmniFlow** está diseñado bajo una arquitectura omnicanal híbrida que combina:
1. **Core SaaS Multi-Tenant & Multi-Tier:** Backend NestJS 10, PostgreSQL 15, Redis 7 y Traefik v3.4 SSL Gateway.
2. **Suite de Microservicios Standalone (PWA / Web):** Aplicaciones desacopladas con esquema de BD propia y paquete de auth compartido (`@orderflow/auth-shared`).
3. **Aplicativos Desktop de Alta Velocidad (Tauri v2 + Rust):** Wrappers nativos en modo Kiosk para PCs de caja, terminales de comensales y pantallas de cocina.
4. **Aplicativos Móviles Nativos (`@orderflow/mobile` - React Native / Expo):** Apps móviles para meseros (mozos), cobro portátil y delivery.
5. **OmnIoT Edge Hardware Gateway (Tauri / Rust Bridge):** Micro-gateway ligero (<15MB RAM) para conexión directa con impresoras térmicas (ESC/POS), básculas RS-232, lectores de barras y cajones monedero RJ11.

---

## 📱 2. Catálogo de Aplicaciones & Matriz de Despliegue Go-to-Live

| Aplicación / Módulo | Tipo de Runtime | Plataforma / OS | Función Principal en Producción | Integración Hardware / API |
|---------------------|-----------------|-----------------|----------------------------------|----------------------------|
| **OmniPOS Retail** | Tauri v2 / PWA | Linux / Windows / Web | Cobro rápido mostrador retail, lectura SKU, emisión de ticket. | USB/LAN via OmnIoT, Lectores USB |
| **OmniPOS Gastro** | Tauri v2 / PWA | Linux / Windows / Web | Cobro de salón, gestión de mesas, divisibilidad de cuentas y propinas. | OmnIoT Bridge, Odoo POS 14/18 |
| **OmniMozos Pocket** | Expo / React Native | Android / iOS | Toma de comandas en mesa por meseros, modificadores y recetas. | Bluetooth ESC/POS, WebSocket |
| **OmniKDS Touch** | Tauri v2 / PWA | Linux / Windows / Android | Pantalla de comandas táctiles en cocina y barra con alertas sonoras. | WebSockets, OmnIoT impresoras |
| **OmniBio (Bio-Links)** | Standalone PWA | Web / Cloud (`:3022`) | Portada omnicanal, catálogos bi-link sin comisión y captación. | Redis, Cloudflare CDN |
| **OmniCatalog** | Standalone PWA | Web / Cloud (`:3021`) | Catálogo público digital, carrito WhatsApp y auto-atención. | WhatsApp Cloud API, Webhooks |
| **OmniBookings** | Standalone PWA | Web / Cloud (`:3023`) | Gestión de citas, turnos, profesionales y agenda. | iCal, WhatsApp Notifications |
| **OmniGiveaways** | Standalone PWA | Web / Cloud (`:3020`) | Sorteos virales, campañas de fidelización y captación. | Redis LRU, Social APIs |
| **OmniLedger** | Standalone Service | Linux (`:3027`) | Libro mayor canónico, contabilidad partida doble inmutable y RLS. | AsyncPG, PostgreSQL RLS |
| **OmniRealState** | Standalone Service | Web / Cloud (`:3028`) | Vertical PropTech: inmuebles, loteamientos, GeoJSON, alquileres, expensas, mora y liquidaciones a propietarios. | `@TenantPrisma()`, OmniLedger, Refine UI |
| **OmnIoT Edge Gateway** | Tauri / Rust Native | Debian / Radxa / Win | Puente universal de hardware (Epson ePOS, COM/RS-232, TCP, USB). | `/dev/ttyS*`, `/dev/usb/lp*`, TCP 9100 |

---

## 🔌 3. OmnIoT Hardware Gateway & Puente IoT (Tauri / Rust)

### 3.1 Arquitectura del Puente Físico
```text
           [ OmniPOS Desktop (Tauri) ]        [ Odoo 14/18 POS ]        [ OmniMozos Mobile (Expo) ]
           (WebSocket / JSON DTO)             (HTTP / ePOS-Print XML)   (WebSocket / JSON DTO)
                     │                                  │                            │
                     └──────────────────────────┬───────┴────────────────────────────┘
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             OMNIOT EDGE HARDWARE GATEWAY (TAURI / RUST)                     │
│                                                                                             │
│  [ Capa de Ingesta & Protocolos ]                                                            │
│  ├─ Emulador Epson ePOS-Print XML/SOAP (/cgi-bin/epos/service.cgi)                          │
│  ├─ WebSocket Server Bridge (ws://localhost:8080/ws/hardware)                               │
│  └─ REST API raw print (/api/v1/print/raw & /api/v1/scale/read)                             │
│                                                                                             │
│  [ Controladores de Dispositivos ]                                                           │
│  ├─ Impresoras Térmicas ESC/POS: Sockets TCP/LAN (:9100), USB (/dev/usb/lpX), COM (/dev/ttyS)│
│  ├─ Básculas Industriales & Café: Lectura asíncrona RS-232 / USB-Serial (tokio-serial)       │
│  ├─ Cajones Portamonedas: Pulso eléctrico ESC/POS pin 2/5 (RJ11/RJ12)                      │
│  └─ Lectores de Código de Barras / QR: Eventos HID Keyboard Wedge o Serie Directo           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Protocolos e Integraciones Clave de OmnIoT
1. **Emulación Epson ePOS-Print (XML/SOAP):** Permite a Odoo 14/18 enviar comandas creyendo comunicarse con impresoras Epson originales; OmnIoT las traduce a ESC/POS crudo en <5ms.
2. **Lectura Atómica de Básculas RS-232:** Retorna el peso exacto en gramos/kilos hacia el POS web/desktop para cálculo automático de importe por peso (ej: rotisería, café en grano, venta a granel).
3. **Apertura Eléctrica de Cajón Monedero:** Pulso atómico enviado junto con la impresión del comprobante o comando manual de caja.

---

## 🏁 4. Estrategia y Checklist Go-to-Live por Fases

### Fase 1: Estabilización Core & Standalone (Gate 1)
- [x] Aislamiento multi-tenant DB 100% en backend core ([`PLAN_CIERRE_TENANT_ISOLATION.md`](PLAN_CIERRE_TENANT_ISOLATION.md)).
- [x] Estandarización de tokens de tema UX/UI en POS y componentes.
- [ ] Ejecución de suite completa de pruebas unitarias y E2E (`./scripts/init.sh`).

### Fase 2: Empaquetado Desktop Tauri & PWA Manifests (Gate 2)
- [ ] Compilación de binarios Tauri Desktop para Linux (`.AppImage`), Windows (`.msi`) para OmniPOS y OmniKDS.
- [ ] Verificación de manifest PWA (`manifest.json`) y Service Worker offline en microservicios standalone (`omni-bio`, `omni-catalog`, `omni-bookings`).

### Fase 3: Despliegue & Configuración Edge OmnIoT (Gate 3)
- [ ] Instalación de OmnIoT daemon (`systemd`) en Mini PCs / Radxa Debian de sucursales.
- [ ] Mapeo de puertos Serie `/dev/ttyUSB0` (básculas) y TCP `:9100` (comanderas de cocina).
- [ ] Pruebas de impresión de comanderas cruzadas (Cocina vs Barra).

### Fase 4: Lanzamiento Móvil & Verificación Final (Gate 4)
- [ ] Build de APK/IPA para `OmniMozos` (`@orderflow/mobile`).
- [ ] Pruebas de cobro Tap-to-Pay / NFC y lectura QR en salón.
- [ ] Auditoría de producción en servidor Hetzner y Laboratorio Provecchio.

---

## 📄 5. Referencias & Documentación Relacionada
- [`STANDALONE_DESKTOP_PWA_TUNING.md`](STANDALONE_DESKTOP_PWA_TUNING.md) — Plan de ajuste de microservicios.
- [`/opt/omniot/README.md`](file:///opt/omniot/README.md) — Especificación técnica del micro-gateway OmnIoT Rust.
- [`AGENTS.md`](file:///opt/orderflow/AGENTS.md) — Protocolo de actuación y barrera de calidad.
