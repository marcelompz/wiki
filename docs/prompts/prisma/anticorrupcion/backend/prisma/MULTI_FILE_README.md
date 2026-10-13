# Prisma multi-file layout (Fase 0)

## Objetivo

Organizar el schema monolítico (~64 modelos) en archivos por bounded context
**sin cambiar todavía el runtime**. Esto reduce el peso mental y prepara la
extracción de módulos standalone.

## Estructura

```
backend/prisma/
├── schema.prisma              # generator + datasource (entrypoint)
├── schema.prisma.monolith.bak # backup del schema original monolítico
└── models/
    ├── platform.prisma        # Tenant, User, Auth, Billing, Audit, Server...
    ├── commerce.prisma        # Product, Order, Contact, Stock, Integrations...
    └── _deprecated/
        └── giveaways.prisma   # Tras migrar a standalone → borrar
```

## Cómo activarlo

1. Backup:
   ```bash
   cp prisma/schema.prisma prisma/schema.prisma.monolith.bak
   ```

2. Mover el contenido de modelos a `models/platform.prisma` y `models/commerce.prisma`
   (clasificación en `docs/SCHEMA_DECOUPLING_PLAN.md` §2).

3. Dejar en `schema.prisma` solo `generator` + `datasource`.

4. En `package.json` / CI:
   ```json
   "prisma": {
     "schema": "prisma"
   }
   ```
   (Prisma une todos los `.prisma` del directorio).

5. Verificar:
   ```bash
   npx prisma validate
   npx prisma generate
   ```

## Clasificación rápida

### platform.prisma
- Tenant, Server, DeployInstance
- User, UserTenantAccess, Permission, RolePermission, UserTenantPermission
- ApiKeyRotation, ApiKeyAuditLog, AuditLog
- ModuleInstallation
- SubscriptionPlan, Subscription, Invoice, SubscriptionAddon, PaymentTransaction

### commerce.prisma
- Product, Warehouse, Location, StockQuant, StockMove
- Contact*, ContactAddress, ContactCategory*, ContactBankAccount, ContactRole
- Customer (legacy), Supplier, GlobalDirectory
- Order, OrderLine, Payment, CashMovement, WebhookLog
- Service, Resource*, BookingSlot, AppointmentAssignment  (hasta extraer Bookings)
- Quotation, QuotationItem                                  (hasta extraer Quotations)
- Loyalty*                                                  (hasta extraer Loyalty)
- Integration, IntegrationFieldMap, Tango*, Facturasend*, ElectronicDocument
- ImportJob, ExchangeRate, CatalogChannelConfig             (hasta extraer Social Catalog)
- RetentionRule, FollowUpJob
- BioLink, BioLinkClick                                     (hasta extraer Bio-Links)
- PushToken

### _deprecated/giveaways.prisma (temporal)
- Giveaway, GiveawayRegistration, GiveawayWinner + enum GiveawayStatus
- Eliminar tras cut-over del standalone (ver docs/GIVEAWAYS_SCHEMA_EXTRACTION.md)

## Regla de oro

> Cualquier modelo **nuevo** de un feature que pueda ser standalone
> **no** se agrega aquí: nace directamente en `services/<modulo>-standalone/prisma/`.
