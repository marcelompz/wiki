# 🛠️ Registro de Errores Comunes: Fallo de Emisión Certificados SSL Traefik, Error 502 API & Bucle 301 en Provecchio In-House

**Fecha:** 2026-07-29  
**Módulo / Área:** DevOps / Traefik / SSL / Entornos / NestJS Backend  
**Severidad:** Alta (HTTP 502 Bad Gateway en API y NS_ERROR_REDIRECT_LOOP en `provecchio.com`)  
**Estado:** ✅ **RESUELTO & HOMOLOGADO**  

---

## 1. Descripción del Problema

Al navegar a `https://provecchio.com`, se presentaron tres problemas en cascada durante la puesta a punto:
1. **Error 502 Bad Gateway en recursos estáticos**: `https://provecchio.com` respondía `502 Bad Gateway`.
2. **Error 502 Bad Gateway en endpoints de API**: La raíz cargaba (`200 OK`), pero llamadas como `GET /api/v1/tenants/config/...` y `POST /api/v1/auth/login` devolvían `HTTP/2 502 Bad Gateway`.
3. **Bucle de Redirecciones (`NS_ERROR_REDIRECT_LOOP`)**: El navegador indicaba múltiples redirecciones 301 infinitas al entrar al sitio a través del proxy de Cloudflare.

---

## 2. Causa Raíz

1. **Inconsistencia de Directorios de Traefik**: En Provecchio, el proxy residía en `/srv/traefik-orderflow/` en lugar de la norma del proyecto (`/srv/traefik/`).
2. **Aislamiento de Red Docker (`traefik-public`)**:
   - `orderflow-frontend-prod` no estaba adjunto a `traefik-public`.
   - `orderflow-backend-prod` tampoco estaba conectado a `traefik-public`, impidiendo a Traefik comunicarse con el puerto interno NestJS `3010`.
3. **Bucle Infinito en Entrypoint del Backend (`entrypoint.sh`)**: El contenedor backend ejecutaba una versión desactualizada de `entrypoint.sh` buscando `nc -z orderflow-db-prod 5432` (cuando la base de datos se llama `database` en Compose), dejando al contenedor en bucle sin levantar la aplicación.
4. **Conflicto de SSL/TLS Proxy con Cloudflare (Bucle 301)**: Cloudflare estaba configurado en modo encriptado flexible/full realizando peticiones por HTTP al origen (`:80`). Traefik tenía activada una redirección global rígida `entryPoints.web.http.redirections` a `websecure` (`:443`), forzando una redirección 301 que Cloudflare volvía a reenviar por HTTP en bucle.

5. **Error 502 Bad Gateway en Odoo (`odoo.provecchio.com`)**: Al levantar una nueva instancia de Odoo en `/srv/odoo8085/` (`odoo_web_8085`), el contenedor no estaba conectado a la red Docker `traefik-public`, haciendo que Traefik arrojara `HTTP 502 Bad Gateway`.

---

## 3. Solución Ejecutada y Homologación Realizada

1. **Reestructuración de Carpetas e Integración de Redes**:
   - Se renombró `/srv/traefik-orderflow` a **`/srv/traefik`** en `dimoraserverlocal` (Provecchio).
   - Se conectaron explícitamente `orderflow-frontend-prod`, `orderflow-backend-prod` y `odoo_web_8085` a la red `traefik-public`:
     ```bash
     docker network connect traefik-public orderflow-frontend-prod
     docker network connect traefik-public orderflow-backend-prod
     docker network connect traefik-public odoo_web_8085
     ```

2. **Resolución de Bloqueo en Backend**:
   - Se aplicó la versión homologada de `entrypoint.sh` y se regeneró la base de datos con `npx prisma db push`.
   - Se verificó que el backend inicia y escucha en `http://localhost:3010` retornando `HTTP 200 OK` en `/api/v1/health`.

3. **Eliminación del Bucle 301 con Cloudflare**:
   - Se removió la redirección forzada a nivel de `traefik.yml` en la entrada HTTP `:80`, permitiendo que Traefik atienda solicitudes HTTP y HTTPS sin generar bucles 301 infinitos con el proxy de Cloudflare.

---

## 4. Protocolo de Prevención para Futuras Actualizaciones

1. **Ruta Unificada del Proxy**: En cualquier servidor (Hetzner o Provecchio), Traefik vive **estrictamente en `/srv/traefik`**.
2. **Re-conexión de Redes Post-Deploy**: Al ejecutar scripts de despliegue o al desplegar nuevos servicios como Odoo, asegurar siempre la ejecución de los comandos:
   ```bash
   docker network connect traefik-public orderflow-frontend-prod 2>/dev/null || true
   docker network connect traefik-public orderflow-backend-prod 2>/dev/null || true
   docker network connect traefik-public odoo_web_8085 2>/dev/null || true
   ```
3. **Compatibilidad con Proxy Cloudflare**: Mantener `traefik.yml` sin la redirección global rígida `:80 -> :443` para evitar bucles 301 cuando el dominio pasa a través del proxy naranja de Cloudflare.
4. **Resguardo de Variables de Entorno**: Mantener intactos los archivos `.env` locales en `/srv/traefik/.env` y `/srv/orderflow/.env.prod`.

---

**Firma:** Antigravity AI Engineering Team  
**Archivo:** `docs/troubleshooting/06-provecchio-traefik-ssl-and-502-diagnosis.md`


