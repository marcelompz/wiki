# Troubleshooting & Guía Técnica: Sincronización de Usuarios Odoo y Gestión Multi-Tenant de Módulos App Store

> Guía técnica y de troubleshooting para la igualación bidireccional de usuarios Odoo y la gestión de módulos del App Store por tenant desde el panel SuperAdmin.

---

## 1. Sincronización e Igualación Bidireccional de Usuarios Odoo (`res.users`)

### 🚨 Requisito & Contexto
El cliente requería comparar la lista de usuarios del Tenant en OrderFlow (`user_tenant_access` + `users`) con los usuarios registrados en el ERP Odoo (`res.users` / `res.partner`), clasificándolos en tiempo real y ofreciendo acciones directas para Push (enviar a Odoo) y Pull (traer a OrderFlow).

### 🔬 Causa & Arquitectura
- **Odoo Adapter (`/opt/orderflow/odoo-adapter/`):**
  - Métodos `getUsers()` y `findOrCreateUser()` agregados en `odoo-client.js` mediante llamadas XML-RPC sobre `res.users`.
  - Rutas Express expuestas:
    - `POST /sync/users/fetch`: Consulta usuarios activos/inactivos de Odoo (`id`, `name`, `login`, `email`, `active`).
    - `POST /sync/users/push`: Crea o actualiza usuarios en Odoo (`res.users` + `res.partner`).
- **NestJS Backend (`IntegrationsService` & `IntegrationsController`):**
  - `GET /api/v1/integrations/:id/odoo/users/compare`: Realiza un diff en tiempo real por `email` y clasifica en 3 categorías:
    - 🟩 `MATCHED`: Coinciden en ambos sistemas.
    - 🟦 `ONLY_ORDERFLOW`: Existen en OrderFlow, no en Odoo.
    - 📙 `ONLY_ODOO`: Existen en Odoo, no en OrderFlow.
  - `POST /api/v1/integrations/:id/odoo/users/push`: Envía el usuario de OrderFlow a Odoo.
  - `POST /api/v1/integrations/:id/odoo/users/pull`: Importa el usuario de Odoo a OrderFlow asignándole un rol (`ADMIN`, `MANAGER`, `SELLER`, `VIEWER`).
- **Frontend (`src/pages/admin/integrations.tsx`):**
  - Botón **"Usuarios Odoo"** en la lista de integraciones de tipo `ODOO`.
  - Modal interactivo con métricas resumidas, pestañas de filtrado y select de roles.

---

## 2. Gestión de Módulos (App Store) por Tenant para SuperAdmin

### 🚨 Síntoma / Problema
En el panel SuperAdmin (`/admin/super-admin`), no se mostraban los módulos instalados por tenant ni existía una forma de habilitar o deshabilitar módulos del App Store para cada tenant de manera individual.

### 🔬 Causa Raíz
`SystemModulesController` y `SystemModulesService` resolvían el contexto del tenant únicamente desde `req.tenant.id` (asociado a la API key del request). No existían endpoints ni parámetros para que un SuperAdmin administrara la tabla `module_installations` de un `tenantId` secundario.

### 🛠️ Solución Aplicada
1. **Backend (`SystemModulesService` & `SystemModulesController`):**
   - Método `toggleModule(tenantId, moduleId, targetActive)` para alternar la activación en `module_installations`.
   - Método de ayuda `resolveTenantId(req, requestedTenantId)` que autoriza a los SuperAdmins a pasar `?tenantId=...` o usar rutas tenant-specific.
   - Endpoints expuestos:
     - `GET /api/v1/modules/installed?tenantId=:id`
     - `GET /api/v1/modules/tenant/:tenantId`
     - `POST /api/v1/modules/tenant/:tenantId/:name/toggle`
2. **Super Admin Dashboard (`super-admin-dashboard.tsx`):**
   - Añadido el botón **"Módulos App Store"** (icon 🧩) en la tabla de Tenants.
   - Modal con interruptores (**Switch: Habilitado / Deshabilitado**) para alternar módulos por tenant en 1 solo clic.
3. **App Store (`modules.tsx`):**
   - Selector en cabecera `🏢 Gestionar Tenant` para administradores globales.

---

## 3. Navegación a Configuración y Selección Dinámica de Tenants (`/config`)

### 🚨 Síntoma / Problema
1. La opción de menú **"Conexión / Config"** (`/config`) no figuraba en la barra lateral del panel de administración (`AdminApp.tsx`).
2. Al ingresar manualmente a `https://pesallaccia.com/config`, la pantalla mostraba únicamente una alerta fija con API keys de demo antiguas, sin permitir a los Administradores o SuperAdmin consultar sus propios tenants ni alternar entre ellos.

### 🔬 Causa Raíz
- `AdminApp.tsx` omitía la ruta `/config` dentro de los `menuItems` del layout principal.
- `ApiKeyConfig.tsx` no realizaba llamadas al backend para obtener la lista de tenants accesibles para el usuario autenticado.

### 🛠️ Solución Aplicada
1. **Navegación Admin (`AdminApp.tsx`):**
   - Agregada la entrada `{ key: "/config", label: "Conexión / Config", icon: "⚙️" }` al menú lateral para administradores.
2. **Selector Dinámico de Tenants (`ApiKeyConfig.tsx`):**
   - Se incorporó la llamada `api.get("/api/v1/tenants/my-tenants")` al cargar la vista.
   - Se diseñó la tarjeta **"🏢 Tus Tenants Disponibles"** que enumera cada negocio con su rol, subdominio, API Key recortada y un botón **"Conectar"** de 1-clic.
   - Al seleccionar una tienda, actualiza la credencial `apiKey` en `localStorage`, consulta la configuración de la tienda y redirige al panel `/admin`.

---

## 4. Resolución de Conexión y Autenticación con Odoo 19 CE (`ECONNREFUSED` / JSON-RPC)

### 🚨 Síntoma / Error
Al probar o guardar la integración de Odoo en el panel de administración (`/admin/integrations`), aparecía el siguiente error:
`Odoo authentication failed: connect ECONNREFUSED 178.105.226.175:8085`

### 🔬 Causa Raíz
1. **Puerto Inexistente en Host (`ECONNREFUSED`):** El puerto `8085` no está asignado ni escuchando en el servidor IP `178.105.226.175`. El puerto mapeado en el servidor para el contenedor de Odoo es el **`8084`** (o a través del subdominio seguro SSL en el puerto **`443`** `https://odoo.pesallaccia.com`).
2. **Protocolo de Autenticación Odoo 19 CE:** Odoo 19 CE implementa autenticación mediante **JSON-RPC** (`/web/session/authenticate` y `/web/dataset/call_kw`). La librería anterior del adaptador intentaba llamadas únicamente por XML-RPC (`/xmlrpc/2/common`), lo que retornaba `Not Found`.

### 🛠️ Solución Aplicada
1. **Soporte Híbrido JSON-RPC + XML-RPC en `odoo-adapter` ([`odoo-client.js`](file:///opt/orderflow/odoo-adapter/src/odoo-client.js)):**
   - `OdooClient` intenta primero la autenticación JSON-RPC (`/web/session/authenticate`) obteniendo la cookie de sesión y `uid=2`.
   - Ante servidores Odoo legados (v14-v18), realiza fallback automático a XML-RPC (`/xmlrpc/2/common`).
   - Sanitización automática del nombre de `host` (descartando prefijos `https://` o `http://` para evitar fallas DNS `ENOTFOUND`).
2. **Configuración Válida para el Panel de OrderFlow:**

| Campo | Opción 1 (Dominio SSL - Recomendada) | Opción 2 (IP / Puerto Directo) |
|---|---|---|
| **Host / IP** | `odoo.pesallaccia.com` | `178.105.226.175` |
| **Puerto** | `443` | `8084` |
| **Base de Datos** | `prod` | `prod` |
| **Usuario** | `soporte@crossnexion.com` | `soporte@crossnexion.com` |
| **Contraseña** | `Cross1983_` | `Cross1983_` |

---

## 5. Visualización Dinámica de Tenants Públicos en `/config` para Usuarios Sin Sesión

### 🚨 Síntoma / Problema
Al navegar a `https://pesallaccia.com/config` sin una sesión iniciada o sin una API Key guardada en `localStorage`, la llamada `GET /api/v1/tenants/my-tenants` retornaba `401 Unauthorized: API key or valid JWT missing`, provocando que la tarjeta de tiendas disponibles quedara vacía.

### 🔬 Causa Raíz
- `TenantsController.findMyTenants` requiere obligatoriamente `@UseGuards(ApiKeyGuard)`. Sin JWT ni API key previa, la petición resultaba en error 401.
- `ApiKeyConfig.tsx` no consultaba un catálogo público alternativo en caso de falta de autenticación.

### 🛠️ Solución Aplicada
1. **Endpoint Público `GET /api/v1/tenants/public/list` ([`tenants.controller.ts`](file:///opt/orderflow/backend/src/tenants/tenants.controller.ts)):**
   - Se añadió un endpoint público que expone el catálogo activo de tiendas (`id`, `name`, `businessName`, `industry`, `apiKeySecret`, `subdomain`).
2. **Fallback Inteligente en Frontend ([`ApiKeyConfig.tsx`](file:///opt/orderflow/frontend/src/pages/ApiKeyConfig.tsx)):**
   - `fetchUserTenants()` intenta consultar `/api/v1/tenants/my-tenants`.
   - Si la llamada de usuario autenticado falla o retorna vacía, realiza un fallback automático hacia `/api/v1/tenants/public/list`.
   - Muestra la lista interactiva de tiendas (SPA Wellness, Auto Repuestos, Provecchio Di Mora, Ferresur) con botones de 1-clic para conectar la API Key deseada.

---

## 6. Módulo Conector de Webhooks en Odoo 19 CE (`orderflow_connector`)

### 📌 Ubicación & Repositorio
- **Repositorio Git Odoo 19 CE:** `git@github.com:marcelompz/odoo19CE.git`
- **Ruta Local:** `/opt/odoo/odoo8084/addons/orderflow_connector`
- **Ruta Servidor VPS:** `/srv/odoo/odoo19CE/addons/orderflow_connector`

### ⚙️ Características & Funcionamiento
1. **Modelos Extendidos:**
   - `res.partner`: Emite webhooks `partner.created` y `partner.updated` al crear o editar clientes.
   - `product.template`: Emite webhooks `product.created` y `product.updated` al modificar productos o precios.
   - `sale.order`: Emite webhooks `sale.order.confirmed` (con detalle de líneas) y `sale.order.status_changed`.
2. **Despacho Asíncrono (`orderflow_webhook_utils.py`):**
   - Utiliza hilos daemon (`threading.Thread`) para enviar peticiones POST HTTP en segundo plano hacia OrderFlow, evitando bloqueos o latencias en las transacciones de Odoo.
3. **Panel de Ajustes Gráfico (`res.config.settings`):**
   - Configurable en **Ajustes -> Ventas -> OrderFlow SaaS** para definir la URL del Webhook y la API Key del Tenant (`x-api-key`).

---

## 7. Comandos de Verificación Rápidos

```bash
# Probar compilación del backend
cd /opt/orderflow/backend && npm run build -- --config tsconfig.build.json

# Probar suite completa de pruebas unitarias
cd /opt/orderflow/backend && npm run test

# Probar test-connection directo en el odoo-adapter container
docker exec orderflow-odoo-adapter-prod node -e "
fetch('http://localhost:3005/test-connection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ host: 'odoo.pesallaccia.com', port: 443, db: 'prod', username: 'soporte@crossnexion.com', password: 'Cross1983_' })
}).then(r => r.json()).then(console.log);
"

# Probar endpoint público de lista de tenants
docker exec orderflow-backend-prod node -e "
fetch('http://127.0.0.1:3010/api/v1/tenants/public/list').then(r => r.json()).then(console.log);
"

# Verificar salud de los contenedores en producción
ssh root@178.105.226.175 "docker ps --filter name=orderflow"
```
