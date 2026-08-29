# 📄 Informe Técnico: Estado del Arte de la Integración de Collabora Online (WOPI) en OmniFlow (`v1.20.38`)

> **Plataforma:** OmniFlow SaaS Omnicanal  
> **Versión Actual:** `v1.20.38`  
> **Ubicación del Documento:** `docs/info/INFORME_INTEGRACION_COLLABORA_WOPI_OMNIFLOW.md`  
> **Fecha:** 26 de Agosto de 2026  
> **Estado:** 🚀 **PRODUCTION READY — OPERATIVO EN PRODUCCIÓN**

---

## 📌 1. RESUMEN EJECUTIVO

La integración de **Collabora Online (CODE - Collabora Online Development Edition)** en **OmniFlow** se encuentra **100% desarrollada, desplegada y operativa en producción**, utilizando la especificación estándar del protocolo **WOPI (Web Application Open Platform Interface Protocol)** de Microsoft y Collabora.

Permite a los usuarios de OmniFlow previsualizar en tiempo real reportes analíticos de inteligencia de negocios (`.xlsx`) y editar documentos colaborativamente en un entorno seguro y multi-tenant sin descargar archivos a sus equipos locales.

---

## 🏛️ 2. ARQUITECTURA DE INFRAESTRUCTURA Y COMPONENTES

```mermaid
graph TD
    User["Usuario en Panel Admin (React / Refine)"]
    Traefik["Traefik v3.4 Reverse Proxy (SSL Wildcard)"]
    Backend["OmniFlow Backend (NestJS WOPI Host)"]
    Collabora["Collabora Online CODE (office.provecchio.com)"]
    Redis["Redis (Locking Concurrente)"]

    User -->|1. Solicita previsualizar reporte XLSX| Backend
    Backend -->|2. Chequeo proactivo /hosting/discovery| Collabora
    Backend -->>User: 3. Retorna EditorURL + WopiFileToken JWT (TTL 15m)
    User -->|4. Carga iframe con cool.html| Collabora
    Collabora -->|5. WOPI CheckFileInfo / GetFile| Backend
    Backend -->>Collabora: 6. Stream del archivo .xlsx en memoria
    Collabora -->|7. WOPI PutFile / Lock / Unlock| Backend
    Backend <-->|8. Coordinación de bloqueos| Redis
```

### Componentes de Infraestructura:
1. **Servidor Collabora CODE Dedicado:** Hospedado en `https://office.provecchio.com`.
2. **Reverse Proxy Traefik v3.4:** Manejo de SSL/TLS wildcard con Let's Encrypt, WebSockets passthrough y politicas CSP (`img-src blob:`, `frame-ancestors`).
3. **WOPI Host (NestJS Backend):** Implementado en `backend/src/analytics/wopi/` (`WopiService`, `WopiController`).
4. **Caché y Locking (Redis):** Control de concurrencia y bloqueo de archivos para edición multi-usuario (`X-WOPI-Lock`).

---

## 📋 3. FUNCIONALIDADES DETALLADAS

### A. Visor WOPI Solo Lectura para Reportes OmniBI (`FEAT-082`)
- **Visualización en Vivo de Reportes XLSX:** Renderiza el Resumen KPI y la Matriz de Productos directamente en modales de pantalla completa.
- **Autenticación Efímera Stateless (JWT):** Generación de `WopiFileToken` con vigencia de 15 minutos que garantiza el aislamiento por `tenantId`.
- **Chequeo Proactivo de Disponibilidad (`/analytics/viewer/status`):** Consulta proactiva a `/hosting/discovery` con caché de 30 segundos.
- **Degradación Elegante (Fallback UI):** Si el servidor Collabora está indispuesto, la interfaz conmuta automáticamente a **descarga directa del archivo Excel**.

### B. Workspace Documental con Edición & Locking (`FEAT-083`)
- **Estructura Multi-Tenant de Documentos:** Módulo de carpetas y archivos con permisos granulares (`VIEW`, `EDIT`, `OWNER`).
- **Edición Bidireccional (`PutFile`):** Recepción y almacenamiento atómico de cambios guardados desde la interfaz de Collabora.
- **WOPI Lock Engine:** Bloqueo coordinado con Redis para evitar colisiones en la edición simultánea.

---

## 📂 4. MATRIZ DE ARCHIVOS DEL PROYECTO

| Componente | Archivo / Directorio | Descripción |
| :--- | :--- | :--- |
| **WOPI Service** | `backend/src/analytics/wopi/wopi.service.ts` | Servicio principal WOPI host, firma de JWT y descubrimiento |
| **WOPI Controller** | `backend/src/analytics/wopi/wopi.controller.ts` | Endpoints WOPI (`CheckFileInfo`, `GetFile`, `PutFile`) |
| **Document Workspace** | `backend/src/documents/` | Módulo de gestión documental multi-tenant |
| **UI Iframe Modal** | `frontend/src/pages/admin/bi.tsx` | Componente modal para renderizado iframe de Collabora |
| **Manual de Usuario** | `docs/manual/omnibi_flow.md` | Manual ilustrado del flujo OmniBI y visor Collabora |
