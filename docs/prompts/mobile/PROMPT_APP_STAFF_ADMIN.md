# Prompt: App móvil Staff / Admin (OrderFlow)

## Contexto
OrderFlow es un SaaS multi-tenant. Esta app es para **personal del negocio**: mozos, cajeros, managers y admin del tenant.

No es la app del cliente final ni el Super Admin de la plataforma OrderFlow.

Dependencia previa recomendada:
- Feature flags (`GET /api/v1/modules/enabled?audience=staff` o `admin`).
- Endpoints operativos depurados: orders, products, contacts, bookings, POS, KDS, loyalty.

Stack sugerido: **Expo (React Native)** + TypeScript, misma API que el admin web. Puede compartir paquete de API/types con la app cliente, pero **proyecto o flavor distinto** (otro `app.json` / bundle id).

---

## Objetivo
App operativa del día a día en el local:
- Rápida, orientada a tareas (tomar pedido, ver cocina, gestionar turnos, buscar cliente).
- Menú según **módulos instalados** + **rol/permisos** del usuario.
- Más completa que la app cliente, pero **mucho más chica** que el admin web completo.

---

## Roles típicos (mapear a RBAC existente)
| Rol | Enfoque en la app |
|-----|-------------------|
| SELLER / Mozo | Mesas, pedidos, productos, clientes básicos |
| Cajero | Cobro, pedidos draft, medios de pago |
| MANAGER | Turnos, contactos, productos, reportes simples |
| ADMIN (tenant) | Lo anterior + config ligera del negocio |

Superadmin de plataforma, tenants ajenos, Deploy Manager, Traefik, billing SaaS de OrderFlow → **solo web**.

---

## Módulos (si flag on + permiso)

| moduleId | Uso en app staff |
|----------|------------------|
| `core` | Home/dashboard simple, pedidos, contactos/clientes, productos (lectura/edición según permiso) |
| `pos` | Flujo POS mozo/cajero (alineado a POS web offline-first si hay API/sync) |
| `kds` | Vista cocina por estados / semáforo de tiempos |
| `bookings` | Agenda del día, check-in, asignaciones |
| `catalog` | Gestión rápida de productos (stock/precio) si el rol lo permite |
| `loyalty` | Consulta de puntos / canje asistido |
| `quotations` | Listado y estado de cotizaciones (si aplica al rubro) |
| `analytics` | KPIs del día (ventas, pedidos) — solo lectura, liviano |
| `biolinks` / `giveaways` | Opcional: acceso de solo lectura o atajos; no priorizar en MVP staff |

Excluir siempre en esta app: `facturasend` avanzado, `integrations` ERP config, `billing` SaaS, Super Admin, Infrastructure Deploy Manager.

---

## Alcance funcional MVP

### Auth
- Login staff (JWT), selección de tenant si el usuario tiene varios (`UserTenantAccess`).
- Cierre de sesión, manejo 401 → login.
- Guardado seguro de tokens (SecureStore).

### Shell de la app
- Bottom navigation (4–5 destinos frecuentes) **filtrada** por módulos + rol.
- Drawer o pantalla “Más” para el resto.
- Indicador de tenant activo y entorno (staging badge si aplica).

### Pedidos (core)
- Listado por estado, detalle, cambio de estado según permisos.
- Filtros simples (hoy, mesa, estado).

### POS (si `pos`)
- Modo mozo: catálogo → carrito → mesa → envío.
- Modo cajero: pedidos draft → cobro.
- Reutilizar contratos del POS web; offline completo es deseable pero puede fasearse (fase 1 online estable).

### KDS (si `kds`)
- Columnas o listas por estado; actualización en tiempo real si existe WebSocket (`OrdersGateway` / rooms por tenant).
- Acciones: marcar listo / entregar según API.

### Bookings (si `bookings`)
- Vista día, detalle de turno, acciones básicas.

### Contactos / clientes
- Búsqueda, ficha rápida, pedidos asociados si el API lo permite.

### Productos
- Búsqueda, ver stock/precio; edición solo con permiso.

### Config ligera (solo ADMIN tenant)
- Horarios o toggles que ya exponga la API (no panel de integraciones completo).

---

## Arquitectura técnica
- Cliente API compartido o duplicado controlado; interceptores de auth iguales al web cuando sea posible.
- Store: sesión, tenant, roles, `enabledModules`, estado POS local.
- `isModuleEnabled` + `hasPermission('orders:update')` antes de mostrar acciones.
- Suscripción WebSocket opcional y aislada (no tumbar la app si Redis/WS falla).
- UI mobile nativa (no portar Ant Design del admin web).
- Flavors: `staff` package name distinto de la app cliente.

---

## Criterios de aceptación
- [ ] Usuario mozo no ve config de integraciones ni Super Admin.
- [ ] Si `pos` está off, no aparece tab POS aunque el rol sea admin.
- [ ] Si `kds` está on y hay WS, la vista cocina actualiza sin refresh manual (o degrada a polling documentado).
- [ ] Cambio de tenant (multi-access) recarga módulos y datos.
- [ ] 401 limpia sesión y vuelve a login.
- [ ] MVP usable en dispositivo ~360px de ancho, una mano para acciones principales.
- [ ] No incluye pantallas de plataforma (deploy, tenants globales, etc.).

---

## Fuera de alcance
- App cliente final.
- Admin web responsive (drawer/bottom bar).
- Implementar feature flags en backend (solo consumir).
- Tauri desktop / impresión ESC/POS nativa (puede listarse como fase 2 si ya existe en desktop).
- Facturación electrónica y setup Odoo.

---

## Entregables
1. Proyecto Expo staff (navegación, auth, multi-tenant access).
2. Pantallas MVP: Home, Pedidos, POS (si aplica), KDS (si aplica), Turnos, Contactos, Más.
3. Integración real con API staging.
4. README: roles de prueba, env, diferencias vs app cliente.
5. Matriz módulo × rol × pantalla (qué se muestra).

## Prioridad de implementación
1. Auth + módulos enabled + shell  
2. Pedidos + contactos + productos lectura  
3. POS  
4. KDS / Bookings  
5. Loyalty / analytics livianos  
```