# 187 — `select` de Prisma sin `id` → `error TS2339` que rompe el build de Docker

> **Fecha:** 2026-10-22 · **Estado:** ✅ Resuelto en **v1.40.0** · **Rama:** `fix/tenants-config-select-id`

## Síntoma

El deploy local (`./scripts/deploy-local.sh`) falla en la **Fase 5** al construir la imagen
del backend, y el script se cae en el `docker compose build`:

```text
#21 [16/16] RUN NODE_OPTIONS="--max-old-space-size=4096" npx tsc -p tsconfig.prod.json && ...
src/tenants/tenants.controller.ts(367,18): error TS2339: Property 'id' does not exist on type
'{ customDomain: string | null; domainVerified: boolean; themePrimaryColor: string | null;
   themeLogoUrl: string | null; themeCssUrl: string | null; removeOrderflowBranding: boolean;
   subdomain: string | null; config: JsonValue; }'.
ERROR: process "/bin/sh -c ... tsc -p tsconfig.prod.json ..." did not complete successfully: exit code: 2
failed to solve: ...
```

El error aparece **también** en la Fase 3 del script (`nest build` → FAIL y `tsc --noEmit` → WARN),
pero el script **no aborta** en esa fase: sigue hasta la Fase 5, donde el fallo sí es fatal.

## Causa raíz

El commit `8da98262` (*"fix: white label modal"*) añadió el endpoint
`GET /api/v1/tenants/:id/config` en `backend/src/tenants/tenants.controller.ts`.

La consulta Prisma usaba un `select` explícito **sin** `id`:

```ts
const tenant = await this.prisma.tenant.findUnique({
  where: { id },
  select: {
    customDomain: true,
    domainVerified: true,
    // ... sin `id: true`
  },
});

// ... y el return leía:
return { id: tenant.id, /* ... */ };
```

Cuando Prisma recibe un `select`, **el tipo de retorno es el objeto literal de los campos
seleccionados** — no el modelo completo. Como `id` no estaba en la lista, el tipo de `tenant`
no tiene propiedad `id` y TypeScript rechaza `tenant.id` con **TS2339**.

Es un fallo **silencioso hasta que se compila**: el código es JS válido en runtime, pero el
`tsc` del build de producción lo rechaza.

### Por qué llegó a `main` sin que nadie lo notara

El commit se hizo **después** del deploy a producción de la v1.39.28 (deploy 09:48, commit 11:26),
así que **nunca se compiló en ningún entorno**: ni en producción ni en el backend local
(el contenedor local seguía con la imagen de las 08:17, construida antes del commit).

El `deploy-local.sh` tampoco lo detectó en la Fase 3 porque **el script no aborta ante un
build fallido**: continúa hasta la Fase 5, donde el `docker compose build` sí falla de forma fatal.

### Defecto secundario: `deploy-local.sh` no reconstruía nada

Mientras se investigaba, se descubrió que el script **nunca desplegaba el código nuevo** cuando
el contenedor ya estaba arriba:

```bash
# ANTES (defectuoso)
if docker compose ps --services 2>/dev/null | grep -q "^backend$"; then
  echo "ALREADY RUNNING"        # <-- se saltaba el build
else
  docker compose build --no-cache backend
  docker compose up -d backend
fi
```

`docker compose ps --services` lista **solo los servicios que están corriendo**. Con el backend
ya arriba, el script imprimía `ALREADY RUNNING`, **se saltaba el build** y reportaba **éxito**
sin desplegar el código nuevo. Esto viola la **Regla #11** de `AGENTS.md`
(*"siempre usar `docker compose up --build -d`, nunca `docker compose restart`"*).

Es un **falso positivo de validación**: el script decía "verde" mientras servía código viejo.

## Solución aplicada

### 1. Corrección del bug de tipos

`backend/src/tenants/tenants.controller.ts` — añadir `id: true` al `select`:

```ts
select: {
  id: true,
  customDomain: true,
  domainVerified: true,
  themePrimaryColor: true,
  themeLogoUrl: true,
  themeCssUrl: true,
  removeOrderflowBranding: true,
  config: true,
  subdomain: true,
},
```

Es el mismo patrón que ya usan las consultas vecinas del controller (líneas 102, 176, 226, 265).

> **Alternativa válida:** usar el parámetro `id` en lugar de `tenant.id` en el `return`.
> Se eligió `id: true` por consistencia con el resto del archivo.

### 2. Corrección de `scripts/deploy-local.sh`

- **Fase 5**: se reconstruye siempre con `up --build -d` (Regla #11), pasando `CACHE_BUST` para
  invalidar la capa de `prisma generate`, y se **espera el health check** del contenedor nuevo.
  Se eliminó la comprobación `ps --services` que causaba el falso positivo.
- **Fase 6.3 / 7.1**: apuntaban a `http://localhost:80`, pero el puerto 80 del host lo ocupa
  **Traefik**, no el contenedor `frontend` (el servicio frontend **no publica puertos**: se sirve
  vía el router `provecchio-local` de Traefik). Se corrigieron a `http://${DOMAIN}:80`.
- **Fase 6.5 (nuevo)**: compara el hash del entrypoint servido contra el de `frontend/dist` en
  disco, para detectar que el contenedor sirve un bundle viejo.
- **Fase 7.3**: la versión del health endpoint pasó de `WARN` a `FAIL` — una versión distinta a
  `VERSION` significa que corre código viejo.
- **Fase 7.4 (nuevo)**: valida `GET /api/v1/tenants/:id/config` → **200**.
- El script carga `MASTER_API_KEY` desde `.env` para poder consultar endpoints protegidos por
  `ApiKeyGuard`.

## Reglas para prevenirlo

1. **Compilar antes de commitear** cuando el cambio toque un `select` de Prisma:
   ```bash
   cd backend && npx tsc --noEmit
   ```
   Un `select` incompleto **no** rompe los tests unitarios (no ejecutan el type-check).

2. **Todo campo que se devuelva debe estar en el `select`.** Prisma tipa el resultado como el
   objeto literal de campos seleccionados: si el campo no está, no existe en el tipo.

3. **Si el código va a producción pero no se compiló**, el primer deploy que lo encuentre va a
   fallar en el build. Por eso el deploy local es la barrera real: un commit que solo pasó los
   tests **no** significa que compile.

4. **Regla #11**: el deploy siempre es `up --build -d`. Un `restart` (o un chequeo de "ya está
   corriendo") preserva la imagen vieja y produce un falso positivo de validación.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `backend/src/tenants/tenants.controller.ts` | `id: true` añadido al `select` de `getTenantConfig` |
| `scripts/deploy-local.sh` | Fase 5 reconstruye siempre; checks 6.3/6.5/7.3/7.4 corregidos y ampliados |
| `VERSION`, `backend/package.json`, `frontend/package.json`, `mobile/package.json` | Bump a `1.40.0` |
| `backend/src/main.ts`, `featurelist.json`, `README.md`, `ROADMAP.md`, `docs/ROADMAP.md` | Sincronización de versión |
| `CHANGELOG.md`, `docs/guides/CHANGELOG.md` | Entrada de la release v1.40.0 |
