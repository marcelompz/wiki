# Arquitectura Modular - OrderFlow vs Odoo

**Fecha:** 2026-06-22  
**Estado:** 📋 Análisis de arquitectura actual  
**Recomendación:** Formalizar sistema de módulos (similar a Odoo)

---

## 📊 ESTADO ACTUAL DE ORDERFLOW

### ✅ OrderFlow **YA ES MODULAR** (a nivel de código)

**Módulos actuales en Backend (NestJS):**

| Módulo | Path | Estado | Descripción |
|--------|------|--------|-------------|
| **Auth** | `src/auth/` | ✅ Implementado | Autenticación JWT + API Keys |
| **Tenants** | `src/tenants/` | ✅ Implementado | Gestión multi-tenant (empresas) |
| **Products** | `src/products/` | ✅ Implementado | Catálogo de productos |
| **Orders** | `src/orders/` | ✅ Implementado | Pedidos + webhooks |
| **Customers** | `src/customers/` | ✅ Implementado | Clientes |
| **Bookings** | `src/bookings/` | ✅ Implementado | Turnos/agenda |
| **Contacts** | `src/contacts/` | ✅ Implementado | Contactos (estilo Odoo res.partner) |
| **Users** | `src/users/` | ✅ Implementado | Usuarios del sistema |
| **Integrations** | `src/integrations/` | ✅ Implementado | Conexiones ERP (Odoo, MIDA, SAP) |
| **Health** | `src/health/` | ✅ Implementado | Health checks |
| **Webhooks** | `src/webhooks/` | ⚠️ Vacío | Pendiente de implementar |

**Estructura de cada módulo (convención NestJS):**

```
src/orders/
├── dto/                       # Data Transfer Objects (validación)
│   └── create-order.dto.ts
├── entities/                  # Entidades (mapeo a DB)
│   └── order.entity.ts
├── orders.controller.ts       # Endpoints HTTP
├── orders.service.ts          # Lógica de negocio
├── orders.module.ts           # Declaración del módulo
└── webhook-cron.service.ts    # Servicio secundario
```

**Registro en `app.module.ts`:**

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    
    // ✅ Módulos de negocio (10 módulos)
    TenantsModule,
    ProductsModule,
    OrdersModule,
    CustomersModule,
    BookingsModule,
    UsersModule,
    IntegrationsModule,
    ContactsModule,
    AuthModule,
    HealthModule,
  ],
  providers: [PrismaService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

---

## 🔄 COMPARACIÓN: ORDERFLOW vs ODOO

### **Odoo: Sistema de Módulos Explícito**

| Característica | Odoo | OrderFlow Actual |
|----------------|------|------------------|
| **Manifiesto de módulo** | ✅ `__manifest__.py` (nombre, versión, dependencias) | ❌ No tiene (solo `*.module.ts`) |
| **Instalación/desinstalación** | ✅ UI para activar/desactivar módulos | ❌ Todos los módulos siempre activos |
| **Dependencias entre módulos** | ✅ `depends: ['base', 'sale']` | ⚠️ Implícitas (imports en TypeScript) |
| **Módulos por defecto** | ✅ `base` siempre instalado | ❌ No hay concepto de "core" |
| **Módulos opcionales** | ✅ 20,000+ módulos en OCA | ❌ Todos son "core" |
| **Extensibilidad** | ✅ Herencia de vistas/modelos | ❌ Requiere modificar código |
| **Apps Store** | ✅ Odoo Apps (comerciales y free) | ❌ No existe |
| **Versionado por módulo** | ✅ Cada módulo tiene su versión | ⚠️ Todos en `0.1.0` |
| **Migraciones** | ✅ Scripts `migrations/` por versión | ❌ Solo migraciones Prisma globales |

---

### **OrderFlow: Arquitectura NestJS (implícitamente modular)**

| Característica | OrderFlow | Notas |
|----------------|-----------|-------|
| **Aislamiento** | ✅ Alto (cada módulo tiene su service) | Buena separación de concerns |
| **Reutilización** | ✅ Módulos exportan services | `exports: [OrdersService]` |
| **Inyección de dependencias** | ✅ Automática (NestJS DI) | Mejor que Odoo en este aspecto |
| **Testing** | ⚠️ Posible pero no implementado | 0 tests unitarios actualmente |
| **Hot reload** | ✅ En desarrollo (NestJS) | Mejor que Odoo (requiere restart) |
| **Type safety** | ✅ TypeScript | Mejor que Python (Odoo) |

---

## 🎯 RECOMENDACIÓN: FORMALIZAR SISTEMA DE MÓDULOS

### **Propuesta: Sistema de Módulos Híbrido (NestJS + Odoo-style)**

Mantener la arquitectura NestJS actual pero **agregar metadata al estilo Odoo**:

---

## 📋 ARQUITECTURA PROPUESTA

### **1. Manifiesto de Módulo (similar a `__manifest__.py`)**

**Archivo:** `src/{modulo}/{modulo}.manifest.json`

**Ejemplo:** `src/orders/orders.manifest.json`

```json
{
  "name": "orders",
  "displayName": "Pedidos",
  "description": "Gestión de pedidos de clientes con webhook a ERP",
  "version": "0.1.0",
  "author": "OrderFlow Team",
  "license": "MIT",
  
  "category": "sales",
  "icon": "shopping-cart",
  
  "depends": ["tenants", "customers", "products", "integrations"],
  "dependsExternal": [],
  
  "data": [
    "data/orders_data.xml"
  ],
  
  "demo": [
    "demo/orders_demo.xml"
  ],
  
  "endpoints": [
    {
      "path": "/api/v1/orders",
      "methods": ["GET", "POST"],
      "auth": "api-key"
    },
    {
      "path": "/api/v1/orders/:id/confirm",
      "methods": ["PATCH"],
      "auth": "api-key"
    }
  ],
  
  "permissions": [
    {
      "role": "ADMIN",
      "actions": ["create", "read", "update", "delete", "confirm"]
    },
    {
      "role": "SELLER",
      "actions": ["create", "read"]
    },
    {
      "role": "VIEWER",
      "actions": ["read"]
    }
  ],
  
  "webhooks": [
    {
      "event": "order.confirmed",
      "description": "Disparado cuando un pedido se confirma",
      "payload": {
        "order_id": "uuid",
        "customer": "object",
        "items": "array"
      }
    }
  ],
  
  "settings": [
    {
      "key": "autoWebhook",
      "type": "boolean",
      "default": true,
      "description": "Enviar webhook automáticamente al confirmar"
    },
    {
      "key": "webhookTimeout",
      "type": "number",
      "default": 5000,
      "description": "Timeout en ms para webhooks"
    }
  ],
  
  "installable": true,
  "autoInstall": false,
  "application": true
}
```

---

### **2. Registry de Módulos**

**Archivo:** `src/modules.registry.ts`

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

export interface ModuleManifest {
  name: string;
  displayName: string;
  version: string;
  depends: string[];
  category: string;
  installable: boolean;
  autoInstall: boolean;
  application: boolean;
  // ... más campos
}

export class ModulesRegistry {
  private modules: Map<string, ModuleManifest> = new Map();
  
  loadAll() {
    const modulesPath = join(__dirname, '.');
    const moduleDirs = [
      'auth', 'tenants', 'products', 'orders', 'customers',
      'bookings', 'contacts', 'users', 'integrations', 'health'
    ];
    
    moduleDirs.forEach(dir => {
      try {
        const manifestPath = join(modulesPath, dir, `${dir}.manifest.json`);
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        this.modules.set(manifest.name, manifest);
      } catch (error) {
        console.warn(`⚠️ Módulo ${dir} no tiene manifiesto`);
      }
    });
  }
  
  getModule(name: string): ModuleManifest | undefined {
    return this.modules.get(name);
  }
  
  getAllModules(): ModuleManifest[] {
    return Array.from(this.modules.values());
  }
  
  getInstalledModules(): ModuleManifest[] {
    // En el futuro, filtrar por módulos "instalados" en DB
    return this.getAllModules().filter(m => m.installable);
  }
  
  getDependencies(moduleName: string): string[] {
    const module = this.modules.get(moduleName);
    if (!module) return [];
    return module.depends || [];
  }
  
  // Topological sort para orden de instalación
  getInstallOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    
    const visit = (moduleName: string) => {
      if (visited.has(moduleName)) return;
      visited.add(moduleName);
      
      const deps = this.getDependencies(moduleName);
      deps.forEach(dep => visit(dep));
      
      order.push(moduleName);
    };
    
    this.getAllModules().forEach(m => visit(m.name));
    return order;
  }
}

// Singleton
export const modulesRegistry = new ModulesRegistry();
modulesRegistry.loadAll();
```

---

### **3. Endpoints de Gestión de Módulos**

**Controller:** `src/modules/modules.controller.ts`

```typescript
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/api-key.guard';

@Controller('api/v1/modules')
@UseGuards(ApiKeyGuard)
export class ModulesController {
  @Get()
  getAllModules() {
    // Retorna lista de todos los módulos disponibles
    return modulesRegistry.getAllModules();
  }
  
  @Get('installed')
  getInstalledModules() {
    // Retorna módulos "instalados" (activos para este tenant)
    return modulesRegistry.getInstalledModules();
  }
  
  @Get(':name')
  getModuleDetails(@Param('name') name: string) {
    // Retorna detalles de un módulo específico
    return modulesRegistry.getModule(name);
  }
  
  @Post(':name/install')
  installModule(@Param('name') name: string) {
    // "Instala" un módulo (lo activa para el tenant)
    // Ejecuta scripts de instalación si existen
    // Valida dependencias
    return { success: true, module: name };
  }
  
  @Post(':name/uninstall')
  uninstallModule(@Param('name') name: string) {
    // "Desinstala" un módulo (lo desactiva)
    // Verifica que no haya dependencias
    return { success: true, module: name };
  }
}
```

---

### **4. UI de Gestión de Módulos (Frontend)**

**Página:** `frontend/src/pages/admin/modules.tsx`

```tsx
// Lista de módulos disponibles con:
// - Nombre y descripción
// - Versión
// - Estado (instalado/no instalado)
// - Dependencias
// - Botón instalar/desinstalar
// - Settings del módulo (si tiene)

// Similar a: Settings → Apps en Odoo
```

**Mockup:**

```
┌─────────────────────────────────────────────────────────────┐
│  Módulos Instalados (10/11)                        [Buscar] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📦 VENTAS                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🛒 Pedidos                            ✅ Instalado    │  │
│  │ Gestión de pedidos con webhook a ERP                 │  │
│  │ v0.1.0 | MIT | Depende: Tenants, Clientes, Productos │  │
│  │ [Configuración] [Desinstalar]                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📋 Presupuestos                      ⬜ No instalado  │  │
│  │ Presupuestos de venta convertibles a pedidos         │  │
│  │ v0.0.1 | MIT | Depende: Pedidos                      │  │
│  │ [Instalar]                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  📅 AGENDA                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📅 Turnos y Reservas                  ✅ Instalado    │  │
│  │ Gestión de turnos por profesional y recurso          │  │
│  │ v0.1.0 | MIT | Depende: Tenants                      │  │
│  │ [Configuración] [Desinstalar]                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

### **5. Scripts de Instalación/Migración**

**Path:** `src/{modulo}/migrations/`

```
src/orders/migrations/
├── 0.1.0-install.ts      # Script de instalación
├── 0.1.1-update.ts       # Script de actualización
└── 0.2.0-migrate.ts      # Migración de datos
```

**Ejemplo:** `src/orders/migrations/0.1.0-install.ts`

```typescript
import { PrismaService } from '../../common/prisma.service';

export async function install(prisma: PrismaService, tenantId: string) {
  console.log(`Instalando módulo Orders para tenant ${tenantId}`);
  
  // Crear datos por defecto
  await prisma.orderStatus.createMany({
    data: [
      { name: 'Borrador', code: 'draft', tenantId },
      { name: 'Confirmado', code: 'confirmed', tenantId },
      { name: 'Cancelado', code: 'cancelled', tenantId },
    ]
  });
  
  // Crear configuración por defecto
  await prisma.moduleConfig.upsert({
    where: { tenantId_module: { tenantId, module: 'orders' } },
    create: {
      tenantId,
      module: 'orders',
      config: {
        autoWebhook: true,
        webhookTimeout: 5000,
      }
    },
    update: {}
  });
  
  console.log('✅ Módulo Orders instalado');
}

export async function uninstall(prisma: PrismaService, tenantId: string) {
  console.log(`Desinstalando módulo Orders para tenant ${tenantId}`);
  
  // Eliminar configuración
  await prisma.moduleConfig.delete({
    where: { tenantId_module: { tenantId, module: 'orders' } }
  });
  
  // ⚠️ No eliminar datos (pedidos existentes)
  // Solo desactivar el módulo
  
  console.log('✅ Módulo Orders desinstalado');
}
```

---

## 📊 BENEFICIOS DE FORMALIZAR MÓDULOS

| Beneficio | Impacto | Prioridad |
|-----------|---------|-----------|
| **Visibilidad** | Saber qué módulos existen y sus dependencias | Alta |
| **Gestión UI** | Activar/desactivar módulos sin código | Media |
| **Settings por módulo** | Configuración específica sin hardcodear | Alta |
| **Versionado independiente** | Cada módulo evoluciona a su ritmo | Media |
| **Módulos opcionales** | Clientes pagan solo por lo que usan | **Comercial** |
| **Ecosistema third-party** | Otros devs pueden crear módulos | **Estratégico** |
| **Migraciones controladas** | Scripts por versión de módulo | Alta |

---

## 🗺️ ROADMAP DE IMPLEMENTACIÓN

### **Fase 1: Metadata Básica (Semana 1)**

- [ ] Crear `*.manifest.json` para los 10 módulos actuales
- [ ] Implementar `ModulesRegistry` (carga de manifiestos)
- [ ] Endpoint `/api/v1/modules` (listar módulos)

### **Fase 2: Gestión UI (Semana 2)**

- [ ] Página `admin/modules.tsx` (lista de módulos)
- [ ] Botones instalar/desinstalar (UI)
- [ ] Settings por módulo (formulario dinámico)

### **Fase 3: Instalación Real (Semana 3)**

- [ ] Scripts `migrations/*.ts` por módulo
- [ ] Endpoint `POST /modules/:name/install` (ejecuta scripts)
- [ ] Tabla `ModuleInstallation` en DB (tenant_id, module, version, installed_at)

### **Fase 4: Dependencias y Validación (Semana 4)**

- [ ] Validar dependencias antes de instalar
- [ ] Topological sort para orden de instalación
- [ ] Prevenir desinstalación si hay dependencias

### **Fase 5: Módulo de Ejemplo Opcional (Semana 5-6)**

- [ ] Crear módulo **nuevo desde cero** (ej: `quotations` / presupuestos)
- [ ] Documentar proceso de creación de módulos
- [ ] Template/generador de módulos (`npm run generate:module`)

---

## 💡 EJEMPLO: MÓDULO OPCIONAL "PRESUPUESTOS"

**Caso de uso:** Cliente quiere presupuestos antes de pedidos (no está en el core)

**Estructura:**

```
src/quotations/
├── quotations.manifest.json   # Metadata
├── quotations.module.ts       # NestJS module
├── quotations.controller.ts   # Endpoints
├── quotations.service.ts      # Lógica
├── dto/
│   └── create-quotation.dto.ts
├── entities/
│   └── quotation.entity.ts
└── migrations/
    └── 0.1.0-install.ts       # Script de instalación
```

**`quotations.manifest.json`:**

```json
{
  "name": "quotations",
  "displayName": "Presupuestos",
  "description": "Presupuestos de venta convertibles a pedidos",
  "version": "0.1.0",
  "category": "sales",
  "depends": ["tenants", "customers", "products", "orders"],
  "installable": true,
  "autoInstall": false,
  "application": false,
  "commercial": {
    "plan": "professional",
    "price": 10,
    "billing": "monthly"
  }
}
```

**Instalación vía UI:**
1. Admin va a `Settings → Módulos`
2. Busca "Presupuestos"
3. Click en "Instalar"
4. Sistema valida dependencias (Tenants, Clientes, Productos, Pedidos)
5. Ejecuta `migrations/0.1.0-install.ts`
6. Crea tabla `quotations` en DB
7. Activa endpoints `/api/v1/quotations`
8. Módulo listo para usar

---

## 🎯 CONCLUSIÓN

**OrderFlow YA TIENE arquitectura modular** (NestJS modules), pero **no está formalizada** como sistema de gestión de módulos.

**Recomendación:** Implementar **Fase 1 (Metadata Básica)** post-Fase 0 del cronograma de auditoría.

**Beneficio inmediato:** Documentación clara de módulos y dependencias.

**Beneficio a largo plazo:** Ecosistema de módulos opcionales (modelo Odoo Apps) para monetización.

---

## 📁 ARCHIVOS PROPUESTOS

| Archivo | Propósito | Prioridad |
|---------|-----------|-----------|
| `src/{modulo}/*.manifest.json` | Metadata de cada módulo | Alta |
| `src/modules.registry.ts` | Registry centralizado | Alta |
| `src/modules/modules.controller.ts` | API de gestión | Media |
| `src/modules/modules.service.ts` | Lógica de instalación | Media |
| `src/modules/dto/install-module.dto.ts` | Validación | Media |
| `frontend/src/pages/admin/modules.tsx` | UI de gestión | Media |
| `src/{modulo}/migrations/*.ts` | Scripts de instalación | Alta |
| `scripts/generate-module.ts` | Generador de módulos | Baja |

---

**Documento para evaluación del equipo**  
**Próxima revisión:** Post-Fase 0 (semana 2-3 del cronograma de auditoría)
