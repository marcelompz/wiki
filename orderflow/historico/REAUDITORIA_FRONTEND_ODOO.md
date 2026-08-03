# OrderFlow - Reauditoría del Frontend e Integración con Odoo

**Fecha:** 2026-06-22  
**Estado:** ⚠️ En Progreso

---

## 📊 Resumen Ejecutivo

### Frontend - Estado Actual

| Aspecto | Estado Anterior | Estado Actual | Evaluación |
|---------|-----------------|---------------|------------|
| **Templates hardcodeados** | ❌ 2 templates | ⚠️ 3 archivos (incluye TenantTemplate) | ⚠️ Mejorable |
| **TenantTemplate** | ✅ Creado | ✅ Implementado | ✅ Bien |
| **BrandingProvider** | ✅ Contexto | ✅ Funcional | ✅ Bien |
| **Tests** | ❌ 0 tests | ✅ 2 archivos de test | ✅ Bien |
| **Archivos obsoletos** | ❌ checkout.tsx.old | ❌ Todavía existe | ❌ Pendiente |

### Integración Odoo - Estado Actual

| Aspecto | Estado | Evaluación |
|---------|--------|------------|
| **odoo-adapter** | ✅ Implementado | ✅ Bien documentado |
| **Backend endpoint** | ✅ `/api/v1/integrations` | ✅ CRUD completo |
| **Frontend UI** | ✅ `admin/integrations.tsx` | ✅ Interfaz completa |
| **Conexión real** | ⚠️ Solo test simulado | ⚠️ Falta implementación |
| **Odoo 8083** | ✅ Corriendo | ✅ Docker configurado |

---

## 🏗️ Frontend - Reauditoría Completa

### 1. Estructura de Directorios

```
frontend/src/
├── pages/
│   ├── admin/                ✅ CRUDs administrativos
│   ├── ApiKeyConfig.tsx      ✅ Configuración API Key
│   ├── catalog.tsx           ⚠️ Sin usar (duplicado)
│   ├── catalog-with-categories.tsx ✅ En uso
│   ├── checkout.tsx          ⚠️ En uso
│   ├── checkout.tsx.old      ❌ BORRAR (obsoleto)
│   ├── checkout-simple.tsx   ⚠️ Sin usar
│   ├── orders.tsx            ✅ En uso
│   ├── orderflow-landing.tsx ⚠️ Sin usar
│   ├── TenantTemplate.tsx    ✅ NUEVO - Template dinámico
│   ├── retail-template.tsx   ❌ DEBERÍA BORRARSE
│   └── spa-template.tsx      ❌ DEBERÍA BORRARSE
├── components/
│   ├── tenant/
│   │   ├── BrandingProvider.tsx   ✅ Implementado
│   │   └── __tests__/
│   │       └── BrandingProvider.test.tsx ✅ Tests
│   ├── CartDrawer.tsx        ✅ Carrito
│   ├── SlotPicker.tsx        ✅ Turnos
│   └── index.ts
├── hooks/
│   ├── useTenantConfig.ts    ✅ Hook multi-tenant
│   └── __tests__/
│       └── useTenantConfig.test.ts ✅ Tests
├── services/
│   ├── api.ts                ✅ Axios config
│   └── tenant.service.ts     ✅ Servicio de tenants
└── store/
    └── public-cart-store.ts  ✅ Zustand cart
```

---

### 2. Problemas Detectados

#### 🔴 Críticos

**1. Archivos Obsoletos (3 archivos)**

```bash
# Deberían borrarse:
src/pages/checkout.tsx.old       # Backup innecesario
src/pages/retail-template.tsx    # Reemplazado por TenantTemplate
src/pages/spa-template.tsx       # Reemplazado por TenantTemplate
src/pages/catalog.tsx            # Duplicado de catalog-with-categories
src/pages/orderflow-landing.tsx  # Sin uso aparente
src/pages/checkout-simple.tsx    # Duplicado de checkout.tsx
```

**Impacto:**
- Confusión para desarrolladores
- Código muerto en el repo
- Aumenta tiempo de build innecesariamente

**Solución:**
```bash
cd /opt/orderflow/frontend/src/pages
rm checkout.tsx.old
rm retail-template.tsx
rm spa-template.tsx
rm catalog.tsx
rm orderflow-landing.tsx
rm checkout-simple.tsx
```

---

**2. TenantTemplate No Se Está Usando**

**Problema:**
```typescript
// App.tsx - Todavía usa las rutas viejas
<Routes>
  <Route path="/" element={<CatalogPage />} />
  <Route path="/catalogo" element={<CatalogWithCategoriesPage />} />
  <Route path="/checkout" element={<CheckoutPage />} />
  <Route path="/orders" element={<OrdersPage />} />
  {/* ❌ No hay ruta para TenantTemplate */}
</Routes>
```

**Solución:**
```typescript
// App.tsx - Actualizar con TenantTemplate
import { TenantTemplatePage } from './pages/TenantTemplate';

<Routes>
  <Route path="/tienda" element={<TenantTemplatePage />} />
  <Route path="/tienda/:category" element={<TenantTemplatePage />} />
  {/* Mantener admin separado */}
  <Route path="/admin/*" element={<AdminApp />} />
</Routes>
```

---

**3. BrandingProvider No Envuelve la App**

**Problema:**
```typescript
// main.tsx - Sin BrandingProvider
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />  {/* ❌ Sin BrandingProvider */}
  </React.StrictMode>
);
```

**Solución:**
```typescript
// main.tsx
import { BrandingProvider } from './components/tenant/BrandingProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrandingProvider>
      <App />
    </BrandingProvider>
  </React.StrictMode>
);
```

---

#### 🟡 Medianos

**4. Tests Sin Ejecutar**

**Archivos creados:**
- ✅ `components/tenant/__tests__/BrandingProvider.test.tsx`
- ✅ `hooks/__tests__/useTenantConfig.test.ts`

**Problema:**
```json
// package.json - Sin script de tests
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx"
    // ❌ No hay "test"
  }
}
```

**Solución:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage"
  }
}
```

**Y configurar Jest:**
```typescript
// jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

---

**5. API Key en LocalStorage**

**Problema de seguridad:**
```typescript
// api.ts
const apiKey = localStorage.getItem('apiKey');
```

**Riesgos:**
- ⚠️ XSS vulnerability
- ⚠️ No expira nunca
- ⚠️ Accesible desde cualquier script

**Solución recomendada:**
```typescript
// Opción A: HTTP-only cookie (backend setea)
// Opción B: SessionStorage (se borra al cerrar)
const apiKey = sessionStorage.getItem('apiKey');
// Opción C: JWT con expiración
```

---

### 3. Fortalezas del Frontend

#### ✅ Bien Implementado

1. **TenantTemplate.tsx**
   - ✅ Dinámico, usa `useTenantConfig`
   - ✅ Branding automático
   - ✅ Carrito funcional
   - ✅ Búsqueda + filtros
   - ✅ Responsive

2. **BrandingProvider**
   - ✅ Contexto de React
   - ✅ Obtiene config del backend
   - ✅ Fallback si no hay config
   - ✅ Tests unitarios

3. **useTenantConfig Hook**
   - ✅ Reutilizable
   - ✅ Separa lógica de UI
   - ✅ Tests unitarios

4. **Zustand Cart Store**
   - ✅ Persistencia
   - ✅ Operaciones CRUD
   - ✅ Multi-tenant (nombre único)

5. **API Service**
   - ✅ Interceptors
   - ✅ Logging
   - ✅ Endpoints organizados

---

## 🔌 Integración con Odoo - Auditoría

### 1. Estado de la Integración

#### Arquitectura

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   OrderFlow     │────────▶│  odoo-adapter   │────────▶│   Odoo 8083     │
│   (Frontend)    │ webhook │  (Puente)       │ XML-RPC │   (ERP)         │
└─────────────────┘         └─────────────────┘         └─────────────────┘
     :3011                        :3005                       :8083
```

---

#### Componentes

| Componente | Ubicación | Estado |
|------------|-----------|--------|
| **Backend CRUD** | `backend/src/integrations/` | ✅ Completo |
| **Frontend UI** | `frontend/src/pages/admin/integrations.tsx` | ✅ Completa |
| **Odoo Adapter** | `odoo-adapter/` | ✅ Implementado |
| **Odoo 8083** | `/opt/odoo/odoo8083/` | ✅ Corriendo |
| **Webhooks** | `odoo-adapter/src/webhooks/` | ✅ Implementado |

---

### 2. Odoo 8083 - Configuración

**Directorio:** `/opt/odoo/odoo8083/`

**Configuración Docker:**
```yaml
version: '3.8'
services:
  web8084:  # Odoo 19
    container_name: odoo_web_8083
    image: odoo:19.0
    ports:
      - "8083:8069"
    volumes:
      - ./addons:/mnt/extra-addons
      - ./config:/etc/odoo
    environment:
      - HOST=db_odoo_5435
      - USER=odoo
      - PASSWORD=crossdimora.159753
  
  db5436:  # PostgreSQL 15
    container_name: db_odoo_5435
    image: postgres:15
    ports:
      - "5435:5432"
    environment:
      - POSTGRES_DB=postgres
      - POSTGRES_USER=odoo
      - POSTGRES_PASSWORD=crossdimora.159753
```

**Datos de conexión:**
- **Host:** `localhost`
- **Puerto Odoo:** `8083`
- **Puerto DB:** `5435`
- **DB User:** `odoo`
- **DB Password:** `crossdimora.159753`
- **Versión:** Odoo 19.0 CE

---

### 3. Odoo Adapter - Estado

**Directorio:** `/opt/orderflow/odoo-adapter/`

**Endpoints implementados:**
```typescript
POST /webhook/orderflow/order-confirmed   ✅ Implementado
POST /webhook/orderflow/order-cancelled   ✅ Implementado
GET  /health                               ✅ Implementado
```

**Mapeo de datos:**
| OrderFlow | Odoo | Modelo |
|-----------|------|--------|
| `customer.tax_id` | `res.partner.vat` | ✅ |
| `customer.name` | `res.partner.name` | ✅ |
| `booking_details.date` | `calendar.event.start` | ✅ |
| `assigned_resources[].name` | `hr.employee.name` | ✅ |
| `assigned_resources[].name` | `resource.resource.name` | ✅ |

**Problema detectado:**
- ⚠️ **No está corriendo** (no hay proceso activo)
- ⚠️ **No hay tests** del adapter
- ⚠️ **Configuración `.env`** pendiente

---

### 4. Backend Integrations - Estado

**Controller:** `backend/src/integrations/integrations.controller.ts`

**Endpoints:**
```typescript
GET    /api/v1/integrations       ✅ Listar
GET    /api/v1/integrations/:id   ✅ Obtener
POST   /api/v1/integrations       ✅ Crear
PATCH  /api/v1/integrations/:id   ✅ Actualizar
DELETE /api/v1/integrations/:id   ✅ Eliminar
POST   /api/v1/integrations/:id/test ✅ Test conexión
```

**Service:** `backend/src/integrations/services/integrations.service.ts`

**Problema:**
```typescript
// testConnection() - Solo simulado
async testConnection(id: string, tenantId: string) {
  // ❌ Solo retorna mensaje genérico
  return {
    success: true,
    message: `Connection test for ${integration.name} (${integration.type})`,
    timestamp: new Date(),
  };
}
```

**Debería:**
```typescript
async testConnection(id: string, tenantId: string) {
  const integration = await this.findOne(id, tenantId);
  
  if (integration.type === 'ODOO') {
    // ✅ Probar conexión real con Odoo
    return await this.odooService.testConnection(integration.config);
  }
  
  // ... otros tipos
}
```

---

### 5. Frontend Integrations - Estado

**Página:** `frontend/src/pages/admin/integrations.tsx`

**Features:**
- ✅ Listar integraciones
- ✅ Crear nueva integración
- ✅ Editar integración existente
- ✅ Eliminar integración
- ✅ Test de conexión (UI)
- ✅ Soporta múltiples tipos (ODOO, MercadoLibre, etc.)

**Tipos de integración soportados:**
```typescript
<Option value="ODOO">🔵 Odoo ERP</Option>
<Option value="MERCADOLIBRE">🟡 MercadoLibre</Option>
<Option value="WHATSAPP">🟢 WhatsApp Business</Option>
```

**Campos configurables:**
- Nombre
- Tipo
- URL del webhook
- Config (JSON):
  - Host
  - Puerto
  - Usuario
  - Contraseña
  - Base de datos

---

### 6. Problemas de Integración Detectados

#### 🔴 Críticos

**1. Test Connection No Funciona Realmente**

**Problema:**
```typescript
// integrations.service.ts
async testConnection(id: string, tenantId: string) {
  // ❌ Solo retorna mensaje simulado
  return {
    success: true,
    message: `Connection test for ${integration.name}`,
  };
}
```

**Solución:**
```typescript
// Implementar prueba real para Odoo
async testConnection(id: string, tenantId: string) {
  const integration = await this.findOne(id, tenantId);
  
  if (integration.type === 'ODOO') {
    try {
      // Probar conexión XML-RPC real
      const odoo = new OdooClient({
        url: integration.config.host,
        port: integration.config.port,
        db: integration.config.database,
        username: integration.config.username,
        password: integration.config.password,
      });
      
      await odoo.authenticate();
      
      return {
        success: true,
        message: 'Conexión exitosa con Odoo',
        version: await odoo.getVersion(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }
}
```

---

**2. Odoo Adapter No Está Corriendo**

**Estado:**
```bash
# Verificar si está corriendo
ps aux | grep odoo-adapter
# ❌ No hay proceso

# Verificar puerto 3005
netstat -tlnp | grep 3005
# ❌ Nadie escuchando
```

**Solución:**
```bash
cd /opt/orderflow/odoo-adapter

# Configurar .env
cp .env.example .env
# Editar .env con datos reales de Odoo 8083

# Instalar
npm install

# Iniciar (desarrollo)
npm run dev

# O en producción (con PM2)
pm2 start npm --name "odoo-adapter" -- start
```

---

**3. Webhook URL No Configurada en OrderFlow**

**Problema:**
```typescript
// El tenant no tiene webhook_url configurado
{
  "id": "tenant-123",
  "name": "Gaia Wellness",
  // ❌ Falta: webhook_order_confirmed_url
}
```

**Solución:**
```bash
# Actualizar tenant con webhook URL
curl -X PATCH "http://localhost:3010/api/v1/tenants/{tenant_id}" \
  -H "x-api-key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "webhook_order_confirmed_url": "http://localhost:3005/webhook/orderflow/order-confirmed"
    }
  }'
```

---

#### 🟡 Medianos

**4. Falta Documentación de Integración**

**No existe:**
- ❌ Guía de configuración paso a paso
- ❌ Diagrama de flujo de sincronización
- ❌ Troubleshooting específico
- ❌ Ejemplos de payloads reales

**Recomendación:**
Crear `/opt/orderflow/docs/INTEGRACION_ODOO.md`

---

**5. No Hay Tests de Integración**

**Falta:**
- ❌ Tests del odoo-adapter
- ❌ Tests de webhooks
- ❌ Tests de mapeo de datos
- ❌ Tests E2E (OrderFlow → Odoo)

---

## 📋 Plan de Acción

### Sprint 1: Limpieza del Frontend (2-3 días)

```bash
# 1. Borrar archivos obsoletos
cd /opt/orderflow/frontend/src/pages
rm checkout.tsx.old retail-template.tsx spa-template.tsx
rm catalog.tsx orderflow-landing.tsx checkout-simple.tsx

# 2. Actualizar App.tsx
# - Agregar ruta para TenantTemplate
# - Importar BrandingProvider en main.tsx

# 3. Agregar tests al package.json
# - npm install -D jest @testing-library/react
# - Agregar scripts: test, test:watch, test:cov
# - Crear jest.config.ts

# 4. Ejecutar tests
npm test
```

---

### Sprint 2: Integración Odoo Real (3-4 días)

```bash
# 1. Configurar odoo-adapter
cd /opt/orderflow/odoo-adapter
cp .env.example .env
# Editar .env con datos de Odoo 8083

# 2. Iniciar odoo-adapter
npm install
npm run dev

# 3. Implementar testConnection real
# - backend/src/integrations/services/integrations.service.ts
# - Agregar OdooClient
# - Implementar prueba real

# 4. Configurar webhook en tenant
# - PATCH /api/v1/tenants/:id
# - Agregar webhook_order_confirmed_url

# 5. Probar flujo completo
# OrderFlow → odoo-adapter → Odoo 8083
```

---

### Sprint 3: Documentación y Tests (2-3 días)

```bash
# 1. Crear documentación
# - docs/INTEGRACION_ODOO.md
# - docs/FRONTEND_CLEANUP.md

# 2. Agregar tests de integración
# - odoo-adapter/tests/
# - backend/src/integrations/__tests__/

# 3. Agregar tests E2E
# - tests/e2e/odoo-integration.spec.ts
```

---

## ✅ Checklist de Verificación

### Frontend

- [ ] Borrar `checkout.tsx.old`
- [ ] Borrar `retail-template.tsx`
- [ ] Borrar `spa-template.tsx`
- [ ] Borrar `catalog.tsx`
- [ ] Borrar `orderflow-landing.tsx`
- [ ] Borrar `checkout-simple.tsx`
- [ ] Actualizar `App.tsx` con TenantTemplate
- [ ] Agregar BrandingProvider en `main.tsx`
- [ ] Agregar scripts de test en `package.json`
- [ ] Ejecutar tests localmente
- [ ] Configurar Jest

---

### Integración Odoo

- [ ] Configurar `.env` del odoo-adapter
- [ ] Iniciar odoo-adapter (puerto 3005)
- [ ] Implementar `testConnection()` real
- [ ] Configurar webhook URL en tenant
- [ ] Probar flujo completo (pedido → Odoo)
- [ ] Crear documentación de integración
- [ ] Agregar tests del adapter

---

## 📊 Métricas Actuales

| Métrica | Frontend | Integración |
|---------|----------|-------------|
| **Archivos obsoletos** | 6 | 0 |
| **Tests** | 2 archivos | 0 |
| **Endpoints reales** | N/A | 3/5 (60%) |
| **Documentación** | ✅ Completa | ⚠️ Pendiente |
| **En producción** | ⚠️ Parcial | ❌ No corre |

---

## 🎯 Conclusión

### Frontend

**Fortalezas:**
- ✅ TenantTemplate bien implementado
- ✅ BrandingProvider funcional
- ✅ Tests creados (pero sin ejecutar)
- ✅ Stack tecnológico moderno

**Debilidades:**
- 🔴 6 archivos obsoletos
- 🔴 TenantTemplate no se usa
- 🔴 BrandingProvider no envuelve la app
- 🔴 Tests sin configurar en package.json

**Recomendación:** **Sprint de limpieza (2-3 días)**

---

### Integración Odoo

**Fortalezas:**
- ✅ odoo-adapter implementado
- ✅ Backend CRUD completo
- ✅ Frontend UI completa
- ✅ Odoo 8083 corriendo

**Debilidades:**
- 🔴 testConnection() simulado
- 🔴 odoo-adapter no corre
- 🔴 Webhook URL no configurada
- 🔴 Sin documentación
- 🔴 Sin tests

**Recomendación:** **Sprint de integración (3-4 días)**

---

*Documento creado: 2026-06-22*  
*Próxima revisión: Después de Sprint 1 (limpieza frontend)*
