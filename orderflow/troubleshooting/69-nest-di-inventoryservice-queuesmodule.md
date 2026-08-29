# 🛠️ Troubleshooting #69 — NestJS DI: `InventoryService` no disponible en `QueuesModule`

## 📅 Fecha
2026-08-26

## 🎯 Síntoma
- Backend en crash loop tras fix de `sharp` (troubleshooting #68)
- `docker logs` muestra error de NestJS antes de `app.listen()`:
```
ERROR [ExceptionHandler] Nest can't resolve dependencies of the BatchProductImportService (PrismaService, ?).
Please make sure that the argument InventoryService at index [1] is available in the QueuesModule context.
```
- Health check falla: `Connection refused` en puerto 3010

## 🔍 Causa Raíz
`BatchProductImportService` (en `src/products/services/`) inyecta `InventoryService`
en su constructor, pero fue registrado como provider en `QueuesModule` sin que
`InventoryModule` estuviera importado en ese módulo.

```typescript
// batch-product-import.service.ts
constructor(
  private prisma: PrismaService,
  private readonly inventoryService: InventoryService  // ← no resolvible
) {}
```

`QueuesModule` tenía `BatchProductImportService` en `providers` pero no importaba
`InventoryModule` (que es quien exporta `InventoryService`).

## ✅ Solución Aplicada
**Commit `e10e702`** — `fix(queues): add InventoryModule to QueuesModule`

En `backend/src/queues/queues.module.ts`:
```typescript
// Agregado en imports:
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    // ...BullModule queues...
    SocialCatalogModule,
    InventoryModule,   // ← AÑADIDO
  ],
  // ...
})
export class QueuesModule {}
```

## 🧪 Verificación
```bash
docker logs orderflow-backend-prod --tail 10
# Debe mostrar: "Nest application successfully started"

docker exec orderflow-backend-prod wget -qO- http://localhost:3010/api/v1/health
# {"status":"ok",...}
```

## 🔗 Referencias
- Commit: `e10e702`
- Archivo: `backend/src/queues/queues.module.ts`
- Relacionado: [#27 — DI Scope AuditService en BullMQ](27-nest-dependency-resolution-scope-audit-service.md)
- Relacionado: [#53 — DI AnalyticsExportService](53-nest-dependency-resolution-analytics-export-service.md)
