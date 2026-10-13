# Guía de Desarrollo de Módulos por Terceros, Testing Aislado y Publicación en Marketplace

> **Versión:** 1.0.0  
> **Fecha:** 14 de Agosto de 2026  
> **Plataforma:** OmniFlow (Marca pública) / OrderFlow (Capa técnica)  
> **Ámbito:** Arquitectura Modular, Microservicios Standalone, Multi-Tenant y App Store  

---

## 1. Estado del Arte de la Arquitectura en OmniFlow

OmniFlow (OrderFlow en su nivel técnico) opera bajo una **arquitectura híbrida decoupled & multi-tier** diseñada para alta velocidad, aislamiento de datos y extensibilidad.

```
                  ┌─────────────────────────────────────────────────────────────┐
                  │                 Traefik v3.4 Proxy Gateway                  │
                  └──────────────┬──────────────────────────────┬───────────────┘
                                 │                              │
                    PathPrefix   │                              │ Subdominios Dinámicos
                 (/api/v1/...)   ▼                              ▼
                 ┌──────────────────────────────┐    ┌──────────────────────────┐
                 │    OrderFlow Core (NestJS)   │    │ Microservicios Standalone│
                 │   (Monolito Modular Multi)   │    │ (Giveaways, BioLinks...) │
                 └──────────────┬───────────────┘    └────────────┬─────────────┘
                                │                                 │
                                ▼                                 ▼
                 ┌──────────────────────────────┐    ┌──────────────────────────┐
                 │  DB Compartida / Dedicadas   │    │  auth-shared (JWT/Keys)  │
                 │     (Prisma Multi-Tier)      │    └──────────────────────────┘
                 └──────────────────────────────┘
```

### Componentes Clave:
1. **Monolito Modular Core (NestJS 10 + React Refine):**
   - Contiene los dominios base: `orders`, `products`, `customers`, `bookings`, `loyalty`, `quotations`, `system-modules` (App Store) e `integrations`.
   - Cada módulo posee un manifiesto (`*.manifest.json`) estilo Odoo (`__manifest__.py`) para el control de ciclo de vida e instalación dinámica por tenant (`ModuleInstallation`).
2. **Microservicios Standalone Desacoplados:**
   - Módulos con acoplamiento 0 se extraen en `services/<nombre>-standalone/` (ej. `giveaways-standalone`, `whatsapp-catalog-standalone`, `biolinks-standalone`, `bookings-standalone`).
   - Utilizan la librería interna compartida `packages/auth-shared` para autenticar JWT y API Keys sin acoplamiento a la base de datos central.
3. **Multi-Tenant / Multi-Tier Isolation (`ORDERFLOW_MODE`):**
   - **`community` (default):** Multi-tenant con aislamiento dinámico. Tenants `shared` (DB compartida) y `dedicated` (DB Enterprise aislada) usando `@TenantPrisma()`.
   - **`enterprise`:** Single-tenant para instancias exclusivas con `ENTERPRISE_TENANT_ID` inyectado.
   - **Regla Sagrada:** `tenantId` está presente en todas las tablas y queries.

---

## 2. Protocolo de Desarrollo para Terceros (Git & Branches)

Desarrolladores externos o de la comunidad pueden construir nuevos módulos creando ramas secundarias (`feature/modulo-tercero`) a partir del repositorio central (`https://github.com/marcelompz/orderflow`).

### Las 6 Reglas Inviolables de Arquitectura:
1. **`tenantId` es Sagrado:** NINGUNA consulta ni entidad debe omitir `tenantId`.
2. **Cero Lógica Condicionada por `ORDERFLOW_MODE` en Services:** No usar `if (mode === 'enterprise')` en `*.service.ts`. La diferencia reside en Guards/Middlewares.
3. **Prohibido Instanciar `PrismaClient` Directamente:** Usar `this.prisma` (singleton) o `@TenantPrisma()` (dinámico). Nunca hacer `new PrismaClient()`.
4. **Proxy Exclusivo Traefik v3.4:** No configurar Nginx. Todo ruteo y SSL se administra vía Traefik v3.4.
5. **Estructura Modular & Manifiesto:** Definir acoplamiento. Si el acoplamiento es 0, califica como candidato a Microservicio Standalone.
6. **Sincronización de Manifiestos:** Mantener `coreCompatibility` en el `*.manifest.json`.

---

## 3. Estrategia de Testing y Desarrollo Aislado contra el Core

Un desarrollador externo **NO requiere instanciar otros servicios ni ERPs externos (como Odoo, Sentry o FacturaSend)** para desarrollar y probar su módulo.

### Flujo de Testing Aislado:
1. **Inyección de Contexto Tenant:**
   - Al registrar el nuevo módulo en `backend/src/app.module.ts`, los guards estándar (`ApiKeyGuard`) inyectan `req.tenant` y `req.tenantPrisma` automáticamente.
2. **Aislamiento por Manifiesto:**
   - El módulo se declara en `backend/src/<modulo>/<modulo>.manifest.json`.
3. **Barrera de Validación Automatizada (`scripts/init.sh`):**
   El desarrollador puede ejecutar la suite de calidad local para verificar:
   - Generación de cliente Prisma (`npx prisma generate`).
   - Pruebas unitarias de Jest (`npm run test`).
   - Build limpio de NestJS y React/Vite (`npm run build`).
   - Pruebas E2E de navegación con Playwright (`qa_e2e_check.py`).

---

## 4. Estructura del Manifiesto y Publicación en el Marketplace (App Store)

Para que el módulo aparezca y pueda ser instalado por los usuarios en el panel de administración (`/admin/modules`), debe incluir su archivo de manifiesto descriptor.

### Ejemplo de Manifiesto (`mi-modulo.manifest.json`):
```json
{
  "name": "Módulo de Fidelización Avanzada",
  "slug": "loyalty-advanced",
  "version": "1.0.0",
  "coreCompatibility": "^1.20.0",
  "description": "Permite recompensar clientes mediante gamificación y niveles VIP.",
  "author": "Partner / Desarrollador Tercero",
  "category": "Marketing",
  "icon": "gift",
  "price": 0.00,
  "isCore": false,
  "dependencies": []
}
```

### Proceso de Publicación y Merge:
1. **Pull Request:** Se envía el PR a la rama `main` del repositorio.
2. **Auditoría CI/CD:** GitHub Actions y `./scripts/init.sh` verifican 0 errores TypeScript, 100% de tests unitarios y 0 excepciones JS en E2E.
3. **Fusión en `main`:** Tras el merge, el `system-modules` module del backend detecta automáticamente el nuevo manifiesto.
4. **Disponibilidad en Marketplace:** El módulo aparece inmediatamente en la tienda interna del Backoffice (`/admin/modules`), listo para ser activado por cualquier tenant.

---

## 5. Documentación de Referencia Relacionada
- [Contexto para Agentes y Desarrolladores](file:///opt/orderflow/docs/00-contexto-agentes.md)
- [Glosario y Ecosistema](file:///opt/orderflow/docs/GLOSARIO_TERMINOS_Y_ECOSISTEMA.md)
- [Roadmap de Microservicios Standalone](file:///opt/orderflow/ROADMAP.md)
- [Índice de Troubleshooting](file:///opt/orderflow/docs/troubleshooting/README.md)
