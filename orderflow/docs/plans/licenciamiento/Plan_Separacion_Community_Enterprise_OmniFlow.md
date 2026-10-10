# Plan de separación Community / Enterprise — OmniFlow

**Fecha:** 28 de septiembre de 2026
**Alcance:** paso a producción de OmniGastro, creación del repositorio Enterprise, cambio de licencia del repo actual (MIT → AGPLv3) y arquitectura de alojamiento en servidor.

> Este documento es un plan técnico/operativo. Las decisiones jurídicas (texto de la licencia, cesiones, IP Audit, "obra combinada" bajo AGPLv3) deben validarse con el abogado. Documentos base: `Plan_de_Licenciamiento__Gobierno_y_Ecosistema_OmniFlow.md` y `PLAN_LICENCIAMIENTO_OMNIFLOW.md`.

---

## 1. Punto de partida

- El repositorio actual **siempre fue y es privado**, con licencia MIT declarada.
- Hoy se pasa a producción la feature enterprise **OmniGastro**.
- Objetivo: a partir de ahí, (1) crear un repo privado para las features Enterprise, (2) mover a él los módulos de esas verticales y (3) cambiar la licencia del repo actual a AGPLv3.

### Consecuencias de que el repo sea privado

- El MIT no tiene efecto práctico hacia afuera: nadie tiene derechos MIT sobre el código, salvo quien haya recibido una copia con el archivo `LICENSE` (freelancers, Crossnexion, clientes con entregas white-label). El IP Audit debe confirmar qué copias salieron y bajo qué términos.
- Se puede relicenciar sin problema de fondo, siempre que se tengan los derechos sobre todo el código, incluido el de terceros.
- No hay urgencia de reescribir el historial del repo actual para separar Gastro, porque el historial es privado.
- El riesgo aparece **el día de publicar Community**: si se publica con el historial completo, quedan expuestos los módulos Enterprise que estuvieron dentro, posibles secretos y código de clientes. Por eso Community debe publicarse desde un **snapshot limpio** (o historial filtrado) una vez completada la Fase 0.

### Inconsistencia a resolver

El README de la wiki declara licencia "Propietario - OrderFlow Team", mientras el repo de código se describe como MIT. Debe definirse cuál es el estado real de cada repo antes de tocar nada. (También hay versiones distintas en el README: 1.37.0 vs 1.27.10, y Traefik v3.3 vs v3.4.)

---

## 2. Decisiones ya cerradas (según el plan de licenciamiento)

| Decisión | Estado |
|---|---|
| Licencia Community | AGPLv3 |
| Licencia Enterprise | Propietaria, a redactar con abogado |
| Marca OmniFlow | Separada jurídicamente del código |
| IP Audit | Fase 0, bloqueante para publicar Community |
| CLA vs DCO | Pendiente |
| Ecosistema de terceros | OmniFlow Marketplace + OmniFlow Harness |

**Regla de oro:** ningún código de procedencia externa entra a Enterprise sin verificar antes su cadena de titularidad.

**Principio:** Community es la plataforma; Enterprise es la capa de inteligencia, compliance, integración y escala. Las funcionalidades Enterprise nuevas nacen privadas y nunca se cierra código que ya fue público.

---

## 3. Secuencia recomendada

| # | Cuándo | Acción |
|---|---|---|
| 1 | Hoy | Go-live de OmniGastro. Tag de esa versión (`v-gastro-golive`) y congelamiento. No refactorizar el mismo día. |
| 2 | Esta semana | Crear repo privado Enterprise (vacío). Extraer Gastro con historial (`git filter-repo`). Sacar Gastro del repo actual en una rama aparte. |
| 3 | Esta semana | Separar migraciones y modelos Prisma de Gastro. Definir el punto de extensión (registro de módulos) en Community. |
| 4 | Esta semana | Agregar CI anti-contaminación en Community (script de frontera + gitleaks). |
| 5 | En paralelo | Iniciar IP Audit (Fase 0): titularidad, terceros, clientes/white-label, SBOM, derivación de Odoo. |
| 6 | Cuando el abogado cierre el texto (Fase 2) | Cambiar la licencia del repo actual a AGPLv3. Puede hacerse ya sin efecto externo, pero conviene esperar para no hacerlo dos veces. Mientras tanto, `LICENSE` "todos los derechos reservados" en el repo Enterprise. |
| 7 | Fase 4 | Decidir DCO/CLA **antes** de aceptar cualquier contribución externa. |
| 8 | Fase 7 | Publicar Community desde un snapshot limpio, solo tras completar las fases anteriores. |

---

## 4. Separación de módulos y repositorios

### 4.1 Extracción de Gastro

Script: `extract-gastro.sh` (entregado por separado). Pasos que realiza:

1. Verifica que el repo no tenga cambios sin commitear y que existan las rutas configuradas.
2. Crea un tag del estado actual (punto de retorno).
3. Hace un clon nuevo y aplica `git filter-repo` conservando solo las rutas de Gastro con su historial.
4. Se detiene para que revises el resultado y corras `gitleaks` antes de publicar.
5. Empuja al repo privado Enterprise.
6. Elimina Gastro del repo actual en la rama `chore/extract-gastro`, sin tocar `main`.

Se ejecuta primero en modo simulación (sin argumentos) y luego con `--apply`.

**Qué debe ajustarse:** `GASTRO_PATHS` (rutas reales), `ENTERPRISE_REMOTE` (repo privado vacío) y, si aplica, las migraciones propias de Gastro.

### 4.2 Lo que `filter-repo` no resuelve (trabajo manual)

`filter-repo` solo extrae archivos completos. Lo que Gastro tenga metido en archivos compartidos debe separarse a mano:

- Modelos y migraciones en `schema.prisma`.
- Registro en `AppModule` / routers del backend y en `AdminApp.tsx` / `App.tsx`.
- `docker-compose.prod.yml` y labels de Traefik.

La solución limpia es que Community exponga un **registro de módulos** y Gastro se enchufe desde el repo privado.

### 4.3 Qué es base y qué es Gastro

El README lista KDS multi-estación con SLA y explosión de BoM en el repo compartido, mientras el plan asigna a Community solo un "KDS básico" y a Enterprise el multi-sucursal y NFC. Debe definirse el límite: la base (POS, KDS básico, BoM simple) se queda en Community; lo avanzado pasa a Enterprise.

### 4.4 Frontera Community → Enterprise

La dependencia va en un solo sentido: **Enterprise usa Community por API o paquete; Community nunca importa Enterprise.**

Script: `check-community-boundary.sh` + workflow `community-boundary.yml` (entregados por separado). Fallan si Community referencia:

- paquetes o rutas Enterprise (patrones configurables),
- submódulos apuntando a repos enterprise,
- dependencias `@omniflow/enterprise*` en `package.json`.

Además el workflow corre `gitleaks` sobre el historial completo. Opcionalmente puede agregarse `license-checker` para el SBOM.

---

## 5. Arquitectura de alojamiento en servidor

**Idea central:** Community y Enterprise se componen **al ejecutarse**, no en el código. Cada lado tiene su imagen Docker, su pipeline y su schema de base de datos.

```
                 Traefik v3.4 (SSL, rutas por tenant)
                    │                       │
        ┌───────────▼───────────┐ ┌─────────▼─────────────┐
        │ Community (AGPLv3)    │ │ Enterprise (privado)  │
        │  Core backend         │◄┤  OmniGastro           │
        │  Frontend + registro  │ │  Otros módulos        │
        │  Microservicios base  │ │  Manifiesto de módulo │
        └───────────┬───────────┘ └─────────┬─────────────┘
                    │                       │
        PostgreSQL: schema core   PostgreSQL: schema gastro
        (RLS por tenantId)        (sin FK hacia core)
```

La flecha entre contenedores indica que Enterprise consume la API de Core, nunca al revés.

### 5.1 Reglas

1. **Dos imágenes, dos registros.** El repo Community publica `omniflow-core` y sus microservicios básicos (sin código Enterprise). El repo privado construye `omniflow-gastro` y demás módulos, y los sube a un registro privado. Producción hace pull de ambos.
2. **Dos archivos compose.** `docker-compose.yml` (Community) funciona solo, porque quien se autoaloje Community debe poder levantarlo sin nada de Enterprise. `docker-compose.enterprise.yml` (repo privado) agrega los servicios Enterprise. En producción SaaS: `-f docker-compose.yml -f docker-compose.enterprise.yml`.
3. **Traefik enruta; Core no necesita conocer a Enterprise.** Cada servicio Enterprise se anuncia con sus propias labels (prefijo `/api/v1/gastro` o subdominio). Community funciona igual si ese contenedor no existe.
4. **Redes separadas.** `edge` solo para Traefik; `internal` para core, servicios Enterprise, Postgres y Redis. La base de datos nunca se expone.
5. **Datos: cada uno dueño de lo suyo.** Core es dueño del schema `core`; cada módulo Enterprise tiene su propio schema, migraciones y `schema.prisma` en su repo. Enterprise referencia a Core solo por IDs (`tenantId`, `productId`), sin claves foráneas hacia tablas de Core. Para el tier con DB dedicada (como `orderflow-company`), el servicio Enterprise resuelve el DSN por tenant igual que Core.
6. **Identidad y licencia en tres capas.**
   - Presencia del servicio: si el contenedor no está desplegado, la función no existe.
   - Derecho del tenant: el JWT emitido por Core incluye `tenantId` y `modules: ["gastro", ...]`; los servicios Enterprise validan la firma con la clave pública de Core.
   - Validación de licencia dentro del propio servicio Enterprise.
   Los feature flags no son el mecanismo principal de protección.
7. **Punto de extensión en la UI.** Core expone `/api/v1/modules/manifest`. Cada módulo publica `/.well-known/omniflow-module.json` con id, versión, rutas, ítems de menú, permisos y versión mínima de la API de Core. El frontend Community lee los manifiestos y muestra los módulos presentes. A futuro, la UI Enterprise puede cargarse como remote (Module Federation de Vite); mientras tanto, un build de frontend separado.

### 5.2 Patrón de paquetes privados (OmniLedger)

Para módulos que comparten proceso con Core (fiscal, banking): build multi-etapa en el repo privado (`FROM omniflow-core:community` + `COPY` de paquetes privados). Community define una interfaz de plugin (módulos dinámicos de NestJS) que carga lo que encuentre en un directorio de plugins.

**Riesgo jurídico:** al correr en el mismo proceso que un Core AGPLv3, la línea de "obra combinada" es menos clara que con un microservicio aparte. Por defecto usar **microservicio separado** (como Gastro) y paquetes privados solo cuando sea imprescindible.

### 5.3 Versionado y despliegue

- Contrato de API versionado de Core (`v1`) y matriz de compatibilidad: cada módulo Enterprise declara qué versión de Core soporta.
- CI por repo: tests, build de imagen y push. El deploy a Hetzner solo hace pull de tags concretos.
- Un solo VPS alcanza al inicio. Al ser contenedores independientes, un servicio Enterprise puede moverse a otro servidor sin tocar Core.

---

## 6. Pendientes y preguntas abiertas

**Para el abogado**
- Texto final de AGPLv3 Community y de la Enterprise License.
- Dónde termina la "obra combinada" con AGPLv3 (microservicio separado vs. paquete en el mismo proceso).
- Cesiones de derechos de freelancers, contratistas y Crossnexion; código white-label o B2B desarrollado para clientes.
- DCO vs CLA.

**Técnicos**
- Rutas reales de Gastro y límite exacto base/Enterprise del POS y KDS.
- Diseño del registro de módulos en Community y del manifiesto.
- Separación de migraciones y modelos Prisma de Gastro.
- Definición del registro privado de imágenes y política de tags.
- Archivos compose (base y override Enterprise) con labels de Traefik y redes, a partir del `docker-compose.prod.yml` actual.

**Documentación**
- Unificar versión (1.37.0 vs 1.27.10), versión de Traefik y la licencia declarada en el README.

---

## 7. Entregables asociados

| Archivo | Uso |
|---|---|
| `extract-gastro.sh` | Extrae Gastro con historial al repo privado y lo quita del repo actual (rama aparte). |
| `check-community-boundary.sh` | Falla si Community referencia código Enterprise. Va en `scripts/` del repo Community. |
| `community-boundary.yml` | Workflow de GitHub Actions (frontera + gitleaks). Va en `.github/workflows/`. |
