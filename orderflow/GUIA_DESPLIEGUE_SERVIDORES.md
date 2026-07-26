# 🚀 GUÍA DE DESPLIEGUE EN SERVIDOR (PRODUCCIÓN & STAGING)

Esta guía detalla los pasos exactos para implementar la plataforma **OrderFlow** en tu nuevo servidor utilizando el dominio **`orderflow.pesallaccia.com`** (Producción) y **`staging.orderflow.pesallaccia.com`** (Staging), además de la infraestructura de subdominios públicos por tenant.

---

## 📋 REQUISITOS PREVIOS EN EL HOSTING

1. **DNS Configurado:**
   Apunta los registros A de tus dominios principales a la IP pública de tu servidor de hosting:
   * `pesallaccia.com` -> `[IP_DEL_SERVIDOR]`
   * `staging.pesallaccia.com` -> `[IP_DEL_SERVIDOR]` *(si aplica)*
2. **Cloudflare:**
   - Zona `pesallaccia.com` en Cloudflare.
   - API Token con permiso `Zone:DNS:Edit` guardado en `.env` como `CLOUDFLARE_API_TOKEN`.
   - *(Opcional staging)* Variable `CF_SUBDOMAIN_PREFIX=staging` para generar subdominios del tipo `staging.<tenant>.pesallaccia.com`.
3. **Puertos Abiertos:**
   Asegúrate de que el firewall (o grupo de seguridad) de tu proveedor tenga abiertos los puertos:
   * `80` (HTTP)
   * `443` (HTTPS)
   * `22` (SSH para conectarte)
4. **Docker & Docker Compose Instalados:**
   El host de destino debe contar con Docker y Docker Compose (v2.x o superior).

---

## 🛠️ PASO 1: INSTALACIÓN Y PREPARACIÓN DE ENTORNOS

Si despliegas ambos entornos en el mismo servidor, se recomienda clonar la plataforma en dos directorios separados para aislar sus códigos y bases de datos:

### Entorno de Staging:
```bash
# 1. Clonar el repositorio en la carpeta staging
git clone -b staging https://github.com/marcelompz/orderflow.git /opt/orderflow-staging
cd /opt/orderflow-staging

# 2. Generar archivo de secretos
./scripts/generate-secrets.sh
```

### Entorno de Producción:
```bash
# 1. Clonar el repositorio en la carpeta producción
git clone -b main https://github.com/marcelompz/orderflow.git /opt/orderflow-prod
cd /opt/orderflow-prod

# 2. Generar archivo de secretos
./scripts/generate-secrets.sh
```

---

## 📦 PASO 2: CONFIGURACIÓN DE TRAEFIK Y CERTIFICADOS SSL

OrderFlow usa **Traefik** como reverse proxy y gestor de certificados SSL. Traefik se despliega como stack independiente en `/srv/traefik/` (fuera del repo del proyecto) y se encarga de:
- Enrutar tráfico por dominio/subdominio.
- Gestionar certificados SSL automáticos con Let's Encrypt.
- Exponer el backend y frontend por dominio.

### 1. Configurar Traefik en el servidor (producción/staging)

En el servidor, creá el directorio `/srv/traefik/` y los archivos de configuración:

- `traefik.yml`: configuración principal (entrypoints, providers, ACME).
- `dynamic/services.yml`: routers y servicios backend por dominio.
- `dynamic/headers.yml`: middlewares de seguridad compartidos.
- `acme.json`: almacenamiento de certificados (permisos `chmod 600`).

El archivo `docker-compose.yml` de Traefik levanta el contenedor `orderflow_traefik` montando estos archivos.

### 2. Variables necesarias en `.env`
En el `.env` del proyecto (production o staging):
```env
ACME_EMAIL=marcelo@pesallaccia.com
ACME_CASERVER=https://acme-v02.api.letsencrypt.org/directory
CLOUDFLARE_API_TOKEN=tu_token_de_cloudflare_con_Zone:DNS:Edit
CF_SUBDOMAIN_PREFIX=staging   # solo staging; producción lo deja vacío
```

### 3. Levantar Traefik
```bash
cd /srv/traefik
docker compose up -d
```

### 4. Verificar dashboard de Traefik
Abrí `http://<IP_SERVIDOR>:8080` para ver routers activos. Desde allí podés confirmar que los dominios están registrados y los servicios responden.

### 5. Validar HTTPS
```bash
curl -I https://pesallaccia.com
curl -I https://pesallaccia.com/api/v1/health
```

Si todo responde con `200` y certificado válido de Let's Encrypt, Traefik quedó operativo.

---

## 📈 PASO 3: VERIFICAR LA INSTALACIÓN
Abrí el navegador y verificá los accesos base:

| Ambiente | URL admin | Backend health | Notas |
|----------|-----------|----------------|-------|
| **Producción** | `https://pesallaccia.com` | `https://pesallaccia.com/api/v1/health` | Dominio raíz sirve el frontend OrderFlow. Backend accesible por path `/api`. |
| **Staging** | `https://staging.pesallaccia.com` | `https://staging.pesallaccia.com/api/v1/health` | Staging se sirve bajo el mismo dominio raíz con Traefik. |

> [!IMPORTANT]  
> El backend **no** se expone en `api.pesallaccia.com` por defecto. Las rutas `/api` y `/webhook` se enrutan a través del dominio principal (o subdominio staging) por path. Si necesitas un subdominio dedicado para el API, debes agregar el router correspondiente en `/srv/traefik/dynamic/services.yml` y crear el registro DNS en Cloudflare.

---

## 🖥️ PASO 4: DESARROLLO LOCAL CON TRAEFIK

En desarrollo local, podés usar un stack de Traefik similar al de producción ubicado en `/opt/traefik-orderflow/`.

### 1. Levantar Traefik local

```bash
cd /opt/traefik-orderflow
docker compose up -d
```

Esto levanta Traefik con file provider, escuchando en puertos `80`, `443` y `8080` (dashboard).

### 2. Levantar OrderFlow conectado a Traefik

```bash
cd /opt/orderflow
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build
```

> [!IMPORTANT]  
> Asegurate de que los contenedores `frontend` y `backend` estén conectados a la red `traefik-public` (definida en el archivo `docker-compose.traefik.yml`).

### 3. Probar localmente

Accedé a:
- `http://localhost` (frontend)
- `http://localhost/api/v1/health` (backend health)

No hace falta modificar `/etc/hosts` ni configurar SSL. El dashboard de Traefik está en `http://localhost:8080`.

---

## 🌐 PASO 5: SUBDOMINIOS PÚBLICOS POR TENANT

Con Traefik + Cloudflare DNS, cada tenant puede tener su tienda en un subdominio propio:

- **Producción**: `https://<tenant>.pesallaccia.com`
- **Staging**: `https://staging.<tenant>.pesallaccia.com`

El backend crea el registro CNAME en Cloudflare cuando el Super Admin crea el tenant con el campo `subdomain`. El frontend público detecta el host y renderiza la tienda del tenant sin mostrar OrderFlow/admin.

> [!IMPORTANT]  
> Los subdominios de tenant (`<tenant>.pesallaccia.com` y `staging.<tenant>.pesallaccia.com`) son gestionados automáticamente por Cloudflare DNS (CNAME hacia `pesallaccia.com`). No requieren registros A manuales. Traefik ruteará cualquier subdominio que coincida con `*.pesallaccia.com` hacia el frontend de OrderFlow.

Para más detalle, ver `docs/GUIA_DESPLIEGUE_Y_TENANTS.md` (sección *Subdominio público por tenant*).
