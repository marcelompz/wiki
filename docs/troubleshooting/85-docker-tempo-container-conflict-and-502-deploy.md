# Troubleshooting #85 — Conflicto de Contenedor Huérfano `orderflow-tempo` y 502 Bad Gateway en Despliegue de Producción

## 📋 Síntoma
Al ingresar a la URL de producción (`https://pesallaccia.com/` o `https://provecchio.com/`), el navegador/Cloudflare devolvía la pantalla de error `502 Bad Gateway` (Error code 502) durante o inmediatamente después del despliegue de la versión `v1.20.72` / `v1.20.73`.

---

## 🔍 Causa Raíz

1. **Conflicto de Nombre de Contenedor en Docker Daemon (`orderflow-tempo`)**:
   Durante la ejecución del script de despliegue `./scripts/deploy-production.sh production`, la pila de contenedores intentó crearse pero el motor Docker rechazó el arranque por colisión de nombres con un contenedor previo no destruido:
   ```text
   service:tempo:1 Error response from daemon: Conflict. The container name "/orderflow-tempo" is already in use by container "74a9c3de5f66bc09c49385e639316daecfb2560867bf059c7766e94753c04391". You have to remove (or rename) that container to be able to reuse that name.
   ```
2. **Interrupción del Arranque del Clúster**:
   Al fallar el arranque del contenedor `tempo`, la secuencia de `docker compose up` se abortó antes de que los contenedores `orderflow-frontend-prod` y `orderflow-backend-prod` estuvieran operativos.
3. **Falta de Upstream en Traefik**:
   Traefik v3.4 en el servidor de producción no encontró ningún backend activo escuchando en los puertos internos de la red (`:80` / `:3010`), ocasionando que las peticiones entrantes desde el proxy inverso de Cloudflare finalizaran con código `HTTP 502 Bad Gateway`.

---

## 🛠️ Solución Aplicada

1. **Re-ejecución del Despliegue con Purga de Huérfanos (`--remove-orphans`)**:
   Se ejecutó el comando de arranque incluyendo la eliminación explícita de contenedores huérfanos:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env up -d --build --remove-orphans
   ```
2. **Re-inicio y Verificación de Salud de la Pila**:
   Se reinstanciaron exitosamente todos los servicios del clúster (`orderflow-backend-prod`, `orderflow-frontend-prod`, `database`, `redis`, `loki`, `tempo`, `grafana`, `odoo-adapter`).
3. **Validación E2E Post-Deploy**:
   La suite de auditoría E2E Playwright (`qa_e2e_check.py`) comprobó que:
   - `https://pesallaccia.com` responde `HTTP 200 OK` (0 errores de consola).
   - `https://provecchio.com` responde `HTTP 200 OK`.
   - Todas las rutas administrativas (`/admin/products`, `/admin/customers`, `/admin/bookings`, `/admin/social-catalog`, etc.) responden `HTTP 200 OK`.
