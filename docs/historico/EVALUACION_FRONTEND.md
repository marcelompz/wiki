# OrderFlow - Evaluación del Frontend

**Fecha:** 2026-06-21  
**Estado:** ⚠️ En Refactorización Multi-Tenant

---

## 📊 Resumen Ejecutivo

El frontend de OrderFlow está en **transición arquitectónica**:

| Aspecto | Estado Anterior | Estado Actual | Target |
|---------|-----------------|---------------|--------|
| **Arquitectura** | Refine + AntD | Refine + Branding Context | ✅ Correcto |
| **Multi-Tenant** | ❌ Hardcodeado | ⚠️ En implementación | ✅ Dinámico |
| **State Management** | ✅ Zustand | ✅ Zustand | ✅ Correcto |
| **HTTP Client** | ✅ Axios | ✅ Axios + Interceptors | ✅ Correcto |
| **Templates** | ❌ Estáticos | ⚠️ En refactorización | ✅ Dinámicos |

---

## 🏗️ Arquitectura Actual

### Stack Tecnológico

```json
{
  "framework": "React 18.2",
  "bundler": "Vite 5.0",
  "ui-library": "Ant Design 5.12",
  "framework-refine": "Refine 4.47",
  "state-management": "Zustand 5.0",
  "http-client": "Axios 1.6",
  "routing": "React Router 6.20",
  "language": "TypeScript 5.3"
}
```

**Evaluación:** ✅ **Excelente** - Stack moderno y bien seleccionado

---

### Estructura de Directorios

```
frontend/
├── src/
│   ├── App.tsx                      ✅ Principal (Refine)
│   ├── AdminApp.tsx                 ✅ Admin panel
│   ├── main.tsx                     ✅ Entry point
│   ├── pages/
│   │   ├── admin/                   ✅ CRUDs (8 archivos)
│   │   ├── ApiKeyConfig.tsx         ✅ Configuración
│   │   ├── catalog.tsx              ✅ Catálogo básico
│   │   ├── catalog-with-categories  ✅ Con categorías
│   │   ├── checkout.tsx             ✅ Checkout
│   │   ├── orders.tsx               ✅ Pedidos
│   │   ├── retail-template.tsx      ⚠️ Hardcodeado
│   │   └── spa-template.tsx         ⚠️ Hardcodeado
│   ├── components/
│   │   ├── tenant/                  ✅ BrandingProvider
│   │   ├── CartDrawer.tsx           ✅ Carrito
│   │   ├── SlotPicker.tsx           ✅ Turnos
│   │   └── index.ts
│   ├── services/
│   │   ├── api.ts                   ✅ Axios config
│   │   └── tenant.service.ts        🆕 Tenant config
│   ├── hooks/
│   │   └── useTenantConfig.ts       🆕 Hook multi-tenant
│   └── store/
│       └── public-cart-store.ts     ✅ Zustand cart
```

**Evaluación:** ⚠️ **Buena, pero con templates hardcodeados**

---

## ✅ Fortalezas del Frontend

### 1. API Service Bien Configurado

**Archivo:** `src/services/api.ts`

```typescript
✅ Interceptor para API key automático
✅ Logging de requests/responses
✅ Manejo de errores centralizado
✅ Endpoints organizados por recurso
✅ baseURL configurable por ambiente
```

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

### 2. Zustand Cart Store

**Archivo:** `src/store/public-cart-store.ts`

```typescript
✅ Persistencia en localStorage
✅ Operaciones CRUD completas
✅ Cálculo de totales
✅ Multi-tenant (nombre único por tenant)
✅ TypeScript bien tipado
```

**Código:**
```typescript
export const usePublicCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => { ... },
      getTotal: () => { ... },
    }),
    {
      name: 'gaia-spa-cart', // ✅ Nombre por tenant
    }
  )
);
```

---

### 3. BrandingProvider (En Implementación)

**Archivo:** `src/components/tenant/BrandingProvider.tsx`

```typescript
✅ Contexto de React para branding
✅ Configuración dinámica por tenant
✅ Fallback para evitar crashes
✅ Integración con tenant.service
```

**Código:**
```typescript
export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantConfig, setTenantConfig] = useState<any>(null);
  
  useEffect(() => {
    const fetchConfig = async () => {
      const apiKey = localStorage.getItem('apiKey');
      const config = await tenantService.getConfigByApiKey(apiKey);
      setTenantConfig(config);
    };
    fetchConfig();
  }, []);
  
  return (
    <BrandingContext.Provider value={{ tenantConfig, loading }}>
      {children}
    </BrandingContext.Provider>
  );
};
```

**Evaluación:** ✅ **Excelente implementación** - Solo falta el endpoint en el backend

---

### 4. useTenantConfig Hook

**Archivo:** `src/hooks/useTenantConfig.ts`

```typescript
✅ Hook customizado para obtener config
✅ Reutilizable en cualquier componente
✅ Separa lógica de UI
```

---

## ⚠️ Problemas Detectados

### 1. Templates Hardcodeados

**Archivos:**
- `pages/spa-template.tsx` - Branding fijo de Gaia Spa
- `pages/retail-template.tsx` - Branding fijo de Repuestos

**Problema:**
```typescript
// ❌ Hardcodeado
const BRANDING = {
  primary: "#8B7355", // Fijo para Gaia Spa
  secondary: "#D4A574",
};

const API_KEY = "067059e2d6ae48d8a5f7c81b85fbf522"; // Hardcodeado
```

**Solución:**
```typescript
// ✅ Dinámico
const { branding } = useTenantConfig();
const primaryColor = branding?.primaryColor || '#1890ff';
```

---

### 2. Falta Endpoint en Backend

**Problema:** El `tenant.service.ts` llama a un endpoint que no existe:

```typescript
// tenant.service.ts
async getConfigByApiKey(apiKey: string) {
  const response = await api.get(`/api/v1/tenants/config/${apiKey}`);
  // ❌ Este endpoint no existe en el backend
  return response.data;
}
```

**Backend necesario:**
```typescript
// backend/src/tenants/tenants.controller.ts
@Get('config/:apiKey')
async getTenantConfig(@Param('apiKey') apiKey: string) {
  const tenant = await this.prisma.tenant.findUnique({
    where: { apiKeySecret: apiKey },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      ecommerceEnabled: true,
      bookingsEnabled: true,
    }
  });
  return tenant;
}
```

---

### 3. API Key en LocalStorage

**Problema:**
```typescript
const apiKey = localStorage.getItem('apiKey');
```

**Riesgos:**
- ⚠️ XSS vulnerability (si hay scripts de terceros)
- ⚠️ No se invalida nunca (hasta que el usuario borre)

**Solución recomendada:**
```typescript
// Opción A: HTTP-only cookie (más seguro)
// Backend setea cookie, frontend no tiene acceso

// Opción B: Session storage (se borra al cerrar)
const apiKey = sessionStorage.getItem('apiKey');

// Opción C: Token JWT con expiración
const token = localStorage.getItem('authToken');
// Validar expiración antes de usar
```

---

### 4. Archivos Obsoletos

**Archivos que sobran:**
- `pages/checkout.tsx.old` - ❌ Borrar
- `pages/orderflow-landing.tsx` - ❌ No se usa
- `pages/catalog.tsx` - ⚠️ Duplicado con `catalog-with-categories.tsx`

---

### 5. Falta de Tests

**Estado actual:**
```bash
# No hay tests de frontend
❌ Unit tests (Jest, React Testing Library)
❌ Integration tests
❌ E2E tests (Playwright, Cypress)
```

**Recomendación:**
```bash
npm install -D @testing-library/react @testing-library/jest-dom jest
npm install -D @playwright/test  # Para E2E
```

---

## 🔧 Configuración de Vite

### Estado Actual

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3011,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.PROXY_TARGET || 'http://localhost:3010',
        changeOrigin: true,
      },
    },
  },
})
```

**Evaluación:** ✅ **Bien configurado**

**Mejoras sugeridas:**
```typescript
// Agregar para producción
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'antd-vendor': ['antd', '@ant-design/icons'],
      },
    },
  },
  chunkSizeWarningLimit: 1000,
}
```

---

## 📦 Dependencias

### Dependencias Principales

| Package | Versión | Última | Estado |
|---------|---------|--------|--------|
| react | 18.2 | 18.3 | ✅ OK |
| antd | 5.12 | 5.22 | ⚠️ Actualizable |
| @refinedev/core | 4.47 | 5.x | ⚠️ Major disponible |
| zustand | 5.0 | 5.0 | ✅ OK |
| axios | 1.6 | 1.7 | ⚠️ Actualizable |
| typescript | 5.3 | 5.5 | ⚠️ Actualizable |

**Recomendación:** Actualizar en próximo sprint (no crítico)

---

### DevDependencies

| Package | Versión | Estado |
|---------|---------|--------|
| vite | 5.0 | ✅ OK |
| @vitejs/plugin-react | 4.2 | ✅ OK |
| eslint | 8.55 | ⚠️ 9.x disponible |
| typescript | 5.3 | ⚠️ 5.5 disponible |

---

## 🎯 Estado de la Refactorización Multi-Tenant

### Completado ✅

- [x] `BrandingProvider.tsx` - Contexto de branding
- [x] `useTenantConfig.ts` - Hook para obtener config
- [x] `tenant.service.ts` - Servicio de tenants
- [x] API interceptors con API key

### Pendiente ⏳

- [ ] Endpoint backend: `GET /api/v1/tenants/config/:apiKey`
- [ ] Unificar `spa-template.tsx` + `retail-template.tsx` en uno dinámico
- [ ] Agregar `TenantTemplate.tsx` genérico
- [ ] Borrar templates hardcodeados
- [ ] Tests de BrandingProvider

---

## 📊 Métricas de Calidad

| Métrica | Actual | Target |
|---------|--------|--------|
| **Componentes reutilizables** | 40% | 80%+ |
| **Código duplicado** | Medio (2 templates) | Bajo |
| **Tests coverage** | 0% | 70%+ |
| **Configurabilidad tenant** | 60% | 100% |
| **Performance (Lighthouse)** | N/A | 90+ |

---

## 🚀 Plan de Acción

### Sprint 1 (Esta semana)

**Backend:**
```typescript
// 1. Crear endpoint de tenant config
GET /api/v1/tenants/config/:apiKey

// 2. Agregar campos a Tenant model
- primaryColor
- secondaryColor
- logoUrl
- faviconUrl
```

**Frontend:**
```typescript
// 1. Crear TenantTemplate genérico
components/tenant/TenantTemplate.tsx

// 2. Unificar templates
Eliminar spa-template.tsx y retail-template.tsx

// 3. Usar BrandingProvider en App.tsx
```

---

### Sprint 2 (Próxima semana)

**Tests:**
```bash
# Instalar testing libraries
npm install -D @testing-library/react @testing-library/jest-dom jest
npm install -D @playwright/test

# Crear tests
src/components/tenant/__tests__/BrandingProvider.test.tsx
src/hooks/__tests__/useTenantConfig.test.ts
```

---

### Sprint 3 (2 semanas)

**Performance:**
```bash
# Code splitting
npm install react-loadable

# Lazy loading de rutas
const CatalogPage = lazy(() => import('./pages/catalog'));

# Analizar bundle
npm install -D rollup-plugin-visualizer
```

---

## 📈 Roadmap de Mejoras

### Corto Plazo (1-2 semanas)

- [ ] Endpoint backend de tenant config
- [ ] Template dinámico único
- [ ] Borrar templates hardcodeados
- [ ] Tests básicos de componentes

### Mediano Plazo (1 mes)

- [ ] Tests E2E con Playwright
- [ ] Performance optimization (code splitting)
- [ ] Error boundaries
- [ ] Loading skeletons

### Largo Plazo (2-3 meses)

- [ ] PWA (offline support)
- [ ] Server-side rendering (Next.js migration)
- [ ] Internationalization (i18n)
- [ ] Accessibility (WCAG 2.1 AA)

---

## ✅ Conclusión

### Fortalezas

- ✅ **Stack tecnológico moderno** (React 18, Vite 5, TypeScript)
- ✅ **API service bien implementado** (interceptors, logging)
- ✅ **State management sólido** (Zustand con persistencia)
- ✅ **BrandingProvider en camino** (arquitectura correcta)
- ✅ **Refine Framework** (CRUDs rápidos)

### Debilidades

- ⚠️ **Templates hardcodeados** (falta refactorización)
- ⚠️ **Sin tests** (0% coverage)
- ⚠️ **Endpoint de tenant config faltante** (backend)
- ⚠️ **API key en localStorage** (seguridad mejorable)
- ⚠️ **Archivos obsoletos** (limpieza necesaria)

### Oportunidades

- 🚀 **Refactorización multi-tenant** (casi lista)
- 🚀 **Tests automatizados** (fácil de agregar)
- 🚀 **Performance optimization** (bundle splitting)
- 🚀 **PWA** (offline support para POS)

---

*Documento creado: 2026-06-21*  
*Próxima revisión: Después de completar Sprint 1 (refactorización multi-tenant)*
