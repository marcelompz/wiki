# Anti-Corruption Layer (ACL) — OmniFlow / OrderFlow

**Versión:** 1.0  
**Fecha:** 2026-08-13  
**Contexto:** Extracción de módulos standalone (Giveaways → Social Catalog → Bio-Links)  
**Relacionado:** `SCHEMA_DECOUPLING_PLAN.md`, `GIVEAWAYS_SCHEMA_EXTRACTION.md`

---

## 1. ¿Qué es y por qué lo necesitamos?

Un **Anti-Corruption Layer** es un límite explícito entre dos modelos de dominio que no deben contaminarse entre sí.

En OmniFlow tenemos dos mundos:

| Mundo | Dueño | Modelo de identidad de persona | Modelo de tenant |
|-------|-------|-------------------------------|------------------|
| **Core (Commerce + Platform)** | Monolito | `Contact` (CRM unificado, roles, direcciones, taxId…) | `Tenant` completo (branding, isolationTier, billing…) |
| **Giveaways Standalone** | Microservicio | `Participant` (mínimo para sorteos) | Solo `tenantId: string` |

Si el standalone importa el Prisma Client del core (o hace `include: { contact: true }`), **hereda el acoplamiento**: cada cambio en `Contact` rompe Giveaways, el client pesa 64 modelos y el módulo deja de ser vendible por separado.

El ACL es el contrato que dice:

> “Del otro lado existe un Contact. Yo no lo conozco. Solo conozco un Participant y, si hace falta, una referencia opaca (`externalContactId`).”

---

## 2. Principios del ACL en este proyecto

1. **El standalone nunca importa modelos Prisma del core.**  
   Ni `Contact`, ni `Tenant`, ni `Order`, ni `Product`.

2. **Identidad mínima.**  
   - Tenant → `tenantId: string` validado por `auth-shared` / API interna.  
   - Persona → `Participant` local + `externalContactId?`.

3. **Snapshot, no join.**  
   Si necesitas nombre/email/phone en el momento del registro, **los copias** al Participant. No confías en que el Contact siga igual mañana.

4. **Referencias opacas.**  
   `externalContactId` es un string. El standalone no hace `prisma.contact.findUnique`. Si necesita datos frescos, llama a una API del core (o consume un evento).

5. **Dirección de dependencia única.**  
   - Standalone → Core: permitido (validar tenant, opcionalmente “asegurar Contact”).  
   - Core → Standalone: solo por **eventos** o API pública del standalone.  
   - Nunca: tablas compartidas con FK Prisma cross-schema.

6. **Idempotencia.**  
   Crear/actualizar Participant a partir de un Contact (o de OAuth) debe ser seguro de reintentar.

---

## 3. ACL de Giveaways: el modelo `Participant`

### 3.1 Por qué no reutilizar `Contact`

`Contact` en el core incluye:

- Roles múltiples (cliente, proveedor, empleado, lead…)
- Direcciones, cuentas bancarias, categorías
- `taxId`, rankings, lead scoring, `parentId` (empresa)
- Relaciones a `User`, `Order`, `LoyaltyCard`, etc.

Un sorteo solo necesita:

- Quién participa (nombre + canal de contacto)
- Evitar doble inscripción
- Poder notificar al ganador
- Trazabilidad opcional hacia el CRM

Forzar `Contact` en el standalone arrastra todo el CRM.

### 3.2 Modelo local

```prisma
model Participant {
  id                String   @id @default(uuid())
  tenantId          String
  externalContactId String?  // referencia opaca al Contact del core
  name              String
  email             String?
  phone             String?
  authProvider      String?  // google | facebook | manual
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  registrations GiveawayRegistration[]
  wins          GiveawayWinner[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([externalContactId])
  @@index([tenantId, phone])
  @@map("participants")
}
```

**Reglas de negocio del Participant:**

| Campo | Regla |
|-------|--------|
| `tenantId` | Obligatorio. Aislamiento multi-tenant. |
| `email` | Único por tenant si está presente. Base del “no doble registro” cuando hay email. |
| `externalContactId` | Opcional. Si existe, apunta a un Contact del core. **No se valida en runtime con Prisma del core.** |
| `name` | Obligatorio. Snapshot en el momento del registro. |
| `phone` / `email` | Snapshots. Pueden desactualizarse respecto al CRM; es aceptable. |
| `authProvider` | Origen de la identidad en el registro (OAuth o manual). |
| `metadata` | Extensible (UTM extra, consentimientos, etc.) sin tocar el schema. |

### 3.3 Mapeo Contact → Participant (migración y runtime)

```
Contact (core)                    Participant (standalone)
──────────────                    ────────────────────────
id                         →      id  (en migración: mismo UUID)
                                  externalContactId = Contact.id
tenantId                   →      tenantId
name                       →      name
email                      →      email
phone / mobile             →      phone
(roles, addresses, …)      →      (ignorados)
```

En **registros nuevos** (post-cut-over):

1. El usuario se registra en la landing del sorteo (OAuth o formulario).
2. El standalone crea/actualiza un `Participant` con los datos del formulario/OAuth.
3. Opcionalmente emite `giveaway.participant.registered`.
4. El core (si está suscrito) puede crear o enriquecer un `Contact` y, si quiere, responder con el `contactId` para que el standalone rellene `externalContactId` en un segundo paso (async, no bloqueante).

No es obligatorio que todo Participant tenga Contact. Un sorteo público puede vivir solo con Participants.

---

## 4. Capas del ACL (implementación)

```
┌─────────────────────────────────────────────────────────────┐
│  Giveaways Standalone                                        │
│                                                              │
│  ┌──────────────┐   ┌──────────────────┐   ┌─────────────┐ │
│  │ Controllers  │ → │ Application      │ → │ Domain      │ │
│  │ (HTTP)       │   │ Services         │   │ Participant │ │
│  └──────────────┘   └────────┬─────────┘   │ Giveaway    │ │
│                              │             └─────────────┘ │
│                              ▼                               │
│                    ┌──────────────────┐                      │
│                    │ ACL / Adapters   │                      │
│                    │  - TenantGuard   │                      │
│                    │  - ContactBridge │  (opcional)          │
│                    │  - EventPublisher│                      │
│                    └────────┬─────────┘                      │
└─────────────────────────────┼───────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   auth-shared /        Core Internal API    Redis / BullMQ
   JWT + API Key        (validate tenant,    (eventos)
                        optional ensure
                        contact)
```

### 4.1 TenantGuard (identidad de tenant)

```ts
// Pseudocódigo — ACL de tenant
async function resolveTenantId(req: Request): Promise<string> {
  // 1. Preferir JWT / API Key ya validados por auth-shared
  const fromAuth = req.auth?.tenantId;
  if (fromAuth) return fromAuth;

  // 2. Validar API Key contra el core (cache Redis)
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const cached = await redis.get(`tenant:apikey:${hash(apiKey)}`);
    if (cached) return cached;

    const tenant = await coreClient.validateApiKey(apiKey);
    // tenant = { id, active }  ← DTO mínimo, NO el modelo Prisma Tenant
    if (!tenant?.active) throw new UnauthorizedException();
    await redis.setex(`tenant:apikey:${hash(apiKey)}`, 120, tenant.id);
    return tenant.id;
  }

  throw new UnauthorizedException();
}
```

**Contrato del DTO de validación (core → standalone):**

```ts
// packages/contracts
export type TenantValidationResult = {
  id: string;
  active: boolean;
  // Solo lo mínimo. Nunca isolationTier, odooConnection, etc.
};
```

El standalone **no** debe pedir ni cachear el modelo Tenant completo.

### 4.2 ContactBridge (opcional, dirección standalone → core)

Solo si el producto quiere que cada participante exista también en el CRM:

```ts
// ACL: el standalone habla en su lenguaje; el bridge traduce
async function ensureExternalContact(input: {
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
}): Promise<string | undefined> {
  try {
    const res = await coreClient.post('/internal/contacts/ensure', {
      tenantId: input.tenantId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      source: 'giveaway',
    });
    // res = { contactId: string }
    return res.contactId;
  } catch {
    // El sorteo no debe fallar si el CRM está caído
    return undefined;
  }
}
```

Uso en el caso de registro:

```ts
async function registerParticipant(cmd: RegisterCommand) {
  const tenantId = cmd.tenantId;

  // 1. Dominio local primero (fuente de verdad del standalone)
  let participant = await participantRepo.findByEmail(tenantId, cmd.email);
  if (!participant) {
    participant = await participantRepo.create({
      tenantId,
      name: cmd.name,
      email: cmd.email,
      phone: cmd.phone,
      authProvider: cmd.authProvider,
    });
  }

  // 2. ACL: intentar vincular Contact (best-effort)
  if (!participant.externalContactId) {
    const contactId = await contactBridge.ensureExternalContact({
      tenantId,
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
    });
    if (contactId) {
      participant = await participantRepo.setExternalContactId(participant.id, contactId);
    }
  }

  // 3. Registrar en el sorteo (regla de unicidad local)
  await registrationRepo.createUnique({
    giveawayId: cmd.giveawayId,
    participantId: participant.id,
    utmSource: cmd.utmSource,
  });

  // 4. Evento de dominio (el core puede escuchar)
  await eventPublisher.publish({
    type: 'giveaway.participant.registered',
    tenantId,
    giveawayId: cmd.giveawayId,
    participant: {
      id: participant.id,
      externalContactId: participant.externalContactId,
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
    },
    utmSource: cmd.utmSource,
    occurredAt: new Date().toISOString(),
  });
}
```

**Importante:** el paso 2 es opcional y no bloqueante. El sorteo funciona aunque el core no responda.

### 4.3 EventPublisher (dirección standalone → resto del sistema)

El standalone publica hechos de su dominio. El core (u otros módulos) se suscriben si les interesa.

```ts
// packages/contracts/src/events/giveaways.ts
export type GiveawayParticipantRegistered = {
  type: 'giveaway.participant.registered';
  tenantId: string;
  giveawayId: string;
  participant: {
    id: string;
    externalContactId?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  utmSource: string;
  occurredAt: string;
};

export type GiveawayDrawn = {
  type: 'giveaway.drawn';
  tenantId: string;
  giveawayId: string;
  winners: Array<{
    participantId: string;
    externalContactId?: string;
    prizeName: string;
    drawOrder: number;
  }>;
  occurredAt: string;
};
```

El core **no** debe hacer queries al schema `giveaways`. Si necesita “ganadores del mes”, consume `giveaway.drawn` y materializa lo que quiera en su propio modelo (o no).

---

## 5. Qué queda **dentro** del límite y qué queda **fuera**

| Concepto | ¿Dónde vive? | ¿Cómo se relaciona? |
|----------|--------------|---------------------|
| Sorteo, premios, fechas, estado | Standalone (`Giveaway`) | — |
| Inscripción, unicidad por sorteo | Standalone (`GiveawayRegistration`) | — |
| Ganadores y orden del sorteo | Standalone (`GiveawayWinner`) | — |
| Persona que participa | Standalone (`Participant`) | Snapshot local |
| CRM / Contact completo | Core | `externalContactId` + eventos |
| Tenant (branding, plan, isolation) | Core | Solo `tenantId` + validación |
| ModuleInstallation (feature flag) | Core | Standalone consulta “¿módulo activo?” vía API/cache |
| Facturación del módulo | Core (Billing) | Core decide si el tenant puede usar Giveaways |

---

## 6. Reglas de no-contaminación (checklist de code review)

Al revisar PRs del standalone, rechazar si:

- [ ] Se importa `@prisma/client` del core o cualquier modelo `Contact` / `Tenant` / `Order`.
- [ ] Existe una FK Prisma hacia tablas del schema `public`.
- [ ] Se hace `include: { contact: true }` o equivalente.
- [ ] Se cachea el objeto Tenant completo (branding, secrets, etc.).
- [ ] Un fallo del core impide registrar un participante (salvo validación de auth, que es obligatoria).
- [ ] Se comparte el mismo Prisma Client generado entre core y standalone.

Aceptar si:

- [ ] Solo se usa `tenantId: string` y DTOs de `packages/contracts`.
- [ ] `externalContactId` es un string opcional sin `@relation` cross-service.
- [ ] Los datos de persona se tratan como snapshot.
- [ ] La comunicación con el core es HTTP interno o eventos, nunca SQL cruzado.

---

## 7. ACL en los siguientes módulos

### 7.1 Social Catalog

- **Riesgo de corrupción:** querer “join” a `Product` / `Order` desde el schema de canales.
- **ACL:**
  - `CatalogChannelConfig` solo conoce `tenantId`.
  - Productos se resuelven por API al Commerce Core (o snapshot en carrito/checkout).
  - IDs de producto son referencias opacas (`productId: string`).
  - Adapters de mensajería (`IMessagingAdapter`) no importan Prisma del core.

### 7.2 Bio-Links

- **Riesgo de corrupción:** bloques JSON que asumen shape de `Product` / `Order` / `Giveaway` del core.
- **ACL — contrato de bloques:**

```ts
type BioBlock =
  | { type: 'link' | 'header' | 'social'; /* self-contained */ }
  | {
      type: 'product' | 'booking' | 'giveaway';
      resourceType: 'product' | 'booking' | 'giveaway';
      resourceId: string;          // opaco
      snapshot?: {                 // opcional, para render sin latencia
        name?: string;
        price?: number;
        imageUrl?: string;
      };
    };
```

- Resolución de `resourceId` → HTTP al dueño del recurso (core o giveaways-standalone), con cache.
- El schema de Bio-Links **no** tiene FK a Product/Order/Giveaway.

### 7.3 Patrón general

```
Para cada concepto externo (Contact, Product, Tenant, Order…):
  1. ¿Lo necesito para la lógica local?
     - No → no lo modeles.
     - Sí, solo identidad → string opaco (externalXxxId).
     - Sí, datos en el momento T → snapshot en tu modelo o en JSON.
  2. ¿Necesito datos frescos después?
     - Evento de actualización, o
     - API de lectura al dueño del dato (nunca SQL).
  3. ¿El otro sistema debe enterarse de mis hechos?
     - Publica eventos de dominio; no escribas en sus tablas.
```

---

## 8. Errores comunes (y cómo evitarlos)

| Error | Consecuencia | Mitigación |
|-------|--------------|------------|
| “Dejo la FK a Contact y listo” | Standalone no es desplegable solo | `Participant` + `externalContactId` |
| “Comparto el schema public” | Migraciones y deploys acoplados | Schema PostgreSQL por módulo |
| “Si falla el core, fallo el registro” | El módulo standalone no es resiliente | ContactBridge best-effort |
| “Cacheo el Tenant entero” | Fuga de secretos / datos de billing | DTO mínimo (`id`, `active`) |
| “El core hace SELECT al schema giveaways” | Acoplamiento invertido | Solo eventos o API del standalone |
| “Reutilizo el mismo Prisma Client” | 64 modelos otra vez | Client generado por servicio |

---

## 9. Resumen ejecutivo

El Anti-Corruption Layer en OmniFlow, para Giveaways, es:

1. **`Participant`** como modelo de persona del dominio de sorteos (no `Contact`).
2. **`tenantId` string** validado por auth (no modelo `Tenant`).
3. **`externalContactId`** como referencia opaca y opcional.
4. **Snapshots** de name/email/phone en el momento del hecho.
5. **ContactBridge** best-effort (standalone → core) si se desea sync con CRM.
6. **Eventos de dominio** para que el resto del sistema reaccione sin conocer el schema de Giveaways.
7. **Prohibición explícita** de Prisma cross-module y de joins SQL entre schemas de bounded contexts.

Con esto, Giveaways puede venderse y desplegarse solo, sin cargar la mochila de 64 modelos, y el Core sigue siendo el dueño del CRM y del billing.

---

*Próximo documento opcional: implementación concreta de `ContactBridge` + tests de contrato del ACL.*
