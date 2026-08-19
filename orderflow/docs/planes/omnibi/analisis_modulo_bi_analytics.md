# 📊 Informe Técnico de Análisis: Módulo BI & Business Analytics

> **Proyecto:** OrderFlow (OmniFlow)  
> **Fecha:** 2026-08-17  
> **Fuente Analizada:** `docs/prompts/orderflow-bi-analytics-module`  
> **Estado:** Listo para Revalidación y Aprobación de Desarrollo  

---

## 1. Resumen Ejecutivo y Propósito del Módulo

El módulo de **BI & Business Analytics** dota a OrderFlow de capacidades avanzadas de Business Intelligence, agregación financiera matricial y análisis ejecutivo de ventas.

### Capacidades Clave:
1. **Matriz Comparativa de Productos (Mes a Mes / YoY):**
   - Análisis multidimensional de ventas y facturación acumulada por producto.
   - Comparativa de múltiples años simultáneos (ejemplo: `2025` vs `2026`).
   - Granularidad mensual (meses 1 al 12) con cálculo automático de gran total.
2. **Resumen Ejecutivo de KPIs:**
   - Crecimiento interanual (YoY Growth %).
   - Facturación acumulada del período actual vs anterior.
   - Total de pedidos confirmados/entregados.
   - Unidades vendidas totales.
   - Ticket promedio calculado ($ \text{Facturación} / \text{Pedidos} $).
   - Identificación del producto estrella (Top Selling Product).

---

## 2. Diagnóstico de Compatibilidad con OrderFlow

Al contrastar los componentes fuente del prompt con la base de código autoritativa de OrderFlow, se identificaron los siguientes hallazgos y ajustes necesarios:

### 2.1 Mapeo del Esquema PostgreSQL (`schema.prisma`)

El prompt venía con consultas SQL genéricas (`order_items`, `unit_price`, `categories`). En el esquema autoritativo de OrderFlow (`backend/prisma/schema.prisma`), las tablas y columnas exactas requieren los siguientes cambios:

| Componente | Prompt Original | Esquema Autoritativo OrderFlow | Ajuste Técnico Requerido |
| :--- | :--- | :--- | :--- |
| **Tabla Cabecera** | `orders` (`tenant_id`, `created_at`, `total`) | `orders` (`"tenantId"`, `"createdAt"`, `"totalAmount"`) | Usar comillas dobles para columnas camelCase en SQL raw |
| **Tabla Detalle** | `order_items` | `order_lines` | Reemplazar `order_items` por `order_lines` |
| **Relaciones Detalle** | `order_id`, `product_id` | `"orderId"`, `"productId"` | Ajustar nombres de FK a camelCase en PostgreSQL |
| **Precio Unitario** | `unit_price` | `"priceAtSale"` | Usar `oi."priceAtSale"` para cálculo de facturación |
| **Categorías** | JOIN a `categories` (`c.name`) | `p.category` (`String?` en `products`) | Usar la columna `p.category` directamente sin JOIN externo |
| **Estados de Pedido** | `status NOT IN ('CANCELLED', 'DRAFT')` | Enum `OrderStatus` | Excluir pedidos `DRAFT` y `CANCELLED` |

---

### 2.2 Requisitos de Arquitectura Multi-Tenant & Multi-Tier

De acuerdo con el protocolo [AGENTS.md](file:///opt/orderflow/AGENTS.md) y [docs/00-contexto-agentes.md](file:///opt/orderflow/docs/00-contexto-agentes.md):

1. **Aislamiento `tenantId` (Inviolable):**
   - Todas las consultas SQL incluyen filtrado explícito por tenant:
     ```sql
     WHERE o."tenantId" = ${tenantId}::uuid
     ```
2. **Soporte Multi-Tier (`@TenantPrisma`):**
   - El servicio aceptará el cliente Prisma inyectado de forma dinámica (`dbClient?: any`), garantizando compatibilidad con tenants de base de datos compartida (`shared`) y dedicada (`dedicated`):
     ```typescript
     const prisma = dbClient || this.prisma;
     ```

---

## 3. Arquitectura Frontend (React / Refine / Ant Design)

Para completar el módulo y hacerlo 100% operativo en el backoffice de administración:

1. **Nueva Vista:** [analytics.tsx](file:///opt/orderflow/frontend/src/pages/admin/analytics.tsx)
   - Tarjetas KPI estilizadas con métricas de crecimiento interanual.
   - Barra de filtros interactivos (Años, Rango de meses, Categorías, Límite, Criterio de ordenamiento).
   - Tabla matricial responsive con scroll horizontal y totales generales acumulados.
2. **Integración en Navegación:**
   - Registro de la ruta `/admin/analytics` en `AdminApp.tsx`.
   - Inserción de la opción `"BI & Analytics Hub"` (`moduleId: 'analytics'`, icono `📈`) en [Sidebar.tsx](file:///opt/orderflow/frontend/src/components/Sidebar.tsx).

---

## 4. Plan de Gobernanza y Versionado

- **Identificador de Característica:** `FEAT-067`
- **Bump de Versión:** Incrementar versión global de `v1.20.4` a `v1.21.0` en:
  - `VERSION`
  - `featurelist.json`
  - `backend/package.json`
  - `frontend/package.json`
  - `analytics.manifest.json`

---

## 5. Plan de Verificación

1. **Compilación Backend:** `npm run build` en `backend/`.
2. **Compilación Frontend:** `npm run build` en `frontend/`.
3. **Pruebas de Regresión:** `npm test` en `backend/` para asegurar cero rupturas en suites existentes.
4. **Verificación E2E:** Navegación en el dashboard admin `/admin/analytics` comprobando la carga de datos sin errores en consola JS.
