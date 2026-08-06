# OrderFlow Multi-Tenant Demo

[🏠 Atrás (README)](../README.md) | [🚀 Inicio Rápido](01-quickstart.md) | [🏗️ Arquitectura](02-architecture.md) | [🏢 Multi-Tenant Demo](03-multi-tenant-demo.md) | [🔐 JWT Auth](04-jwt-auth.md) | [📊 Testing Report](05-testing-report.md) | [🏪 POS & KDS](06-pos-kds.md) | [📊 Diagramas UML](07-uml-diagrams.md) | [🎖️ Loyalty Module](08-loyalty.md)

---

## Tenants Configurados

### 1. SPA Wellness 🌿
- **API Key:** `067059e2d6ae48d8a5f7c81b85fbf522`
- **Rubro:** Spa / Wellness / doTERRA
- **Productos:** 4 (Aceites esenciales, Kits)
- **Clientes:** 0
- **Branding:** Verde (#2D7D6D) y Marrón (#F4A460)

### 2. Auto Repuestos 🚗
- **API Key:** `a908333c0bb7417caff9d4895ab590ac`
- **Rubro:** Automotriz / Repuestos
- **Productos:** 6 (Filtros, Frenos, Suspensión, Motor, Encendido)
- **Clientes:** 3 (Talleres y particulares)
- **Branding:** Rojo (#E74C3C) y Gris (#34495E)

## Aislamiento de Datos

Cada tenant tiene datos **completamente separados**:

```sql
-- SPA Wellness solo ve SUS productos
SELECT * FROM products WHERE tenant_id = 'ca587fa3-...'; -- 4 productos doTERRA

-- Auto Repuestos solo ve SUS productos
SELECT * FROM products WHERE tenant_id = '1c628dcb-...'; -- 6 repuestos
```

## Cómo Probar

### Cambiar entre Tenants

1. **Ir a configuración:** http://localhost:3011/config
2. **Ingresar API Key** del tenant deseado
3. **Guardar y recargar**
4. **Navegar** a la web pública o admin

### SPA Wellness
```
API Key: 067059e2d6ae48d8a5f7c81b85fbf522
Web: http://localhost:3011/spa
Admin: http://localhost:3011/admin/spa
```

### Auto Repuestos
```
API Key: a908333c0bb7417caff9d4895ab590ac
Web: http://localhost:3011/auto-repuestos
Admin: http://localhost:3011/admin/auto-repuestos
```

## Productos por Tenant

### SPA Wellness (doTERRA)
- DOT-001: Aceite de Lavanda (15ml) - ₲180.000
- DOT-002: Aceite de Menta (15ml) - ₲150.000
- DOT-003: Aceite de Árbol de Té (15ml) - ₲165.000
- DOT-004: Kit de Bienestar - ₲450.000

### Auto Repuestos
- REP-TOY-001: Filtro Aceite Toyota Hilux 2.8 - ₲15.000
- REP-TOY-002: Pastilla Freno Delantera Toyota - ₲45.000
- REP-TOY-003: Amortiguador Trasero Toyota - ₲150.000
- REP-TOY-004: Kit Distribución Toyota 2.8 - ₲220.000
- REP-VW-001: Filtro Aire VW Gol - ₲10.000
- REP-VW-002: Bujía NGK VW - ₲6.000

## Características Multi-Tenant

✅ **Aislamiento Total:** Cada tenant solo ve sus datos
✅ **Misma Plataforma:** Un solo deployment sirve múltiples negocios
✅ **Branding Personalizado:** Colores y logo por tenant
✅ **Configuración Independiente:** E-commerce, bookings, etc.
✅ **Escalable:** Podés agregar infinitos tenants

## Próximos Pasos

1. Crear web específica para Auto Repuestos
2. Agregar más tenants de ejemplo
3. Panel de administración SaaS (super-admin)
4. Landing page para vender el SaaS

---

## Ver también

- [Arquitectura Multi-Tenant](02-architecture.md#multi-tenant-saas-ready)
- [Estrategia Multi-Tenant](ESTRATEGIA_MULTITENANT.md)
- [Planes Comerciales](PLANES_COMERCIALES.md)
