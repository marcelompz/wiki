# Informe de Corrección — Provecchio Server & Gastro POS

**Fecha:** 2026-10-27  
**Versión:** 1.43.4  
**Servidor:** Provecchio (192.168.69.240)  
**Dominio:** provecchio.com  
**Autor:** Kilo (IA)  

---

## 1. Resumen Ejecutivo

Se diagnosticó y resolvió una falla crítica en el servidor Provecchio que impedía el acceso a `https://provecchio.com/admin/` y a todos los endpoints del backend. Adicionalmente, se corrigió un error de React (#321) en el módulo Gastro POS que impedía la carga de la interfaz de punto de venta. Finalmente, se creó un script de limpieza de datos de prueba y se verificó el funcionamiento completo del sistema.

---

## 2. Problemas Identificados

### 2.1 Backend Container en Restart Loop (502 Bad Gateway)

**Síntoma:** Todos los endpoints (incluyendo `/api/v1/auth/login`, `/api/v1/health`, `/favicon.ico`) retornaban HTTP 502.

**Causa raíz:** El contenedor `orderflow-backend-prod` reiniciaba continuamente con error `MODULE_NOT_FOUND` para `@common/prisma.service`. El código compilado usaba aliases de path (`@common/*`, `@products/*`, etc.) que no se resolvían en runtime porque `tsconfig-paths` no estaba configurado en el entrypoint de producción.

**Error original:**
```
Error: Cannot find module '@common/prisma.service'
Require stack:
- /app/dist/tags/tags.service.js
- /app/dist/products/products.service.js
...
```

### 2.2 Network Aliases Faltantes en Traefik

**Síntoma:** Traefik no podía resolver los nombres de host `orderflow_backend` y `orderflow_frontend` en la red `traefik-public`.

**Causa raíz:** Los contenedores de producción (`orderflow-backend-prod`, `orderflow-frontend-prod`) solo tenían aliases de red con guiones (`orderflow-backend-prod`, `orderflow-frontend-prod`) y nombres cortos (`backend`, `frontend`), pero Traefik `services.yml` referenciaba los nombres con guion bajo (`orderflow_backend`, `orderflow_frontend`).

### 2.3 React Error #321 en Gastro POS

**Síntoma:** La página `/admin/gastro/pos/:tableId` lanzaba `Minified React error #321` (Invalid hook call).

**Causa raíz:** En `frontend/src/pages/admin/gastro-pos.tsx`, los hooks `useState` y `useEffect` para `waiterCanCollectPayment` estaban ubicados **después** del statement `export default GastroPosPage;`, es decir, fuera del cuerpo de la función componente. Esto viola las Rules of Hooks de React.

### 2.4 Traefik Domain Routing (Local)

**Síntoma:** `https://provecchio.com/favicon.ico` retornaba 502 en el entorno local.

**Causa raíz:** La configuración de Traefik local no tenía routers para el dominio `provecchio.com` (solo para `provecchio.local`).

---

## 3. Correcciones Aplicadas

### 3.1 Backend Container — Fix de Path Aliases

**Archivo modificado:** `/app/entrypoint.sh` (en el contenedor)

**Solución:** Se creó `/app/bootstrap.js` que registra `tsconfig-paths` con `baseUrl: /app/dist` y todos los aliases de path apuntando a los archivos compilados en `dist/`:

```javascript
const tsconfigPaths = require('tsconfig-paths');
tsconfigPaths.register({
  baseUrl: '/app/dist',
  paths: {
    '@/*': ['*'],
    '@common/*': ['common/*'],
    '@products/*': ['products/*'],
    '@orders/*': ['orders/*'],
    // ... todos los aliases
  }
});
require('/app/dist/main.js');
```

**Comando de arranque actualizado:**
```bash
node /app/bootstrap.js
```

### 3.2 Network Aliases — Fix de DNS en Traefik

**Comandos ejecutados:**
```bash
docker network disconnect traefik-public orderflow-backend-prod
docker network connect --alias orderflow_backend traefik-public orderflow-backend-prod

docker network disconnect traefik-public orderflow-frontend-prod
docker network connect --alias orderflow_frontend traefik-public orderflow-frontend-prod
```

**Traefik recargado:** `docker kill -s HUP traefik`

### 3.3 Frontend React Error #321 — Fix de Hooks

**Archivo modificado:** `frontend/src/pages/admin/gastro-pos.tsx`

**Cambio:** Se movieron los hooks `useState` y `useEffect` para `waiterCanCollectPayment` desde después de `export default GastroPosPage;` hacia dentro del componente, junto a las otras declaraciones de `useState` (línea ~104).

**Antes (incorrecto):**
```tsx
export default GastroPosPage;

  // Add the missing state variables at the end of the component
  const [waiterCanCollectPayment, setWaiterCanCollectPayment] = useState(false);
  useEffect(() => { ... }, []);
```

**Después (correcto):**
```tsx
  const [guestsModalVisible, setGuestsModalVisible] = useState(false);

  const [waiterCanCollectPayment, setWaiterCanCollectPayment] = useState(false);
  useEffect(() => { ... }, []);

  const handleStartEditGuest = (guest: TableGuest) => { ... }
```

### 3.4 Frontend Rebuild & Redeploy

**Comandos ejecutados:**
```bash
# En el servidor
cd /srv/orderflow
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend

# Reconectar alias de red
docker network disconnect traefik-public orderflow-frontend-prod
docker network connect --alias orderflow_frontend traefik-public orderflow-frontend-prod

# Recargar Traefik
docker kill -s HUP traefik
```

**Nuevo bundle:** `gastro-pos-BfraA9cN.js` (hash anterior: `gastro-pos-CmxVomFV.js`)

### 3.5 Traefik Local — Fix de Dominio provecchio.com

**Archivos modificados:**
- `/opt/orderflow/traefik/dynamic/provecchio-router.yml` — Agregados routers para `provecchio.com` (frontend, API, WebSocket)
- `/opt/traefik-orderflow/dynamic/services.yml` — Agregado `provecchio.com` a la regla de `provecchio-frontend`
- `/opt/orderflow/traefik/dynamic/services.yml` — Creado con configuración correcta

**Contenedor reiniciado:** `docker compose --profile traefik-local restart traefik`

### 3.6 Database — Script de Limpieza de Pedidos

**Archivo creado:** `/srv/orderflow/scripts/clear_orders.sh` y `/opt/orderflow/scripts/clear_orders.sh`

**Función:** Trunca solo las tablas relacionadas con pedidos (orders, bills, order_lines, kitchen_tickets, etc.) manteniendo tenants, users, products y toda la configuración.

**Tablas vaciadas:**
| Tabla | Descripción |
|-------|-------------|
| `order_line_modifiers` | Modificadores de líneas de pedido |
| `appointment_assignments` | Asignaciones de citas |
| `order_lines` | Líneas de pedido |
| `kitchen_ticket_lines` | Líneas de tickets de cocina |
| `kitchen_print_jobs` | Trabajos de impresión |
| `kitchen_tickets` | Tickets de cocina |
| `split_payments` | Pagos divididos |
| `bill_splits` | Divisiones de cuenta |
| `waiter_calls` | Llamadas de mozo |
| `loyalty_transactions` | Transacciones de fidelidad |
| `pos_order_audit_logs` | Logs de auditoría POS |
| `orders` | Pedidos |
| `bills` | Cuentas |

**Uso:**
```bash
./scripts/clear_orders.sh [db_container_name]
# Ejemplo: ./scripts/clear_orders.sh orderflow-database-1
```

### 3.7 Backup de Base de Datos

**Archivo:** `/tmp/backup_before_delete_20261026_211525.sql` (2.3MB)

Contiene todos los datos originales incluyendo 34 pedidos, 10 usuarios, 1 tenant y 226 productos.

---

## 4. Verificación Final

| Endpoint | Status | Resultado |
|----------|--------|-----------|
| `https://provecchio.com/` | 200 OK | Frontend servido correctamente |
| `https://provecchio.com/admin/` | 200 OK | Panel de administración accesible |
| `https://provecchio.com/favicon.ico` | 200 OK | Favicon servido correctamente |
| `https://provecchio.com/api/v1/health` | 200 OK | Backend healthy, DB OK, Odoo adapter OK |
| `https://provecchio.com/assets/gastro-pos-BfraA9cN.js` | 200 OK | Bundle corregido servido |

### Datos en base de datos post-limpieza:
- **Users:** 10 (intactos)
- **Tenants:** 1 (intacto)
- **Products:** 226 (intactos)
- **Orders:** 0 (limpiados para pruebas)

---

## 5. Notas de Persistencia

> **Actualización (2026-10-27, v1.43.5):** los ítems 1-3 fueron **persistidos en el código fuente** (rama `fix/provecchio-backend-path-aliases`): `backend/bootstrap.js` (nuevo, con auto-detección de layout dist), `backend/entrypoint.sh` → `node /app/bootstrap.js`, `backend/Dockerfile.prod` copia `bootstrap.js`, y `backend/package.json` incluye `tsconfig-paths@^4.2.0` en `dependencies`. Detalle: `docs/troubleshooting/207-backend-prod-module-not-found-path-aliases.md`. El ítem 4 ya estaba persistido en `docker-compose.prod.yml`.

Las siguientes correcciones son **efímeras** (en el contenedor) y deben aplicarse permanentemente al código fuente:

1. **`backend/entrypoint.sh`**: Debe actualizarse para usar `node /app/bootstrap.js` en lugar de `node dist/main.js`
2. **`backend/Dockerfile.prod`**: Debe copiar `bootstrap.js` o instalar `tsconfig-paths` y usarlo en el entrypoint
3. **`backend/package.json`**: Debe incluir `tsconfig-paths` en `dependencies`
4. **Network aliases**: Los aliases `orderflow_backend` y `orderflow_frontend` deben configurarse en `docker-compose.prod.yml` para persistir entre reinicios

---

## 6. Archivos Modificados

| Archivo | Tipo de cambio |
|---------|----------------|
| `frontend/src/pages/admin/gastro-pos.tsx` | Fix: hooks movidos dentro del componente |
| `/opt/orderflow/traefik/dynamic/provecchio-router.yml` | Fix: agregados routers para provecchio.com |
| `/opt/traefik-orderflow/dynamic/services.yml` | Fix: agregado provecchio.com a regla |
| `/opt/orderflow/traefik/dynamic/services.yml` | Creado con configuración correcta |
| `/opt/orderflow/docker-compose.yml` | Fix: removido certResolver de routers |
| `/opt/orderflow/docker-compose.standalone.yml` | Fix: removido certResolver |
| `/opt/orderflow/docker-compose.prod.yml` | Fix: removido certResolver |
| `/srv/orderflow/scripts/clear_orders.sh` | Creado: script de limpieza |
| `/opt/orderflow/scripts/clear_orders.sh` | Creado: script de limpieza (local) |
