# Plan Maestro — OmniFlow Marketplace: Empaquetado y Distribución de Addons

**Objetivo**: permitir que cualquier módulo standalone (`services/*-standalone/`) se empaquete como un artefacto `.tar.gz` autocontenido, se publique en un repositorio central (Marketplace), y un **installer wizard** lo descargue, valide dependencias/versiones, y lo instale en el directorio `addons/` de un tenant/servidor OmniFlow.

Este plan **no inventa un manifest nuevo**: extiende el `*.manifest.json` estilo Odoo que ya usan todos los módulos (`depends`, `coreCompatibility`, `version`, `installable`, `autoInstall`) — el mismo patrón que ya usa `backend/*/​*.manifest.json` y `services/*-standalone/src/*.manifest.json`. Se conecta directamente con lo ya definido en `Plan de Licenciamiento, Gobierno y Ecosistema OmniFlow.md` (OmniFlow Marketplace + OmniFlow Harness de certificación técnica).

---

## 1. Hallazgo crítico que condiciona todo el diseño

Auditando `services/*-standalone/package.json` contra el tarball real: los standalones dependen de paquetes internos vía **path relativo al monorepo**, no vía versión publicada:

```json
"@orderflow/auth-shared": "file:../../packages/auth-shared"
```

Un `.tar.gz` que solo contenga `services/giveaways-standalone/` **no instalará** fuera del monorepo — `npm install` no encontrará `../../packages/auth-shared`. Esto es bloqueante y debe resolverse en la Fase 0, antes de construir el empaquetador:

- **Opción A (recomendada)**: publicar `packages/auth-shared` (y cualquier otro `@orderflow/*` compartido) como paquete versionado en un registry privado (Verdaccio self-hosted o npm registry privado), y que los standalones lo consuman por versión semver normal (`"@orderflow/auth-shared": "^1.3.0"`).
- **Opción B (fallback sin registry)**: el empaquetador *vendoriza* el código de `packages/auth-shared` dentro del `.tar.gz` del addon y reescribe el `file:` path en tiempo de build del paquete, no en tiempo de instalación.

Se recomienda A porque además resuelve versionado/breaking changes de los shared packages de forma prolija.

---

## 2. Formato del paquete `.tar.gz`

Estructura estándar de un addon package (nombre de archivo: `<module-name>-<version>.omniaddon.tar.gz`):

```
giveaways-0.5.0.omniaddon.tar.gz
├── manifest.json          # manifest extendido (ver sección 3)
├── checksum.sha256        # hash del contenido (integridad)
├── signature.sig          # firma del paquete (autenticidad — ver sección 7)
├── src/                   # código fuente del módulo (backend/servicio)
├── package.json           # dependencias npm resueltas (sin "file:" locales)
├── prisma/
│   └── schema.module.prisma   # modelo Prisma parcial del addon (merge, no reemplazo)
├── migrations/            # migraciones Prisma propias del addon
├── frontend/               # (opcional) componentes admin/Refine que aporta el addon
└── README.md               # notas de instalación/uso
```

`checksum.sha256` y `signature.sig` son obligatorios: el wizard nunca descomprime un paquete sin verificarlos primero (ver sección 6, paso 2).

---

## 3. Manifest extendido (`manifest.json` v2)

Se extiende el schema actual (compatible hacia atrás — todo módulo existente ya cumple los campos base):

```json
{
  "name": "giveaways",
  "displayName": "Sorteos / Giveaways",
  "version": "0.5.0",
  "category": "sales",
  "depends": ["contacts"],
  "installable": true,
  "autoInstall": false,
  "application": true,
  "coreCompatibility": "^1.32.0",
  "icon": "GiftOutlined",

  "packageType": "standalone",
  "npmDependencies": {
    "@orderflow/auth-shared": "^1.3.0"
  },
  "internalPackages": ["@orderflow/auth-shared"],
  "prismaModels": ["Giveaway", "GiveawayParticipant"],
  "envRequired": ["GIVEAWAYS_PORT", "DATABASE_URL"],
  "minDbVersion": "1.4.0",
  "license": "community",
  "publisher": "orderflow-core",
  "checksumAlgo": "sha256"
}
```

Cambios clave respecto al manifest actual:

| Campo nuevo | Para qué |
|---|---|
| `coreCompatibility` (ahora **rango semver real**, no `"1.1.x"` suelto) | El validador puede resolver compatibilidad automáticamente contra la versión del core instalado |
| `npmDependencies` | Lista explícita y **resuelta** (sin `file:`) de lo que el addon necesita — es lo que el wizard valida/instala |
| `internalPackages` | Marca qué dependencias son `@orderflow/*` internas, para saber qué resolver contra el registry privado |
| `prismaModels` | Qué modelos aporta, para detectar colisiones de nombre entre addons antes de mergear el schema |
| `envRequired` | El wizard valida que existan (o pide completarlas) antes de arrancar el servicio |
| `minDbVersion` | Compatibilidad contra la versión de schema de base de datos del tenant |
| `license` / `publisher` | Soporte directo al modelo dual Community/Enterprise ya definido — un addon Enterprise puede requerir validación de licencia comercial antes de instalar |

---

## 4. Repositorio Marketplace (índice central)

Un repo (puede ser un bucket S3/R2 + un JSON index, no hace falta un backend complejo para el v1):

```
marketplace.orderflow.io/
├── index.json                     # catálogo completo, generado en cada publish
└── packages/
    └── giveaways/
        ├── 0.4.0/giveaways-0.4.0.omniaddon.tar.gz
        └── 0.5.0/giveaways-0.5.0.omniaddon.tar.gz
```

`index.json` (lo que el wizard consulta primero, sin descargar nada pesado):

```json
{
  "generatedAt": "2026-09-11T00:00:00Z",
  "packages": [
    {
      "name": "giveaways",
      "latest": "0.5.0",
      "versions": ["0.4.0", "0.5.0"],
      "coreCompatibility": {"0.5.0": "^1.32.0", "0.4.0": "^1.28.0"},
      "license": "community",
      "downloadUrl": "https://marketplace.orderflow.io/packages/giveaways/0.5.0/giveaways-0.5.0.omniaddon.tar.gz",
      "checksumUrl": ".../checksum.sha256"
    }
  ]
}
```

Esto es exactamente lo que **OmniFlow Harness** (ya mencionado en el plan de licenciamiento como certificación técnica automatizada) debe firmar antes de que un paquete entre al índice: seguridad, licencias, arquitectura, multi-tenancy, rendimiento.

---

## 5. Validación de dependencias y versiones (antes de instalar)

Orden estricto, todo **falla rápido y no descomprime nada** si algo no pasa:

1. **Resolver el manifest** del paquete solicitado desde `index.json` (sin descargar el tar.gz todavía).
2. **Chequear `coreCompatibility`** contra la versión real del core instalado (`context/featurelist.json` / `VERSION`). Si no matchea el rango semver → abortar con mensaje claro.
3. **Resolver el árbol de `depends`** (módulos OmniFlow de los que depende, ej. `giveaways` depende de `contacts`): si algún dependiente no está instalado, el wizard debe ofrecer instalarlo en cadena (orden topológico) o abortar si el usuario no lo confirma.
4. **Chequear `minDbVersion`** contra el schema real de la DB del tenant.
5. **Chequear colisión de `prismaModels`**: si otro addon ya instalado declara un modelo con el mismo nombre, abortar (evita corromper el schema al mergear).
6. **Descargar el `.tar.gz`**, verificar `checksum.sha256` (integridad) y `signature.sig` (autenticidad — ver sección 7).
7. Recién ahí: descomprimir en `addons/<name>-<version>/`, resolver `npmDependencies` (`internalPackages` contra el registry privado, el resto contra npm público), correr `migrations/`, registrar el addon en la tabla `InstalledAddon` (nueva, tenant-scoped) y arrancar/registrar el servicio.

Si cualquier paso 1-6 falla, no se toca el filesystem del servidor — es todo o nada.

---

## 6. Flujo del Installer Wizard (UI, `/admin/marketplace`)

1. Lista el catálogo (`index.json`) con badge de compatibilidad (✅ compatible / ⚠️ requiere upgrade de core / ❌ incompatible) calculado client-side contra la versión del tenant.
2. Usuario elige un addon → wizard muestra: dependencias que va a instalar en cadena, variables de entorno que va a pedir, y si es Enterprise (requiere validar licencia comercial del tenant antes de continuar).
3. Confirmación → backend ejecuta la secuencia completa de la sección 5 como un job asíncrono (BullMQ, mismo patrón que ya usa el resto de OmniFlow) con progreso visible (validando → descargando → verificando firma → migrando DB → arrancando servicio).
4. Si falla en cualquier paso: rollback automático (borra el directorio parcialmente descomprimido, no deja migraciones a medio aplicar — usar transacción Prisma para el bloque de migración del addon).
5. Addon instalado queda visible en `/admin/marketplace/installed` con opción de desinstalar (soft, respetando el mismo criterio de soft-delete que ya se usa para Tenant) y actualizar versión.

---

## 7. Seguridad — no es opcional

Un addon instalado ejecuta código NestJS arbitrario dentro del proceso del tenant (o como microservicio con acceso a `DATABASE_URL`). Dado el hallazgo de la auditoría anterior sobre `@TenantPrisma()` y aislamiento multi-tenant todavía incompleto, **instalar addons de terceros sin firma es una superficie de ataque directa sobre el problema que ya está pendiente de cerrar**. Por eso:

- Todo paquete que entra al índice del Marketplace pasa primero por **OmniFlow Harness** (certificación automatizada ya prevista en el plan de licenciamiento) y queda firmado con la clave privada del Marketplace.
- El wizard **rechaza cualquier paquete sin firma válida**, incluso si el usuario lo sube manualmente (opción "instalar desde archivo local" debe ser un flag explícito de modo desarrollador, no el flujo default).
- Addons Enterprise validan licencia comercial del tenant contra el servicio de licenciamiento antes de descomprimir (esto reutiliza directamente el modelo dual Community/Enterprise ya definido).

---

## 8. Fases de implementación sugeridas (próximos FEAT-ID libres: desde FEAT-140)

| Fase | FEAT | Alcance |
|---|---|---|
| 0 | FEAT-140 | Publicar `packages/auth-shared` (y demás `@orderflow/*`) a un registry privado (Verdaccio); actualizar todos los `package.json` de standalones para dejar de usar `file:` |
| 1 | FEAT-141 | Extender schema de `manifest.json` (v2) + script `omniflow-pack` (CLI) que genera el `.tar.gz` + checksum + firma a partir de un módulo/standalone existente |
| 2 | FEAT-142 | Servicio de índice del Marketplace (`index.json` + storage de paquetes) y endpoint de publish (protegido, solo CI/pipeline interno firma) |
| 3 | FEAT-143 | Backend del validador: los 7 pasos de la sección 5, como servicio + cola BullMQ, con tabla `InstalledAddon` (tenant-scoped) |
| 4 | FEAT-144 | Installer Wizard UI (`/admin/marketplace`) sobre Refine.dev, siguiendo el patrón visual ya usado en el resto del admin |
| 5 | FEAT-145 | Endurecimiento: firma/verificación real (no solo checksum), validación de licencia Enterprise, modo "instalar desde archivo local" resguardado |

Cada fase se puede entregar, como en tus otros planes, como un prompt de implementación autocontenido en Markdown si querés que los desarrolle uno por uno.

---

## 9. Preguntas abiertas para cerrar el diseño

- ¿El Marketplace es solo interno (vos publicando tus propios módulos Community/Enterprise) o desde el día 1 contemplás terceros publicando addons de otros desarrolladores?
- ¿El registry privado de npm (`packages/auth-shared`) lo hosteás vos (Verdaccio en Hetzner) o preferís un servicio administrado (GitHub Packages, npm privado)?
- ¿La instalación de un addon Enterprise sin licencia válida debe bloquearse por completo, o instalar en modo "trial" con límite de tiempo?
