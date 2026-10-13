Actúa como Arquitecto de Software y Desarrollador Full Stack / DevOps Senior.

Tu tarea es estandarizar la convención de nomenclatura de archivos en el proyecto, registrar formalmente este criterio en las directivas de `AGENTS.md`, ejecutar el renombramiento de los archivos fuera de norma en `frontend/src/pages/`, y reparar todas las referencias rotas (importaciones en React, rutas de enrutamiento y reglas/mapeos en Traefik o Nginx/Docker).

---

### 1. Actualización de directivas en `AGENTS.md`
Agrega una nueva sección clara y vinculante en `AGENTS.md` bajo el título **`## Convención de Nombres de Archivos y Enrutamiento`**:
- **Páginas, componentes, utilidades y servicios (`.tsx`, `.ts`, `.jsx`, `.js`):** Uso estricto de `kebab-case` para todos los nombres de archivos (ejemplo: `omni-catalog.tsx`, `api-key-config.tsx`, `messaging-deep-links.ts`).
- **Exportación de componentes:** Los nombres de componentes internos deben definirse en `PascalCase` dentro de sus respectivos archivos `kebab-case` (ejemplo: `export const ApiKeyConfig = () => ...`).
- **Archivos residuales y temporales:** Prohibido dejar backups (`.bkup`, `.bak`), logs (`.log`) o duplicados dentro de los directorios de código fuente (`src/`). Deben ser ignorados vía `.gitignore` o eliminados.
- **Rutas y consistencia de despliegue:** Explicar que el uso de `kebab-case` es mandatorio para garantizar compatibilidad con sistemas Linux/Docker (case-sensitive) y consistencia con las URLs públicas.

---

### 2. Renombramiento de archivos en `frontend/src/pages/`
Ejecuta la migración de nombres usando comandos compatibles con Git (`git mv` para evitar problemas de case-sensitivity en entornos locales):

- `ApiKeyConfig.tsx` ➔ `api-key-config.tsx`
- `GiveawayRegister.tsx` ➔ `giveaway-register.tsx`
- `LandingBioLinksCatalog.tsx` ➔ `landing-biolinks-catalog.tsx`
- `PublicStorefrontPage.tsx` ➔ `public-storefront-page.tsx`
- `TenantHomepage.tsx` ➔ `tenant-homepage.tsx`
- `TenantTemplate.tsx` ➔ `tenant-template.tsx`
- `social-catalog.tsx` ➔ `omni-catalog.tsx` (unificando la transición al nuevo módulo omnicanal)
- **Depuración:** Remover o mover fuera de `src/pages/` los archivos residuales: `social-catalog2.tsx.bkup`, `social-catalog.log` y verificar la necesidad de `whatsapp-catalog.tsx` / `whatsapp-checkout.tsx`.

---

### 3. Reparación de Enlaces, Enrutadores e Importaciones
Realiza un barrido completo en todo el código base (`frontend/src/`):
1. **Actualización de `import`:** Corrige todas las importaciones estáticas y dinámicas (`lazy()`, `import(...)`, `index.ts`) que apunten a los archivos antiguos.
2. **React Router:** Actualiza las definiciones de rutas (`App.tsx`, `routes.tsx` o archivos de configuración de rutas) asegurando que las rutas de navegación internas no queden rotas.
3. **Barrels (`index.ts`):** Actualiza los re-exports dentro de `frontend/src/pages/index.ts` (si existe).

---

### 4. Verificación y Reparación de Mapeos Traefik y Reverse Proxy
Revisa los archivos de configuración de infraestructura (`docker-compose.yml`, `traefik.yml`, `dynamic_conf.yml` o configuraciones en `frontend/nginx.conf`):
1. **Reglas de enrutamiento (PathPrefix / Path):** Verifica si existen routers o middlewares en Traefik que dependan de paths específicos que hayan cambiado (ejemplo: `/admin/social-catalog` vs `/admin/omni-catalog` o redirecciones legacy).
2. **Redirecciones 301/Fallback (si aplica):** Si URLs públicas o endpoints administrativos cambiaron de nombre, configura los middlewares de Traefik o reglas de Nginx correspondientes para redirigir el tráfico antiguo hacia la nueva ruta canonical sin romper accesos existentes.
3. **Mapeo SPA en Frontend:** Asegura que la directiva de fallback a `index.html` (para rutas manejadas por React Router en el cliente) siga intacta en el contenedor web.

---

### Formato de Entrega Esperado
1. **Diff / Extracto de `AGENTS.md`:** Sección exacta añadida.
2. **Plan de comandos de renombramiento:** Comandos `git mv` / `rm` ejecutados.
3. **Archivos de código modificados:** Lista de archivos con sus `import` y rutas actualizadas.
4. **Verificación de infraestructura:** Revisión de Traefik / Docker confirmando que no hay routers o redirecciones rotas.