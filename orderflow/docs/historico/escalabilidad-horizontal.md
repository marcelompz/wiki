# Escalabilidad Horizontal — OrderFlow

**Estado:** Diseño  
**Versión:** v1.10.0+  
**Objetivo:** Definir la estrategia para escalar el backend NestJS y los microservicios standalone más allá de un solo VPS.

---

## 1. Contexto

Actualmente, OrderFlow se despliega en un solo VPS Hetzner con Docker Compose. A medida que crece el número de tenants y la carga de requests, el cuello de botella se traslada al proceso único de NestJS y a la conexión única a PostgreSQL.

Esta documentación define la estrategia para escalar horizontalmente sin perder la simplicidad operativa actual.

---

## 2. Arquitectura Objetivo

```
                    ┌─────────────────┐
                    │   Traefik v3.4  │
                    │  (Load Balancer)│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
       │  Backend #1 │ │ Backend #2 │ │  Backend #3 │
       │  NestJS     │ │ NestJS     │ │  NestJS     │
       │  :3010      │ │  :3010     │ │   :3010     │
       └──────┬──────┘ └────┬─────┘ └──────┬──────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │  PostgreSQL 15  │
                    │  (Primary +     │
                    │   Read Replica) │
                    └─────────────────┘
```

---

## 3. Estrategia de Escalado

### 3.1 Backend NestJS (API Core)

**Enfoque:** Réplicas idénticas detrás de Traefik.

- Traefik ya funciona como reverse proxy; solo necesita un backend con múltiples réplicas.
- Docker Compose (`docker-compose.prod.yml`) debe definir un `deploy.replicas` para el servicio `backend`.
- Sesiones sin estado: el JWT es almacenado en el cliente, no en sesión de servidor.

**Cambios necesarios:**

```yaml
# docker-compose.prod.yml (futuro)
services:
  backend:
    build: ./backend
    deploy:
      replicas: 3
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
```

**WebSockets (OrdersGateway):**  
El gateway de WebSockets requiere un adapter store compartido. Usar `@nestjs/websockets` con `RedisIoAdapter`:

```ts
// backend/src/main.ts
import { RedisIoAdapter } from './common/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redisIoAdapter = new RedisIoAdapter(app);
  app.useWebSocketAdapter(redisIoAdapter);
}
```

El adapter usa Redis para sincronizar eventos entre instancias de NestJS.

### 3.2 Microservicios Standalone

Cada standalone (`giveaways-standalone`, `whatsapp-catalog-standalone`, etc.) ya tiene su propio subdominio y servicio en Docker Compose. El escalado es simplemente incrementar réplicas por servicio:

```yaml
services:
  whatsapp-catalog-standalone:
    deploy:
      replicas: 2
```

Traefik balancea automáticamente entre réplicas.

### 3.3 Base de Datos

**Fase 1 — Read Replica:**

- Configurar una réplica de lectura en PostgreSQL 15.
- El backend envía queries de lectura a la réplica y writes al primary.
- Usar ` PrismaService` con soporte multi-database:

```ts
// backend/src/common/prisma.service.ts
@Injectable()
export class PrismaService {
  private readClient: PrismaClient;

  onModuleInit() {
    this.readClient = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL_READ_REPLICA } }
    });
  }

  getReadClient() {
    return this.readClient;
  }
}
```

**Fase 2 — DB-per-tenant (enterprise):**  
Ya soportado para tenants dedicados (`isolationTier: 'dedicated'`). Escalar tenants enterprise moviéndolos a su propio servidor PostgreSQL.

---

## 4. Configuración de Traefik

Traefik ya balancea entre contenedores Docker. Solo requiere:

1. **Docker Network compartido:** Todos los servicios backend en la misma network.
2. **Health checks:** Agregar `HEALTHCHECK` en cada servicio para que Traefik detecte instancias unhealthy.
3. **Rate limiting:** Usar Traefik middlewares para limitar requests por IP.

```yaml
# docker-compose.prod.yml
services:
  backend:
    build: ./backend
    labels:
      - "traefik.enable=true"
      - "traefik.http.services.backend.loadbalancer.healthcheck.path=/health"
      - "traefik.http.services.backend.loadbalancer.healthcheck.interval=10s"
```

---

## 5. Métricas de Autoescalado

Definir reglas para escalar automáticamente (usando Docker Swarm o Kubernetes):

| Métrica | Umbral | Acción |
|---------|--------|--------|
| CPU por instancia | > 70% por 2 min | Agregar réplica |
| Memoria por instancia | > 80% por 2 min | Agregar réplica |
| Latencia P95 | > 500ms por 1 min | Agregar réplica |
| Conexiones WebSocket | > 500 por instancia | Agregar réplica |

Para Docker Swarm: usar `docker service scale orderflow-backend=5`.

Para Kubernetes: definir `HorizontalPodAutoscaler` con estos umbrales.

---

## 6. Sesiones y Estado Compartido

- **JWT:** Almacenado en el cliente (localStorage). Sin estado en servidor.
- **Cache de disponibilidad (bookings):** Ya usa Redis compartido (`BookingsCacheService`).
- **Rate limiting:** Implementar con `@nestjs/throttler` + Redis store compartido.
- **Uploads de archivos:** Almacenar en `/uploads/{tenantId}/` montado como volumen compartido (NFS o S3).

---

## 7. Plan de Migración

1. **v1.10.0:** Documentar estrategia (este documento) + agregar `RedisIoAdapter` para WebSockets.
2. **v1.11.0:** Implementar read replica de PostgreSQL + health checks en Docker Compose.
3. **v2.0.0:** Migrar a Kubernetes (Helm charts) con autoescalado horizontal completo.

---

## 8. Referencias

- NestJS scalability: https://docs.nestjs.com/recipes/socket-io
- PostgreSQL streaming replication: https://www.postgresql.org/docs/15/warm-standby.html
- Traefik load balancing: https://doc.traefik.io/traefik/providers/docker/
