# PLAN_OMNINFC.md — Plan Maestro de Implementación

**Módulo:** OmniNFC (nombre técnico interno: `nfc-standalone`)
**Tipo:** Microservicio standalone, desacoplado, consumido por todos los servicios de OrderFlow
**Estado:** Planning
**FEAT-IDs:** placeholder — confirmar próximo ID libre contra `featurelist.json` antes de arrancar Sprint 1 (último rango conocido en esta conversación: FEAT-105 a FEAT-110 ya asignados a PLAN_OMNIDINEIN)

---

## 1. Resumen ejecutivo

OmniNFC es un servicio horizontal que resuelve **cualquier tag NFC físico a una entidad de negocio** (mesa, cliente, empleado, producto, activo), sin acoplarse a ningún módulo consumidor. Sigue el mismo patrón ya validado en el ecosistema con `biolinks-standalone`, `whatsapp-catalog-standalone`, `loyalty-standalone`, etc.: un servicio pequeño, con su propio schema, su propio puerto, y su propia ruta Traefik, orquestado por Docker Compose junto al resto de los `*-standalone`.

**Por qué desacoplado y no embebido en POS/RRHH/Inventario:** el mismo tag físico y el mismo mecanismo de lectura sirven para casos de uso completamente distintos (mesas, fichaje, fidelización, activos). Si la lógica de resolución vive dentro de POS, cada módulo nuevo reinventa su propio lector/endpoint. Con un servicio único, cada módulo consumidor solo necesita: (a) registrar sus tags contra sus propias entidades, y (b) llamar a un endpoint de resolución genérico.

**Fuera de alcance de este plan:** pagos contactless con tarjeta (EMV). Eso no es "leer un tag NFC propio" sino integrarse con el SDK del terminal de pago (MercadoPago Point, Getnet, etc.); no pasa por OmniNFC y debería ser un plan aparte si se decide encararlo.

---

## 2. Arquitectura

```
services/
  nfc-standalone/
    src/
      nfc/
        nfc.module.ts
        nfc.controller.ts
        nfc.service.ts
        nfc-tag.entity.ts (Prisma model)
        dto/
          register-tag.dto.ts
          scan-tag.dto.ts
      common/          (reusa @TenantPrisma, guards, interceptors del patrón OrderFlow)
    prisma/
      schema.prisma
    Dockerfile
```

- **Puerto:** siguiente libre en la convención existente (`giveaways-standalone` :3020, `whatsapp-catalog-standalone` :3021, `biolinks-standalone` :3022, `bookings-standalone` :3023, `quotations-standalone` :3024, `loyalty-standalone` :3025, `storefront-builder-standalone` :3026 en planning) → **`nfc-standalone` :3028** (dejando :3027 disponible por si `storefront-builder-standalone` lo toma primero — confirmar contra `docker-compose.standalone.yml` real antes de fijar el puerto).
- **Ruta Traefik:** `nfc.<tenant-domain>` interno, o subpath `/api/v1/nfc/*` enrutado desde el gateway principal si se prefiere no exponer subdominio propio (a decidir en Sprint 1 — dado que este servicio es 100% B2B entre microservicios y no tiene UI pública propia, subpath interno es probablemente más simple que subdominio).
- **Cliente HTTP:** Axios, como manda AGENTS.md — cada servicio consumidor (POS, RRHH, Inventario) usa un cliente Axios delgado (`OmniNfcClient`) en vez de llamar `fetch` directo.
- **Prisma:** nunca instanciado directo — `this.prisma` / `@TenantPrisma()`, igual que el resto del ecosistema.
- **tenantId:** obligatorio en cada tabla y cada query, sin excepción, incluso siendo un servicio "horizontal".

---

## 3. Modelo de datos (Prisma)

```prisma
model NfcTag {
  id          String         @id @default(cuid())
  tenantId    String
  uid         String         // UID físico del chip (NDEF/UID de fábrica)
  entityType  NfcEntityType
  entityId    String         // FK lógica a Table/Customer/Employee/Product/Asset (otro servicio)
  label       String?        // ej: "Mesa 4", "Badge Juan Pérez"
  active      Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@unique([tenantId, uid])
  @@index([tenantId, entityType, entityId])
}

enum NfcEntityType {
  TABLE
  CUSTOMER
  EMPLOYEE
  PRODUCT
  ASSET
}

model NfcScanLog {
  id          String         @id @default(cuid())
  tenantId    String
  tagId       String
  entityType  NfcEntityType
  entityId    String
  scannedBy   String?        // userId del mozo/empleado que escaneó, null si fue autoservicio
  source      String         // "pos-tablet" | "employee-kiosk" | "omnimobile" | etc.
  scannedAt   DateTime       @default(now())

  @@index([tenantId, entityType, entityId])
}
```

`NfcScanLog` no es opcional: da trazabilidad (quién escaneó qué y cuándo), útil tanto para debugging como para casos de auditoría (ej. fichaje de empleados).

---

## 4. API pública

| Método | Endpoint | Uso |
|---|---|---|
| `POST` | `/api/v1/nfc/tags` | Registrar/provisionar un tag físico contra una entidad (admin) |
| `PATCH` | `/api/v1/nfc/tags/:id` | Reasignar o desactivar un tag |
| `GET` | `/api/v1/nfc/tags?entityType=&entityId=` | Listar tags de una entidad |
| `POST` | `/api/v1/nfc/scan` | **Endpoint central** — recibe `{ uid, source, scannedBy? }`, devuelve `{ entityType, entityId, label }` o 404 si el tag no está registrado/activo |
| `GET` | `/api/v1/nfc/logs?entityType=&entityId=` | Historial de escaneos (auditoría) |

Todo módulo consumidor (POS, RRHH, Inventario, futuro OmniMobile) solo necesita conocer estos 5 endpoints. Nunca debe tocar el schema de OmniNFC directamente ni asumir su estructura interna.

---

## 5. Fases de implementación

### Fase 1 — Core del servicio (FEAT-XXX)
**Objetivo:** scaffolding de `nfc-standalone`, modelo Prisma, endpoints de registro y resolución, sin ningún consumidor todavía.

**Prompt de implementación:**
> Crear el servicio `services/nfc-standalone/` siguiendo el patrón de `services/biolinks-standalone/` (mismo Dockerfile base, mismo bootstrap de NestJS, mismo patrón de `@TenantPrisma()`). Implementar el schema Prisma de `NfcTag` y `NfcScanLog` tal como se define en este plan. Implementar `NfcController` con los 5 endpoints listados en la sección 4, con guards de tenant y validación de DTOs. Sin lógica de negocio de POS/RRHH/etc. — este servicio no sabe qué es una "mesa", solo guarda `entityType`/`entityId` como strings opacos. Agregar el servicio a `docker-compose.standalone.yml` en el puerto que corresponda tras confirmarlo contra el compose real. Tests unitarios básicos de scan (tag activo, tag inactivo, tag inexistente, colisión de UID entre tenants).

### Fase 2 — Integración POS: identificación de mesas (staff)
**Objetivo:** el mozo con tablet Android resuelve la mesa vía NFC al iniciar/retomar un pedido.

**Prompt de implementación:**
> En el módulo POS/KDS (dentro del monolito, `backend/src/pos` u `orders`), crear `OmniNfcClient` (wrapper Axios sobre `nfc-standalone`). Al recibir un `uid` desde el frontend Refine.dev (leído vía Web NFC API en Chrome/Android), llamar a `POST /api/v1/nfc/scan` con `source: "pos-tablet"` y `scannedBy: userId` del mozo autenticado. Si `entityType === TABLE`, resolver el pedido activo de `RestaurantTable.entityId` (reusando `sellerId` como dueño, según PLAN_OMNIDINEIN) o crear uno nuevo. Si el navegador no soporta Web NFC (fallback), mantener el flujo manual de selección de mesa por UI ya existente — no romper el camino actual.

### Fase 3 — Integración cliente vía QR (mientras no exista OmniMobile)
**Objetivo:** habilitar el mismo flujo de resolución de mesa para clientes, pero por QR en vez de NFC, dado que el navegador del cliente no es un entorno controlado.

**Prompt de implementación:**
> Reusar el servicio `qr-generator` existente para generar un QR por mesa que apunte a `provecchio.com/mesa/{tableId}` (o el patrón de dominio que corresponda por tenant). La página resultante NO llama a `/nfc/scan` — resuelve directo por `tableId` en la URL, ya que no hay tag físico involucrado en este camino. Este flujo debe quedar terminado y estable del lado cliente-web antes de avanzar a Fase 6 (OmniMobile), según la estrategia de "cerrar primero el lado cliente en OmniFlow web".

### Fase 4 — Integración RRHH: fichaje de empleados
**Objetivo:** lector NFC fijo en la entrada (USB/Bluetooth conectado a un cliente delgado, ej. Raspberry Pi o PC del local) ficha entrada/salida de empleados.

**Prompt de implementación:**
> Registrar un `NfcTag` por empleado (`entityType: EMPLOYEE`) desde el panel admin de RRHH, llamando a `POST /api/v1/nfc/tags`. Construir un pequeño cliente (puede ser un script/servicio dedicado, no necesita ser parte del monolito) que lea el lector físico y llame a `POST /api/v1/nfc/scan` con `source: "employee-kiosk"`. El módulo de RRHH escucha el resultado (vía webhook interno o polling de `NfcScanLog`) y registra el fichaje. Definir regla de negocio para "doble tap" (evitar que dos escaneos seguidos en menos de N segundos generen dos fichajes).

### Fase 5 — Integración fidelización: tarjetas NFC de cliente
**Objetivo:** identificar clientes en el POS al cobrar, para acumular puntos/beneficios, reusando `loyalty-standalone`.

**Prompt de implementación:**
> Registrar `NfcTag` con `entityType: CUSTOMER` al entregar la tarjeta física al cliente (flujo de alta en `loyalty-standalone` o en el POS). Al cobrar, el cajero escanea la tarjeta del cliente (mismo `OmniNfcClient` de Fase 2, `source: "pos-cashier"`), y el POS consulta a `loyalty-standalone` con el `entityId` resuelto para aplicar puntos/descuentos.

### Fase 6 — Preparación de contrato para OmniMobile (sin construir la app)
**Objetivo:** dejar la API de OmniNFC lista para que, cuando arranque el proyecto React Native de OmniMobile, la app nativa solo tenga que agregar la capa de lectura NFC (Core NFC / NfcAdapter) y llamar al mismo `POST /api/v1/nfc/scan` que ya usa el mozo — cero cambios de backend en ese momento.

**Prompt de implementación:**
> No requiere código nuevo en esta fase — es una fase de validación: confirmar que el contrato de `POST /api/v1/nfc/scan` (payload y respuesta) es agnóstico del `source`, y documentar en el README de `nfc-standalone` el flujo esperado para un futuro `source: "omnimobile"`. Si en el futuro se detecta que OmniMobile necesita datos adicionales (ej. token de sesión de la app), extender el DTO ahí, no antes.

---

## 6. Consideraciones de seguridad

- **UID como identificador, no como secreto:** el UID de un tag NDEF estándar se puede clonar con hardware barato. Para mesas y fichaje esto es un riesgo bajo (no hay valor económico directo en clonar el tag de "Mesa 4"). Para fidelización, el riesgo también es bajo (a lo sumo alguien acumula puntos ajenos). **Si en algún momento se evalúa NFC para algo con valor monetario directo, no reusar este mecanismo** — ahí se necesitan tags con autenticación criptográfica (ej. NTAG 424 DNA con SUN/SDM), que es una categoría de hardware distinta y merece su propio plan.
- **Rate limiting** en `/api/v1/nfc/scan` por tenant, para evitar abuso o fuerza bruta de UIDs.
- **Aislamiento multi-tenant estricto:** el índice único es `[tenantId, uid]`, no `[uid]` solo — dos tenants pueden tener tags con el mismo UID de fábrica sin colisionar.

---

## 7. Próximos pasos antes de Sprint 1

1. Confirmar el próximo FEAT-ID libre contra `featurelist.json` real (no contra lo que consta en esta conversación).
2. Confirmar el puerto libre real contra `docker-compose.standalone.yml` (evitar colisión con `storefront-builder-standalone` si ya tomó :3027).
3. Decidir subdominio Traefik propio vs. subpath del gateway principal para `nfc-standalone` (sección 2).
4. Sincronizar este plan en `VERSION`, `ROADMAP.md`, `docs/02-architecture.md` y la Wiki, según el protocolo de AGENTS.md, una vez aprobado.
