# **\# Prompts Maestros de Implementación: OmniRealState (Fast-Track)**

Ecosistema OmniFlow — Módulo Vertical PropTech & Real Estate

Fecha: Septiembre 2026

Documento: PROMPTS\_DE\_IMPLEMENTACION\_OMNIREALSTATE.md

Estado: Prompts Técnicos de Ingeniería Ajustados al Repositorio OrderFlow v1.28.0

---

## **\#\# Índice de Prompts Maestros**

1\. Prompt 0 (Fast-Track Scaffold & SideBar): Creación del Microservicio real-estate-standalone y Nuevo Menú en el SideBar del Frontend.

2\. Prompt 1 (Backend Core & Blindaje Multi-Tenant): Modelos Prisma, Servicios NestJS con @TenantPrisma() y Endpoints REST de Catastro.

3\. Prompt 2 (Frontend Refine & Visor de Lotes): Registro de Recursos en Refine y Visor Interactivo de Master Plan con Ficha de Tasación.

4\. Prompt 3 (Motor Financiero & BullMQ): Amortización, Cálculo de Mora y Despacho de Eventos con DTOs Canónicos a OmniLedger.

5\. Prompt 4 (Property Management): Contratos de Alquiler, Expensas Consorciales y Liquidación Neta a Propietarios.

6\. Prompt 5 (OmniCRM Bridge & Comisiones): Webhooks de Reserva de Lotes y Split de Comisiones de Venta.

---

## **\#\# PROMPT 0: Scaffold de Microservicio y Menú SideBar en Frontend**

&nbsp;

```
# Contexto y Rol
Actúa como Desarrollador Full-Stack Senior en el ecosistema OmniFlow (OrderFlow v1.28.0). Conoces la arquitectura monorepo basada en pnpm workspaces, NestJS para microservicios backend y React / Refine.dev / Tailwind CSS para la aplicación web administrativa.

# Objetivo
1. Crear el scaffolding del nuevo microservicio backend `services/real-estate-standalone`.
2. Integrar el nuevo menú "Inmobiliaria" en la barra lateral (`SideBar`) de la aplicación administrativa (`apps/admin`) con sus rutas base.

# Tarea 1: Backend Scaffolding (services/real-estate-standalone)
- Inicializar aplicación NestJS en `services/real-estate-standalone` vinculada al monorepo pnpm.
- Configurar dependencias internas: `@packages/auth-shared` (guards JWT y API Key), `@packages/prisma-shared` o Prisma client local con `@TenantPrisma()`.
- Asignar puerto de red :3028 (verificando no colisionar con otros microservicios) y prefijo de ruta `/api/v1/real-estate`.
- Configurar Dockerfile y entrada en `docker-compose.yml` para proxy reverso Traefik bajo el subdominio `propiedades.localhost` / `propiedades.omniflow.app`.

# Tarea 2: Frontend SideBar & Routing (apps/admin)
- Archivos a intervenir: `src/components/layout/SideBar.tsx`, `src/App.tsx` (o router principal), y `src/resources/realEstate.tsx`.
- Requisitos del SideBar:
  * Crear un ítem colapsable o de acceso directo "Inmobiliaria" con icono temático (`BuildingOfficeIcon` o `MapPinIcon`).
  * Sub-ítems de navegación:
    - "Proyectos / Loteamientos" -> `/admin/real-estate/projects`
    - "Mapa de Terrenos" -> `/admin/real-estate/map`
    - "Contratos" -> `/admin/real-estate/contracts`
  * Control de acceso: renderizar el menú solo si el tenant tiene habilitada la feature `REAL_ESTATE` (usar hook `useTenantFeatures()` o claims del token).
  * Soporte visual consistente: aplicar clases Tailwind para Dark Mode (`dark:text-gray-300 dark:hover:bg-gray-800`) y estado activo (`bg-primary-50 dark:bg-primary-900/20 text-primary-600`).

# Entregables
- Archivos de configuración de NestJS (`main.ts`, `app.module.ts`, `package.json`).
- Código del SideBar actualizado y archivo de definición de recursos en Refine.
- Verificación visual de renderizado en modo claro y oscuro.
```

---

## **\#\# PROMPT 1: Backend Core, Esquema Prisma y Blindaje Multi-Tenant**

&nbsp;

````
# Contexto y Rol
Actúa como Ingeniero Backend Senior en NestJS y Prisma. Estás implementando el dominio central de propiedades y catastro para `services/real-estate-standalone`.

# Regla de Oro Arquitectónica (CRÍTICO)
Todo acceso a base de datos DEBE cumplir con el blindaje de aislamiento multi-tenant estricto. Está PROHIBIDO usar `this.prisma` directo. Debes usar el decorador `@TenantPrisma()` y el helper `getDb(db)` para garantizar que ninguna consulta omita el filtro `tenantId`.

# Requisitos Técnicos
1. Esquema Prisma (`prisma/schema.prisma`):
   - Modelos: `RealEstateProject`, `RealEstateProperty` (Manzana/Torre), `RealEstateUnit` (Lote/Depto/Local), `RealEstateCadastre`.
   - Cada modelo debe incluir `tenantId String` e índices indexados `@@index([tenantId])`.
   - Almacenamiento de geometrías GeoJSON en `RealEstateCadastre`: usar campo nativo `Json` para `geoPolygon` y `landmarks` (mojones). NO usar la extensión PostGIS en esta fase.
   - Vinculación con contactos: campo `ownerId String?` que referencia a los modelos nativos `Customer` / `Contact` de OrderFlow (NO usar res.partner).
2. Capa de Servicios y Controladores NestJS:
   - `ProjectsService`, `UnitsService`, `CadastreService`.
   - Cada método recibe el cliente Prisma del tenant vía inyección contextual:
     ```typescript
     @Injectable()
     export class UnitsService {
       async findAll(@TenantDb() db: PrismaClient, tenantId: string, filter: FilterUnitDto) {
         return db.realEstateUnit.findMany({
           where: { tenantId, ...filter },
           include: { cadastre: true, property: true }
         });
       }
     }
     ```
3. Endpoints REST a implementar:
   - `POST /api/v1/real-estate/projects` (crear proyecto con sus manzanas)
   - `GET /api/v1/real-estate/projects/:id/units` (unidades con polígonos GeoJSON y estado)
   - `PATCH /api/v1/real-estate/units/:id/status` (cambio de estado: AVAILABLE, RESERVED, SOLD, RENTED)
   - `PUT /api/v1/real-estate/units/:id/cadastre` (actualización de mojones, declive, servicios)

# Entregables
- Archivo `schema.prisma` con modelos y migraciones de base de datos.
- Módulos, Controladores, DTOs con `class-validator` y Servicios NestJS blindados con `@TenantPrisma()`.
- Tests unitarios que comprueben el aislamiento estricto por `tenantId`.
````

---

## **\#\# PROMPT 2: Frontend Refine y Visor Interactivo de Lotes con Ficha de Tasación**

&nbsp;

```
# Contexto y Rol
Actúa como Desarrollador Frontend Senior en React, TypeScript y Tailwind CSS para OmniFlow.

# Objetivo
Crear la vista interactiva de loteamiento (`MasterPlanViewer.tsx`) conectada a Refine.dev, donde el asesor inmobiliario o el cliente visualiza el plano de lotes, su estado de disponibilidad y la ficha técnica de tasación.

# Requisitos de Interfaz
1. Visor de Terrenos:
   - Renderizar los polígonos GeoJSON de los lotes sobre un lienzo interactivo (Leaflet o SVG dinámico responsivo).
   - Colores por estado:
     * Disponible: `emerald-500` / `bg-emerald-500/20`
     * Reservado: `amber-500` / `bg-amber-500/20`
     * Vendido: `slate-400` / `bg-slate-400/20`
     * Alquilado: `indigo-500` / `bg-indigo-500/20`
2. Drawer Lateral de Detalle al Seleccionar un Lote:
   - Cabecera: Manzana y Número de Lote, Superficie en m², Dimensiones (frente y fondo).
   - Ficha Catastral: Padrón, Cta. Cte. Catastral, Altitud (msnm), Pendiente (% de declive).
   - Grilla de Servicios Disponibles con iconos (Agua, Energía eléctrica, Desagüe, Fibra óptica, Asfalto).
   - Botón "Ficha Técnica PDF" y botón "Reservar Lote" (que abre el modal de seña rápida).
3. Consumo de API vía Data Provider de Refine:
   - Hook `useCustom` o `useList` para traer las unidades del proyecto seleccionado.
   - Mutación optimista al cambiar el estado del lote.

# Entregables
- Componente `src/pages/realEstate/MasterPlanViewer.tsx`.
- Componente `src/components/realEstate/UnitDetailDrawer.tsx`.
- Integración fluida en el layout administrativo con Dark Mode.
```

---

## **\#\# PROMPT 3: Motor Financiero de Cuotas y Eventos Contables a BullMQ**

&nbsp;

````
# Contexto y Rol
Actúa como Ingeniero Backend Financiero en NestJS con experiencia en contabilidad y sistemas de mensajería (BullMQ / Redis).

# Objetivo
Implementar el generador de planes de financiación de loteamientos (hasta 240 cuotas) y el cálculo de mora, desacoplado de la contabilidad mediante el despacho de DTOs canónicos al `Integration Worker`.

# Requisitos
1. Algoritmos de Amortización (en precisión decimal con librería `decimal.js`):
   - Sistema Francés (cuota constante).
   - Sistema Alemán (amortización de capital fija).
   - Cuota fija acordada.
2. Motor de Mora Diario:
   - Cron Job programado (`@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`).
   - Identificar cuotas vencidas y calcular recargos e intereses punitorios diarios configurables por el tenant.
3. Despacho de Eventos hacia Integration Worker (BullMQ):
   - Al registrarse el pago de una cuota, el microservicio NO escribe en tablas contables directamente. Emite un evento canónico:
     ```typescript
     await this.integrationQueue.add('ACCOUNTING_TRANSACTION', {
       tenantId,
       eventType: 'REAL_ESTATE_INSTALLMENT_PAID',
       payload: {
         contractId: contract.id,
         installmentNumber: installment.number,
         amountTotal: installment.totalPaid,
         principalAmount: installment.principal,
         interestAmount: installment.interest,
         penaltyAmount: installment.penalty,
         currency: installment.currency,
         customerId: contract.customerId,
         paymentMethod: payment.method,
         idempotencyKey: `RE_PAY_${installment.id}_${payment.id}`
       }
     });
     ```
   - El `Integration Worker` se encarga de dirigir este DTO hacia OmniLedger o el conector contable configurado.

# Entregables
- Servicio `InstallmentEngineService` con algoritmos de amortización testeados.
- Job de evaluación de mora con actualización de estados.
- Productor de cola BullMQ con DTOs canónicos fuertemente tipados.
````

---

## **\#\# PROMPT 4: Property Management, Consorcios y Liquidación a Propietarios**

&nbsp;

```
# Contexto y Rol
Actúa como Desarrollador Backend Senior en NestJS para Property Management.

# Objetivo
Implementar la gestión de contratos de alquiler, distribución de expensas por coeficiente de copropiedad y liquidaciones netas automáticas a propietarios.

# Requisitos
1. Contratos de Locación (`RealEstateContract`):
   - Inquilino, fiadores/garantes, fechas de inicio y vencimiento, canon mensual, depósito en custodia.
   - Reglas de reajuste periódico programado.
2. Liquidación Neta a Propietarios (*Owner Settlement*):
   - Cálculo mensual automático:
     * (+) Total recaudado por canon de alquiler del período.
     * (-) Comisión de administración de la inmobiliaria (porcentaje o monto fijo según mandato).
     * (-) Gastos de mantenimiento y reparaciones con comprobante cargado.
     * (-) Retenciones impositivas aplicables.
     * (=) Monto neto a liquidar al propietario.
   - Generación de comprobante de rendición de cuentas en PDF listo para envío por WhatsApp / correo.
3. Consorcios y Expensas:
   - Registro de gastos del edificio y prorrateo según coeficiente de copropiedad (suma de porcentajes = 100%).
   - Discriminación obligatoria entre expensas ordinarias (inquilino) y extraordinarias (propietario).

# Entregables
- Módulo NestJS `PropertyManagementModule` con servicios y controladores blindados con `@TenantPrisma()`.
- Generador de plantilla de liquidación mensual a propietarios.
```

---

## **\#\# PROMPT 5: Bridge con OmniCRM y Comisiones de Vendedores**

&nbsp;

```
# Contexto y Rol
Actúa como Ingeniero de Integración en OmniFlow.

# Objetivo
Conectar el pipeline de OmniCRM con la reserva de unidades y el cálculo de comisiones para la fuerza de ventas.

# Requisitos
1. Pipeline de Oportunidad y Bloqueo de Lote:
   - Webhook interno cuando una oportunidad en OmniCRM pasa al estado "Reserva":
     * Cambiar estado del lote a `RESERVED` con marca de tiempo de expiración (ej. 72 horas).
     * Si no se confirma el pago de la seña en el plazo estipulado, liberar automáticamente a `AVAILABLE`.
2. Split de Comisiones de Venta:
   - Al confirmarse la venta o boleto de compraventa:
     * Calcular comisión total (ej. 5% sobre el precio de lista).
     * Dividir entre las partes según configuración:
       - Agente Captador (% acordado).
       - Agente Cerrador (% acordado).
       - Agencia Inmobiliaria (remanente).
     * Registrar en la tabla `RealEstateCommission` en estado `PENDING_PAYOUT`.

# Entregables
- Controlador de webhooks y sincronizador con OmniCRM.
- Lógica de vencimiento de reservas y liberación de stock.
- Servicio de cálculo y reporte de comisiones por asesor comercial.
```

&nbsp;