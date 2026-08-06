# Troubleshooting: Manifiestos en Docker Producción, Redirecciones HTTPS y Menú SuperAdmin

> Documento de solución de problemas para resolución de vacíos en App Store (`/admin/modules`), redirecciones HTTPS en Traefik v3 + Cloudflare, y visibilidad de integraciones en el panel SuperAdmin.

---

## 1. Módulos vacíos en App Store (`/admin/modules`) en Docker Producción

### 🚨 Síntoma
En el panel de administración (`/admin/modules`), la lista de módulos de la App Store aparece totalmente vacía `[]`, aunque los archivos `*.manifest.json` existen en el repositorio.

### 🔬 Causa Raíz
El backend de NestJS utiliza imágenes Docker con **Multi-Stage Build** (`Dockerfile.prod`). 
- En la etapa 2 (imagen final de producción), solo se copian los archivos compilados en `/app/dist` (se descarta la carpeta fuente `/app/src`).
- La clase `ModulesRegistry` (`backend/src/modules.registry.ts`) buscaba los manifiestos JSON hardcodeados a la ruta `join(process.cwd(), 'src')`. Al no existir la carpeta `/app/src` en el contenedor final, no leía ningún archivo manifest.

### 🛠️ Solución Aplicada
Se actualizó [`modules.registry.ts`](file:///opt/orderflow/backend/src/modules.registry.ts#L20-L40) implementando una estrategia de evaluación multi-directorio:

```typescript
const candidatePaths = (dir: string) => [
  join(process.cwd(), 'src', dir, `${dir}.manifest.json`),
  join(process.cwd(), 'dist', dir, `${dir}.manifest.json`),
  join(__dirname, dir, `${dir}.manifest.json`),
  join(__dirname, 'src', dir, `${dir}.manifest.json`),
];
```

Esto permite al registrador ubicar los manifiestos tanto en entornos de desarrollo local como en contenedores de producción aislados.

---

## 2. Redirección HTTPS y Configuración de Cloudflare Universal SSL

### 🚨 Síntoma
- Error `HTTP 522 Connection Timed Out` o fallas de conexión al ingresar vía `http://orderflow.pesallaccia.com`.
- Peticiones XHR o WebSockets fallando por mezclas de protocolo (`ws://` vs `wss://`).

### 🔬 Causa Raíz
1. **Sintaxis Traefik v3:** En Traefik v3, la regla `!Host(...)` en archivos de servicio dinámicos acepta **un único parámetro por llamada**. Pasar listas separadas por comas arrojaba un error de parsing y descartaba los routers de tenant.
2. **Cloudflare Proxy & SSL Handshake:** Con la nube naranja (`proxied: true`), Cloudflare requiere un modo SSL compatible con la terminación de certificados que realiza Traefik v3.4 en el origen.

### 🛠️ Solución Aplicada
1. **Traefik `services.yml`:** Se corrigieron los routers en [`services.yml`](file:///opt/traefik-orderflow/dynamic/services.yml#L123-L131) separando cada exclusión en `!Host(...)` individuales.
2. **Traefik `traefik.yml`:** Se añadió la redirección permanente `HTTP 308` en el entryPoint `web` (puerto 80):
   ```yaml
   entryPoints:
     web:
       address: ":80"
       http:
         redirections:
           entryPoint:
             to: websecure
             scheme: https
             permanent: true
   ```
3. **Cloudflare Configuration:**
   - **Plan:** Universal SSL.
   - **Modo SSL/TLS:** `Full (Strict)` (valida el certificado Let's Encrypt de Traefik emitido mediante el desafío `DNS-01` con `CLOUDFLARE_API_TOKEN`).
   - **Edge Certificates:** **Always Use HTTPS** activado (ON).

---

## 3. Redirección congelada en `/config` y Visibilidad del Menú SuperAdmin

### 🚨 Síntoma
- Al ingresar una API Key en `https://pesallaccia.com/config`, la pantalla quedaba congelada sin redireccionar.
- La opción de menú **Integraciones (`/admin/integrations`)** no figuraba en la barra lateral para el SuperAdmin.

### 🔬 Causa Raíz
1. `ApiKeyConfig.tsx` intentaba hacer `window.location.href` a rutas obsoletas (`/spa` o `/retail`).
2. `AdminApp.tsx` filtraba los ítems del menú comprobando únicamente la tabla `module_installations` por tenant. Si el tenant no tenía filas instaladas, la opción se ocultaba incluso para el SuperAdmin.

### 🛠️ Solución Aplicada
1. **`ApiKeyConfig.tsx`:** Se actualizó la redirección posterior al guardado de la API Key:
   ```typescript
   const accessToken = localStorage.getItem("accessToken");
   const targetPath = accessToken ? "/admin" : "/tienda";
   window.location.href = targetPath;
   ```
2. **`AdminApp.tsx`:** Se agregaron permisos directos para el rol SuperAdmin en las opciones del menú lateral:
   ```typescript
   if (isSuperAdmin || isModuleActive('integrations')) {
     menuItems.push({ key: "/admin/integrations", label: "Integraciones", icon: "🔌" });
   }
   ```

---

## 4. Comandos de Verificación Rápidos

```bash
# Probá la redirección 308 de HTTP a HTTPS
curl -sIL http://pesallaccia.com/

# Probá la respuesta 200 de la API de módulos
curl -sI https://pesallaccia.com/api/v1/health

# Verificá el estado del contenedor de backend
docker logs orderflow-backend-prod --tail 50
```
