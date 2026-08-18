# **OmniPulse**

[https://gemini.google.com/app/c92a935634151103](https://gemini.google.com/app/c92a935634151103)

*User prompt: Gemini, se me ocurrió una nueva funcionalidad.*

Response: ¡Excelente\! Contame de qué se trata la idea.

La analizamos juntos para ver cómo encaja en la arquitectura de **OmniFlow** (modelo de datos en Prisma, endpoints en NestJS, lógica en el frontend o microservicios) y evaluamos si impacta en el Roadmap o si armamos directamente el *prompt maestro* / especificación técnica para implementarla.

¿De qué funcionalidad se trata?

---

*User prompt: Bueno, resulta ser que los dueños de empresas reciben mucha información de fuentes terceras, sus amigos, familiares, propios clientes o a veces el chismorreo que corre dentro de la empresa y sus propios empleados le cuentan sobre la competencia o sobre promociones de otros lugares o cosas que le cuentan sus clientes a sus propios empleados. Y estos datos están dispersos y nunca se usan para tomar decisiones objetivas en la empresa.*

Response: ¡Es una idea brillante y ataca un dolor enorme y real en las empresas\! En gestión y estrategia esto se conoce como **Market & Field Intelligence** (o *Inteligencia de Calle / Voz del Campo*).

Generalmente, los ERPs tradicionales solo registran datos duros y pasados (*lo que ya se vendió, lo que ya costó*), pero están **completamente ciegos** ante la información cualitativa del día a día:

> * *"La competencia de la esquina bajó el producto X a tal precio"*  
> * *"Un cliente no llevó porque le dijeron que en otro local dan 3 cuotas sin interés"*  
> * *"Un proveedor va a aumentar un 15% la semana que viene"*  
> * *"Los clientes están pidiendo una marca o servicio específico que no tenemos"*

Transformar ese "chismorreo" o feedback informal disperso en **datos estructurados y accionables** encaja perfecto en la visión de OmniFlow como el *sistema de acción* del negocio.

### **¿Cómo podríamos estructurar este módulo en OmniFlow?**

Podríamos llamarlo por ejemplo **OmniRadar**, **OmniPulse** o **OmniIntel** (Field & Market Intelligence).

#### **1\. Canales de Captura Ultra-Rápidos (Cero Fricción para el Empleado/Dueño)**

Para que esto funcione, registrar el dato no debe tomar más de 5 a 10 segundos:

> * **Audio o Texto por WhatsApp Bot:** El dueño o un vendedor le manda un mensaje de voz o texto al bot interno de OmniFlow: *"El cliente de recién me dijo que en Distribuidora X tienen la cubierta 20% más barata por liquidación"*.  
> * **Botón Rápido en POS / Drawer de Ventas:** Al cerrar una venta (o al marcar una cotización perdida), un campo rápido de feedback/motivo.  
> * **App Móvil (Expo) / Admin (Refine):** Widget de carga rápida de *Insight*.

#### **2\. Procesamiento Inteligente (AI / LLM Worker)**

Un worker asíncrono (NestJS \+ Redis/BullMQ) procesa la nota de voz o texto con un LLM y extrae:

> * **Tipo de Insight:** Competencia (Precio/Promo), Proveedor, Demanda insatisfecha, Tendencia de mercado, Calidad de servicio.  
> * **Entidad / Competidor:** Nombre de la empresa o local mencionado.  
> * **Producto / Categoría involucrada.**  
> * **Impacto / Nivel de Alerta:** Crítico, Oportunidad, Informativo.

#### **3\. Panel de Control y Decisiones (Dashboard en Refine / BI)**

> * **Radar de Competencia:** Historial de movimientos y promociones detectadas de competidores locales.  
> * **Alertas Tempranas:** Si 5 clientes en una semana mencionan que un producto está caro o falta stock, se dispara una notificación al dueño.  
> * **Correlación con Ventas:** Cruzar por qué bajan las ventas de una categoría justo cuando se reportaron promociones fuertes de un competidor.

### **¿Cómo te imaginás vos el flujo ideal?**

> 1. ¿Querés que la entrada principal sea vía **WhatsApp (audio/texto)**, desde la **interfaz del POS/caja**, o ambos?  
> 2. ¿Te gustaría que nos enfoquemos primero en la **definición del modelo de datos / arquitectura** o en el **caso de uso comercial y su impacto en el Roadmap**?

---

*User prompt: Sí, me gusta mucho. Tal vez podría ser Omnipulse. El nombre ahora mismo no es que me preocupa tanto. Lo que quiero hacer es registrar todo que lo vincule a una fuente de información que es un contacto. ¿Sí? Y que esta persona o fuente de información vaya teniendo una calificación de acuerdo a que nosotros corroboremos o no la veracidad de lo que nos cuenta. Primero. Segundo, que es que esos datos se puedan cruzar con datos duros de nuestro sistema y que nos quite un informe real que nos ayuda a tomar decisiones objetivas basado en esa fuente de información terciaria. Y tercero, que vayamos viendo también de acuerdo a la falsedad de lo que nos dicen cómo podemos eh sondear y manipular el mercado tirando eh información falsa contándoles a esta fuente de información que que nos falsea la información.*

Response: El concepto que estás planteando lleva la inteligencia comercial al siguiente nivel: **Inteligencia de Campo \+ Scoring de Fuentes \+ Contrainteligencia Estratégica (Information Operations / Canary Trapping)**.

En el mundo de la inteligencia empresarial y analítica de datos, esto es exactamente lo que utilizan las corporaciones para **filtrar ruido, proteger márgenes y testear intenciones del mercado**.

### **Arquitectura Funcional de OmniPulse (Field Intel & Strategic Ops)**

Podemos estructurar la funcionalidad en **3 pilares clave**:

                    `┌────────────────────────┐`  
                    `│  OmniPulse Core Hub    │`  
                    `└───────────┬────────────┘`  
         `┌──────────────────────┼──────────────────────┐`  
         `▼                      ▼                      ▼`  
`┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐`  
`│ 1. Source Trust  │  │ 2. Data Cross-   │  │ 3. Strategic Ops │`  
`│    & Intel Log   │  │    Validation    │  │    & Counter-Info│`  
`│ (Scoring Fuentes)│  │ (Cruce con ERP)  │  │  (Sondeo / Leaks)│`  
`└──────────────────┘  └──────────────────┘  └──────────────────┘`

### **Pilar 1: Registro de Insights y Scoring de Fuentes (*Source Reliability Engine*)**

Cada informante (empleado, cliente, amigo, proveedor, intermediario) se modela como una **Fuente de Información** vinculada al res.partner o contacto de OmniFlow:

> 1. **Captura Rápida del Rumor/Dato:**  
   * Origen: WhatsApp, POS Drawer, Refine Admin.  
   * Datos capturados: *Fuente*, *Competidor/Entidad*, *Producto/Línea*, *Detalle (ej. "Competidor X tiene liquidación a ₲ 150.000")*, *Vigencia estimada*.  
> 2. **Sistema de Reputación (Trust Score 0% a 100% / Rango A-E):**  
   * Basado en el estándar de Inteligencia (Matriz de Admirantazgo: Fiabilidad de la fuente vs. Veracidad de la información).  
   * **Feedback Loop:** Cuando el dueño o el sistema valida o desmiente el hecho, el score de la fuente sube o baja automáticamente:  
     * **Verificado Verdadero:** \+*X* puntos de fiabilidad.  
     * **Inexacto / Parcial:** \+0 o −*Y*.  
     * **Falso / Malintencionado:** Penalización severa de fiabilidad y etiqueta semafórica (🔴 *Fuente Tóxica / Desinformadora* | 🟡 *Ruido* | 🟢 *Alta Confianza*).

### **Pilar 2: Cruce de Datos Duros y Correlación con el ERP (*Corroboration Engine*)**

El rumor nunca se queda aislado; el sistema lo cruza con el historial real transaccional de OmniFlow / ERP:

> * **Correlación de Ventas:** Si la fuente dice *"El cliente nos dejó porque la competencia vende el producto Y más barato"*, OmniPulse analiza:  
  * ¿Realmente cayeron las órdenes de ese producto o de ese cliente en los últimos 30 días?  
  * ¿Ese cliente sigue comprando otras líneas?  
> * **Alerta de Quiebre o Margen:** Si 3 fuentes distintas reportan que un proveedor aumentará el costo la próxima semana, el sistema genera una **Recomendación Objetiva**: *"Comprar X unidades hoy para cubrir 60 días antes del incremento"*.  
> * **Matriz de Ruido vs. Realidad:** Reporte ejecutivo que separa:  
  * *Hechos verificados con impacto real en facturación.*  
  * *Psicosis o rumores internos sin correlación numérica en las ventas.*

### **Pilar 3: Operaciones Estratégicas y Manejo de Información (*Strategic Probing & Counter-Info*)**

Para el tercer punto (sondear el mercado y usar a los divulgadores de falsedad a tu favor):

> 1. **Canary Leaks / Trazabilidad de Información (Sondeo Controlado):**  
   * Cuando detectás a un informante con baja fiabilidad o con tendencia a "llevar y traer" información a la competencia, OmniPulse permite registrar una **Campaña de Sondeo**:  
     * *Dato sembrado:* "Le comentamos al Contacto Z que en 15 días lanzamos un descuento del 40% en categoría X".  
   * **Medición del Eco:** El sistema registra si competidores reaccionan (por ejemplo, bajando sus precios preventivamente o llamando a proveedores).  
> 2. **Detección de Fugas Internas:**  
   * Sembrar versiones ligeramente distintas a diferentes sospechosos (ej. Fecha A vs. Fecha B) para identificar exactamente quién filtra datos internos al mercado.  
> 3. **Mapeo de Redes de Influencia:**  
   * Identificar qué competidores reciben información de tus mismos contactos o qué canales son los más sensibles a las maniobras de precios.

### **Modelo de Datos Preliminar (Prisma Schema)**

`enum IntelCategory {`  
  `COMPETITOR_PRICE`  
  `COMPETITOR_PROMO`  
  `SUPPLIER_INCREASE`  
  `PRODUCT_DEMAND`  
  `INTERNAL_RUMOR`  
  `MARKET_TREND`  
`}`

`enum VerificationStatus {`  
  `UNVERIFIED`  
  `CORROBORATED_TRUE`  
  `CORROBORATED_FALSE`  
  `PARTIALLY_TRUE`  
  `DEBUNKED`  
`}`

`enum OperationType {`  
  `PASSIVE_LISTENING`  
  `CANARY_PROBE       // Información sembrada para testear reacción/fugas`  
  `PRICE_DISTORTION`  
`}`

`model IntelSource {`  
  `id              String         @id @default(cuid())`  
  `tenantId        String`  
  `contactId       String?        // Vinculado a Contacto/Cliente/Empleado`  
  `name            String`  
  `role            String         // "Vendedor", "Cliente Frecuente", "Amigo", "Proveedor"`  
  `reliabilityScore Float         @default(50.0) // 0.0 a 100.0%`  
  `totalReports    Int            @default(0)`  
  `verifiedTrue    Int            @default(0)`  
  `verifiedFalse   Int            @default(0)`  
  `isToxicChannel  Boolean        @default(false)`  
  `insights        MarketInsight[]`  
  `campaignProbes  ProbeRecipient[]`

  `createdAt       DateTime       @default(now())`  
  `updatedAt       DateTime       @updatedAt`

  `@@index([tenantId, reliabilityScore])`  
`}`

`model MarketInsight {`  
  `id              String             @id @default(cuid())`  
  `tenantId        String`  
  `sourceId        String`  
  `source          IntelSource        @relation(fields: [sourceId], references: [id])`  
    
  `category        IntelCategory`  
  `entityMentioned String?            // Nombre de la competencia / proveedor`  
  `productId       String?            // Producto de OmniFlow vinculado (opcional)`  
  `rawText         String             // Texto original o transcripción de audio`  
  `claimedPrice    Decimal?           @db.Decimal(12, 2)`  
    
  `status          VerificationStatus @default(UNVERIFIED)`  
  `verificationNote String?`  
    
  `// Correlación de impacto`  
  `detectedImpactScore Float?         // Calculado cruzando caídas/subas en ERP`  
    
  `createdAt       DateTime           @default(now())`  
  `updatedAt       DateTime           @updatedAt`

  `@@index([tenantId, category, status])`  
`}`

`model StrategicProbe {`  
  `id              String           @id @default(cuid())`  
  `tenantId        String`  
  `title           String           // Ej: "Test de Reacción Promo Neumáticos"`  
  `disseminatedFact String          // Dato sembrado`  
  `expectedReaction String?`  
  `recipients      ProbeRecipient[]`  
  `observedReaction String?`  
  `successScore    Float?`  
    
  `createdAt       DateTime         @default(now())`  
  `updatedAt       DateTime         @updatedAt`  
`}`

`model ProbeRecipient {`  
  `id        String         @id @default(cuid())`  
  `probeId   String`  
  `sourceId  String`  
  `probe     StrategicProbe @relation(fields: [probeId], references: [id])`  
  `source    IntelSource    @relation(fields: [sourceId], references: [id])`  
  `deliveredAt DateTime     @default(now())`  
`}`

### **Próximos Pasos**

¿Te gustaría que preparemos el **System Prompt maestro / Especificación Técnica** para implementar este módulo (backend/src/modules/omnipulse en NestJS \+ vistas en Refine), o querés que ajustemos primero los algoritmos de scoring y correlación con ventas?

---

*User prompt: Sí, por favor, prepara un plan y un prompt, ambos en archivo MD.*

Response: ┌─────────────────────────────────────────────────────────────┐ │ OmniFlow UI (Refine.dev) │ │ • Radar de Mercado • Gestión de Fuentes • Operaciones │ └──────────────────────────────┬──────────────────────────────┘ │ REST / DTOs ┌──────────────────────────────▼──────────────────────────────┐ │ OmniPulse NestJS Module │ │ backend/src/modules/omnipulse/ │ │ ├── omnipulse.controller.ts │ │ ├── omnipulse.service.ts (Scoring & Analytics) │ │ ├── probe.service.ts (Canary Traps & Counter-Intel) │ │ └── adapters/erp-corroborator.adapter.ts │ └──────────────────────────────┬──────────────────────────────┘ │ ┌───────────────────────┴───────────────────────┐ ▼ ▼ ┌──────────────┐ ┌──────────────┐ │ PostgreSQL │ (Prisma ORM) │ Redis / Bull │ (Procesamiento │ (DB Layer) │ │ Worker │ Asíncrono) └──────────────┘ └──────────────┘

`---`

`## 4. Fases de Implementación`

`| Fase | Hito | Entregables Principales |`  
`| :--- | :--- | :--- |`  
``| **Fase 1: Persistencia y Core API** | Esquema Prisma, Migraciones, CRUD de Fuentes e Insights | Modelos `IntelSource`, `MarketInsight`, `StrategicProbe`, `ProbeRecipient`. NestJS Module. |``  
``| **Fase 2: Motor de Scoring y Cruce** | Algoritmo de Reputación y Cruce de Series de Ventas | `ReliabilityEngineService`, querys analíticas cruzando `SaleOrder` / `Product`. |``  
`| **Fase 3: Operaciones Estratégicas** | Canary Probing y Detección de Fugas | Flujo de creación de sondas, auditoría de eco y cálculo de éxito. |`  
`| **Fase 4: Frontend UI (Refine.dev)** | Radar Dashboard y Vistas Operativas | Panel de Inteligencia, semáforos de fuentes, matriz de rumores vs. ventas. |`

`---`

`## 5. Criterios de Aceptación y Seguridad`  
``1. **Multi-Tenancy Estricto:** Toda consulta debe resolver con aislamiento contextual `tenantId`.``  
``2. **Precisión Decimal:** Manejo estricto de montos y precios declarados mediante `Decimal` de Prisma.``  
``3. **Privacidad y Permisos:** Solo usuarios con rol `ADMIN` o `INTEL_OPERATOR` tienen acceso al módulo OmniPulse.``  
`"""`

`prompt_content = """# 🚀 SYSTEM PROMPT: Implementación del Módulo OmniPulse (Field Intel & Strategic Ops) en OmniFlow`

`## 🎯 Rol y Contexto del Agente`  
``Actúas como **Lead Full-Stack Architect & Security Operations Engineer** en el ecosistema **OmniFlow**. Tu objetivo es construir e integrar el nuevo módulo **OmniPulse** (`backend/src/modules/omnipulse/` y `frontend/src/pages/admin/omnipulse/`).``

`Este módulo permite a las empresas:`  
`1. Registrar reportes cualitativos de campo provenientes de fuentes terceras (amigos, empleados, clientes, proveedores).`  
`2. Calcular la reputación y veracidad dinámica de las fuentes mediante un **Source Reliability Engine**.`  
`3. Correlacionar insights con datos duros transaccionales del ERP/POS.`  
`4. Diseñar e instrumentar operaciones de sondeo y contrainteligencia táctica (*Canary Trapping*).`

`---`

`## 📦 PASO 1: Persistencia de Datos (Prisma Schema)`

``Actualiza `backend/prisma/schema.prisma` agregando los siguientes enums y modelos:``

```` ```prisma ````  
`enum IntelCategory {`  
  `COMPETITOR_PRICE`  
  `COMPETITOR_PROMO`  
  `SUPPLIER_INCREASE`  
  `PRODUCT_DEMAND`  
  `INTERNAL_RUMOR`  
  `MARKET_TREND`  
`}`

`enum VerificationStatus {`  
  `UNVERIFIED`  
  `CORROBORATED_TRUE`  
  `CORROBORATED_FALSE`  
  `PARTIALLY_TRUE`  
  `DEBUNKED`  
`}`

`enum ProbeStatus {`  
  `DRAFT`  
  `ACTIVE`  
  `TRIGGERED`  
  `CONCLUDED`  
`}`

`model IntelSource {`  
  `id               String           @id @default(cuid())`  
  `tenantId         String`  
  `contactId        String?          // Opcional: relación a contacto/partner existente`  
  `name             String`  
  `role             String           // "Vendedor", "Cliente", "Proveedor", "Amigo", etc.`  
  `reliabilityScore Float            @default(50.0) // 0.0 a 100.0%`  
  `totalReports     Int              @default(0)`  
  `verifiedTrue     Int              @default(0)`  
  `verifiedFalse    Int              @default(0)`  
  `isToxicChannel   Boolean          @default(false)`  
    
  `insights         MarketInsight[]`  
  `probes           ProbeRecipient[]`

  `createdAt        DateTime         @default(now())`  
  `updatedAt        DateTime         @updatedAt`

  `@@index([tenantId, reliabilityScore])`  
`}`

`model MarketInsight {`  
  `id                  String             @id @default(cuid())`  
  `tenantId            String`  
  `sourceId            String`  
  `source              IntelSource        @relation(fields: [sourceId], references: [id], onDelete: Cascade)`  
    
  `category            IntelCategory`  
  `entityMentioned     String?            // Nombre de competidor o proveedor`  
  `productId           String?            // SKU o ID de producto vinculado`  
  `rawText             String             // Texto original / transcripción`  
  `claimedPrice        Decimal?           @db.Decimal(12, 2)`  
    
  `status              VerificationStatus @default(UNVERIFIED)`  
  `verificationNote    String?`  
  `salesImpactCorrel   Float?             // % de variación en ventas detectada`  
    
  `createdAt           DateTime           @default(now())`  
  `updatedAt           DateTime           @updatedAt`

  `@@index([tenantId, category, status])`  
`}`

`model StrategicProbe {`  
  `id                  String           @id @default(cuid())`  
  `tenantId            String`  
  `title               String           // Ej: "Test Reacción Liquidación Baterías"`  
  `disseminatedFact    String           // Dato/rumor sembrado`  
  `expectedReaction    String?          // Reacción que confirmaría la fuga o eco`  
  `status              ProbeStatus      @default(ACTIVE)`  
    
  `recipients          ProbeRecipient[]`  
  `observedReaction    String?`  
  `detectedLeakSourceId String?         // ID de la fuente identificada como filtro`  
    
  `createdAt           DateTime         @default(now())`  
  `updatedAt           DateTime         @updatedAt`

  `@@index([tenantId, status])`  
`}`

`model ProbeRecipient {`  
  `id                  String         @id @default(cuid())`  
  `probeId             String`  
  `sourceId            String`  
  `probe               StrategicProbe @relation(fields: [probeId], references: [id], onDelete: Cascade)`  
  `source              IntelSource    @relation(fields: [sourceId], references: [id], onDelete: Cascade)`  
    
  `variationVariant    String?        // Variante específica sembrada a este contacto`  
  `deliveredAt         DateTime       @default(now())`

  `@@index([probeId, sourceId])`  
`}`

Ejecuta la migración de Prisma:

`npx prisma migrate dev --name add_omnipulse_intel_module`

## **💻 PASO 2: Módulo Backend NestJS**

Crea la estructura en backend/src/modules/omnipulse/:

### **A. DTOs de Entrada (dto/omnipulse.dto.ts)**

`import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';`  
`import { IntelCategory, VerificationStatus, ProbeStatus } from '@prisma/client';`

`export class CreateIntelSourceDto {`  
  `@IsString()`  
  `@IsNotEmpty()`  
  `name: string;`

  `@IsString()`  
  `@IsNotEmpty()`  
  `role: string;`

  `@IsString()`  
  `@IsOptional()`  
  `contactId?: string;`  
`}`

`export class CreateMarketInsightDto {`  
  `@IsString()`  
  `@IsNotEmpty()`  
  `sourceId: string;`

  `@IsEnum(IntelCategory)`  
  `category: IntelCategory;`

  `@IsString()`  
  `@IsOptional()`  
  `entityMentioned?: string;`

  `@IsString()`  
  `@IsOptional()`  
  `productId?: string;`

  `@IsString()`  
  `@IsNotEmpty()`  
  `rawText: string;`

  `@IsNumber()`  
  `@IsOptional()`  
  `claimedPrice?: number;`  
`}`

`export class VerifyInsightDto {`  
  `@IsEnum(VerificationStatus)`  
  `status: VerificationStatus;`

  `@IsString()`  
  `@IsOptional()`  
  `verificationNote?: string;`  
`}`

`export class CreateStrategicProbeDto {`  
  `@IsString()`  
  `@IsNotEmpty()`  
  `title: string;`

  `@IsString()`  
  `@IsNotEmpty()`  
  `disseminatedFact: string;`

  `@IsString()`  
  `@IsOptional()`  
  `expectedReaction?: string;`

  `@IsString({ each: true })`  
  `recipientSourceIds: string[];`  
`}`

### **B. Servicio Principal (omnipulse.service.ts)**

Implementa los siguientes métodos clave:

> 1. recordInsight(tenantId: string, dto: CreateMarketInsightDto): Registra el insight y actualiza el contador totalReports de la fuente.  
> 2. verifyInsight(tenantId: string, insightId: string, dto: VerifyInsightDto):  
   * Modifica el estado del insight.  
   * Aplica el recálculo dinámico del reliabilityScore en IntelSource:  
     * CORROBORATED\_TRUE: Incrementa el score proporcionalmente y suma verifiedTrue.  
     * CORROBORATED\_FALSE / DEBUNKED: Reduce severamente el score, suma verifiedFalse y activa isToxicChannel \= true si el score cae por debajo del 30%.  
> 3. correlateWithSales(tenantId: string, insightId: string):  
   * Consulta el historial de ventas (order\_lines / SaleOrder) de los últimos 30 días previos y posteriores a la fecha del insight para el producto/categoría.  
   * Calcula el diferencial porcentual de volumen y margen.

### **C. Controlador (omnipulse.controller.ts)**

Expone los endpoints bajo /api/v1/pulse/:

> * POST /api/v1/pulse/sources \- Crear fuente de información  
> * GET /api/v1/pulse/sources \- Listar fuentes con ranking de fiabilidad  
> * POST /api/v1/pulse/insights \- Registrar nuevo reporte de campo  
> * GET /api/v1/pulse/insights \- Listado con filtros de categoría y estado  
> * PATCH /api/v1/pulse/insights/:id/verify \- Validar/desmentir insight  
> * POST /api/v1/pulse/probes \- Crear operación de sondeo táctico  
> * GET /api/v1/pulse/radar \- Resumen ejecutivo para el dashboard

## **🎨 PASO 3: Interfaz de Usuario (Refine.dev \+ Ant Design)**

Crea las vistas en frontend/src/pages/admin/omnipulse/:

> 1. **Dashboard Radar (RadarView.tsx):**  
   * **Métricas:** Total Insights activos, Índice de Confiabilidad Promedio, Fuentes Tóxicas Detectadas.  
   * **Matriz de Veracidad:** Gráfico comparativo de Rumores vs. Ventas Reales.  
> 2. **Directorio de Fuentes (SourcesList.tsx):**  
   * Tabla con Progress bar para el reliabilityScore (Verde \>70%, Amarillo 40-70%, Rojo \<40%).  
   * Tag de advertencia si isToxicChannel está activo.  
> 3. **Módulo de Operaciones Tácticas (StrategicProbes.tsx):**  
   * Panel para monitorear sondas activas y registrar qué fuentes filtraron información hacia el mercado.

## **🔒 Reglas Estrictas de Ingeniería**

> 1. **Multi-Tenancy:** Todo acceso a Prisma debe filtrar por tenantId.  
> 2. **Alineación con Odoo / ERP:** Si el productId o contactId proviene de una integración externa, resolverlo de forma no bloqueante.  
> 3. **Validación de Compilación:** Ejecutar npm run build en backend y frontend para certificar cero errores de tipado en TypeScript. """

# **Write Plan**

with open("PLAN\_MAESTRO\_OMNIPULSE.md", "w", encoding="utf-8") as f: f.write(plan\_content)

# **Write Prompt**

with open("PROMPT\_IMPLEMENTACION\_OMNIPULSE.md", "w", encoding="utf-8") as f: f.write(prompt\_content)

print("Files generated successfully: PLAN\_MAESTRO\_OMNIPULSE.md and PROMPT\_IMPLEMENTACION\_OMNIPULSE.md")

`Tus archivos Markdown (.md) están listos para descargar:`

`1. **Plan Maestro de Arquitectura y Negocio:** [file-tag: code-generated-file-1-1787007647349965024]`

`2. **System Prompt Maestro de Implementación Técnica:** [file-tag: code-generated-file-0-1787007647349957544]`

`---`

`### Resumen de lo que cubren ambos documentos:`

``* **Plan Maestro (`PLAN_MAESTRO_OMNIPULSE.md`):**``  
  `- **Pilar 1:** Algoritmo de Reputación Dinámica y Scoring de Fuentes (Matriz de Confiabilidad A-E / 0-100%).`  
  `- **Pilar 2:** Motor de Corroboración con Datos Duros (cruce automático con ventas y márgenes históricos en OmniFlow/Odoo).`  
  `- **Pilar 3:** Operaciones Tácticas y *Canary Trapping* (detección de fuentes que filtran información y sondeo de reacciones de la competencia).`  
  `- **Roadmap & Fases:** Desglose en 4 fases de entrega técnica.`

``* **System Prompt de Implementación (`PROMPT_IMPLEMENTACION_OMNIPULSE.md`):**``  
  ``- **Paso 1 (Prisma Schema):** Modelos `IntelSource`, `MarketInsight`, `StrategicProbe` y `ProbeRecipient` con tipado Decimal estricto y enums.``  
  ``- **Paso 2 (NestJS Backend):** DTOs, métodos del servicio para recálculo de reputación y correlación de ventas, y controlador REST bajo `/api/v1/pulse/`.``  
  `- **Paso 3 (Refine.dev UI):** Vistas para el Dashboard Radar de Mercado, lista de fuentes con semáforos de confiabilidad y panel de sondas tácticas.`  
  `- **Reglas de Ingeniería:** Multi-tenancy obligatorio y compatibilidad desacoplada con el ERP.`

---

