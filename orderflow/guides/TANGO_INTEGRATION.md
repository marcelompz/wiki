# 🔌 Integración Tango ERP Gestión (Adaptador Multi-Tenant)

**Versión:** 1.0.0  
**Módulo:** `backend/src/integrations/tango`  
**Estado:** ✅ Production Ready  

---

## 🎯 Descripción General
El adaptador de Tango ERP permite la sincronización bidireccional multi-tenant entre **OrderFlow** y **Tango Gestión ERP** (Axoft), automatizando los flujos de pedidos de venta, gestión de clientes y actualización masiva de stock sin intervención manual.

---

## 📐 Arquitectura & Modelos de Datos

### 1. Tablas Prisma (`schema.prisma`)

```prisma
model TangoTenantConfig {
  id                String    @id @default(uuid())
  tenantId          String    @unique
  baseUrl           String
  username          String
  passwordEncrypted String
  companyId         String?
  branchId          String?
  warehouseId       String?
  syncStockInterval Int       @default(15)
  active            Boolean   @default(true)
  lastSyncAt        DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@map("tango_tenant_configs")
}

model TangoIdMap {
  id             String   @id @default(uuid())
  tenantId       String
  entityType     String   // "customer" | "order" | "product" | "invoice"
  orderflowId    String
  tangoId        String
  tangoCompanyId String?
  metadata       Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, entityType, orderflowId])
  @@unique([tenantId, entityType, tangoId])
  @@index([tenantId, entityType])
  @@map("tango_id_maps")
}
```

---

## 🚀 Endpoints de la API (`/api/v1/integrations/tango`)

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `POST` | `/config` | `JwtAuthGuard` | Guardar / actualizar credenciales cifradas AES-256 del tenant |
| `GET` | `/config` | `JwtAuthGuard` | Obtener configuración del tenant (sin secretos) |
| `POST` | `/webhooks/order-confirmed` | `ApiKeyGuard` | Recibe notificación de pedido confirmado en OrderFlow e impacta Tango |
| `POST` | `/sync/stock` | `JwtAuthGuard` | Forzar sincronización puntual/manual de stock desde Tango ERP |

---

## 🔒 Seguridad e Idempotencia
- **Cifrado de Secretos:** Las contraseñas se almacenan cifradas en AES-256 (`tango.auth.service.ts`).
- **Aislamiento por `tenantId`:** Cada consulta y mapeo valida estrictamente el tenant del request.
- **Idempotencia:** Evita pedidos duplicados gracias al índice único `[tenantId, entityType, orderflowId]` en `TangoIdMap`.
