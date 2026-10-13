# 🚀 Guía Completa de Despliegue de Servidor y Configuración de Tenants

Esta guía detalla los pasos completos para desplegar la plataforma **OrderFlow** en un nuevo servidor VPS y realizar la creación, asociación y configuración de un nuevo **Tenant** (entorno de cliente/empresa).

---

## 📂 PARTE 1: DESPLIEGUE EN UN NUEVO SERVIDOR

### 📋 1. Requisitos Previos en el Hosting
- **Sistema Operativo**: Servidor Linux (Ubuntu 20.04+, Debian o CentOS).
- **Herramientas**: Git, Docker y Docker Compose (v2.x+).
- **Puertos Abiertos**:
  - `80` (HTTP) y `443` (HTTPS) para el tráfico web.
  - `22` (SSH) para administración.
- **DNS**: Los registros tipo A del dominio principal (ej. `orderflow.pesallaccia.com`) y subdominios correspondientes deben apuntar a la IP pública del servidor VPS.

---

### ⚙️ 2. Clonado y Configuración del Entorno
Clona el repositorio en el directorio deseado (ej. `/srv/orderflow`):

```bash
# 1. Clonar el repositorio
git clone -b main https://github.com/marcelompz/orderflow.git /srv/orderflow
cd /srv/orderflow

# 2. Crear archivo de variables de entorno a partir de la plantilla
cp .env.production .env
```

Edite el archivo `.env` para ingresar credenciales seguras y configurar los dominios del servidor:
- **Base de Datos y Redis**: Defina contraseñas seguras para `POSTGRES_PASSWORD` y `REDIS_PASSWORD`.
- **Secretos de Autenticación**: Genere claves JWT aleatorias usando `openssl rand -hex 32` para `JWT_SECRET` y `JWT_REFRESH_SECRET`.
- **URL y Dominios**:
  ```env
  DOMAIN_NAME=orderflow.pesallaccia.com
  FRONTEND_URL=https://orderflow.pesallaccia.com
  VITE_API_URL=https://orderflow.pesallaccia.com/api
  ```

---

### 🛡️ 3. Configuración de Traefik (Edge Proxy) en el Servidor
OrderFlow usa **Traefik** como reverse proxy y gestor de certificados SSL. En producción/staging, Traefik se despliega como stack independiente en `/srv/traefik/` (fuera del repo del proyecto).

> [!IMPORTANT]  
> Si ya tenés otros tenants en staging/producción, estos archivos **ya existen** y contienen la configuración multi-tenant. No los reemplaces sin antes fusionar tus routers/servicios existentes.

Estructura esperada en `/srv/traefik/`:
```
/srv/traefik/
├── docker-compose.yml
├── traefik.yml
├── acme.json
└── dynamic/
    ├── services.yml
    └── headers.yml
```

**Dominio configurable**: el backend usa la variable `ROOT_DOMAIN` (o `DOMAIN_NAME` como fallback) para construir los subdominios de tenant y registrar los CNAME en Cloudflare. En la documentación y ejemplos reemplazá `pesallaccia.com` por tu dominio real.

**Archivos a modificar/crear según el caso**:

1. **`traefik.yml`**: configuración estática (entrypoints, providers, ACME con DNS-01 Cloudflare).
2. **`dynamic/services.yml`**: routers y servicios por dominio/subdominio.
3. **`dynamic/headers.yml`**: middlewares de seguridad compartidos.
4. **`acme.json`**: almacenamiento de certificados (permisos `chmod 600`).

Variables necesarias en `.env` del proyecto:
```env
ROOT_DOMAIN=tu-dominio.com
CLOUDFLARE_API_TOKEN=tu_token_de_cloudflare_con_Zone:DNS:Edit
CF_SUBDOMAIN_PREFIX=staging   # solo staging; producción lo deja vacío
ACME_EMAIL=admin@tu-dominio.com
```

Levantar Traefik:
```bash
cd /srv/traefik
docker compose up -d
```

> [!NOTE]  
> Si usás Cloudflare, configurá el SSL del dominio a **"Full"** o **"Flexible"** para que Traefik gestione correctamente los certificados de Let's Encrypt.

### 🐘 4. Inicialización de la Base de Datos y Prisma
Antes de arrancar la aplicación, se debe inicializar el motor de base de datos y sincronizar el esquema.

1. **Levantar la base de datos**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d database
   sleep 10  # Esperar inicialización
   ```
2. **Crear la base de datos manualmente (si reutiliza volúmenes previos)**:
   Si el volumen ya existía con otro nombre de base de datos, conéctese a la base de datos de Postgres y cree la correspondiente:
   ```bash
   docker exec -i orderflow-db-prod psql -U orderflow -d postgres -c "CREATE DATABASE orderflow_db;"
   ```
3. **Sincronizar el esquema usando Prisma**:
   Dado que el directorio `prisma/migrations` se encuentra en `.gitignore`, la sincronización de tablas debe hacerse directamente sobre la estructura declarativa mediante `db push`. Anule temporalmente el entrypoint de NestJS para ejecutar la tarea:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm --entrypoint '' backend npx prisma db push
   ```

---

### 🚀 5. Encendido de la Pila de Producción
Una vez que el esquema de la base de datos esté sincronizado, compile e inicie todos los contenedores de la plataforma:

```bash
# 1. Compilar y levantar la pila completa
docker compose -f docker-compose.prod.yml up -d --build

# 2. Verificar que los contenedores estén conectados a la red traefik-public
docker network connect traefik-public orderflow-frontend-1 || true
docker network connect traefik-public orderflow-backend-1 || true
docker network connect traefik-public orderflow-odoo_adapter-1 || true
```

> [!IMPORTANT]  
> Los contenedores de OrderFlow (`orderflow-frontend-1`, `orderflow-backend-1`, `orderflow-odoo_adapter-1`) deben estar conectados a la red `traefik-public` para que Traefik pueda enrutar el tráfico correctamente. Si usas Docker Compose con la sección `networks` en el archivo `docker-compose.prod.yml`, esto se hace automáticamente.

---

## 🏢 PARTE 2: CREACIÓN Y CONFIGURACIÓN DE UN TENANT

En OrderFlow, los clientes y empresas se aíslan lógicamente a través de la entidad de **Tenant**. El backend utiliza una clave de API secreta (`sk_...`) adjunta a cada tenant para identificar y filtrar los registros correspondientes.

### ➕ 1. Crear un Nuevo Tenant vía API
El endpoint de creación de Tenants es de acceso público por defecto y genera automáticamente la clave API secreta:

- **Método**: `POST`
- **Ruta**: `https://orderflow.pesallaccia.com/api/v1/tenants` (o localmente `http://localhost:3010/api/v1/tenants`)
- **Headers**:
  - `Content-Type: application/json`
- **Cuerpo JSON**:
  ```json
  {
    "name": "Panadería El Trigo",
    "businessName": "El Trigo S.A.",
    "taxId": "23-88998877-9",
    "industry": "retail",
    "branding": {
      "primaryColor": "#D97706",
      "secondaryColor": "#FBBF24"
    },
    "ecommerce": {
      "enabled": true,
      "url": "https://panaderiaeltrigo.com",
      "allowGuestCheckout": true
    },
    "bookings": {
      "enabled": false
    },
    "config": {
      "googleClientId": "opcional-oauth-id"
    }
  }
  ```

#### Ejemplo de respuesta:
```json
{
  "id": "e6f9d3b1-2182-411a-abff-9de90bc02c81",
  "name": "Panadería El Trigo",
  "apiKey": "sk_cf5a22bbad1290fbcc0119e8cf1aa91a",
  "message": "Tenant creado exitosamente. Guardá la API Key en un lugar seguro."
}
```
> [!IMPORTANT]  
> Guarde la `apiKey` generada de forma muy segura. Esta es la clave que identificará al cliente en cada petición HTTP.

---

### 👥 2. Asociar Usuarios al Tenant
Para otorgar acceso a los administradores o empleados al panel del nuevo tenant, se debe crear la relación en la tabla `user_tenant_access`. 

Esto puede realizarse directamente a través de Prisma Studio o mediante la consola de base de datos:

```bash
# Conectarse a postgres (ajustar nombre de contenedor si usas otro proyecto/nombre)
docker exec -it orderflow-database-1 psql -U orderflow -d orderflow_db

# Insertar el acceso del usuario
# Reemplace USER_ID y TENANT_ID con los IDs reales
INSERT INTO "user_tenant_access" ("id", "user_id", "tenant_id", "role", "active", "created_at", "updated_at")
VALUES (
  gen_random_uuid(), 
  'USER_ID_AQUÍ', 
  'TENANT_ID_AQUÍ', 
  'ADMIN', 
  true, 
  NOW(), 
  NOW()
);
```

---

### 🎨 3. Conexión y Branding en el Frontend
El frontend utiliza la clave API del tenant para cargar dinámicamente sus configuraciones de color, nombre comercial e integraciones habilitadas.

- **Cargar Configuración de Tenant**:
  El frontend realiza una petición HTTP al backend enviando la API Key del tenant para renderizar la interfaz:
  `GET https://orderflow.pesallaccia.com/api/v1/tenants/config/:apiKey`
  
  Esto cargará automáticamente la paleta de colores personalizada y el logotipo del cliente.

---

### 🔍 4. Verificación y Troubleshooting de Tenants
Para comprobar que el nuevo tenant responde adecuadamente, puede consumir el endpoint público de branding usando su ID único:

```bash
curl -i https://orderflow.pesallaccia.com/api/v1/tenants/public/TENANT_ID_AQUÍ/branding
```
Debe retornar un código `200 OK` con el JSON del nombre y configuraciones visuales del nuevo cliente.

---

### 🌐 5. Subdominio público por tenant (Cloudflare + Traefik)

Cada tenant puede exponer su tienda pública en un subdominio propio. Al crear el tenant, el backend calcula el hostname y crea el registro CNAME en Cloudflare automáticamente.

#### Configuración de variables
| Variable | Descripción | Ejemplo staging | Ejemplo producción |
|----------|-------------|-----------------|-------------------|
| `CLOUDFLARE_API_TOKEN` | Token con permiso `Zone:DNS:Edit` para la zona | `CLOUDFLARE_API_TOKEN=...` | `CLOUDFLARE_API_TOKEN=...` |
| `CF_SUBDOMAIN_PREFIX` | Prefijo opcional para subdominios | `staging` | *(vacío)* |
| `VITE_CF_SUBDOMAIN_PREFIX` | Mismo prefijo para el frontend público | `staging` | *(vacío)* |

#### Creación desde el Super Admin
En el dashboard Super Admin, al crear un tenant se puede enviar el campo `subdomain` en el body:

```json
{
  "name": "SPA Wellness",
  "subdomain": "spa-wellness",
  "businessName": "SPA Wellness SRL",
  "branding": {
    "primaryColor": "#5B3A7B",
    "secondaryColor": "#00B4D8"
  }
}
```

El backend:
- Genera el tenant + API Key.
- Normaliza el `subdomain` a slug (`spa-wellness`).
- Si `CF_SUBDOMAIN_PREFIX` está definido (ej: `staging`), construye `staging.spa-wellness.pesallaccia.com`; si no, construye `spa-wellness.pesallaccia.com`.
- Crea el registro CNAME en Cloudflare apuntando al dominio raíz (`pesallaccia.com`).

#### Acceso público
- **Staging**: `https://staging.spa-wellness.pesallaccia.com`
- **Producción**: `https://spa-wellness.pesallaccia.com`

El frontend público detecta el host, consulta `/api/v1/public/storefront/:subdomain/branding` y renderiza el catálogo con el branding del tenant. No requiere login.

#### Endpoints públicos involucrados
- `GET /api/v1/public/storefront/:subdomain/branding` → branding público.
- `GET /api/v1/public/storefront/:subdomain/products` → productos públicos.
- `GET /api/v1/public/tenant-by-subdomain/:subdomain` → datos completos del tenant por subdominio.

#### Eliminación
Al eliminar un tenant desde el Super Admin, el backend elimina automáticamente el registro CNAME de Cloudflare asociado al subdominio.
