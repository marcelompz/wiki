# Monitorización y Alertas — OrderFlow

**Estado:** Diseño  
**Versión:** v1.10.0+  
**Objetivo:** Definir el stack de monitoreo, métricas clave y reglas de alerta para cumplir con el SLA.

---

## 1. Stack de Monitorización

### 1.1 Componentes

| Componente | Propósito | Alternativa |
|------------|-----------|-------------|
| **Prometheus** | Recolección de métricas (CPU, memoria, HTTP latency) | Datadog, New Relic |
| **Grafana** | Dashboards y visualización | — |
| **Alertmanager** | Gestión y enrutamiento de alertas | — |
| **cAdvisor** | Métricas de contenedores Docker | — |
| **Node Exporter** | Métricas del sistema (VPS) | — |
| **Sentry** | Errores del frontend y backend | — |
| **Uptime Kuma** | Monitoreo externo de endpoints | Better Uptime, Pingdom |

### 1.2 Arquitectura

```
┌─────────────────────────────────────────────┐
│              VPS Production                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Backend  │  │Frontend  │  │  Odoo    │  │
│  │ :3010    │  │ :3011    │  │ :8069    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │         │
│  ┌────▼─────────────▼─────────────▼─────┐   │
│  │      cAdvisor + Node Exporter        │   │
│  └──────────────────┬──────────────────┘   │
│                     │ scrape               │
│  ┌──────────────────▼──────────────────┐   │
│  │         Prometheus                   │   │
│  │  (almacenamiento de métricas)        │   │
│  └──────────────────┬──────────────────┘   │
│                     │                      │
│  ┌──────────────────▼──────────────────┐   │
│  │         Grafana                      │   │
│  │  (dashboards)                        │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│  Alertmanager   │
│  (email, Slack) │
└─────────────────┘
```

---

## 2. Métricas Clave

### 2.1 Infraestructura

| Métrica | Descripción | Umbral |
|---------|-------------|--------|
| `node_cpu_usage` | Uso de CPU del VPS | > 80% |
| `node_memory_available` | Memoria disponible | < 2GB |
| `node_disk_usage` | Uso de disco | > 85% |
| `container_cpu_usage` | CPU por contenedor | > 70% |
| `container_memory_usage` | Memoria por contenedor | > 80% |

### 2.2 Aplicación (Backend)

| Métrica | Descripción | Umbral |
|---------|-------------|--------|
| `http_request_duration_seconds` | Latencia P95 de requests | > 500ms |
| `http_requests_total` | Tasa de requests por segundo | > 1000 req/s |
| `http_requests_failed_total` | Tasa de errores HTTP 5xx | > 5% |
| `websocket_connections_active` | Conexiones WebSocket activas | > 500 |
| `prisma_query_duration_seconds` | Latencia de queries a DB | > 100ms |
| `order_creation_total` | Throughput de creación de pedidos | — |

### 2.3 Aplicación (Frontend)

| Métrica | Descripción | Umbral |
|---------|-------------|--------|
| `js_errors_total` | Errores JS en consola | > 10/hora |
| `page_load_duration` | Tiempo de carga de página | > 3s |
| `api_call_failures` | Fallos en llamadas a API | > 5% |

---

## 3. Reglas de Alerta

### 3.1 Alertas Críticas

```yaml
groups:
  - name: critical
    rules:
      - alert: HighCPU
        expr: node_cpu_usage > 80
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "CPU alto en {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"

      - alert: HighMemory
        expr: node_memory_available < 2GB
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Memoria baja en {{ $labels.instance }}"

      - alert: HighErrorRate
        expr: rate(http_requests_failed_total[5m]) > 0.05
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Tasa de error HTTP > 5%"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL no disponible"
```

### 3.2 Alertas de Advertencia

```yaml
  - name: warning
    rules:
      - alert: SlowAPI
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API lenta (P95 > 500ms)"

      - alert: DiskSpaceLow
        expr: node_disk_usage > 85
        for: 10m
        labels:
          severity: warning
```

---

## 4. Dashboards

### 4.1 Dashboard de Infraestructura

- CPU, memoria, disco por VPS
- Red: ancho de banda, conexiones
- Contenedores: estado, restart count, logs recientes

### 4.2 Dashboard de Aplicación

- Request rate, error rate, latencia (RED method)
- Top 10 endpoints más lentos
- WebSocket connections activas
- Queue de jobs (si se implementa BullMQ)

### 4.3 Dashboard de Base de Datos

- Conexiones activas
- Queries más lentas
- Tamaño de tablas principales
- Replicación lag (si aplica)

---

## 5. Notificaciones

### 5.1 Canales

| Severidad | Canal | Responsable |
|-----------|-------|-------------|
| **Critical** | SMS + Email + Slack | On-call SRE |
| **Warning** | Slack + Email | Support Lead |
| **Info** | Email diario | Tech Lead |

### 5.2 Configuración de Alertmanager

```yaml
route:
  receiver: 'default'
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@orderflow.dev'
        from: 'alerts@orderflow.dev'
        smarthost: smtp.gmail.com:587
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#orderflow-alerts'
```

---

## 6. Implementación

### Fase 1 (v1.10.0)

- [ ] Desplegar Prometheus + Grafana + Alertmanager en Docker Compose
- [ ] Configurar exportadores: cAdvisor, Node Exporter
- [ ] Crear dashboards básicos (infraestructura + aplicación)
- [ ] Configurar alertas críticas

### Fase 2 (v1.11.0)

- [ ] Integrar Sentry para errores de frontend/backend
- [ ] Configurar Uptime Kuma para monitoreo externo
- [ ] Definir runbook de respuesta a alertas

---

## 7. Runbook de Respuesta

**CPU > 80% por 5 minutos:**
1. Verificar qué proceso consume CPU (`top`, `htop`)
2. Si es un query lento, revisar logs de Prisma
3. Si es tráfico inusual, considerar escalar réplicas
4. Si es un loop infinito, identificar y mitigar

**Memoria < 2GB disponible:**
1. Verificar memoria por contenedor (`docker stats`)
2. Identificar memory leak
3. Reiniciar contenedor afectado si es necesario
4. Considerar aumentar RAM del VPS

**Tasa de error HTTP > 5%:**
1. Revisar logs del backend (`docker logs orderflow-backend`)
2. Identificar endpoint problemático
3. Rollback del último deploy si es reciente
4. Abrir incidente en canal de Slack

**PostgreSQL no disponible:**
1. Verificar estado del contenedor: `docker ps | grep postgres`
2. Verificar logs: `docker logs orderflow-postgres`
3. Si es disco lleno, limpiar logs antiguos
4. Si es corrupción, iniciar restauración desde backup
