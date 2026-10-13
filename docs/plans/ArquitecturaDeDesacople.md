# Arquitectura de Desacople: Core y Microservicios en OmniFlow

El desacople de Prisma y la modularización de microservicios en OmniFlow responde a una arquitectura guiada por eventos (**Event-Driven**) y orientada a la independencia de dominio.

---

## 1. ¿Cómo está vinculada esta separación de los microservicios con el core?

La vinculación entre el **Core (NestJS)** y los microservicios se realiza de forma asíncrona y mediante contratos explícitos, evitando la dependencia directa en la base de datos o el código fuente compartido:

* **Bus de Eventos y Colas Asíncronas (BullMQ + Redis):** El Core actúa como orquestador y motor transaccional primario. Cuando ocurre una acción (ej. confirmación de pedido o actualización de stock), el Core publica un evento en Redis. Los microservicios escuchan y procesan estas tareas de forma independiente.
* **Aislamiento de Persistencia (Prisma Decoupling):** Al eliminar el uso de un `PrismaClient` monolítico global o directo, cada microservicio define su propio contexto de persistencia o se comunica vía DTOs/REST/gRPC con el Core. En el Core, el acceso a datos se rige estrictamente por `@TenantPrisma()` y `this.prisma` contextual para preservar la invariabilidad multi-tenant.
* **Comunicación Realtime Adaptativa:** Para la sincronización en vivo (como el POS local y la pantalla de cocina KDS), se utiliza `@socket.io/redis-adapter`, permitiendo escalar sockets entre el Core y los servicios sin acoplamiento de memoria.

---

## 2. ¿Puedo instalar modularmente estos microservicios u obviarlos sin el código empaquetado?

Sí, absolutamente. Esta es una de las mayores ventajas del diseño desacoplado:

* **Tolerancia a la Ausencia (Graceful Fallback):** Si un microservicio no está desplegado o empaquetado (por ejemplo, el motor de integraciones para Odoo/SAP o un worker específico), el Core simplemente omite el despacho de esas tareas o las encola de manera pasiva en Redis.
* **Estrategia "Trojan Horse" / Modularidad:** La aplicación puede funcionar en modo mínimo (solo el Core con el "Tridente": Bio-Links, Catálogo y Bookings) sin necesidad de descargar, compilar ni incluir las dependencias ni el código fuente de los microservicios avanzados (como inventario multidepósito o conectores ERP).
* **Activación por Tenant:** Mediante el decorador de permisos y la configuración contextual del tenant, un cliente en el Tier Shared o Starter solo ejecuta los flujos que tiene contratados, manteniendo el consumo de memoria al mínimo.

---

## 3. ¿Puedo instalar solamente los microservicios en otros servidores?

Sí, 100% posible. La infraestructura está optimizada para despliegue distribuido:

* **Despliegue Independiente (Docker & Traefik v3.3):** Cada microservicio o worker (ej. procesadores de BullMQ, bots de mensajería, adaptadores de integración) se empaqueta en su propio contenedor Docker. Puedes alojar el Core en un VPS principal de Hetzner y correr microservicios específicos en servidores secundarios.
* **Conexión Perimetral:** Para comunicarse con otros servidores, los microservicios únicamente necesitan acceso a:
  * La instancia compartida de **Redis** (para la recepción de eventos/colas).
  * Los endpoints REST/Webhooks protegidos por el interceptor de seguridad dual (`JWT` / `x-api-key`).
  * Las reglas de enrutamiento dinámico gestionadas en el perímetro por **Traefik v3.3** y **Cloudflare**.
* **Escalabilidad Horizontal hacia v2.0:** Esta separación física es el paso previo que permitirá migrar sin fricción desde Docker Compose hacia orquestación con Kubernetes (K8s) cuando se requiera escalar nodos o clusters independientes por región o cliente Enterprise.

