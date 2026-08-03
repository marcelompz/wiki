# 🛠️ MANUAL TÉCNICO Y DE ARQUITECTURA - ORDERFLOW SAAS PLATFORM

**Fecha:** 2026-06-28  
**Versión de Documentación:** v0.1.0-alpha.6  
**Público Objetivo:** Ingenieros de Software, SysAdmins, DevOps

---

## 1. 🏗️ ARQUITECTURA MULTI-TENANT Y BASE DE DATOS

OrderFlow es una plataforma SaaS multi-tenant diseñada bajo un esquema de base de datos única y esquema lógico compartido (Shared Database, Shared Schema). El aislamiento de datos se garantiza mediante una clave de tenant (`tenant_id` o `tenantId`) en todos los modelos críticos de datos.

### 🗄️ Esquema DB (Prisma ORM)
- **Aislamiento lógico:** Tablas como `Product`, `Customer`, `Order`, `Service` e `Integration` poseen una relación mandatoria de clave foránea con el modelo `Tenant`.
- **Motor de Datos:** PostgreSQL 15.
- **Despliegue y Migraciones:** En entornos productivos (`Dockerfile.prod`), el inicio del contenedor de backend ejecuta de forma automatizada `npx prisma migrate deploy` para aplicar los deltas estructurales sin el riesgo de pérdida de datos asociado a `db push`.

---

## 2. 🐳 INFRAESTRUCTURA DE DOCKER Y REDES

La infraestructura se encuentra completamente containerizada bajo Docker Compose, distinguiéndose los entornos de desarrollo (`docker-compose.yml`) y producción/staging (`docker-compose.prod.yml`).

```mermaid
graph TD
    subgraph Red Docker (orderflow-network)
        DB[(PostgreSQL)]
        Redis[(Redis Cache)]
        Backend[Backend NestJS]
        Frontend[Frontend React/Vite]
        Adapter[Odoo Adapter]
    end
    Nginx{Nginx Edge Proxy} --> Frontend
    Nginx --> Backend
    Nginx --> Adapter
    Backend --> DB
    Backend --> Redis
    Backend --> Adapter
```

### 🔌 Red Interna Nombrada (`orderflow-network`)
Para garantizar una resolución DNS interna limpia por nombres de servicio (sin el prefijo del directorio del proyecto), se define de forma explícita una red bridge:
```yaml
networks:
  orderflow-network:
    name: orderflow-network
    driver: bridge
```
Todos los contenedores están acoplados a esta red, lo que permite invocar endpoints internos de forma segura (ej. `http://odoo_adapter:3005`).

### 🩺 Health Checks Estabilizados
Para evitar falsos negativos en sistemas basados en Alpine Linux (donde `localhost` se resuelve por defecto a la dirección IPv6 loopback `[::1]`), todos los comandos de comprobación de salud apuntan explícitamente a la interfaz IPv4 `127.0.0.1`:
* **PostgreSQL:** `pg_isready -U orderflow -d orderflow_db`
* **Backend:** `wget --no-verbose --tries=1 --spider http://127.0.0.1:3010/api/v1/health || exit 1`
* **Frontend:** `wget --no-verbose --tries=1 --spider http://127.0.0.1:3011/ || exit 1` (desarrollo) o puerto `80` (producción)
* **Odoo Adapter:** `wget --no-verbose --tries=1 --spider http://127.0.0.1:3005/health || exit 1`

---

## 3. 🌐 NGINX EDGE PROXY Y TERMINACIÓN SSL

En staging y producción, un contenedor de Nginx actúa como proxy inverso en la frontera, canalizando todo el tráfico web y administrando la seguridad SSL.

### 🛡️ Configuración de Puertos y Enrutamiento
- **Puerto 80 (HTTP):** Recibe las solicitudes de validación de Certbot (`/.well-known/acme-challenge/`) para la renovación automática de certificados Let's Encrypt. Redirecciona opcionalmente el tráfico general a HTTPS.
- **Puerto 443 (HTTPS):** Contiene la terminación SSL y distribuye las peticiones mediante `proxy_pass`:
  * `/` -> Redirecciona a la SPA del Frontend (`http://frontend:80`).
  * `/api/` -> Redirecciona al backend API NestJS (`http://backend:3010`).
  * `/webhook/` -> Redirecciona al adaptador de Odoo (`http://odoo_adapter:3005`) para recibir llamadas externas.

---

## 4. 🔄 ADAPTADOR ODOO DINÁMICO
El adaptador Odoo es un microservicio en Node.js/Express que mapea y sincroniza eventos de pedidos y reservas en tiempo real hacia Odoo 19 (XML-RPC).

### 🔑 Aislamiento y Configuración de Credenciales
- El adaptador no mantiene credenciales estáticas de Odoo en sus variables de entorno de producción.
- Cuando el backend NestJS dispara el webhook (ej. al confirmarse un pedido en [orders.service.ts](file:///opt/orderflow/backend/src/orders/orders.service.ts)), este extrae la configuración cifrada de la base de datos del tenant y la envía en el cuerpo de la petición (`req.body.integration_config`).
- El adaptador inicializa un cliente XML-RPC dinámico (`OdooClient`) para esa solicitud y destruye la sesión al finalizar, garantizando la seguridad multi-tenant.
- Para las pruebas de conexión desde el backend, el servicio [integrations.service.ts](file:///opt/orderflow/backend/src/integrations/services/integrations.service.ts) apunta al host dinámico definido en `process.env.ODOO_ADAPTER_URL` (por defecto `http://odoo_adapter:3005`).

---

## 📱 5. MÓDULO CATÁLOGO DE WHATSAPP (ESTILO PENCY)
Permite a los clientes de un tenant navegar por un catálogo público simplificado y autogestionar su pedido para enviarlo al número de WhatsApp del comercio.

### 🔁 Flujo de Datos del Pedido
1. El cliente agrega productos o servicios en el frontend.
2. Al ir a pagar, rellena el formulario en `WhatsappCheckoutPage`.
3. El frontend envía un `POST /api/v1/public/orders` registrando la venta en la base de datos de OrderFlow (creando registros de `Order` y `OrderLine` asociados al tenant).
4. El backend responde con un código de pedido único (`orderId`).
5. Tras el éxito de la petición API, el frontend formatea un mensaje pre-redactado codificado en URL con los detalles del pedido, limpia el carrito y abre el enlace de WhatsApp:
   `https://wa.me/{numero_whatsapp}?text={mensaje_codificado}`
6. De forma paralela, el backend dispara de forma asíncrona un webhook hacia el adaptador de Odoo para registrar la orden de venta en el ERP.

---

## 📌 6. ESTRATEGIA DE VERSIONAMIENTO HÍBRIDA
El proyecto sigue una propuesta de versionamiento híbrida parent-child para equilibrar la cohesión del núcleo y la velocidad de entrega de los módulos.

### 📝 Control de Versión Global
- **VERSION:** Archivo de texto plano en la raíz que define la versión actual del Core (ej: `0.1.0-alpha.6`).
- **packages.json & package.json:** Sincronizados con la versión global en las carpetas `backend`, `frontend`, `mobile` y `odoo-adapter` mediante el script `scripts/version.js`.

### 🔀 Módulos Core vs Opcionales
* **Sincronización Automática:** Los módulos internos fundamentales (ej: `auth`, `products`, `orders`, `tenants`) se sincronizan de forma masiva con la versión del Core ejecutando:
  ```bash
  node scripts/sync-module-versions.js
  ```
* **Independencia de Módulos Opcionales:** Módulos como `backups`, `quotations` o `whatsapp-catalog` mantienen su propia versión semántica en su respectivo manifiesto `manifest.json`. Esto permite actualizar características individuales de un add-on sin generar un bump de versión en todo el Core de la plataforma.
* **Promoción a Core:** Para atar un módulo opcional a la versión y ciclo del Core, se debe registrar en la constante `CORE_MODULES` de `sync-module-versions.js`.

---

## ⚠️ 7. BUENAS PRÁCTICAS Y SOLUCIÓN DE ERRORES REACT

### 🛑 Evitar Redirecciones en Render-Phase
Un antipatrón común en React con React Router es invocar la función `navigate()` o emitir alertas globales directamente dentro del cuerpo del componente durante la evaluación de condiciones (como validar si el carrito está vacío). Esto interrumpe el ciclo de renderizado e impide actualizar estados concurrentes, arrojando:
`Warning: Cannot update a component while rendering a different component...`

- **Solución implementada:** Se reubicaron estas redirecciones dentro del hook `useEffect`, asegurando que la navegación ocurra limpiamente una vez que el componente se ha montado y renderizado en el DOM.

### 🔌 Inicialización de Fallback en BrandingProvider
Para evitar advertencias de consola críticas (`[API Interceptor] No API key found!`) y caídas de rendimiento en el primer acceso de un usuario anónimo, `BrandingProvider.tsx` valida la existencia de `apiKey` en `localStorage`. Si está vacía, inicializa automáticamente la base de datos local con la clave del tenant por defecto (Provecchio), garantizando que las subsecuentes llamadas a la API mediante Axios o Fetch nativo tengan la cabecera `x-api-key` poblada de inmediato.
