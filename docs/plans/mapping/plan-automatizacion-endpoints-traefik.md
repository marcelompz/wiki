# Plan de Automatización de Gestión de Endpoints — Traefik / Deploy Manager

## 1. Diagnóstico consolidado

| Componente | Estado | Detalle |
|---|---|---|
| Traefik provider | ⚠️ Solo `file` | No hay provider `docker`; los labels `traefik.*` en cualquier compose no tienen efecto salvo el que ya lee `dynamic/services.yml` |
| `dynamic/services.yml` | ✅ Existe | Solo enrutamiento base (frontend/backend/webhook globales + Odoo) |
| `dynamic/deploy-manager/` | ❌ No existe en el servidor | Se crea recién cuando corre el primer despliegue de tenant — nunca corrió |
| `backend/src/deploy-manager/` | ✅ Existe | Genera YAML por tenant (`traefik-config.service.ts`) y escribe el archivo (`traefik-client.service.ts`) |
| Recarga de Traefik | ⚠️ Redundante/no verificado | El código hace `docker kill -s HUP traefik`, pero `traefik.yml` ya tiene `watch: true` en el provider `file` — debería recargar solo. Falta confirmar cuál de los dos mecanismos está realmente disparando la recarga, y qué pasa si el `HUP` falla silenciosamente |
| homepage-builder / qr-generator | ⚠️ No confirmado | Son módulos dentro de `frontend/` y `backend/src/qr/`, pero no está confirmado que disparen `deploy-manager.service.ts` al crear un recurso nuevo |
| Ciclo de vida (delete/update) | ❓ Desconocido | No hay evidencia de que se borre el YAML de un tenant al darlo de baja, ni de manejo de colisión de subdominios |
| Redes Docker | ⚠️ Parcial | Los servicios `*_standalone` (biolinks, whatsapp_catalog, etc.) solo están en `orderflow-network`, no en `traefik-public` |
| Observabilidad | ⚠️ Sin integrar | Ya existe stack Loki/Tempo/Grafana en `docker-compose.observability.yml`, pero no hay evidencia de que el Deploy Manager loguee ahí ni de alertas si un router falla o si ACME falla |

**Conclusión:** el problema no es diseñar el mecanismo desde cero — ya existe. El problema es que nunca se puso en marcha end-to-end en producción, y no hay garantías de robustez (colisiones, borrado, fallos de reload, observabilidad).

---

## 2. Objetivo

Automatizar por completo la creación, actualización y eliminación de endpoints dinámicos (subdominios de tenant, homepages, QR) en Traefik, de forma segura, idempotente y observable — sin intervención manual sobre `dynamic/services.yml` ni reinicios manuales de Traefik.

---

## 3. Plan por fases

### Fase 0 — Bootstrap de infraestructura
- Crear `/srv/traefik/dynamic/deploy-manager/` en el servidor con los permisos correctos (`chown 1000:1000` o el UID que corra el backend).
- Confirmar que el volumen del backend (`/srv/traefik/dynamic/deploy-manager:/opt/traefik-orderflow/dynamic/deploy-manager:rw`) y el de Traefik (`./dynamic:/etc/traefik/dynamic:ro`) apuntan al **mismo path físico** en el host (verificar dónde vive realmente el compose de Traefik).
- Correr un despliegue de prueba con un tenant dummy y confirmar en `docker logs traefik` que la ruta aparece.

### Fase 1 — Endurecer el generador de YAML
- Validar el YAML generado contra un schema antes de escribirlo (evitar que un error de datos tumbe el reload de Traefik entero — un solo archivo dinámico corrupto puede invalidar todo el provider `file`).
- Escritura atómica: escribir a un archivo temporal y hacer `rename()`, no escribir directo sobre el archivo final (evita que Traefik lea un YAML a medio escribir).
- Sanitizar `tenant.slug`/subdominio para evitar colisión de nombres de router/service y para evitar inyección en el `Host()` rule.
- Confirmar mecanismo único de reload: si `watch: true` ya recarga solo, eliminar el `docker kill -s HUP` (una fuente de reload, no dos) — o al revés, si el watch no es confiable en el entorno, quedarse solo con el HUP explícito y loguear su resultado.

### Fase 2 — Ciclo de vida completo
- Implementar `deleteTenantConfig(tenantId)` que borre el archivo YAML correspondiente al dar de baja/desactivar un tenant.
- Implementar `updateTenantConfig` idempotente (mismo nombre de archivo/router al actualizar, no acumular archivos huérfanos).
- Job de reconciliación periódico: comparar tenants activos en la base de datos contra los archivos en `deploy-manager/` y loguear (o corregir) discrepancias.

### Fase 3 — Integrar homepage-builder y qr-generator
- Confirmar si estos módulos ya llaman a `deploy-manager.service.ts` al crear un recurso, o si necesitan una nueva rama del generador (por ejemplo, un router por homepage/QR en vez de por tenant completo, si van a tener su propio subdominio o path).
- Si comparten el mismo patrón de tenant/subdominio, reusar `generateTenantConfig`; si no, extender el Deploy Manager con un segundo tipo de recurso (`generateResourceConfig(type: 'homepage' | 'qr', ...)`) siguiendo el mismo esquema de router+service+middleware.

### Fase 4 — Observabilidad
- Loguear cada escritura/borrado de config dinámica hacia Loki (éxito, error, tenant afectado).
- Alerta en Alertmanager si: un archivo se escribe pero Traefik no confirma la ruta en N segundos, o si ACME falla para un nuevo dominio.
- Dashboard en Grafana: cantidad de endpoints activos, últimos cambios, errores de despliegue.

### Fase 5 — Testing y rollback
- Script de verificación end-to-end: crear tenant de prueba → confirmar router en Traefik API (`:8083/api/http/routers`) → `curl -H "Host: ..."` → destruir tenant → confirmar que el router desaparece.
- Plan de rollback: mantener backup versionado de `deploy-manager/` (git o snapshot) antes de cada cambio masivo.

---

## 4. Prompt de implementación técnica

```
Contexto: Backend NestJS (backend/src/deploy-manager/) que genera configuración
dinámica de Traefik v3 (provider "file", directory /etc/traefik/dynamic, watch: true)
para habilitar subdominios por tenant. El mecanismo ya existe pero nunca se
inicializó en producción y tiene gaps de robustez.

Archivos relevantes:
- backend/src/deploy-manager/deploy-manager.service.ts
- backend/src/deploy-manager/handlers/traefik/traefik-config.service.ts
- backend/src/deploy-manager/handlers/traefik/traefik-client.service.ts

Tareas a implementar, en este orden:

1. Añadir escritura atómica de archivos YAML en traefik-client.service.ts
   (escribir a .tmp + rename), con validación de schema antes de escribir.

2. Sanitizar cualquier valor que entre en un `Host()` rule o en nombres de
   router/service (slug del tenant) para evitar colisiones e inyección de
   reglas Traefik.

3. Implementar deleteTenantConfig(tenantId) y hacerlo idempotente: no debe
   fallar si el archivo ya no existe.

4. Confirmar y dejar un único mecanismo de reload (watch:true del provider
   file, o el kill -s HUP explícito) — eliminar el redundante, y loguear el
   resultado del reload (éxito/fallo) hacia el logger existente del proyecto.

5. Agregar un job de reconciliación (cron o BullMQ, dado que el proyecto ya
   usa Redis/BullMQ) que compare tenants activos en Prisma contra los
   archivos presentes en /opt/traefik-orderflow/dynamic/deploy-manager y
   corrija o reporte discrepancias.

6. Extender generateTenantConfig (o crear generateResourceConfig) para
   soportar los recursos generados por homepage-builder y qr-generator,
   siguiendo el mismo patrón de router+service+middleware ya usado para
   tenants.

7. Escribir un script de verificación end-to-end (puede ser un comando npm
   o un test e2e) que: cree un tenant de prueba, espere N segundos, consulte
   la Traefik API (http://traefik:8080/api/http/routers) para confirmar que
   el router aparece, haga un curl con Host header simulado, borre el tenant,
   y confirme que el router desaparece.

Restricciones:
- No introducir el provider docker de Traefik (se mantiene el patrón file-based
  ya elegido).
- Mantener compatibilidad con el formato de YAML ya usado en
  dynamic/services.yml (mismo estilo de routers/services/middlewares).
- No modificar dynamic/services.yml a mano — todo cambio dinámico debe pasar
  por deploy-manager.
```
