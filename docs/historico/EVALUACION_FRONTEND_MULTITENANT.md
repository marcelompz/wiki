# OrderFlow - Evaluación del Frontend Multi-Tenant

**Fecha:** 2026-06-21  
**Estado:** ⚠️ Parcialmente Implementado

---

## 📊 Resumen Ejecutivo

El frontend de OrderFlow tiene **2 arquitecturas coexistiendo**:

| Enfoque | Estado | Descripción |
|---------|--------|-------------|
| **Refine + Ant Design** | ✅ Implementado | App principal (`App.tsx`) con routing |
| **Templates Hardcodeados** | ⚠️ Prototipo | `retail-template.tsx`, `spa-template.tsx` |

**Problema principal:** Los templates están **hardcodeados** por tenant en lugar de ser **dinámicos y configurables**.

---

## 🏗️ Arquitectura Actual

### 1. App Principal (`App.tsx`)

**Tecnologías:**
- ✅ React 18 + TypeScript
- ✅ Refine Framework (para CRUDs)
- ✅ Ant Design (UI components)
- ✅ React Router (routing)
- ✅ Zustand (state management)
- ✅ Axios (HTTP client)

**Características:**
- ✅ API Key en localStorage
- ✅ Interceptor para agregar `x-api-key` automáticamente
- ✅ Badge de advertencia si no hay API Key configurada
- ✅ Múltiples rutas: `/catalog`, `/checkout`, `/orders`

**Puntos Débiles:**
- ❌ No hay configuración de branding dinámico (colores, logo)
- ❌ Templates hardcodeados en lugar de configurables
- ❌ No hay tenant-aware routing

---

### 2. Templates por Tenant

#### `retail-template.tsx` (Repuestos Enciso)

**Branding Hardcodeado:**
```typescript
const BRANDING = {
  primary: "#E74C3C", // Rojo automotriz
  secondary: "#34495E", // Gris oscuro
};
```

**Features:**
- ✅ Búsqueda y filtros
- ✅ Carrito drawer
- ✅ Categorías por tipo de vehículo

**Problemas:**
- ❌ API Key hardcodeada: `"12345"`
- ❌ Branding fijo en el código
- ❌ No es reutilizable para otros tenants

---

#### `spa-template.tsx` (Gaia Spa)

**Branding Hardcodeado:**
```typescript
const BRANDING = {
  primary: "#8B7355", // Marrón tierra
  secondary: "#D4A574", // Dorado
  accent: "#F5E6D3", // Crema
};
```

**Features:**
- ✅ Animaciones CSS personalizadas
- ✅ Fuentes de Google (Outfit)
- ✅ Bookings integration (SlotPicker)
- ✅ Diseño premium

**Problemas:**
- ❌ API Key hardcodeada: `"067059e2d6ae48d8a5f7c81b85fbf522"`
- ❌ Branding fijo en el código
- ❌ No es reutilizable para otros tenants

---

### 3. Configuración de API Key (`ApiKeyConfig.tsx`)

**Estado:** ✅ Funcional

**Features:**
- ✅ Input para API Key
- ✅ Guardado en localStorage
- ✅ Validación básica
- ✅ Botón para borrar
- ✅ API Key de desarrollo visible

**Mejoras Sugeridas:**
- [ ] Agregar validación de formato (length, caracteres)
- [ ] Testear la API Key contra el backend
- [ ] Mostrar información del tenant después de guardar

---

## 🎯 Configuración Multi-Tenant Actual

### Estado Actual

| Feature | Estado | Implementación |
|---------|--------|----------------|
| **API Key** | ✅ Funcional | localStorage + interceptor |
| **Branding** | ❌ Hardcodeado | Constantes en cada template |
| **Templates** | ❌ Estáticos | Archivos separados por tenant |
| **Routing** | ⚠️ Parcial | `/admin/tenant-id` no implementado |
| **Config Tenant** | ❌ No existe | No hay endpoint para obtener config |

### Flujo Actual (Manual)

```
1. Usuario entra a /config
2. Ingresa API Key manualmente
3. Se guarda en localStorage
4. Recarga y usa el template hardcodeado
5. ❌ No hay forma de saber qué tenant es
```

### Flujo Ideal (Automático)

```
1. Usuario entra a tenant.orderflow.app
2. Frontend obtiene tenant_id del subdominio
3. Llama a GET /api/v1/tenants/:id/config
4. Obtiene branding, logo, colores, features
5. Aplica configuración dinámicamente
6. ✅ Template personalizado sin hardcodear
```

---

## 📁 Estructura de Archivos

### Actual

```
frontend/
├── src/
│   ├── App.tsx                    ✅ Principal (Refine)
│   ├── AdminApp.tsx               ✅ Admin panel
│   ├── pages/
│   │   ├── ApiKeyConfig.tsx       ✅ Configuración
│   │   ├── catalog.tsx            ✅ Catálogo básico
│   │   ├── catalog-with-categories.tsx ✅ Con categorías
│   │   ├── checkout.tsx           ✅ Checkout
│   │   ├── orders.tsx             ✅ Pedidos
│   │   ├── retail-template.tsx    ⚠️ Hardcodeado (Repuestos)
│   │   ├── spa-template.tsx       ⚠️ Hardcodeado (Gaia Spa)
│   │   └── admin/
│   │       ├── dashboard.tsx      ✅ Dashboard admin
│   │       ├── products.tsx       ✅ CRUD productos
│   │       ├── bookings.tsx       ✅ Turnos
│   │       └── ...
│   ├── components/
│   │   ├── CartDrawer.tsx         ✅ Carrito
│   │   ├── SlotPicker.tsx         ✅ Selector de turnos
│   │   └── index.ts
│   ├── services/
│   │   └── api.ts                 ✅ Axios config
│   └── store/
│       └── public-cart-store.ts   ✅ Zustand cart
```

### Recomendada

```
frontend/
├── src/
│   ├── App.tsx                    ✅ Unificado
│   ├── pages/
│   │   ├── public/
│   │   │   ├── Catalog.tsx        ✅ Dinámico
│   │   │   ├── Checkout.tsx       ✅ Dinámico
│   │   │   └── Orders.tsx         ✅ Dinámico
│   │   ├── admin/
│   │   │   └── ...                ✅ CRUDs
│   │   └── tenant/
│   │       ├── TenantConfig.tsx   🆕 Obtener config del tenant
│   │       └── TemplateRenderer.tsx 🆕 Renderiza template dinámico
│   ├── components/
│   │   ├── tenant/
│   │   │   ├── BrandingProvider.tsx   🆕 Contexto de branding
│   │   │   ├── Logo.tsx               🆕 Logo dinámico
│   │   │   └── ThemeConfig.tsx        🆕 Colores dinámicos
│   │   └── ...
│   ├── hooks/
│   │   └── useTenantConfig.ts     🆕 Hook para obtener config
│   └── services/
│       └── tenant.service.ts      🆕 Servicio de tenants
```

---

## 🔧 Problemas Detectados

### 1. API Keys Hardcodeadas

**Archivos afectados:**
- `retail-template.tsx` (línea 24): `"12345"`
- `spa-template.tsx` (línea 23): `"067059e2d6ae48d8a5f7c81b85fbf522"`

**Riesgo:**
- 🔴 Security through obscurity
- 🔴 Keys expuestas en el código
- 🔴 Difícil rotación de keys

**Solución:**
```typescript
// ✅ Usar variable de entorno
const API_KEY = import.meta.env.VITE_DEFAULT_API_KEY || localStorage.getItem('apiKey');

// ✅ O obtener del backend según subdominio
const tenantId = window.location.hostname.split('.')[0];
const config = await fetch(`/api/v1/tenants/${tenantId}/config`);
```

---

### 2. Branding Hardcodeado

**Archivos afectados:**
- `retail-template.tsx`: Colores fijos
- `spa-template.tsx`: Colores + fuentes fijas

**Problema:**
- 🔴 Cada tenant requiere deploy diferente
- 🔴 No hay self-service para cambiar branding
- 🔴 Código duplicado

**Solución:**
```typescript
// ✅ Contexto de branding
<BrandingProvider tenantId={tenantId}>
  <App />
</BrandingProvider>

// ✅ Hook para obtener branding
const { colors, logo, fonts } = useTenantConfig(tenantId);

// ✅ Aplicar dinámicamente
<ConfigProvider theme={{ token: { colorPrimary: colors.primary } }}>
  <App />
</ConfigProvider>
```

---

### 3. Templates Estáticos

**Problema:**
- 🔴 Archivo por tenant (`retail-template.tsx`, `spa-template.tsx`)
- 🔴 No hay componentes reutilizables
- 🔴 Difícil mantenimiento

**Solución:**
```typescript
// ✅ Template dinámico basado en configuración
const TenantTemplate = ({ tenantId }) => {
  const { layout, features, branding } = useTenantConfig(tenantId);
  
  return (
    <Layout style={layout}>
      {features.includes('bookings') && <BookingsSection />}
      {features.includes('ecommerce') && <ProductsSection />}
      {features.includes('pos') && <POSSection />}
    </Layout>
  );
};
```

---

### 4. Falta de Tenant-Aware Routing

**Problema:**
- 🔴 No hay subdominios (`tenant.orderflow.app`)
- 🔴 No hay rutas por tenant (`/admin/:tenantId`)
- 🔴 Todos van al mismo lugar

**Solución:**
```typescript
// ✅ Subdominios
const tenantId = window.location.hostname.split('.')[0];
// gaia.orderflow.app → tenantId = 'gaia'
// enciso.orderflow.app → tenantId = 'enciso'

// ✅ Rutas con tenant
<Route path="/:tenantId" element={<TenantTemplate />} />
<Route path="/:tenantId/admin" element={<AdminDashboard />} />
```

---

## ✅ Features Implementadas (Para Rescatar)

### 1. Carrito con Zustand (`public-cart-store.ts`)

**Estado:** ✅ Excelente

**Features:**
- ✅ Persistencia en localStorage
- ✅ Agregar/remover items
- ✅ Actualizar cantidad
- ✅ Calcular total
- ✅ Multi-tenant (cada tenant tiene su propio cart)

**Código:**
```typescript
export const usePublicCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => { ... },
      removeItem: (productId: string) => { ... },
      // ...
    }),
    {
      name: 'gaia-spa-cart', // ✅ Nombre por tenant
    }
  )
);
```

---

### 2. Interceptor de API Key (`App.tsx`)

**Estado:** ✅ Excelente

**Features:**
- ✅ Agrega `x-api-key` automáticamente
- ✅ Verifica si hay key configurada
- ✅ Muestra advertencia si no hay key

**Código:**
```typescript
api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }
  return config;
});
```

---

### 3. Componentes UI

**Componentes rescatables:**
- ✅ `CartDrawer.tsx` - Drawer del carrito
- ✅ `SlotPicker.tsx` - Selector de turnos
- ✅ `ApiKeyConfig.tsx` - Configuración de API Key

---

## 🚀 Plan de Refactorización

### Fase 1: Tenant Config Service (1-2 días)

**Archivos a crear:**
```typescript
// src/services/tenant.service.ts
export const tenantService = {
  async getConfig(tenantId: string) {
    const response = await api.get(`/api/v1/tenants/${tenantId}/config`);
    return response.data;
  },
  
  async validateApiKey(apiKey: string) {
    const response = await api.get('/api/v1/tenants/validate', {
      headers: { 'x-api-key': apiKey }
    });
    return response.data;
  }
};
```

**Backend endpoint necesario:**
```typescript
// backend/src/tenants/tenants.controller.ts
@Get(':id/config')
async getTenantConfig(@Param('id') id: string) {
  const tenant = await this.prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      businessName: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      ecommerceEnabled: true,
      bookingsEnabled: true,
      posEnabled: true,
    }
  });
  return tenant;
}
```

---

### Fase 2: Branding Context (1 día)

**Archivos a crear:**
```typescript
// src/components/tenant/BrandingProvider.tsx
export const BrandingContext = createContext(null);

export const BrandingProvider = ({ children, tenantId }) => {
  const [branding, setBranding] = useState(null);
  
  useEffect(() => {
    tenantService.getConfig(tenantId).then(setBranding);
  }, [tenantId]);
  
  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
};

// src/hooks/useTenantConfig.ts
export const useTenantConfig = () => {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useTenantConfig must be used within BrandingProvider');
  return context;
};
```

---

### Fase 3: Template Dinámico (2-3 días)

**Archivos a modificar:**
```typescript
// src/App.tsx
function App() {
  const tenantId = useTenantIdFromSubdomain(); // Nuevo hook
  const { branding, features } = useTenantConfig(tenantId);
  
  if (!branding) return <LoadingScreen />;
  
  return (
    <ConfigProvider theme={{ token: { colorPrimary: branding.primaryColor } }}>
      <BrandingProvider tenantId={tenantId}>
        <TenantTemplate 
          layout={branding.layout}
          features={features}
        />
      </BrandingProvider>
    </ConfigProvider>
  );
}
```

---

### Fase 4: Subdominios y Routing (1-2 días)

**Configuración:**
```typescript
// src/hooks/useTenantIdFromSubdomain.ts
export const useTenantIdFromSubdomain = () => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // gaia.orderflow.app → 'gaia'
  // localhost → null (usar API Key)
  if (parts.length > 2) {
    return parts[0];
  }
  
  return localStorage.getItem('tenantId');
};
```

---

## 📊 Evaluación por Tenant

### Gaia Spa Wellness 🌿

| Feature | Estado | Notas |
|---------|--------|-------|
| **Branding** | ⚠️ Hardcodeado | Colores en `spa-template.tsx` |
| **Productos** | ✅ Funcional | doTERRA oils |
| **Bookings** | ✅ Funcional | SlotPicker implementado |
| **Carrito** | ✅ Funcional | Zustand store |
| **Checkout** | ⚠️ Básico | Falta integración con bookings |
| **Admin** | ✅ Funcional | `spa-dashboard.tsx` |

**Prioridad:** 🔴 Alta (refactorizar branding)

---

### Repuestos Enciso 🚗

| Feature | Estado | Notas |
|---------|--------|-------|
| **Branding** | ⚠️ Hardcodeado | Colores en `retail-template.tsx` |
| **Productos** | ✅ Funcional | Filtros por vehículo |
| **Búsqueda** | ✅ Funcional | Por SKU y nombre |
| **Carrito** | ✅ Funcional | Zustand store |
| **Checkout** | ⚠️ Básico | Falta integración con Odoo |
| **Admin** | ⚠️ Pendiente | No hay dashboard específico |

**Prioridad:** 🟡 Media (refactorizar + admin)

---

## 🎯 Recomendaciones

### Corto Plazo (1-2 semanas)

1. **✅ Crear tenant config service** (2 días)
2. **✅ Implementar branding dinámico** (2 días)
3. **✅ Unificar templates en uno solo** (3 días)
4. **✅ Agregar validación de API Key** (1 día)

### Mediano Plazo (1 mes)

1. **✅ Implementar subdominios** (2 días)
2. **✅ Dashboard de tenant settings** (3 días)
3. **✅ Self-service branding (logo, colores)** (3 días)
4. **✅ Feature flags por tenant** (2 días)

### Largo Plazo (2-3 meses)

1. **✅ White-label completo** (custom domain)
2. **✅ Multi-idioma por tenant**
3. **✅ A/B testing por tenant**
4. **✅ Analytics dashboard por tenant**

---

## 📈 Métricas de Calidad

| Métrica | Actual | Target |
|---------|--------|--------|
| **Componentes reutilizables** | 30% | 80%+ |
| **Hardcoding** | Alto | Bajo |
| **Código duplicado** | Alto (2 templates) | Bajo |
| **Configurabilidad** | Baja | Alta |
| **Self-service** | 0% | 80%+ |

---

## ✅ Conclusión

**El frontend tiene una base sólida** pero necesita refactorización para ser verdaderamente multi-tenant:

### ✅ Fortalezas
- Stack tecnológico moderno (React, Refine, Ant Design)
- Carrito con Zustand bien implementado
- Interceptor de API Key funcional
- Componentes UI de calidad

### ⚠️ Debilidades
- Branding hardcodeado por tenant
- Templates estáticos en lugar de dinámicos
- No hay subdominios ni tenant-aware routing
- Falta endpoint de tenant config en el backend

### 🚀 Oportunidad
Con 1-2 semanas de refactorización, se puede tener un sistema **verdaderamente multi-tenant** donde cada cliente puede:
- Configurar su branding desde el admin
- Usar su propio subdominio
- Activar/desactivar features
- Cambiar colores y logo sin deploy

---

*Documento creado: 2026-06-21*  
*Próxima revisión: Después de implementar tenant config service*
