# Plan Estratégico: Desacoplamiento de Microservicios y Modelo de Comercialización (PyME vs Enterprise)

> **Estado:** vigente — revisado 2026-11-12 sobre v1.46.3.
> **Documentos relacionados:** `03-optimizacion-monorepo-pnpm.md` (migración pnpm) y
> `plan-comercial-tridente-omnibio-omnicatalog-omnibooking.md` (matriz tarifaria canónica).

## 📌 Contexto y Visión

OrderFlow (OmniFlow) ha crecido hasta alcanzar una suite de servicios completa. En
`services/` conviven microservicios independientes (`pos-standalone`,
`bookings-standalone`, `omnilinks-standalone`, `giveaways-standalone`,
`social-catalog-standalone`, `sync-standalone`, etc.).

El objetivo estratégico es **triple**:

1. **Comercialización PyME (SaaS Independiente):** vender microservicios específicos de
   forma individual (ej. solo el POS, solo Turnos o solo Bio/Catálogo) a pequeñas
   empresas, con costo de servidor bajo y despliegue simple.
2. **Comercialización Enterprise (Suite ERP OmniFlow completa):** desplegar la suite
   integral con integración a Odoo/Core ERP, analítica avanzada (OmniBI) y Marca Blanca.
3. **Eficiencia en Monorepo:** reducir el peso del checkout y eliminar la duplicación de
   `node_modules`. La migración a pnpm workspaces (FEAT-212, v1.46.3) ya bajó el checkout
   de ~4.2 GB a ~1.7 GB; la fase 2 busca reducirlo aún más y migrar CI/Docker.

---

## 🏗️ Arquitectura Progresiva en 3 Fases

```
+-----------------------------------------------------------------------------------+
|                                 OMNIFLOW CORE                                     |
|  (@orderflow/auth-shared, Brand/WhiteLabel Engine)                                |
|  (paquetes de DB/multi-tenant: planificados, aún no existen)                      |
+-----------------------------------------------------------------------------------+
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      【 MODO STANDALONE (PyME) 】                     【 MODO ENTERPRISE (ERP) 】
 ┌───────────────────────────────────┐           ┌───────────────────────────────────┐
 |  Microservicio Aislado (ej. POS)  |           |  Suite Completa OmniFlow          |
 |  - DB Propia / SQLite / Postgres  |           |  - Odoo Adapter / Sync Service    |
 |  - Auth JWT compartida / Auth Lite|           |  - Single Sign-On (SSO) Central   |
 |  - Despliegue Docker liviano      |           |  - Full OmniBI & Analytics        |
 └───────────────────────────────────┘           └───────────────────────────────────┘
```

> El “modo dual” (`STANDALONE_MODE`) es una **propuesta de arquitectura**, no una
> implementación existente. A v1.46.3 no hay flags `STANDALONE_MODE` / `SYNC_TO_CORE` /
> `AUTH_PROVIDER` en el código; el detalle está en
> `02-arquitectura-standalone-vs-enterprise.md`.

---

## 🚀 Fases de Implementación

### Fase 1: Estandarización de Contratos y Librerías Compartidas (en curso)

- **Shared Packages (`packages/`):** hoy existe `@orderflow/auth-shared`. Las utilidades
  de base de datos/multi-tenant (tipo `@orderflow/db-common`) están **planificadas**, no
  implementadas.
- **Modo Dual de Ejecución (propuesta):** cada microservicio leería flags de entorno
  (`STANDALONE_MODE=true/false`) para funcionar de forma autónoma o notificar eventos al
  Core ERP/Adapter. Pendiente de diseño e implementación.

### Fase 2: Optimización de Monorepo y Deduplicación

- **Fase 1 de pnpm completada (FEAT-212, v1.46.3):** workspace único
  (`pnpm-workspace.yaml`), `node-linker=isolated`, lockfile raíz y store compartida por
  hardlinks. Checkout: ~4.2 GB → ~1.7 GB; `node_modules` por proyecto en KBs (symlinks);
  store global ~1.5 GB.
- **Fase 2 de pnpm (pendiente):** migrar CI de `npm ci` a `pnpm install --frozen-lockfile`,
  adoptar pnpm en Docker builds (`pnpm fetch` / deploy patterns) y aplicar el patrón
  `@prisma/<service>-client` en los servicios standalone restantes. Los
  `package-lock.json` por proyecto se conservan hasta cerrar esta fase.

### Fase 3: Portal Multi-Tenant & Licensing / Feature Flags

- Implementación de un servidor de licencias / Feature Flags para habilitar o deshabilitar
  módulos según el plan contratado.
- Automatización de CI/CD para generar imágenes Docker livianas por microservicio (PyME) o
  un paquete Helm / Docker-Compose integral (Enterprise).
- La landing self-service ya está desplegada en `https://orderflow.pesallaccia.com/`
  (v1.46.3). Queda cerrar el onboarding (redirect a `/bio/<slug>`) y el upsell de módulos
  standalone.

---

## 📂 Índice de Documentación en `docs/plans/estratega-comercial-microservicios/`

| Archivo | Descripción |
| :--- | :--- |
| `01-desacoplamiento-y-comercializacion.md` | Visión general del plan estratégico y fases. |
| `02-arquitectura-standalone-vs-enterprise.md` | Especificación **propuesta** de modos de ejecución (no implementada a v1.46.3). |
| `03-optimizacion-monorepo-pnpm.md` | Migración a pnpm workspaces: resultados de la fase 1 y trabajo restante. |
| `estudio-de-caso-pency.md` | Brief de benchmarking competitivo (Pency, Agendit, Linktree). No es un informe de resultados. |
| `plan-feat-195-landing-self-service-y-esquema-free.md` | Plan FEAT-195: landing self-service y esquema Free (path) vs Pro (subdominio). Implementado en 1.46.0 con gaps de conversión pendientes. |
| `plan-comercial-tridente-omnibio-omnicatalog-omnibooking.md` | Propuesta de valor, matriz tarifaria canónica, packs y estrategia Go-to-Market. |
| `informe-evaluacion-landing-omniflow-feat195.md` | Auditoría UX/UI de la landing: medición pre-deploy (1.40.2) y re-evaluación post-deploy (1.46.3). |
| `informe-estado-del-arte-estratega-comercial.md` | Informe consolidado: semáforo de madurez, gaps priorizados y roadmap de 3 sprints. |
