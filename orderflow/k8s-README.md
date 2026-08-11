# ☸️ GUÍA DE IMPLEMENTACIÓN KUBERNETES & ESCALABILIDAD (OrderFlow v3.0.0 Ready)

## 1. Visión General

Este documento define la estrategia de infraestructura para OrderFlow desde el estado actual (v1.19.0, Docker Compose en Hetzner VPS + Provecchio) hasta la fase de escala masiva planificada para v3.0.0.

**Objetivo:** Mantener operatividad estable en Docker Compose mientras se construye la base para Kubernetes futuro, sin sobre-ingeniería prematura.

---

## 2. Estado Actual de Infraestructura

### 2.1 Stack Producción (Hetzner - ordenflow.provecchio.com)

```yaml
Servicios:
  - orderflow-backend-prod: NestJS API (puerto 3010)
  - orderflow-frontend-prod: Vite SPA (puerto 3011)
  - orderflow-database-1: PostgreSQL 15
  - orderflow-redis-1: Redis 7 (BullMQ + cache)
  - orderflow-odoo-adapter-prod: Node.js adapter Odoo
  - traefik: Reverse proxy + SSL (puertos 80/443)
  - prometheus + grafana + loki + tempo: Observabilidad
```

**Características:**
- Multi-tenant por base de datos compartida + `tenantId`
- SSL automático via Let's Encrypt
- Health checks automáticos
- Backup pre-deploy automático
- Rollback con un comando

### 2.2 Stack Produccción (Provechcio - provecchio.com)

```yaml
Servicios:
  - odoo_web_8085: Odoo 18.0 CE
  - db_odoo_8085: PostgreSQL 15
  - orderflow-odoo-adapter-prod: Node.js adapter Odoo
  - traefik: Reverse proxy + SSL
```

**Paths Canónicos (Post-migración Fase 2):**
```
/srv/odoo-deploy/18/           # docker-compose + config + scripts
/srv/odoo-addons/18/           # addons custom (orderflow_connector, etc.)
/srv/odoo-l10n-py/18/          # localizaciones Paraguay
/srv/odoo-deploy/18/web-data/  # filestore + sesiones Odoo
/srv/odoo-deploy/18/db-data/   # datos PostgreSQL Odoo
```

---

## 3. Estrategia de Escalado

### 3.1 Fase Actual: Docker Compose Optimizado (v1.19.0 → v2.x)

**Stack monolítico compartido:**
- Todos los tenants comparten backend/frontend/database
- Multi-tenancy a nivel de aplicación (`tenantId` en cada query)
- Aprovecha infraestructura existente sin cambios disruptivos

**Ventajas:**
- ✅ Operación probada en producción
- ✅ Costo de infraestructura bajo
- ✅ Deploys simples y rápidos
- ✅ Observabilidad unificada

**Limitaciones:**
- ❌ Escalado horizontal limitado
- ❌ Aislamiento de tenants a nivel de proceso
- ❌ Configuración compartida entre tenants

### 3.2 Fase Futura: Kubernetes (v3.0.0+)

**Condiciones para migrar a K8s:**
1. Volumen de tenants > 50 activos concurrentes
2. Requerimiento de aislamiento por tenant
3. Necesidad de escalado horizontal independiente
4. Deploys por tenant sin afectar otros tenants

**Arquitectura objetivo:**
```yaml
Cluster:
  - namespace: orderflow-core
    - deployment: backend (replicas: 3-5)
    - deployment: frontend (replicas: 2-3)
    - statefulset: postgresql (ha-mode)
    - deployment: redis (cluster-mode)
  
  - namespace: orderflow-tenants
    - deployment: odoo-tenant-a
    - deployment: odoo-tenant-b
    - statefulset: postgresql-tenant-a
    - statefulset: postgresql-tenant-b
  
  - ingress: traefik (IngressController)
  - cert-manager: Let's Encrypt automático
  - prometheus + grafana: Monitoring
```

**Componentes críticos:**
- **Helm Charts** para cada servicio
- **Traefik** como Ingress Controller nativo
- **PostgreSQL Operator** (CrunchyData/Zalando) para DB-per-tenant
- **Redis Cluster** para colas distribuidas
- **Vault** para secrets management
- **ArgoCD/Flux** para GitOps

---

## 4. Patrones de Deploy

### 4.1 Deploy por Versión (Actual)

```bash
# Deploy a producción
./scripts/deploy-production.sh production

# Deploy a Provecchio
./scripts/deploy-production.sh provecchio
```

**Características:**
- Un solo deploy por versión de código
- Afecta a todos los tenants simultáneamente
- Rollback global si hay problema
- Backups automáticos pre-deploy

### 4.2 Deploy por Cliente/Tenant (Futuro)

Para cuando necesites desplegar instancias independientes por cliente de la nube:

**Patrón recomendado:**
```bash
# Estructura de paths
/srv/odoo-deploy/18/                      # template base
/srv/odoo-deploy/18/cliente-a/           # instancia cliente A
/srv/odoo-deploy/18/cliente-b/           # instancia cliente B
/srv/odoo-addons/18/                      # addons compartidos
/srv/odoo-l10n-py/18/                     # localización compartida
```

**Comando de deploy por cliente:**
```bash
# Clonar template base
cp -r /srv/odoo-deploy/18 /srv/odoo-deploy/18/cliente-a

# Configurar .env específico del cliente
cat > /srv/odoo-deploy/18/cliente-a/.env << EOF
WEB_HOST=odoo_cliente_a
WEB_PORT=8090
DB_NAME=cliente_a
WEB_VOLUMES=/srv/odoo-deploy/18/cliente-a/web-data
DB_VOLUMES=/srv/odoo-deploy/18/cliente-a/db-data
# ... resto de configuración
EOF

# Levantar instancia
cd /srv/odoo-deploy/18/cliente-a && docker compose up -d
```

**Ventajas:**
- Aislamiento total entre clientes
- Deploys independientes
- Rollback por cliente sin afectar otros
- Escalado individual

**Consideraciones:**
- Mayor consumo de recursos
- Mayor complejidad operativa
- Necesita monitoreo por instancia

---

## 5. Checklist de Operación

### 5.1 Pre-Deploy

- [ ] Backup de base de datos
- [ ] Backup de archivos estáticos
- [ ] Verificar health check del servicio actual
- [ ] Revisar logs de errores recientes
- [ ] Verificar espacio en disco

### 5.2 Durante Deploy

- [ ] Build de imágenes nuevo
- [ ] Sincronizar código al servidor
- [ ] Migraciones de base de datos
- [ ] Reiniciar servicios en orden
- [ ] Verificar health checks
- [ ] Verificar logs de inicio

### 5.3 Post-Deploy

- [ ] Verificar URLs públicas
- [ ] Ejecutar suite E2E Playwright
- [ ] Verificar métricas de rendimiento
- [ ] Documentar versión desplegada
- [ ] Commitear documentación

---

## 6. Troubleshooting Común

### 6.1 Odoo no inicia después de migración de paths

**Síntoma:** `AssertionError: /var/lib/odoo/sessions: directory is not writable`

**Causa:** Permisos incorrectos en volumen bind mount

**Solución:**
```bash
chown -R 100:101 /srv/odoo-deploy/18/web-data
chmod -R u+rwX,go+rX /srv/odoo-deploy/18/web-data
docker restart odoo_web_8085
```

### 6.2 Traefik retorna 502 para Odoo

**Síntoma:** `502 Bad Gateway` en `https://odoo.provecchio.com`

**Causa:** Traefik y Odoo en redes Docker diferentes

**Solución:**
```bash
docker network connect 18_default traefik
```

### 6.3 Permisos denegados en /srv

**Síntoma:** `mkdir: cannot create directory '/srv/odoo-deploy': Permission denied`

**Causa:** `/srv` owned por root

**Solución:**
```bash
sudo mkdir -p /srv/odoo-deploy/{18,19}
sudo chown -R marcelompz:marcelompz /srv/odoo-deploy
```

---

## 7. Próximos Pasos

1. **Fase 3:** CI/CD por branch con deploy automático
2. **Fase 4:** Probar deploy por cliente en ambiente staging
3. **Fase 5:** Migración a Kubernetes (v3.0.0)

---

## 8. Referencias

- [Plan de Estandarización Odoo](.kilo/plans/1786282353682-odoo-deploy-standardization.md)
- [Documentación Troubleshooting Odoo](docs/troubleshooting/)
- [Scripts de Deploy OrderFlow](../scripts/)
