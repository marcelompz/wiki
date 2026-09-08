# 01 – Arquitectura de EventOps Service

## 1. Principios de diseño

| Principio | Descripción |
|---------|-------------|
| **Desacoplamiento fuerte** | El servicio tiene su propia base de datos, ciclo de vida, despliegue y escalado. OmniFlow no es un monolito del que EventOps dependa en tiempo de ejecución. |
| **Integración por eventos + API** | Preferencia por comunicación asíncrona (eventos). APIs síncronas solo cuando se requiere consistencia inmediata o consultas puntuales. |
| **Datos compartidos controlados** | Solo se sincronizan entidades maestras y hechos de negocio relevantes. Nunca se comparte el modelo interno completo. |
| **Ownership claro** | EventOps es dueño de: eventos operativos, cronograma, presupuesto de ejecución, tareas, checklists, Gantt, materiales del evento y movimientos de check-in/out. OmniFlow es dueño de: clientes, usuarios, contratos, catálogo maestro y facturación. |
| **Independencia de fallos** | Si OmniFlow no está disponible, EventOps continúa operando en modo degradado (usando caché local de datos maestros). |
| **Auditabilidad** | Todos los intercambios de datos y cambios de estado relevantes quedan registrados. |

---

## 2. Diagrama de arquitectura de alto nivel

```
                    ┌─────────────────────────────────────┐
                    │           App Móvil / Web           │
                    │     (Flutter / React Native)        │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │         API Gateway / BFF           │
                    │   (orquestación + autenticación)    │
                    └─────────────────┬───────────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
                 ▼                    ▼                    ▼
    ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
    │     OmniFlow       │  │   Event Bus        │  │   EventOps Service │
    │  (Core Platform)   │◄─┤ (Kafka / RabbitMQ  │─►│                    │
    │                    │  │  / EventBridge)    │  │  - Events          │
    │ - Clientes         │  └────────────────────┘  │  - Schedule        │
    │ - Usuarios / Roles │                          │  - Budget          │
    │ - Contratos        │                          │  - Tasks + Gantt   │
    │ - Catálogo maestro │                          │  - Materials       │
    │ - Facturación      │                          │  - Check-in/out    │
    └────────────────────┘                          └────────────────────┘
                 │                                           │
                 │                                           │
                 └─────────────── PostgreSQL ────────────────┘
                              (bases separadas)
```

---

## 3. Componentes internos de EventOps

```
EventOps Service
├── API Layer (REST / GraphQL)
├── Application Layer (Use Cases / Commands & Queries)
├── Domain Layer (Entidades, Aggregates, Domain Events)
├── Infrastructure
│   ├── PostgreSQL (persistencia)
│   ├── Redis (caché + locks ligeros)
│   ├── Event Publisher (Outbox Pattern)
│   ├── Event Consumer
│   └── Object Storage (S3) – fotos y documentos
└── Background Workers
    ├── Sincronización de datos maestros
    ├── Cálculo de desvíos presupuestarios
    └── Generación de reportes
```

### Patrones aplicados

- **Outbox Pattern**: garantiza que los eventos se publiquen de forma confiable junto con la transacción de base de datos.
- **CQRS ligero**: separación de modelos de escritura (comandos) y lectura (queries optimizadas para móvil).
- **Repository + Unit of Work**.
- **Domain Events** internos que luego se traducen a Integration Events.
- **Circuit Breaker + Retry** en las llamadas hacia OmniFlow.
- **Cache-Aside** para datos maestros (usuarios, clientes, catálogo).

---

## 4. Estrategia de integración

### 4.1 OmniFlow → EventOps (datos maestros)

| Dato | Mecanismo | Notas |
|------|-----------|-------|
| Usuarios y roles | Evento `UserCreated` / `UserUpdated` + API de consulta | Cache local con TTL |
| Clientes | Evento `ClientUpdated` | Solo datos mínimos necesarios |
| Contratos / Órdenes | Evento `ContractConfirmed` | Dispara creación de Evento en EventOps |
| Catálogo de materiales | Evento `CatalogItemChanged` o sync bajo demanda | Referencia por `external_catalog_item_id` |

### 4.2 EventOps → OmniFlow (hechos de negocio)

EventOps publica eventos de integración (ver documento 02).  
OmniFlow puede suscribirse según necesidad (actualización de estado de contrato, alertas, dashboards, etc.).

### 4.3 Comunicación síncrona

Solo para:
- Creación de evento desde OmniFlow al confirmar contrato.
- Consultas de resumen (`GET /events/{id}/summary`).
- Validaciones puntuales de disponibilidad (si aplica).

---

## 5. Seguridad

- **Autenticación**: JWT emitido por el Identity Provider de OmniFlow (o propio con federación).
- **Autorización**: RBAC interno de EventOps + scopes limitados hacia OmniFlow.
- **Comunicación servicio-a-servicio**: mTLS o JWT firmado con audiencia restringida.
- **Datos sensibles**: cifrado en tránsito (TLS) y en reposo (volúmenes y backups).
- **Audit log**: todas las operaciones de escritura y sincronizaciones quedan registradas.

---

## 6. Resiliencia y modo degradado

| Escenario | Comportamiento de EventOps |
|-----------|----------------------------|
| OmniFlow no disponible | Usa caché local de usuarios/clientes/catálogo. Las operaciones de escritura propias continúan. |
| Event Bus degradado | Outbox retiene los eventos hasta poder publicarlos. |
| Base de datos lenta | Timeouts + circuit breakers. Queries de lectura pueden servirse desde réplicas o caché. |
| App móvil sin conexión | Ver documento 06 – Estrategia Offline. |

---

## 7. Observabilidad

- **Logs estructurados** (JSON) con `correlation_id` y `event_id`.
- **Trazas distribuidas** (OpenTelemetry) que atraviesan Gateway → EventOps → Event Bus.
- **Métricas**: latencia de APIs, tasa de eventos publicados/consumidos, desvíos presupuestarios, movimientos de materiales.
- **Alertas**: fallos de sincronización, desvíos de presupuesto > umbral, materiales faltantes críticos.

---

## 8. Consideraciones de despliegue

- Contenedores (Docker) + orquestación (Kubernetes / ECS / Cloud Run).
- Base de datos gestionada (RDS / Cloud SQL / Azure Database).
- Separación de entornos: `dev`, `staging`, `production`.
- Migraciones de esquema versionadas (Flyway / Liquibase / TypeORM migrations).
- Feature flags para activar/desactivar integraciones nuevas.

---

*Siguiente documento recomendado: [02-Contrato-de-Eventos.md](02-Contrato-de-Eventos.md)*
