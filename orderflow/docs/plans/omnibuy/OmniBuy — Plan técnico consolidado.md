# OmniBuy — Plan técnico consolidado

Arquitectura, integración y despliegue · Versión 1.0 · 27 de octubre de 2026

Este documento consolida y reemplaza el plan de desarrollo, el esquema de base de datos, la especificación de API y webhooks y el benchmarking previos, y alinea OmniBuy con el stack de OmniFlow.

## 1. Principios de diseño

1. **Standalone primero.** OmniBuy corre solo, con base de datos, autenticación, usuarios, centros de costo, proveedores y reglas propios. El cliente principal, que no usa OrderFlow, usa el producto completo.
2. **Cero dependencias hacia afuera.** El núcleo no importa ni llama a OrderFlow, Odoo ni a ningún ERP. Toda integración vive en adaptadores detrás de un puerto.
3. **Integración opcional por tenant.** Cada organización activa cero, uno o varios conectores. Con todos apagados, el ciclo completo funciona.
4. **Nativo donde importa.** Conectores preconstruidos para OrderFlow y Odoo. Para cualquier otro legacy o ERP, tres canales universales: webhooks firmados, API REST con feed de eventos y archivos de exportación.
5. **Mismo stack que OmniFlow** para reutilizar equipo, contratos y herramientas, sin acoplar los despliegues.

## 2. Alcance y roles

Ciclo: solicitud → aprobación → orden de compra (OC) → comprobante y cierre.

- **APPLICANT (solicitante):** crea solicitudes con foto, sigue su estado.
- **APPROVER (aprobador):** aprueba, rechaza o pide más datos desde el móvil.
- **BUYER (comprador):** emite la OC, gestiona proveedores, carga el comprobante final.
- **ADMIN:** usuarios, centros de costo, reglas, integraciones y API keys del tenant.
- **Operador de plataforma:** rol fuera de los tenants para altas, soporte y facturación del SaaS.

MVP: umbrales de aprobación por monto y centro de costo con uno o dos niveles. Delegación y escalamiento por ausencia quedan para una fase posterior, pero el modelo ya los contempla.

## 3. Stack y estructura

| Capa | Tecnología | Decisión de diseño |
| --- | --- | --- |
| API y flujos | NestJS (Node.js) | Módulos por dominio, API REST v1 documentada con OpenAPI |
| Workers | NestJS standalone + BullMQ | Proceso separado del API: PDF, webhooks, sincronizaciones, notificaciones |
| Datos | PostgreSQL + Prisma | Multi-tenant con tenant\_id y RLS |
| Colas | Redis + BullMQ | Redis con persistencia y maxmemory-policy noeviction, requisito de BullMQ |
| Web | React 18 + Refine.dev | Consola de comprador y admin, dashboard, consola de integraciones |
| Móvil | React Native | App de solicitante, aprobador y comprador |
| Archivos | Almacenamiento compatible con S3 | Abstracción de proveedor (MinIO, S3, R2 u otro) |
| Contratos | OpenAPI + paquete de tipos TypeScript | Una fuente de verdad para API, web y móvil |

La PWA de los planes anteriores se reemplaza por la app React Native, que ya es parte del stack. Resuelve el push en iOS, el háptico real y la cámara nativa, que eran las limitaciones de la PWA.

Monorepo:

```
omnibuy/
├─ apps/
│  ├─ api/         NestJS (HTTP)
│  ├─ worker/      NestJS standalone (BullMQ)
│  ├─ web/         React 18 + Refine
│  └─ mobile/      React Native
├─ packages/
│  ├─ contracts/   tipos, validaciones, eventos
│  ├─ core/        dominio: estados, reglas de aprobación
│  └─ connectors/  orderflow · odoo · webhook
└─ prisma/
```

## 4. Arquitectura

```
 App móvil (RN)      Consola web (Refine)
        \              /
         v            v
       API OmniBuy (NestJS) ───► PostgreSQL (RLS)
              │ outbox, misma transacción
              v
       Redis / BullMQ ───► Worker OmniBuy
                             ├─ notificaciones (push, email, WhatsApp)
                             ├─ PDF de OC
                             └─ Capa de integración (puerto)
                                  ├─ Conector OrderFlow
                                  ├─ Conector Odoo
                                  ├─ Webhooks firmados
                                  └─ Exportación de archivos

 Sistema externo ──► API OmniBuy (API key): maestros y confirmaciones
```

Como el event loop de Node no debe bloquearse, la generación de PDF y la compresión de imágenes corren en el worker, nunca en el API.

## 5. Modelo de datos

**Estados de la solicitud:** DRAFT, PENDING, NEEDS\_INFO, APPROVED, REJECTED, CANCELLED, ORDERED, FULFILLED. **Prioridad:** LOW, MEDIUM, HIGH, CRITICAL.

**Transiciones:** DRAFT → PENDING → APPROVED, REJECTED o NEEDS\_INFO. NEEDS\_INFO → PENDING. APPROVED → ORDERED → FULFILLED. CANCELLED desde cualquier estado previo a ORDERED. Cada transición se valida en el dominio y, en una sola transacción, actualiza la solicitud, escribe auditoría y registra el evento en el outbox.

| Entidad | Propósito |
| --- | --- |
| Tenant, User, CostCenter, Vendor | Organización, usuarios, centros de costo y proveedores propios |
| Requisition, RequisitionItem | Solicitud y sus líneas (cantidad, unidad, precio estimado) |
| Attachment | Varias fotos y comprobantes por solicitud |
| ApprovalRule, RequisitionApproval | Reglas por umbral y pasos de aprobación por solicitud |
| PurchaseOrder, PurchaseOrderLine | OC con correlativo y monto final. Una solicitud puede generar N OC, el MVP usa 1:1 |
| AuditLog | Cambios de estado y acciones, solo inserción |
| TenantSequence | Correlativos atómicos por tenant |
| IntegrationConnection, ExternalRef | Conectores activos y mapeo de IDs externos |
| WebhookEndpoint, OutboxEvent, DeliveryAttempt | Eventos y su entrega con reintentos |
| ApiKey, DeviceToken | Acceso de sistemas externos y tokens de push |

Fragmento Prisma de las piezas clave:

```prisma
model Requisition {
  id              String            @id @default(uuid()) @db.Uuid
  tenantId        String            @db.Uuid
  code            String            // REQ-2026-00089
  applicantId     String            @db.Uuid
  costCenterId    String            @db.Uuid
  title           String
  description     String?
  currency        String            @db.Char(3) // ISO 4217, PYG por defecto
  estimatedTotal  Decimal           @db.Decimal(18, 2)
  finalTotal      Decimal?          @db.Decimal(18, 2) // al cerrar
  priority        Priority          @default(MEDIUM)
  status          RequisitionStatus @default(DRAFT)
  neededBy        DateTime?
  rejectionReason String?
  version         Int               @default(1) // control optimista
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  items           RequisitionItem[]

  @@unique([tenantId, code])
  @@index([tenantId, status, createdAt])
}

model ExternalRef {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  connectionId String   @db.Uuid
  entityType   String   // COST_CENTER, VENDOR, USER, REQUISITION, PURCHASE_ORDER
  entityId     String   @db.Uuid
  externalId   String
  syncedAt     DateTime?

  @@unique([connectionId, entityType, entityId])
  @@unique([connectionId, entityType, externalId])
}

model OutboxEvent {
  id          String    @id @default(uuid()) @db.Uuid // = id del evento
  tenantId    String    @db.Uuid
  type        String
  aggregateId String    @db.Uuid
  payload     Json
  occurredAt  DateTime  @default(now())
  publishedAt DateTime?

  @@index([tenantId, occurredAt])
  @@index([publishedAt])
}
```

**Convenciones**

- Dinero en Decimal(18,2) con moneda ISO 4217. El monto final se registra al cerrar para medir la desviación contra lo estimado.
- Correlativos por tenant con secuencia atómica: REQ-2026-00089 para solicitudes y OC-2026-00031 para órdenes.
- Aislamiento: tenantId en todas las tablas, RLS en PostgreSQL y claves foráneas compuestas (tenantId, id) para impedir referencias entre tenants. Con Prisma, una extensión de cliente ejecuta set\_config('app.tenant\_id', ..., true) dentro de cada transacción.
- Usuarios con email único por tenant. Si una persona debe pertenecer a varios tenants, se introducen membresías.
- Auditoría append-only: el rol de la aplicación no tiene UPDATE ni DELETE sobre AuditLog.

## 6. Motor de aprobación

- **ApprovalRule:** tenant, centro de costo (opcional), moneda, rango de monto, nivel, aprobador (rol o usuario) y bandera de autoaprobación.
- Al enviar una solicitud se resuelven las reglas aplicables y se crean los pasos de aprobación.
- `approvalAuthorityLimit` del usuario es el monto máximo que puede aprobar. La autoaprobación se define solo por regla, lo que elimina la ambigüedad del esquema anterior.
- Segregación de funciones: nadie aprueba su propia solicitud.
- Umbrales por moneda, sin conversión automática en el MVP.
- Aprobar y rechazar requieren confirmación explícita, con ventana breve para deshacer. No se usa el gesto de deslizar sin confirmación para decisiones de dinero.
- Delegación y escalamiento por tiempo: trabajos retrasados de BullMQ, en fase posterior.

## 7. API REST v1

Convenciones: prefijo /api/v1, JWT de acceso corto con refresh rotativo, cabecera Idempotency-Key en los POST (el móvil reintenta con mala señal), paginación por cursor, errores en formato problem+json, límite de tasa y OpenAPI generado desde NestJS. Las acciones de flujo son POST, no PATCH parciales.

| Módulo | Endpoints principales |
| --- | --- |
| Auth y perfil | login, refresh, logout, recuperación de contraseña, aceptar invitación, GET /me |
| Maestros | CRUD de usuarios, centros de costo y proveedores (ADMIN), importación CSV |
| Solicitudes | GET y POST /requisitions, GET y PATCH /requisitions/{id}, POST /{id}/submit, /approve, /reject, /request-info, /cancel |
| Órdenes de compra | GET /purchase-orders, GET /{id}, GET /{id}/pdf, POST /{id}/fulfill (comprobante y monto final) |
| Adjuntos | POST /attachments/presign, POST /attachments/confirm |
| Notificaciones | registro de dispositivos y preferencias |
| Integraciones | conexiones, endpoints de webhook, API keys, entregas y reenvío, estado de sincronización |
| Eventos (pull) | GET /events?after={cursor} |
| Sincronización | PUT /sync/{entidad}/{externalId}, upsert idempotente de maestros |
| Reportes | gasto por centro de costo, tiempos de aprobación, exportaciones |

## 8. Capa de integración

### 8.1 Patrón: puertos, adaptadores y outbox

- Cada cambio relevante escribe un OutboxEvent en la misma transacción de Prisma que el cambio de negocio.
- Un publicador lo pasa a BullMQ y el worker lo entrega a cada conexión activa del tenant.
- Reintentos con backoff exponencial, cola de fallidos, registro de cada intento y reenvío manual desde la consola.
- Entrega al menos una vez: los receptores deduplican por id de evento.

### 8.2 Contrato de eventos

Nombres canónicos: requisition.created, requisition.submitted, requisition.approved, requisition.rejected, requisition.needs\_info, requisition.cancelled, requisition.fulfilled, purchase\_order.issued y purchase\_order.cancelled.

| Campo | Contenido |
| --- | --- |
| id | Identificador único del evento, clave de deduplicación |
| type | Nombre canónico, por ejemplo requisition.approved |
| version | Versión del esquema del evento |
| occurredAt | Fecha y hora en UTC |
| tenantId | Organización emisora |
| data | IDs estables (no solo emails), código, importes, moneda, líneas, centro de costo, proveedor y URLs firmadas de adjuntos |
| externalRefs | IDs externos conocidos para el destino de la entrega |

### 8.3 Webhooks

Varios endpoints por tenant, con filtro de eventos y secreto propio. Firma HMAC-SHA256 sobre marca de tiempo y cuerpo en una cabecera, con tolerancia de tiempo. Solo HTTPS, timeouts cortos y protección anti-SSRF (bloquear rangos privados y revalidar el DNS al entregar).

### 8.4 API y feed de eventos para legacy

Para sistemas que no pueden recibir webhooks: API keys con alcances (leer eventos, upsert de maestros, confirmaciones), guardadas con hash, con prefijo visible y rotación. El feed GET /events con cursor permite consumo por sondeo.

### 8.5 Archivos

Exportación CSV, XLSX o XML, programada o bajo demanda, e importación CSV de maestros. SFTP opcional para sistemas antiguos.

### 8.6 Referencias externas

La tabla ExternalRef mapea el ID interno con el ID en cada sistema externo. Evita columnas por sistema, admite varios sistemas por tenant y permite sincronizar en ambos sentidos.

### 8.7 Conector OrderFlow (nativo)

- Se habilita por tenant desde la consola con configuración mínima.
- Comparte el paquete de contratos tipados (mismo stack) y puede usar identidad federada OIDC para SSO, siempre opcional.
- Salida: solicitudes y OC aprobadas y comprobantes hacia la contabilidad e inventario de OrderFlow.
- Entrada: centros de costo, proveedores y usuarios desde OrderFlow, y confirmación de contabilización.
- Transporte: API y webhooks por defecto. Si comparten infraestructura de mensajería, el adaptador puede publicar en ese bus sin cambiar el contrato.
- Requiere el contrato de API y eventos de OrderFlow (ver sección 12).

### 8.8 Conector Odoo

| OmniBuy | Odoo (a validar según versión) | Sentido |
| --- | --- | --- |
| Tenant | res.company | Configuración |
| CostCenter | Cuenta analítica (distribución analítica) | Odoo → OmniBuy |
| Vendor | res.partner (proveedor) | Odoo → OmniBuy, opcionalmente bidireccional |
| Solicitud aprobada / OC | purchase.order en borrador (RFQ) o confirmada, configurable | OmniBuy → Odoo |
| Líneas | purchase.order.line (producto genérico o descripción libre) | OmniBuy → Odoo |
| Comprobante | ir.attachment vinculado a la orden | OmniBuy → Odoo |
| Confirmación y recepción | Estado de la orden y recepciones | Odoo → OmniBuy |

- Interfaz: API externa de Odoo (XML-RPC y JSON-RPC; las versiones recientes suman una API JSON), con usuario técnico y API key. La versión y la edición deben confirmarse.
- Odoo → OmniBuy: job repetible de BullMQ por sondeo y, si el cliente lo permite, una acción automatizada de Odoo que llame al endpoint de OmniBuy.
- Soporte multi-compañía mediante el mapeo tenant-compañía.
- Si el cliente usa el módulo OCA de solicitudes de compra, el mapeo apunta a ese modelo.

### 8.9 Criterios de aceptación del modo standalone

1. Un tenant sin conexiones completa el ciclo solicitud → aprobación → OC → comprobante.
2. Ningún paquete del núcleo importa código de conectores.
3. Desactivar un conector no pierde eventos: se acumulan y se reenvían al reactivarlo.
4. Los maestros se pueden cargar por consola o CSV, sin ERP.
5. Un legacy sin webhooks se integra solo con API key y feed de eventos.

## 9. Móvil y web

**App React Native**

- Solicitante: formulario de tres pasos (qué, centro de costo y monto, foto), borradores y cola offline con idempotency key.
- Aprobador: bandeja de tarjetas con el detalle del impacto, acciones con confirmación y push con enlace profundo a la tarjeta.
- Comprador: ver aprobadas, emitir OC y cargar el comprobante.
- Fotos comprimidas en el dispositivo y subida directa por URL firmada, con reintentos.
- Notificaciones como abstracción de canales: push (FCM y APNs), correo y WhatsApp Business, este último a evaluar por costo y plantillas.
- Compatibilidad de la API con la versión actual y la anterior de la app, y chequeo de versión mínima.
- Aprobación por enlace web para quien no tenga la app: fase posterior.

**Consola web (Refine.dev):** bandejas, OC, maestros, usuarios, reglas, reportes y consola de integraciones (conexiones, entregas, reenvíos y mapeos). Proveedor de datos REST sobre la API, autenticación JWT, control de acceso por rol y i18n es/en.

## 10. Seguridad

- Contraseñas con Argon2id. Refresh tokens guardados con hash, rotativos y revocables.
- RLS más pruebas automáticas de aislamiento entre tenants.
- Credenciales de conectores y secretos de webhooks cifrados en reposo.
- Bucket privado, URLs firmadas de corta vigencia, validación de tipo y tamaño, y limpieza de EXIF.
- Límite de tasa, CORS restrictivo y auditoría de dependencias en CI.
- Anti-SSRF en webhooks y panel de colas accesible solo para operadores.

## 11. Despliegue

**Principio:** contenedores y configuración por variables de entorno. El mismo artefacto corre en nube o en infraestructura propia.

**Topologías**

- **A. SaaS multi-tenant compartido** (por defecto).
- **B. Instancia dedicada de un solo tenant**, para clientes con requisitos de aislamiento. Mismas imágenes, distinta configuración.

**Componentes:** api y worker (escalan por separado), web estática, PostgreSQL, Redis, almacenamiento compatible con S3.

**Entornos:** local con Docker Compose (PostgreSQL, Redis, MinIO), staging con datos sintéticos y producción.

**CI/CD**

- En cada PR: lint, tipos, pruebas unitarias, pruebas de integración con PostgreSQL y Redis efímeros, pruebas de contrato OpenAPI y escaneo de dependencias.
- Imágenes versionadas, despliegue automático a staging y promoción a producción con aprobación.
- Rollback a la imagen anterior.

**Migraciones:** `prisma migrate deploy` como paso del release, con patrón expandir y contraer. Las versiones n y n-1 del API deben convivir porque la app móvil no se actualiza al instante.

**Operación**

- Endpoints de salud y readiness, y apagado ordenado de workers.
- Logs estructurados con tenant y correlación, trazas con OpenTelemetry, métricas y alertas (colas, latencia, fallos de entrega, errores).
- Seguimiento de errores y panel de colas restringido.

**Datos:** backups automáticos con restauración a un punto en el tiempo y pruebas periódicas de restauración. Redis con persistencia AOF. Retención y borrado por tenant.

**Móvil:** build y firma automatizados, canales de prueba internos y publicación por etapas. Actualizaciones OTA solo para cambios de JavaScript compatibles.

**Alta de tenants:** script o consola de plataforma que crea tenant, ADMIN, secuencias y configuración inicial, con banderas por tenant para activar conectores y funciones.

## 12. Hoja de ruta

Estimación orientativa para un equipo de 3 a 4 personas (backend, web, móvil), a recalibrar con el equipo real. Cada fase termina con un flujo usable.

| Fase | Semanas | Entregable |
| --- | --- | --- |
| 0 | 1 | Decisiones abiertas, monorepo, CI, entornos, contratos OpenAPI, esquema Prisma v1 |
| 1 | 2–3 | Multi-tenant con RLS, auth, solicitudes con máquina de estados, auditoría y outbox desde el primer día |
| 2 | 4–5 | App móvil (solicitar y aprobar), push, adjuntos, motor de umbrales, consola web básica |
| 3 | 6–7 | Proveedores, OC con PDF en worker, comprobante y cierre, dashboard. **MVP standalone vendible** |
| 4 | 8–9 | Webhooks firmados, API keys, feed de eventos, exportaciones, conector OrderFlow |
| 5 | 10–11 | Conector Odoo, delegación y escalamiento, hardening, QA E2E y producción |

Los ganchos de planes y uso para facturación del SaaS se incluyen desde la fase 3. La pasarela de cobro queda abierta.

## 13. Decisiones abiertas y riesgos

1. **Contrato de API y eventos de OrderFlow**, necesario antes de la fase 4.
2. **Versión y edición de Odoo** del primer cliente, y si usa el módulo de compras estándar o el de solicitudes de OCA.
3. **Móvil:** solo app React Native o además enlace web de aprobación.
4. **Mensajería:** BullMQ por defecto. Kafka o RabbitMQ solo si OrderFlow lo exige, detrás del mismo puerto.
5. **Cobro del SaaS:** pasarela y disponibilidad según el país.
6. **Datos fiscales del comprobante** si el cliente los exige (RUC, timbrado, IVA).
7. **Instancia compartida o dedicada** para el cliente principal.
8. **Riesgo de alcance:** el MVP se corta en la fase 3 y las integraciones van después.
9. **Riesgo técnico Prisma + RLS:** exige disciplina; se mitiga con pruebas de aislamiento entre tenants desde la fase 1.
