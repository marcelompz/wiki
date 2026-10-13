# Diseño: KDS Configurable Multi-Estación + Impresión Selectiva

> **Vertical:** OmniGastro / OmniDineIn  
> **Fecha:** 2026-09-27  
> **Alcance:** KDS configurable por centro de producción + impresión opcional desde POS/KDS  
> **Fuente de verdad:** `docs/plans/omnigastro/PLAN_MAESTRO.md`  

---

## 1. Problema

Hoy el routing de comandas a KDS es **unidestino por línea**:
- Un producto se asigna a la primera `PreparationStation` cuya categoría coincida.
- No existe forma de que un producto aparezca en **múltiples KDS** (ej: una hamburguesa en cocina y barra).
- No existe forma de que un producto **no aparezca en ningún KDS** (ej: productos de exhibición, regalos).
- La impresión está **declarada pero no implementada**: campos en `PosConfig` sin servicio backend ni UI.

---

## 2. Objetivos de Diseño

1. **KDS multi-destino real**: un producto puede verse en 0, 1 o N centros de producción.
2. **Routing determinista**: un pedido genera **un ticket por estación destino**, no por línea.
3. **Impresión opcional y configurable**: auto-print al confirmar, al cobrar, o manual desde KDS/POS.
4. **Independencia de modo servicio**: `TABLE` y `BAR` comparten la misma lógica de impresión.
5. **Escalabilidad**: soporte para impresoras de red, Bluetooth y USB (Tauri).

---

## 3. Cambios en el Modelo de Datos

### 3.1 `Product` — modo de visibilidad KDS

```prisma
enum KdsVisibilityMode {
  ALL_STATIONS    // Visible en todas las estaciones activas
  SELECTED        // Solo estaciones seleccionadas abajo
  NONE            // No visible en ningún KDS
}

model Product {
  // ... campos existentes ...

  kdsVisibilityMode KdsVisibilityMode @default(ALL_STATIONS)
  showInKDS          Boolean           @default(true) @map("show_in_kds")

  // Relación N:N con estaciones (solo relevante cuando kdsVisibilityMode = SELECTED)
  preparationStationLinks ProductPreparationStation[]

  @@map("products")
}
```

**Reglas de negocio:**
- `showInKDS = false` siempre oculta el producto, sin importar el modo.
- `kdsVisibilityMode = NONE` siempre oculta el producto, sin importar `showInKDS`.
- `kdsVisibilityMode = SELECTED` requiere al menos una estación vinculada; si no hay ninguna, el producto no aparece en ningún KDS.

---

### 3.2 Tabla intermedia `ProductPreparationStation`

```prisma
model ProductPreparationStation {
  id              String           @id @default(uuid())
  tenantId        String
  productId       String
  stationId       String
  isVisible       Boolean          @default(true)  // Control fino por producto-estación
  printOnStation  Boolean          @default(false) // Si se imprime automáticamente al crear ticket en esta estación

  product  Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  station  PreparationStation @relation(fields: [stationId], references: [id], onDelete: Cascade)

  @@index([tenantId, productId])
  @@index([tenantId, stationId])
  @@unique([tenantId, productId, stationId])
  @@map("product_preparation_stations")
}
```

---

### 3.3 `PreparationStation` — configuración de impresión

```prisma
model PreparationStation {
  // ... campos existentes ...

  // Configuración de impresión
  printerEnabled           Boolean   @default(false)
  printerType              String?   @default("ESC_POS_NETWORK") // ESC_POS_NETWORK | ESC_POS_BLUETOOTH | ESC_POS_USB | NONE
  printerName              String?   // Nombre descriptivo (ej: "Impresora Cocina 1")
  printerIp                String?
  printerPort              Int?      @default(9100)
  printerPath              String?   // Para USB/Bluetooth (ruta sistema o BT address)
  printerModel             String?   // Modelo para ajustar comandos ESC/POS
  autoPrintOnNewTicket     Boolean   @default(true)
  printCopies              Int       @default(1)
  lastPrintStatus          String?   // OK | ERROR | OFFLINE | TIMEOUT
  lastPrintStatusUpdatedAt DateTime?

  // Relación inversa
  productLinks ProductPreparationStation[]

  @@map("preparation_stations")
}
```

---

### 3.4 `KitchenTicket` — trazabilidad de impresión

```prisma
model KitchenTicket {
  // ... campos existentes ...

  printedAt          DateTime?
  printedBy          String?
  printCount         Int       @default(0)
  lastPrintStatus    String?   // OK | ERROR | OFFLINE | TIMEOUT
  printErrorDetail   String?

  @@map("kitchen_tickets")
}
```

---

### 3.5 `KitchenPrintJob` — cola de impresión

```prisma
model KitchenPrintJob {
  id              String           @id @default(uuid())
  tenantId        String
  ticketId        String?
  orderId         String?
  stationId       String?
  jobType         String           // TICKET | BILL | REPRINT
  payload         Json             // Datos crudos del ticket/boleta para reimprimir
  status          String           @default("PENDING") // PENDING | PRINTING | OK | ERROR | CANCELLED
  attempts        Int              @default(0)
  maxAttempts     Int              @default(3)
  lastError       String?
  printedAt       DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([tenantId, status])
  @@index([ticketId])
  @@map("kitchen_print_jobs")
}
```

---

### 3.6 Migración Prisma

Migración: `YYYYMMDDHHMMSS_kds_multi_station_printing`

```sql
-- 1. Nuevas columnas en Product
ALTER TABLE "products" 
  ADD COLUMN IF NOT EXISTS "kds_visibility_mode" TEXT DEFAULT 'ALL_STATIONS';

CREATE INDEX IF NOT EXISTS "products_tenant_id_kds_visibility_mode_idx" 
  ON "products" ("tenant_id", "kds_visibility_mode");

-- 2. Tabla intermedia
CREATE TABLE IF NOT EXISTS "product_preparation_stations" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenant_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "station_id" TEXT NOT NULL,
  "is_visible" BOOLEAN DEFAULT TRUE,
  "print_on_station" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_preparation_stations_tenant_product_station_uk"
  ON "product_preparation_stations" ("tenant_id", "product_id", "station_id");

CREATE INDEX IF NOT EXISTS "product_preparation_stations_tenant_product_idx"
  ON "product_preparation_stations" ("tenant_id", "product_id");

CREATE INDEX IF NOT EXISTS "product_preparation_stations_tenant_station_idx"
  ON "product_preparation_stations" ("tenant_id", "station_id");

-- 3. Nuevas columnas en PreparationStation
ALTER TABLE "preparation_stations"
  ADD COLUMN IF NOT EXISTS "printer_enabled" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "printer_type" TEXT DEFAULT 'ESC_POS_NETWORK',
  ADD COLUMN IF NOT EXISTS "printer_name" TEXT,
  ADD COLUMN IF NOT EXISTS "printer_ip" TEXT,
  ADD COLUMN IF NOT EXISTS "printer_port" INTEGER DEFAULT 9100,
  ADD COLUMN IF NOT EXISTS "printer_path" TEXT,
  ADD COLUMN IF NOT EXISTS "printer_model" TEXT,
  ADD COLUMN IF NOT EXISTS "auto_print_on_new_ticket" BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "print_copies" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "last_print_status" TEXT,
  ADD COLUMN IF NOT EXISTS "last_print_status_updated_at" TIMESTAMP;

-- 4. Nuevas columnas en KitchenTicket
ALTER TABLE "kitchen_tickets"
  ADD COLUMN IF NOT EXISTS "printed_at" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "printed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "print_count" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_print_status" TEXT,
  ADD COLUMN IF NOT EXISTS "print_error_detail" TEXT;

-- 5. Tabla de cola de impresión
CREATE TABLE IF NOT EXISTS "kitchen_print_jobs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenant_id" TEXT NOT NULL,
  "ticket_id" TEXT,
  "order_id" TEXT,
  "station_id" TEXT,
  "job_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT DEFAULT 'PENDING',
  "attempts" INTEGER DEFAULT 0,
  "max_attempts" INTEGER DEFAULT 3,
  "last_error" TEXT,
  "printed_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "kitchen_print_jobs_tenant_status_idx"
  ON "kitchen_print_jobs" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "kitchen_print_jobs_ticket_idx"
  ON "kitchen_print_jobs" ("ticket_id");

-- 6. Foreign keys explícitas
ALTER TABLE "product_preparation_stations"
  ADD CONSTRAINT "product_preparation_stations_product_fk"
  FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE;

ALTER TABLE "product_preparation_stations"
  ADD CONSTRAINT "product_preparation_stations_station_fk"
  FOREIGN KEY ("station_id") REFERENCES "preparation_stations" ("id") ON DELETE CASCADE;

ALTER TABLE "kitchen_print_jobs"
  ADD CONSTRAINT "kitchen_print_jobs_ticket_fk"
  FOREIGN KEY ("ticket_id") REFERENCES "kitchen_tickets" ("id") ON DELETE SET NULL;
```

---

## 4. Lógica de Routing Multi-Estación

### 4.1 Algoritmo `sendToKitchen`

Reemplaza la lógica actual en `OrdersService.sendToKitchen`:

```typescript
// 0. Determinar estaciones candidatas por línea
const eligibleLines = order.orderLines.filter((l: any) => {
  const product = l.product;
  if (!product) return false;
  if (product.showInKDS === false) return false;
  if (product.kdsVisibilityMode === 'NONE') return false;
  return true;
});

if (eligibleLines.length === 0) {
  return { success: true, ticket: null, order, skipped: true };
}

// 1. Cargar estaciones activas
const stations = await prisma.preparationStation.findMany({
  where: { tenantId, isActive: true },
});

// 2. Agrupar líneas por estación destino
const linesByStation = new Map<string, typeof eligibleLines>();

for (const line of eligibleLines) {
  const product = line.product;
  const productCategory = product?.category || product?.posCategoryId || null;
  const targetStations = getTargetStations(product, productCategory, stations);

  for (const stationId of targetStations) {
    const current = linesByStation.get(stationId) || [];
    current.push(line);
    linesByStation.set(stationId, current);
  }
}

// 3. Crear un ticket por estación destino
for (const [stationId, stationLines] of linesByStation.entries()) {
  const ticket = await this.kdsService.createTicket(tenantId, {
    orderId,
    stationId,
    course: dto?.course,
    priority: dto?.priority,
    lines: stationLines.map(l => ({
      orderLineId: l.id,
      productName: l.product?.name || l.productName,
      quantity: l.quantity,
      seatNumber: l.seatNumber || 1,
      modifiersText: l.modifiers || undefined,
    })),
  });

  // Emitir WebSocket a la sala de la estación
  if (this.ordersGateway?.server) {
    this.ordersGateway.server
      .to(`tenant:${tenantId}:station:${stationId}`)
      .emit('kds:ticket_new', { ...ticket, stationId });
  }

  // Disparar impresión automática si aplica
  if (shouldAutoPrint(stationId, stations)) {
    await this.printQueueService.enqueueTicketPrint(tenantId, ticket.id);
  }

  emittedTickets.push(ticket);
}
```

### 4.2 Función `getTargetStations(product, category, stations)`

```typescript
function getTargetStations(product: any, category: string | null, stations: any[]): string[] {
  const mode = product.kdsVisibilityMode;

  if (mode === 'NONE' || product.showInKDS === false) return [];
  if (mode === 'ALL_STATIONS') return stations.map(s => s.id);

  // SELECTED: buscar estaciones vinculadas explícitamente
  const explicit = product.preparationStationLinks
    .filter((link: any) => link.isVisible)
    .map((link: any) => link.stationId);

  // Si no hay vinculación explícita, fallback a categoría (compatibilidad)
  const byCategory = stations
    .filter(s => s.categories.some((c: string) => c === category || c === 'GENERAL'))
    .map(s => s.id);

  return [...new Set([...explicit, ...byCategory])];
}
```

---

## 5. Servicio de Impresión

### 5.1 `KitchenPrintService`

```typescript
@Injectable()
export class KitchenPrintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async printTicket(tenantId: string, ticketId: string, copies: number = 1): Promise<PrintResult> {
    const ticket = await this.prisma.kitchenTicket.findFirst({
      where: { id: ticketId, tenantId },
      include: { station: true, lines: true, order: { select: { id: true, tableId: true, metadata: true } } },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!ticket.station.printerEnabled) return { success: false, reason: 'PRINTER_DISABLED' };

    const escpos = this.buildEscPosTicket(ticket);
    const result = await this.sendToPrinter(ticket.station, escpos, copies);

    // Actualizar trazabilidad
    await this.prisma.kitchenTicket.update({
      where: { id: ticketId },
      data: {
        printedAt: result.success ? new Date() : null,
        printCount: { increment: result.success ? 1 : 0 },
        lastPrintStatus: result.success ? 'OK' : 'ERROR',
        printErrorDetail: result.error || null,
      },
    });

    return result;
  }

  async printBill(tenantId: string, orderId: string, stationId?: string): Promise<PrintResult> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { orderLines: { include: { product: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');

    const escpos = this.buildEscPosBill(order);
    const targetStation = stationId 
      ? await this.prisma.preparationStation.findFirst({ where: { id: stationId, tenantId } })
      : null;

    const printer = targetStation?.printerEnabled ? targetStation : null;
    if (!printer) return { success: false, reason: 'NO_PRINTER_CONFIGURED' };

    const result = await this.sendToPrinter(printer, escpos, 1);
    return result;
  }

  // ESC/POS builders
  private buildEscPosTicket(ticket: any): Buffer { /* ... comandos ESC/POS ... */ }
  private buildEscPosBill(order: any): Buffer { /* ... comandos ESC/POS ... */ }

  // Envío por socket/Bluetooth/USB
  private async sendToPrinter(station: any, data: Buffer, copies: number): Promise<PrintResult> {
    try {
      switch (station.printerType) {
        case 'ESC_POS_NETWORK':
          return this.printNetwork(station.printerIp!, station.printerPort || 9100, data, copies);
        case 'ESC_POS_BLUETOOTH':
          return this.printBluetooth(station.printerPath!, data, copies);
        case 'ESC_POS_USB':
          return this.printUsb(station.printerPath!, data, copies);
        default:
          return { success: false, reason: 'UNKNOWN_PRINTER_TYPE' };
      }
    } catch (error: any) {
      return { success: false, reason: 'TRANSPORT_ERROR', error: error.message };
    }
  }
}
```

### 5.2 Cola de Impresión (`KitchenPrintQueue`)

```typescript
@Processor('kitchen-print')
export class KitchenPrintProcessor {
  constructor(private readonly printService: KitchenPrintService) {}

  @Process('print_ticket')
  async handlePrintTicket(job: Job<PrintJobPayload>) {
    const result = await this.printService.printTicket(job.data.tenantId, job.data.ticketId, job.data.copies);
    if (!result.success) throw new Error(result.reason);
  }
}
```

Configuración BullMQ:
- Cola: `kitchen-print`
- Concurrency: 2 (no saturar impresoras)
- Retry: 3 intentos con backoff exponencial
- TTL: jobs fallidos se marcan `CANCELLED` después de 3 intentos

---

## 6. Controllers y Endpoints

### 6.1 `PreparationStationsController` (extender)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `PATCH` | `/api/v1/kds/stations/:id/printer` | Actualizar configuración de impresora |
| `POST` | `/api/v1/kds/stations/:id/print/test` | Probar impresora (print test page) |
| `GET` | `/api/v1/kds/stations/:id/printer/status` | Estado de la impresora |

### 6.2 `ProductStationsController` (nuevo)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/kds/products/:productId/stations` | Estaciones asignadas a un producto |
| `PUT` | `/api/v1/kds/products/:productId/stations` | Asignar estaciones a un producto |
| `GET` | `/api/v1/kds/stations/:stationId/products` | Productos asignados a una estación |

### 6.3 `KitchenTicketsController` (extender)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/kds/tickets/:id/print` | Imprimir ticket manualmente |
| `POST` | `/api/v1/kds/tickets/:id/reprint` | Reimprimir ticket |
| `GET` | `/api/v1/kds/orders/:id/print/bill` | Imprimir boleta/factura del pedido |

### 6.4 Triggers automáticos existentes (mantener)

| Trigger | Cuándo | Acción |
|---------|--------|--------|
| `autoPrintOnConfirm` (PosConfig) | POS confirma pago | Imprimir boleta |
| `printAutoOnConfirm` (PosConfig) | Mozo confirma mesa | Enviar a cocina + auto-print ticket |
| `printBillOnPayment` (PosConfig) | Al cobrar | Imprimir boleta final |
| `autoPrintOnNewTicket` (PreparationStation) | Ticket creado en estación | Imprimir comanda |

---

## 7. Frontend / Admin UI

### 7.1 Configuración de Estaciones (`/admin/kds/stations`)

Nueva página o modal en KDS:

```
┌─────────────────────────────────────────┐
│ 🍳 Estación: Cocina Central             │
│                                         │
│ [x] Impresora habilitada                 │
│ Tipo: [ESC/POS Red ▼]                   │
│ IP: [192.168.1.100] Puerto: [9100]       │
│ Modelo: [EPSON TM-T88VI ▼]              │
│ Auto-imprimir comandas: [x]              │
│ Copias: [1]                              │
│ Última impresión: ✅ OK (hace 2 min)     │
│                                         │
│ [Probar impresión]  [Guardar]            │
└─────────────────────────────────────────┘
```

### 7.2 Producto — Visibilidad KDS

En el formulario de producto (`/admin/products/:id`), nueva sección:

```
┌─────────────────────────────────────────┐
│ 🍳 Visibilidad en KDS                    │
│                                         │
│ [x] Visible en pantallas de cocina/barra │
│ Modo:                                    │
│ (•) Todas las estaciones                 │
│ ( ) Solo estaciones seleccionadas        │
│ ( ) Ninguna (no enviar a cocina)         │
│                                         │
│ Estaciones:                              │
│ [x] Cocina Central                       │
│ [x] Barra Principal                      │
│ [ ] Parrilla                            │
│                                         │
│ [x] Imprimir comanda al enviar a Cocina  │
│ [ ] Imprimir comanda al enviar a Barra   │
└─────────────────────────────────────────┘
```

### 7.3 KDS Táctil — Botones de impresión

En `/admin/kds`:

- Indicador de estado de impresora por ticket: 🖨️ lista / ❌ error / ⏳ imprimiendo
- Botón `Imprimir` en cada ticket
- Botón `Reimprimir` en tickets servidos
- Badge de cantidad de copias impresas (`printCount`)

### 7.4 POS — Botón imprimir boleta

En `/admin/pos`:

- Botón `Imprimir Boleta` en detalle de pedido
- Modal de selección de impresora destino si hay múltiples estaciones con impresora

---

## 8. Consideraciones Técnicas

### 8.1 ESC/POS

- Comandos estándar: inicialización, texto, codificación UTF-8 con soporte español/guaraní.
- Cortes de papel: total y parcial.
- QR en ticket: para URL de tracking del pedido.
- Alineación y fuentes: negociar por modelo de impresora (`printerModel`).

### 8.2 Modo BARRA

- El modo `BAR` del guest orders (`serviceMode: 'BAR'`) **no** envía a cocina por defecto.
- Si el producto tiene `printOnStation = true` para barra, se genera ticket de barra incluso en modo `BAR`.
- El KDS de barra filtra por estación con categorías de bebidas.

### 8.3 WebSockets

Sala por estación: `tenant:{tenantId}:station:{stationId}` para aislar qué ve cada KDS.

```typescript
// orders.service.ts
this.ordersGateway.server
  .to(`tenant:${tenantId}:station:${stationId}`)
  .emit('kds:ticket_new', kdsTicket);
```

### 8.4 Idempotencia

- `printCount` en `KitchenTicket` evita reimpresiones accidentes.
- `KitchenPrintJob.status` permite reintentos sin duplicar impresiones.

---

## 9. Migración y Compatibilidad

### 9.1 Backward Compatibility

- Productos existentes: `kdsVisibilityMode = ALL_STATIONS` por defecto.
- Estaciones existentes: `printerEnabled = false` por defecto.
- El routing actual por categoría se mantiene como fallback cuando `SELECTED` no tiene vinculaciones explícitas.

### 9.2 Data Migration

Script de migración opcional para tenants existentes:
- No requiere acción del usuario.
- Los productos existentes funcionan igual que hoy.

### 9.3 Feature Flag

```env
OMNIGASTRO_KDS_MULTI_STATION=true
OMNIGASTRO_PRINTING_ENABLED=true
```

- Si `OMNIGASTRO_KDS_MULTI_STATION=false`: se usa el routing legacy (una estación por línea).
- Si `OMNIGASTRO_PRINTING_ENABLED=false`: se ignoran todos los campos de impresión.

---

## 10. Tareas de Implementación

| # | Tarea | Módulo | Estimación |
|---|-------|--------|-----------|
| 1 | Migración Prisma + seed | backend/prisma | 1 día |
| 2 | `ProductPreparationStation` service/controller | backend/src/kds/ | 2 días |
| 3 | Routing multi-estación en `sendToKitchen` | backend/src/orders/ | 2 días |
| 4 | `KitchenPrintService` + ESC/POS builders | backend/src/kds/ | 3 días |
| 5 | `KitchenPrintProcessor` (BullMQ) | backend/src/queues/ | 2 días |
| 6 | Extender controllers KDS + tickets print | backend/src/kds/ | 1 día |
| 7 | Admin UI: estaciones + productos KDS | frontend/src/pages/admin/ | 3 días |
| 8 | Admin UI: botones print en KDS + POS | frontend/src/pages/admin/ | 2 días |
| 9 | Tests unitarios + E2E Playwright | backend + frontend | 2 días |
| 10 | Documentación + troubleshooting | docs/ | 1 día |

**Total estimado:** ~17 días / ~3.5 sprints

---

## 11. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Impresoras de red inalcanzables | Timeout + cola de reintentos + fallback a "imprimir luego" |
| ESC/POS varía por modelo | Capa de abstracción por `printerModel`; default genérico |
| Performance en pedidos con 10+ estaciones | Tickets se crean en paralelo con `Promise.all` limitado |
| Modo `SELECTED` sin estaciones vinculadas | Fallback a routing por categoría + warning en log |
| Tauri USB/Bluetooth no disponible en web | `printerType: NONE` oculta opciones; browser solo network |

---

## 12. Próximos Pasos

1. Validar diseño con el equipo operativo (cocina/barra).
2. Crear FEAT en `featurelist.json` (ej: FEAT-147 KDS Multi-Estación, FEAT-148 Impresión Selectiva).
3. Implementar migración + backend en rama `feat/gastro-kds-multi-station`.
4. Implementar frontend + E2E en la misma rama.
5. Merge a `develop` + deploy staging.

---

*Documento generado: 2026-09-27*
