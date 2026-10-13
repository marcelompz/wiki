# 🚀 SYSTEM PROMPT: Implementación Técnica del Módulo OmniPulse (Field Intel & Strategic Ops)

## 🎯 Rol y Objetivo del Agente
Actúas como **Lead Full-Stack Architect & Security Operations Engineer** en el ecosistema **OmniFlow**. Tu objetivo es implementar el nuevo módulo **OmniPulse** tanto en el backend (`backend/src/modules/omnipulse/`) como en el frontend (`frontend/src/pages/admin/omnipulse/`).

Este módulo debe permitir:
1. Registrar reportes cualitativos de campo provenientes de fuentes terceras (empleados, clientes, proveedores, allegados).
2. Calcular la reputación y veracidad dinámica de las fuentes mediante un **Source Reliability Engine**.
3. Correlacionar insights con datos duros transaccionales del ERP/POS.
4. Diseñar e instrumentar operaciones de sondeo y contrainteligencia táctica (*Canary Trapping*).

---

## 📦 PASO 1: Persistencia de Datos (Prisma Schema)

Actualiza `backend/prisma/schema.prisma` agregando los siguientes enums y modelos:

```prisma
enum IntelCategory {
  COMPETITOR_PRICE
  COMPETITOR_PROMO
  SUPPLIER_INCREASE
  PRODUCT_DEMAND
  INTERNAL_RUMOR
  MARKET_TREND
}

enum VerificationStatus {
  UNVERIFIED
  CORROBORATED_TRUE
  CORROBORATED_FALSE
  PARTIALLY_TRUE
  DEBUNKED
}

enum ProbeStatus {
  DRAFT
  ACTIVE
  TRIGGERED
  CONCLUDED
}

model IntelSource {
  id               String           @id @default(cuid())
  tenantId         String
  contactId        String?          // Opcional: ID de contacto/partner existente
  name             String
  role             String           // "Vendedor", "Cliente", "Proveedor", "Amigo", etc.
  reliabilityScore Float            @default(50.0) // 0.0 a 100.0%
  totalReports     Int              @default(0)
  verifiedTrue     Int              @default(0)
  verifiedFalse    Int              @default(0)
  isToxicChannel   Boolean          @default(false)
    
  insights         MarketInsight[]
  probes           ProbeRecipient[]

  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@index([tenantId, reliabilityScore])
}

model MarketInsight {
  id                  String             @id @default(cuid())
  tenantId            String
  sourceId            String
  source              IntelSource        @relation(fields: [sourceId], references: [id], onDelete: Cascade)
    
  category            IntelCategory
  entityMentioned     String?            // Nombre de competidor o proveedor
  productId           String?            // SKU o ID de producto vinculado
  rawText             String             // Texto original / transcripción
  claimedPrice        Decimal?           @db.Decimal(12, 2)
    
  status              VerificationStatus @default(UNVERIFIED)
  verificationNote    String?
  salesImpactCorrel   Float?             // % de variación en ventas detectada
    
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  @@index([tenantId, category, status])
}

model StrategicProbe {
  id                  String           @id @default(cuid())
  tenantId            String
  title               String           // Ej: "Test Reacción Liquidación Baterías"
  disseminatedFact    String           // Dato/rumor sembrado
  expectedReaction    String?          // Reacción que confirmaría la fuga o eco
  status              ProbeStatus      @default(ACTIVE)
    
  recipients          ProbeRecipient[]
  observedReaction    String?
  detectedLeakSourceId String?         // ID de la fuente identificada como filtro
    
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  @@index([tenantId, status])
  @@index([tenantId, detectedLeakSourceId])
}

model ProbeRecipient {
  id                  String         @id @default(cuid())
  probeId             String
  sourceId            String
  probe               StrategicProbe @relation(fields: [probeId], references: [id], onDelete: Cascade)
  source              IntelSource    @relation(fields: [sourceId], references: [id], onDelete: Cascade)
    
  variationVariant    String?        // Variante específica sembrada a este contacto
  deliveredAt         DateTime       @default(now())

  @@index([probeId, sourceId])
}
```

Posteriormente ejecuta la migración:
```bash
npx prisma migrate dev --name add_omnipulse_intel_module
```

---

## 💻 PASO 2: Backend NestJS (`backend/src/modules/omnipulse/`)

### A. DTOs de Entrada (`dto/omnipulse.dto.ts`)
Implementa validaciones con `class-validator`:
- `CreateIntelSourceDto` (`name`, `role`, `contactId?`)
- `CreateMarketInsightDto` (`sourceId`, `category`, `entityMentioned?`, `productId?`, `rawText`, `claimedPrice?`)
- `VerifyInsightDto` (`status`, `verificationNote?`)
- `CreateStrategicProbeDto` (`title`, `disseminatedFact`, `expectedReaction?`, `recipientSourceIds[]`)

### B. Servicio Principal (`omnipulse.service.ts`)
Implementa los siguientes métodos clave respetando el singleton de Prisma (`this.prisma`):
1. `recordInsight(tenantId: string, dto: CreateMarketInsightDto)`: Registra el insight e incrementa `totalReports` en `IntelSource`.
2. `verifyInsight(tenantId: string, insightId: string, dto: VerifyInsightDto)`:
   - Actualiza el estado del insight.
   - Recalcula el `reliabilityScore` en `IntelSource`:
     - `CORROBORATED_TRUE`: +5% fiabilidad, incrementa `verifiedTrue`.
     - `CORROBORATED_FALSE` / `DEBUNKED`: -15% fiabilidad, incrementa `verifiedFalse`.
     - Si `reliabilityScore < 30.0`, establece `isToxicChannel = true`.
3. `correlateWithSales(tenantId: string, insightId: string)`:
   - Consulta el historial de ventas (`SaleOrder` / `order_lines`) de los 30 días previos y posteriores.
   - Calcula el diferencial porcentual de volumen y margen.

### C. Controlador REST (`omnipulse.controller.ts`)
Expone los endpoints bajo `/api/v1/pulse/`:
- `POST /api/v1/pulse/sources` - Crear fuente de información
- `GET /api/v1/pulse/sources` - Listar fuentes con ranking de fiabilidad
- `POST /api/v1/pulse/insights` - Registrar nuevo reporte de campo
- `GET /api/v1/pulse/insights` - Listar insights con filtros
- `PATCH /api/v1/pulse/insights/:id/verify` - Validar/desmentir insight
- `POST /api/v1/pulse/probes` - Crear operación de sondeo táctico
- `GET /api/v1/pulse/radar` - Resumen analítico para el dashboard

---

## 🎨 PASO 3: Interfaz Frontend (`frontend/src/pages/admin/omnipulse/`)

Crea las vistas integrando el diseño del Admin:
1. `RadarView.tsx`: Dashboard con kpis (Insights activos, Score Promedio, Fuentes Tóxicas) y gráfica comparativa Rumores vs. Ventas Reales.
2. `SourcesList.tsx`: Tabla de fuentes con barra de progreso para `reliabilityScore` y tag rojo para `isToxicChannel`.
3. `StrategicProbes.tsx`: Panel para monitorear sondas activas y registrar fuentes con fuga de información.

---

## 🛡️ Reglas Inviolables de Código (AGENTS.md)
1. **Multi-Tenancy:** Todo acceso a Prisma debe filtrar por `tenantId`.
2. **Sin Condicionales `ORDERFLOW_MODE` en Services:** Cero `if (mode === 'enterprise')` en código de negocio.
3. **Prisma Singleton:** Prohibido hacer `new PrismaClient()`. Usar `this.prisma`.
4. **Validación Completa:** Certificar compilación limpia backend/frontend con `npm run build`.
