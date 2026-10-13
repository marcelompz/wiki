# Plan Estratégico: Desacoplamiento de Microservicios y Modelo de Comercialización (PyME vs Enterprise)

## 📌 Contexto y Visión

OrderFlow (OmniFlow) ha crecido hasta alcanzar una suite de servicios completa. Actualmente cuenta con microservicios independientes (`pos-standalone`, `bookings-standalone`, `biolinks-standalone`, `giveaways-standalone`, etc.).

El objetivo estratégico es **doble**:
1. **Comercialización PyME (SaaS Independiente):** Permitir vender microservicios específicos de forma individual (ej. solo el POS o solo Turnos) a pequeñas empresas con costos de servidor ínfimos y despliegue simple.
2. **Comercialización Enterprise (Suite ERP OmniFlow completa):** Desplegar la suite integral con integración total a Odoo/Core ERP, analítica avanzada (OmniBI) y Marca Blanca.
3. **Eficiencia en Monorepo:** Optimizar el almacenamiento en disco (actualmente 4.2 GB) eliminando redundancias de `node_modules` mediante workspace/pnpm deduplicado.

---

## 🏗️ Arquitectura Progresiva en 3 Fases

```
+-----------------------------------------------------------------------------------+
|                                 OMNIFLOW CORE                                     |
|  (@orderflow/auth-shared, @orderflow/db-common, Brand/WhiteLabel Engine)          |
+-----------------------------------------------------------------------------------+
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      【 MODO STANDALONE (PyME) 】                     【 MODO ENTERPRISE (ERP) 】
 ┌───────────────────────────────────┐           ┌───────────────────────────────────┐
 |  Microservicio Aislado (ej. POS)  |           |  Suite Completa OmniFlow          |
 |  - DB Propia / SQLite / Postgres  |           |  - Odoo Adapter / Sync Service    |
 |  - Auth Jwt compartida / Auth Lite|           |  - Single Sign-On (SSO) Central   |
 |  - Despliegue Docker (50MB RAM)   |           |  - Full OmniBI & Analytics        |
 └───────────────────────────────────┘           └───────────────────────────────────┘
```

---

## 🚀 Fases de Implementación

### Fase 1: Estandarización de Contratos y Librerías Compartidas (Actual)
- **Shared Packages (`packages/`):** Consolidar módulos comunes como `@orderflow/auth-shared` y utilidades de base de datos/multi-tenant.
- **Modo Dual de Ejecución:** Cada microservicio lee flags de entorno (`STANDALONE_MODE=true/false`) para decidir si funciona de manera autónoma o notifica eventos al Core ERP/Adapter.

### Fase 2: Optimización de Monorepo y Deduplicación
- Transición a **PNPM Workspaces** o **npm workspaces** unificados para compartir un único almacén de dependencias. Esto reducirá el tamaño del repositorio de 4.2 GB a menos de 600 MB en desarrollo local.

### Fase 3: Portal Multi-Tenant & Licensing / Feature Flags
- Implementación de un servidor de licencias / Feature Flags para habilitar o deshabilitar módulos según el plan contratado por el cliente.
- Automatización de CI/CD para generar imágenes de Docker livianas por microservicio (para PyMEs) o un paquete Helm / Docker-Compose integral (Enterprise).

---

## 📂 Índice de Documentación en `docs/planes/`

| Archivo | Descripción |
| :--- | :--- |
| `01-desacoplamiento-y-comercializacion.md` | Visión general del plan estratégico. |
| `02-arquitectura-standalone-vs-enterprise.md` | Detalle técnico de comunicación entre microservicios y Core. |
| `03-optimizacion-monorepo-pnpm.md` | Estrategia de deduplicación de dependencias y limpieza de disco. |
