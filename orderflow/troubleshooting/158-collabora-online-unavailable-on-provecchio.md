# Troubleshooting #158 — Causa raíz: Collabora Online no disponible en Provecchio

## Fecha
2026-09-23

## Síntoma
En `/admin/documents` se mostraba el error:
**"Collabora Online service is currently unavailable"**

Al intentar abrir la sesión de edición, el backend respondía con `HttpStatus.SERVICE_UNAVAILABLE` y el frontend mostraba un mensaje de error que interrumpía el flujo.

---

## Diagnóstico

### Capa de infraestructura
- No existía ningún contenedor `collabora_online` corriendo en Provecchio.
- No había ruta en Traefik para `office.provecchio.com`.
- El backend usaba `COLLABORA_URL=https://office.provecchio.com` y el chequeo `GET /hosting/discovery` devolvía **HTTP 502 Bad Gateway**.
- Sin servicio real, `WopiService.getViewerStatus()` devolvía `available: false` en todo momento.

### Capa de aplicación OmniFlow
- El módulo `documents` no estaba instalado para el tenant `provecchio-dimora-001` en `module_installations`, por lo que la página Documents no tenía contexto de configuración válido.

---

## Causa raíz consolidada

1. **Collabora Online no estaba desplegado** en Provecchio a pesar de tener la configuración lista en `/srv/collabora/` (docker-compose, `.env`, README).
2. **Traefik no enrutaba tráfico** hacia `office.provecchio.com` porque el contenedor no existía.
3. **El módulo `documents` no estaba instalado** para el tenant activo, así que el flujo de Documents quedaba degradado desde el arranque.

---

## Solución aplicada

### Infraestructura
- Levantado el stack Collabora Online desde `/srv/collabora/docker-compose.yml`:
  - Contenedor `collabora_online` corriendo con `collabora/code:latest`.
  - Red Docker `traefik-public` compartida con Traefik.
  - Traefik cargó `dynamic/collabora.yml` y expuso `https://office.provecchio.com`.
- Verificado `GET https://office.provecchio.com/hosting/discovery` → **HTTP 200**.
- Verificado acceso desde backend OrderFlow al discovery endpoint → **OK**.

### Base de datos
- Instalado el módulo `documents` para `provecchio-dimora-001` en `module_installations`.

### Frontend
- Ajustado el manejo de error en `documents.tsx`:
  - Ahora distingue el error específico de indisponibilidad de Collabora.
  - Muestra un `warning` en vez de cortar el flujo.
  - Mantiene el modal abierto con mensaje claro para que el usuario pueda seguir trabajando con el documento desde la lista.

---

## Estado actual
- Collabora Online: **UP / healthy** en Provecchio.
- Traefik: **ruta `office.provecchio.com` activa**.
- Backend OrderFlow: **descubrimiento WOPI OK**.
- Módulo Documents: **instalado y activo** para el tenant.
- Frontend Documents: **manejo graceful** de indisponibilidad de Collabora.

## Known limitation
- `cool.html` puede emitir warnings CSP/telemetry internos de CODE, por ejemplo intentos de carga de `https://static.cloudflareinsights.com/beacon.min.js` bloqueados por el CSP interno de Collabora.
- Esto es comportamiento de la imagen `collabora/code` y no se puede apagar desde OmniFlow ni desde `/srv/collabora` con la configuración actual.
- No afecta la funcionalidad WOPI; es ruido de consola.

## Prevención
- Verificar al menos una vez por release que el servicio apuntado por `COLLABORA_URL` responda `/hosting/discovery`.
- Incluir `module_installations` del tenant en el checklist de post-instalación/restauración de producción.
