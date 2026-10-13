# EventOps Service – Documentación Técnica Completa

**Servicio desacoplado de Gestión de Eventos**  
Integrable con OmniFlow para datos compartidos

---

## Índice de documentos

| # | Documento | Descripción |
|---|-----------|-------------|
| 00 | [README.md](00-README.md) | Este archivo – Índice y visión general |
| 01 | [Arquitectura.md](01-Arquitectura.md) | Arquitectura de alto nivel, principios y patrones |
| 02 | [Contrato-de-Eventos.md](02-Contrato-de-Eventos.md) | Payloads exactos de los eventos de integración |
| 03 | [Modelo-de-Datos.md](03-Modelo-de-Datos.md) | Modelo de datos completo (tablas + relaciones) |
| 04 | [Diseno-de-APIs.md](04-Diseno-de-APIs.md) | Diseño de APIs REST (endpoints principales) |
| 05 | [Flujos-Usuario-Movil.md](05-Flujos-Usuario-Movil.md) | Flujos de usuario móvil (Check-in/out + Gantt) |
| 06 | [Estrategia-Offline.md](06-Estrategia-Offline.md) | Estrategia de modo offline |
| 07 | [Plan-de-Implementacion.md](07-Plan-de-Implementacion.md) | Roadmap por fases |

---

## Visión general

**EventOps** es un servicio independiente (desacoplado) orientado a la operación de eventos, especialmente aquellos con componente gastronómico/logístico.

### Dominio propio de EventOps
- Cronograma operativo
- Ejecución presupuestaria
- Asignación de tareas + checklists + diagrama de Gantt
- Lista de materiales del evento
- Check-in / Check-out de materiales y equipos

### Dominio de OmniFlow (referenciado)
- Clientes
- Usuarios y roles
- Contratos / Órdenes de servicio
- Catálogo maestro de productos y equipos
- Facturación

### Principios clave
1. **Desacoplamiento fuerte** – Base de datos y ciclo de vida propios.
2. **Integración por eventos + API** – Comunicación asíncrona prioritaria.
3. **Ownership claro** – Cada sistema es dueño de su dominio.
4. **Resiliencia** – EventOps puede operar aunque OmniFlow esté temporalmente no disponible.
5. **Datos compartidos controlados** – Solo se intercambian IDs de referencia y hechos de negocio relevantes.

---

## Stack tecnológico recomendado

| Capa | Tecnología |
|------|------------|
| Backend | NestJS (Node.js) o FastAPI (Python) |
| Base de datos | PostgreSQL + Redis |
| Event Bus | Kafka / RabbitMQ / AWS EventBridge / Azure Service Bus |
| API | REST (+ GraphQL opcional para móvil) |
| Auth | JWT + Identity Provider de OmniFlow |
| Archivos | S3-compatible |
| Mobile | Flutter o React Native |
| Observabilidad | OpenTelemetry |

---

## Cómo usar esta documentación

1. Empieza por **01-Arquitectura.md** para entender el diseño global.
2. Revisa **02-Contrato-de-Eventos.md** y **03-Modelo-de-Datos.md** en paralelo (son la base de la integración).
3. Continúa con **04-Diseno-de-APIs.md**.
4. Para el equipo de frontend/móvil: **05-Flujos-Usuario-Movil.md** y **06-Estrategia-Offline.md**.
5. Para planificación de proyecto: **07-Plan-de-Implementacion.md**.

---

*Documento generado para el diseño del servicio EventOps – integrable con OmniFlow.*
