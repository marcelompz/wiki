# Prompt: Ocultar en el menú lateral módulos no instalados o sin permiso

Eres un experto en React + Ant Design + multi-tenant SaaS.  
Objetivo: el **Sidebar** (y la nav móvil si aplica) solo debe mostrar ítems cuyo módulo esté **instalado y activo** para el tenant, y que el usuario tenga **permiso** de verlos.

No cambies el diseño visual (labels, dark mode, `collapsedWidth={0}`, categorías colapsables).  
Solo filtrado de visibilidad.

---

## Estado actual

En `src/AdminApp.tsx` ya existe:

```ts
const [installedModules, setInstalledModules] = useState<any[]>([]);
// GET /api/v1/modules/installed
const isModuleActive = (moduleId: string) => {
  const defaultCoreModules = ['products', 'users', 'customers', 'contacts', 'integrations', 'social-catalog'];
  if (!Array.isArray(installedModules) || installedModules.length === 0) {
    if (defaultCoreModules.includes(moduleId)) return true;
  }
  return Array.isArray(installedModules) &&
    installedModules.some(m => m.moduleId === moduleId && m.active);
};
```

Esa función **no se pasa al Sidebar**. El menú lista todos los ítems siempre.

Contrato del API (según `modules.tsx`):
- Instalados: `{ moduleId: string, active: boolean, ... }[]`
- Catálogo: manifests con `name` (= id del módulo)

---

## Diseño de la solución

### 1. Mapeo ruta → `moduleId`

En `Sidebar.tsx` (o un archivo `src/config/admin-menu.ts` compartido), cada ítem declara opcionalmente:

```ts
type MenuItemDef = {
  key: string;           // ruta, ej. '/admin/pos'
  label: string;
  icon: string;
  moduleId?: string;     // si falta → siempre visible (core UI)
  permission?: string;   // opcional: claim/permission del JWT
  superAdminOnly?: boolean;
};

type MenuGroupDef = {
  label: string;
  items: MenuItemDef[];
};
```

**Mapeo sugerido** (ajustá nombres al catálogo real de `/api/v1/modules`):

| Ruta | moduleId | Notas |
|------|----------|--------|
| `/admin` | — (siempre) | Dashboard |
| `/admin/pos` | `pos` | |
| `/admin/kds` | `kds` | |
| `/admin/orders` | `orders` | o core si no existe módulo |
| `/admin/bookings` | `bookings` | |
| `/admin/products` | `products` | core |
| `/admin/social-catalog` | `social-catalog` | core |
| `/admin/homepage-builder` | `homepage-builder` | |
| `/admin/contacts` | `contacts` | core |
| `/admin/giveaways` | `giveaways` | |
| `/admin/loyalty` | `loyalty` | |
| `/admin/integrations` | `integrations` | core |
| `/admin/subscription` | — o `subscription` | suele ser siempre para owner |
| `/admin/modules` | — | App Store: visible si puede gestionar módulos |
| `/config` | — | siempre |
| `/admin/super-admin` | — | `superAdminOnly: true` |
| `/admin/super-whatsapp-catalog` | — | `superAdminOnly: true` |

Si el backend usa otros ids (`point-of-sale`, `whatsapp-catalog`, etc.), **alineá el mapa** con `ModuleManifest.name`.

### 2. Props nuevas del Sidebar

```ts
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  isSuperAdmin: boolean;
  tenantConfig?: any;
  /** true si el módulo está instalado y active */
  isModuleActive: (moduleId: string) => boolean;
  /** permisos del usuario (opcional) */
  permissions?: string[];
  /** si true, sin permission en el ítem ⇒ visible; si false, exigir permission cuando esté definida */
  // por defecto: sin `permission` en el ítem ⇒ no se chequea permiso
}
```

En `AdminApp.tsx` / `AdminLayout`:

```tsx
<Sidebar
  collapsed={sidebarCollapsed}
  onToggle={toggleSidebar}
  isMobile={isMobile}
  isSuperAdmin={isSuperAdmin}
  tenantConfig={tenantConfig}
  isModuleActive={isModuleActive}
  permissions={userPermissions}
/>
```

### 3. Extraer permisos del JWT (si existen)

Junto a `isSuperAdmin`:

```ts
let userPermissions: string[] = [];
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    isSuperAdmin = !!payload.isSuperAdmin;
    // adaptar al claim real del backend:
    userPermissions = payload.permissions
      || payload.perms
      || payload.roles
      || [];
    if (!Array.isArray(userPermissions)) userPermissions = [];
  } catch { /* ignore */ }
}
```

Si el backend **aún no envía permissions**, el filtro por permiso no oculta nada (solo aplica `moduleId` + `superAdminOnly`). Documentalo en comentario.

### 4. Función de visibilidad

```ts
function canShowItem(
  item: MenuItemDef,
  ctx: {
    isSuperAdmin: boolean;
    isModuleActive: (id: string) => boolean;
    permissions: string[];
  }
): boolean {
  if (item.superAdminOnly && !ctx.isSuperAdmin) return false;

  if (item.moduleId && !ctx.isModuleActive(item.moduleId)) return false;

  if (item.permission) {
    // Super admin bypass opcional:
    if (ctx.isSuperAdmin) return true;
    if (!ctx.permissions.includes(item.permission)) return false;
  }

  return true;
}
```

### 5. Construir `menuItems` filtrado

```ts
const visibleGroups = GROUPS
  .map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      canShowItem(item, { isSuperAdmin, isModuleActive, permissions: permissions ?? [] })
    ),
  }))
  .filter((group) => group.items.length > 0);

// Luego mapear visibleGroups → items de Ant Design Menu
// (submenu colapsable o type group, según lo ya implementado)
```

Grupo **Super Admin**: solo push si `isSuperAdmin` (como ahora), y sus hijos también pasan por el mismo filtro si tienen `moduleId`.

### 6. Core modules y lista vacía de instalados

Mantener el fallback actual en `isModuleActive`:

- Si `installedModules.length === 0` (API falló o tenant nuevo), mostrar solo `defaultCoreModules` + ítems **sin** `moduleId`.
- No mostrar POS/KDS/loyalty/etc. en ese fallback salvo que los agregues explícitamente a core.

Opcional más estricto:

```ts
// Si la API respondió OK con array vacío real, no usar fallback de core ampliado.
// Usar un flag `modulesLoaded` / `modulesError` para distinguir fallo de red vs tenant sin módulos.
```

Recomendado:

```ts
const [modulesStatus, setModulesStatus] = useState<'loading' | 'ready' | 'error'>('loading');

// en fetch:
setModulesStatus('ready'); // o 'error' en catch

const isModuleActive = (moduleId: string) => {
  if (modulesStatus === 'loading') {
    // evitar flash de menú completo: o bien no renderizar menú, o solo core
    return defaultCoreModules.includes(moduleId);
  }
  if (modulesStatus === 'error') {
    return defaultCoreModules.includes(moduleId);
  }
  return installedModules.some(m => m.moduleId === moduleId && m.active);
};
```

Ítems **sin** `moduleId` siguen visibles durante loading.

### 7. MobileBottomNav

Si `MobileBottomNav` hardcodea links (POS, pedidos, etc.), aplicar el **mismo** `canShowItem` / props `isModuleActive` + `permissions`. No dejar atajos a módulos ocultos en el sider.

### 8. Rutas (defensa en profundidad)

Ocultar en el menú **no** reemplaza control de acceso. Idealmente:

```tsx
<Route
  path="pos"
  element={
    isModuleActive('pos') ? <POSPage /> : (
      <Result status="403" title="Módulo no disponible" />
    )
  }
/>
```

Aplicar el mismo patrón a rutas con `moduleId`. Super-admin routes ya usan `isSuperAdmin`.

No es obligatorio en este prompt si solo pedís el menú; es recomendación.

---

## Archivos a tocar

1. `src/components/Sidebar.tsx` — mapa `moduleId`/`permission`, filtro, props nuevas  
2. `src/AdminApp.tsx` — pasar `isModuleActive`, `permissions`; opcional `modulesStatus`; proteger `<Route>`s  
3. `src/components/admin/MobileBottomNav.tsx` — mismo filtro  
4. Opcional: `src/config/admin-menu.ts` — `GROUPS` + tipos compartidos  

---

## Checklist

- [ ] Tenant sin módulo `pos` → no aparece “Punto de Venta”  
- [ ] Grupo sin ítems visibles → el grupo no se renderiza  
- [ ] Core (`products`, `contacts`, …) visible según `isModuleActive` / fallback  
- [ ] No super-admin → no bloque Super Admin  
- [ ] API de módulos en error → solo core + ítems sin `moduleId` (sin menú fantasma completo)  
- [ ] Dark/light, collapse y categorías colapsables intactos  
- [ ] Mobile bottom nav alineado con el sider  

## Criterio de aceptación

El menú lateral refleja **solo** módulos instalados+activos (y permisos si el JWT los trae). Ítems no autorizados no se listan; grupos vacíos desaparecen.

Aplica los cambios ahora.
