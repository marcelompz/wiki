# Plan de Cierre — Aislamiento Multi-Tenant Real (Fase 7 del Blindaje) + JWT_SECRET

> **ESTADO FINAL:** ✅ **100% CERRADO Y COMPLETADO (11 de Septiembre de 2026)**
> **Resultado:** 19/19 módulos de dominio totalmente migrados a `@TenantPrisma()`, `JwtAuthGuard` resolviendo `tenantPrisma` dinámico en tier dedicado, `JWT_SECRET` fail-fast configurado y test de arquitectura anti-regresión `backend/src/common/architecture.spec.ts` 100% pasando en Jest.

**Objetivo:** cerrar la brecha real detectada al auditar el repo v1.26.00: el tráfico de sesión normal (JWT: POS, admin, KDS) nunca setea `request.tenantPrisma`, por lo que cualquier tenant con DB dedicada sigue usando el cliente Prisma compartido para casi todas sus operaciones. Además, eliminar el `JWT_SECRET` hardcodeado presente en 4 archivos.

**Estado de partida (verificado contra el repo, no contra el audit del 2026-09-02 que quedó desincronizado tras el aplanado de `backend/src/` → `backend/`):**
- `@TenantPrisma()` en uso: 5 archivos (`quotations.controller.ts`, `orders.controller.ts`, `customers.controller.ts`, `products.controller.ts`, `modifier-groups.controller.ts`)
- `this.prisma` sin aislar: 61 archivos
- `JwtAuthGuard` NUNCA setea `request.tenantPrisma` — solo `ApiKeyGuard` lo hace
- `JWT_SECRET` con default hardcodeado (`'orderflow-secret-key-change-in-production'`) en: `auth/auth.module.ts`, `auth/jwt-auth.guard.ts`, `auth/auth.service.ts`, `common/api-key.guard.ts`

**Patrón ya validado en el propio código** (no se inventa nada nuevo, se generaliza lo que ya existe en `products`):
- Controller: `@TenantPrisma() db?: PrismaClient` → se pasa al service
- Service: `private getDb(db?: PrismaClient) { return db || this.prisma; }` → cada método acepta `db?: PrismaClient` opcional al final de la firma

---

## Fase 0 — Cortar el `JWT_SECRET` hardcodeado (bloqueante, es la más barata y la más grave)

**Por qué va primero:** no depende de nada más y es la vulnerabilidad más severa (auth completo cae a un secreto público si falta la env var). 15 minutos de trabajo, cero riesgo de regresión funcional si `JWT_SECRET` ya está seteado en producción (que debería estarlo).

**Criterio de aceptación:** la aplicación falla al arrancar (`fail-fast`) si `JWT_SECRET` no está seteado en el entorno; no existe ningún string hardcodeado como fallback en el código.

### PROMPT 0.1 — Eliminar el default hardcodeado de JWT_SECRET

```
Tarea: eliminar el valor por defecto hardcodeado del JWT_SECRET en todo el backend
y reemplazarlo por una validación fail-fast al arranque.

Archivos a modificar:
1. backend/auth/auth.module.ts
2. backend/auth/jwt-auth.guard.ts
3. backend/auth/auth.service.ts
4. backend/common/api-key.guard.ts

Cambios:

A) Crear backend/common/env-validation.ts (si no existe un validador de env
   central) con una función `getRequiredEnv(key: string): string` que:
   - lea process.env[key]
   - si no existe o está vacío, lance un Error inmediato con mensaje claro:
     `Error: la variable de entorno ${key} es obligatoria y no está seteada.
     La aplicación no puede arrancar sin ella.`
   - loguee con Logger de Nest antes de lanzar (severidad ERROR)

B) En auth.module.ts: reemplazar
     configService.get<string>('JWT_SECRET', 'orderflow-secret-key-change-in-production')
   por
     configService.getOrThrow<string>('JWT_SECRET')
   (ConfigService de @nestjs/config ya expone getOrThrow, no hace falta el
   helper custom para este archivo — usarlo directamente)

C) En jwt-auth.guard.ts: mismo cambio, usar
     this.configService.getOrThrow<string>('JWT_SECRET')
   en vez del literal con default.

D) En auth.service.ts: mismo cambio con getOrThrow.

E) En common/api-key.guard.ts: este archivo NO usa ConfigService, usa
   process.env directamente. Reemplazar:
     process.env.JWT_SECRET || 'orderflow-secret-key-change-in-production'
   por una constante de módulo cacheada al primer uso:
     import { getRequiredEnv } from './env-validation';
     ...
     const secret = getRequiredEnv('JWT_SECRET');
   (llamarlo dentro del método, no a nivel de import, para no romper el
   arranque de tests que no seteen la env var salvo que efectivamente
   entren a ese código)

F) Mismo criterio para el otro hardcodeo encontrado de paso en
   api-key.guard.ts: `process.env.MASTER_API_KEY || 'dev-master-key-change-in-prod'`.
   Aplicar el mismo fail-fast con getRequiredEnv('MASTER_API_KEY').

G) Actualizar backend/.env.example (si existe) para documentar que
   JWT_SECRET y MASTER_API_KEY son obligatorias, con un comentario indicando
   que deben generarse con algo como `openssl rand -hex 32` y nunca
   commitearse con un valor real.

No cambiar ninguna lógica de negocio, solo la resolución del secreto.
Verificar que los tests existentes de auth (*.spec.ts) sigan pasando —
si algún test no setea JWT_SECRET en su entorno de test, agregar
`process.env.JWT_SECRET = 'test-secret-only-for-specs'` en el setup
del test (jest setup file o beforeAll), nunca en el código de producción.
```

---

## Fase 1 — Arreglar la raíz: que `JwtAuthGuard` también resuelva `tenantPrisma`

**Por qué esto y no "migrar servicio por servicio" primero:** migrar 14+ servicios a `@TenantPrisma()` sin que `JwtAuthGuard` sepa setear `request.tenantPrisma` no cambia nada — el decorador simplemente va a seguir cayendo a su fallback (`request.app.get('PrismaService')`, es decir, el cliente compartido) en cualquier ruta protegida solo por JWT. Este es el fix que realmente cierra la brecha; la migración de servicios de la Fase 2 en adelante es la que aprovecha ese fix.

**Criterio de aceptación:** una request autenticada solo con JWT (sin `x-api-key`), contra un tenant con `isolationTier` dedicado, llega al controller con `request.tenantPrisma` apuntando al cliente dedicado — verificable con un test de integración.

### PROMPT 1.1 — Extraer la resolución de tenant a un servicio compartido

```
Tarea: extraer la lógica de resolución de tenant + tenantPrisma que hoy vive
duplicada dentro de ApiKeyGuard a un servicio inyectable reutilizable, para
que JwtAuthGuard pueda usarla sin copiar/pegar 80 líneas.

Contexto: backend/common/api-key.guard.ts ya resuelve tenant y tenantPrisma
(ver método canActivate, pasos 3 y 4: busca el Tenant por id, y si
this.tenantConnections existe llama a tenantConnections.getClient(tenant)).
JwtAuthGuard (backend/auth/jwt-auth.guard.ts) solo verifica el JWT y setea
request.user / request.isSuperAdmin, pero nunca toca request.tenant ni
request.tenantPrisma.

Crear backend/common/tenant-resolution.service.ts:

  import { Injectable, Optional } from '@nestjs/common';
  import { PrismaService } from './prisma.service';
  import { TenantConnectionManager } from './tenant-connection.manager';

  @Injectable()
  export class TenantResolutionService {
    constructor(
      private readonly prisma: PrismaService,
      @Optional() private readonly tenantConnections?: TenantConnectionManager,
    ) {}

    async resolveTenantById(tenantId: string) {
      if (!tenantId || tenantId === 'super-admin-global') {
        return { id: 'super-admin-global', name: 'Super Admin', isolationTier: 'shared' };
      }
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant || !tenant.active) return null;
      return tenant;
    }

    async resolveTenantPrisma(tenant: any) {
      if (this.tenantConnections && tenant && tenant.isolationTier) {
        return this.tenantConnections.getClient(tenant);
      }
      return this.prisma;
    }
  }

Registrar TenantResolutionService como provider en backend/common/common.module.ts
(o el módulo donde ya está registrado TenantConnectionManager) y exportarlo.

No modificar todavía ApiKeyGuard ni JwtAuthGuard en este prompt — solo crear
el servicio y agregar un test unitario backend/common/tenant-resolution.service.spec.ts
que cubra: tenant activo con isolationTier dedicado, tenant activo shared,
tenant inactivo/inexistente (debe devolver null), y super-admin-global.
```

### PROMPT 1.2 — Hacer que JwtAuthGuard setee tenant y tenantPrisma

```
Tarea: modificar backend/auth/jwt-auth.guard.ts para que, además de validar
el JWT, resuelva request.tenant y request.tenantPrisma usando el
TenantResolutionService creado en el prompt anterior — replicando lo que
ApiKeyGuard ya hace, sin duplicar su código.

Cambios en jwt-auth.guard.ts:

1. Inyectar TenantResolutionService en el constructor.

2. Dentro de canActivate, después de verificar el payload del JWT y antes
   del `return true` final, agregar:

   const isSuperAdmin = !!payload.isSuperAdmin;
   const resolvedTenantId = payload.tenantId;

   if (resolvedTenantId || isSuperAdmin) {
     const tenant = await this.tenantResolution.resolveTenantById(
       isSuperAdmin && !resolvedTenantId ? 'super-admin-global' : resolvedTenantId,
     );
     if (tenant) {
       (request as any)['tenant'] = tenant;
       (request as any)['tenantPrisma'] = await this.tenantResolution.resolveTenantPrisma(tenant);
     }
   }

   Mantener intacta la validación existente
   "El token no pertenece al entorno actual" (payload.tenantId vs reqTenant.id)
   — debe ejecutarse ANTES de sobreescribir request.tenant con el resuelto,
   usando el request.tenant que ya pudiera existir seteado por un guard
   anterior (p.ej. un middleware de subdominio), igual que hoy.

3. Si el JWT no trae tenantId y el usuario no es super admin, NO lanzar error
   nuevo (mantener compatibilidad con endpoints que resuelven tenant por otra
   vía, p.ej. middleware de subdominio) — simplemente no setear tenantPrisma
   y dejar que el decorador @TenantPrisma() caiga a su fallback como hasta
   ahora.

4. Actualizar el test backend/auth/jwt-auth.guard.spec.ts (crearlo si no
   existe) cubriendo:
   - JWT válido con tenantId de un tenant con isolationTier 'dedicated'
     → request.tenantPrisma debe ser el cliente dedicado (mockear
     TenantResolutionService)
   - JWT válido con tenantId de un tenant 'shared' → tenantPrisma es el
     compartido
   - JWT de super admin sin tenantId → tenant = super-admin-global
   - JWT inválido → sigue lanzando UnauthorizedException como antes (no
     tocar ese comportamiento)

No cambiar el orden de guards en ningún controller en este prompt — este
prompt solo toca jwt-auth.guard.ts y su test.
```

### PROMPT 1.3 — Test de integración end-to-end del fix de raíz

```
Tarea: agregar un test e2e (o de integración con supertest sobre el módulo
de Nest levantado en memoria, según el patrón que ya usen los .spec.ts de
guards en este repo) que pruebe el flujo completo:

1. Crear un tenant de prueba con isolationTier = 'dedicated' y una
   dedicatedDatabaseUrl apuntando a una base de test (o mockear
   TenantConnectionManager.getClient para devolver un PrismaClient mock
   distinguible del compartido).
2. Generar un JWT válido con ese tenantId (sin api-key, sin header
   x-tenant-id).
3. Hacer una request GET a un endpoint protegido solo por JwtAuthGuard
   (no por ApiKeyGuard) que use @TenantPrisma() en su controller —
   si no existe ninguno todavía, usar temporalmente el endpoint de
   products (GET /api/v1/products) para esta prueba, ya que products
   ya está migrado.
4. Verificar que el mock/spy de tenantConnections.getClient fue llamado
   con el tenant correcto, confirmando que el cliente dedicado (y no el
   compartido) fue el que efectivamente se usó para resolver la request.

Este test es el criterio de aceptación real de la Fase 1: si pasa, la
brecha de raíz está cerrada para cualquier servicio que ya esté migrado
a @TenantPrisma(), sin importar qué guard protege la ruta.
```

---

## Fase 2 — Migrar los 14 servicios de riesgo ALTO

Con la Fase 1 cerrada, migrar servicio por servicio deja de ser cosmético — cada uno que se migre queda realmente aislado, sin importar si la request llegó por JWT o por API key. Se migra siguiendo exactamente el patrón ya usado en `products`.

**Orden sugerido** (por criticidad de datos + por reutilización, ya que `inventory` es dependencia de `products` y conviene migrarlo junto):

1. `orders` — ya tiene el controller migrado (`orders.controller.ts` usa `@TenantPrisma()`), falta migrar `orders.service.ts` si aún no acepta `db?`
2. `customers` — mismo caso: controller ya migrado, verificar el service
3. `products` — ya migrado por completo (referencia)
4. `inventory`
5. `bookings`
6. `contacts`
7. `biolinks`
8. `loyalty`
9. `giveaways`
10. `qr`
11. `social-catalog`
12. `tags`
13. `ribbons`
14. `catalog`

### PROMPT 2.1 — Auditar cuáles de los 3 "ya migrados" (orders, customers, quotations) tienen el service realmente migrado

```
Tarea: antes de migrar nada nuevo, verificar si orders.service.ts,
customers.service.ts y quotations.service.ts ya aceptan `db?: PrismaClient`
en sus métodos (como products.service.ts), o si el controller migrado a
@TenantPrisma() está pasando el parámetro `db` a un service que igual usa
this.prisma internamente y lo ignora (migración "a medias", peor porque da
falsa sensación de seguridad).

Comando de verificación:
  cd backend
  for f in orders customers quotations; do
    echo "=== $f ==="
    grep -n "db?: PrismaClient\|getDb(db)" $f/$f.service.ts || echo "NO MIGRADO EN EL SERVICE"
  done

Reportar el resultado exacto antes de continuar — si alguno de los 3 dice
"NO MIGRADO EN EL SERVICE", ese archivo entra a la lista de la Fase 2 con
prioridad 0 (más urgente que los 14 nuevos), porque hoy da una falsa
sensación de estar resuelto.
```

### PROMPT 2.2 — Plantilla de migración (repetir por cada servicio de la lista)

```
Tarea: migrar el módulo "{{MODULO}}" (ej: inventory, bookings, contacts...)
del patrón this.prisma al patrón @TenantPrisma(), replicando exactamente
lo hecho en backend/products/.

Archivos: backend/{{MODULO}}/{{MODULO}}.controller.ts y
          backend/{{MODULO}}/{{MODULO}}.service.ts
(ajustar nombres si el módulo tiene una estructura de archivos distinta,
p.ej. bookings/services/bookings.service.ts)

Paso 1 — Service:
  1. Importar PrismaClient de '@prisma/client' si no está importado.
  2. Agregar el método privado:
       private getDb(db?: PrismaClient) {
         return db || this.prisma;
       }
  3. Para cada método público del service que haga una query a la base
     de datos usando this.prisma directamente:
     - Agregar un parámetro opcional `db?: PrismaClient` al final de su
       firma
     - Al inicio del método, agregar: `const prisma = this.getDb(db);`
     - Reemplazar todas las referencias a `this.prisma.` dentro de ESE
       método por `prisma.` (la variable local, no this.prisma)
  4. Si el service llama a métodos de OTRO service inyectado (como
     products.service.ts llama a tagsService o ribbonsService), NO
     asumir que ese otro service ya está migrado — dejarlo como está en
     esta pasada, se migra en su propio turno. No propagar `db` a
     dependencias que no lo esperan todavía.

Paso 2 — Controller:
  1. Importar TenantPrisma: `import { TenantPrisma } from '../common/tenant-prisma.decorator';`
     e importar PrismaClient de '@prisma/client' si falta.
  2. Para cada endpoint que llame a un método del service que ahora
     acepta `db?`, agregar el parámetro `@TenantPrisma() db?: PrismaClient`
     a la firma del método del controller, y pasar `db` como último
     argumento en la llamada al service.

Paso 3 — Verificación:
  1. Correr los tests existentes del módulo:
       npx jest {{MODULO}} --silent
  2. Si no existen tests para el service, NO es bloqueante para este
     prompt (se cubre en Fase 4), pero dejarlo anotado en el resultado.
  3. Confirmar con grep que no quedó ningún `this.prisma.` suelto en
     métodos que sí deberían estar aislados:
       grep -n "this\.prisma\." backend/{{MODULO}}/{{MODULO}}.service.ts

Reportar, para este módulo específico: cuántos métodos se migraron,
cuáles quedaron sin migrar y por qué (p.ej. cron jobs internos que
intencionalmente deben usar el prisma compartido porque no tienen
contexto de tenant en ese punto — esos SÍ pueden quedar con this.prisma,
documentarlo con un comentario en el código: // Intencional: job sin
contexto de tenant, usa conexión compartida).
```

Ejecutar el Prompt 2.2 once veces (una por módulo), en el orden de la lista de arriba. Cada ejecución es independiente y se puede revisar/mergear por separado.

---

## Fase 3 — Regla de lint que impida retroceder

**Criterio de aceptación:** cualquier PR nuevo que agregue `this.prisma.` fuera de `common/`, `queues/`, `events/`, `health/`, `currency/`, `deploy-manager/` falla el lint/CI automáticamente.

### PROMPT 3.1 — Regla ESLint custom

```
Tarea: agregar una regla de ESLint que prohíba declarar
`private readonly prisma: PrismaService` o `private prisma: PrismaService`
como propiedad de clase en cualquier archivo *.service.ts o
*.controller.ts fuera de las carpetas permitidas
(backend/common/, backend/queues/, backend/events/, backend/health/,
backend/currency/, backend/deploy-manager/).

Opción recomendada: usar `no-restricted-syntax` de ESLint en
backend/.eslintrc.js (o el archivo de config que corresponda) con un
selector AST que matchee la declaración de esa propiedad, con overrides
por carpeta para las excepciones. Si el proyecto usa eslint flat config,
adaptar la sintaxis correspondiente.

Agregar también un test de arquitectura simple en
backend/common/architecture.spec.ts (crear si no existe) que use
`grep`/`fs` desde Node para escanear el árbol de backend/ y falle si
encuentra `this.prisma.` en archivos fuera de las carpetas permitidas —
esto sirve como red de seguridad incluso si alguien deshabilita el
lint localmente, porque architecture.spec.ts corre en el mismo `npm test`
que el resto de la suite y por lo tanto en CI.

Correr el nuevo test/lint contra el estado actual del repo y listar
cuántos archivos "rompen" la regla hoy (deberían ser los que todavía no
se migraron en Fase 2) — no arreglarlos en este prompt, solo dejar la
regla en modo "warning" para los archivos ya identificados como pendientes
(usar un archivo de excepciones temporal, p.ej.
backend/common/.tenant-prisma-migration-allowlist.json con la lista de
paths pendientes) y en modo "error" para cualquier archivo nuevo que no
esté en esa lista.
```

---

## Fase 4 — Cerrar la brecha de documentación

**Por qué:** `PLAN_BLINDAJE_ORDERFLOW.md` dice hoy "🟡 Parcial (16 archivos ya migrados)" y el número real verificado es 5. Si no se corrige, la próxima persona (o el próximo yo) va a asumir que el problema está más resuelto de lo que está.

### PROMPT 4.1 — Actualizar el estado real en la documentación

```
Tarea: actualizar docs/plans/PLAN_BLINDAJE_ORDERFLOW.md y
docs/audits/audit-this-prisma-usage-2026-09-02.md para reflejar:

1. Que el conteo original (77 archivos this.prisma / 16 con @TenantPrisma)
   se hizo contra una estructura de carpetas backend/src/ que ya no
   existe (el backend está aplanado directamente en backend/), y por lo
   tanto el script de auditoría original no es reproducible tal cual
   está escrito.

2. Actualizar el script del audit a:
     cd backend
     grep -rln "this\.prisma\." . --include="*.ts" | grep -v ".spec.ts" | grep -v node_modules
     grep -rln "@TenantPrisma" . --include="*.ts" | grep -v ".spec.ts" | grep -v node_modules

3. Registrar los conteos reales post-Fase 2 (correr el script actualizado
   y pegar el resultado real, no estimarlo).

4. Cambiar el estado de la Fase 7 en PLAN_BLINDAJE_ORDERFLOW.md de
   "🟡 EN PROGRESO" a reflejar el estado real después de ejecutar las
   fases de este plan (0 a 3), incluyendo la mención explícita de que
   el fix de raíz fue el de JwtAuthGuard (Fase 1 de este documento),
   sin el cual la migración de servicios era cosmética.

No modificar el resto del contenido de PLAN_BLINDAJE_ORDERFLOW.md
(fases 1 a 6 quedan como están, ya verificadas).
```

---

## Orden de ejecución recomendado

| Fase | Qué | Bloqueante para |
|---|---|---|
| 0 | JWT_SECRET fail-fast | Nada, independiente — hacerla ya |
| 1 | Fix de raíz en JwtAuthGuard | Todo lo demás — sin esto, la Fase 2 es cosmética |
| 2 | Migrar 14 servicios de riesgo alto | Deploy a producción con confianza de aislamiento real |
| 3 | Lint/test de arquitectura | Evitar regresión futura |
| 4 | Documentación | Nada técnico, pero evita que se repita el malentendido |

No es necesario esperar a terminar Fase 2 completa para deployar — cada servicio migrado en Fase 2 mejora el aislamiento de forma incremental una vez cerrada la Fase 1. Lo que sí es estrictamente secuencial es 0 → 1 → (2 en cualquier orden interno) → 3 → 4.
