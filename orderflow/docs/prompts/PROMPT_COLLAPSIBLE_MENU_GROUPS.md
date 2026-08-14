# Prompt: Categorías del menú lateral colapsables

Eres un experto en React + Ant Design Menu.  
Modifica **solo** `src/components/Sidebar.tsx` (y CSS mínimo en `src/styles/admin-mobile.css` si hace falta).  
No toques rutas, páginas ni la lógica de `collapsedWidth={0}`.

---

## Contexto

Hoy los grupos del sidebar usan:

```ts
{ type: 'group', key, label: <span className="admin-menu-group-label">...</span>, children: [...] }
```

`type: 'group'` **no colapsa**: el título es estático y los hijos siempre visibles.

Se requiere que cada categoría (**Operaciones**, **Catálogo & Canales**, **Relaciones**, **Sistema**, **Super Admin**) sea **colapsable/expandible**, con el mismo look (fondo en el label, **sin** ícono 📁).

---

## Objetivo UX

1. Click en el título de la categoría → expande/colapsa sus ítems.
2. Comportamiento **acordeón** (solo un grupo abierto a la vez), salvo que se indique lo contrario.
3. Al **colapsar el Sider** (`collapsed === true` / `collapsedWidth={0}`):
   - limpiar `openKeys` → `[]`
   - no deben quedar popups de submenú flotando sobre el contenido
4. Conservar `selectedKeys` por `location.pathname`.
5. Sin ícono de carpeta en el grupo; el trigger de expand puede ser la flecha nativa de Ant Design.

---

## Implementación

### 1. Cambiar estructura de `menuItems`

De `type: 'group'` a **submenu** normal (sin `type: 'group'`):

```ts
const menuItems: any[] = GROUPS.map((group, idx) => ({
  key: `group-${idx}`,
  // Sin icon: 📁
  label: (
    <span className="admin-menu-group-label admin-menu-group-label--submenu">
      {group.label}
    </span>
  ),
  children: group.items.map((item) => ({
    key: item.key,
    icon: <span style={{ fontSize: 16 }}>{item.icon}</span>,
    label: item.label,
  })),
}));
```

Igual para el bloque Super Admin (`key: 'group-super'`).

### 2. Estado `openKeys` + acordeón

```ts
const [openKeys, setOpenKeys] = useState<string[]>([]);

// Opcional: abrir el grupo que contiene la ruta activa al montar / cambiar de ruta
useEffect(() => {
  if (collapsed) {
    setOpenKeys([]);
    return;
  }
  const activeGroup = menuItems.find((g) =>
    g.children?.some((c: any) => c.key === location.pathname)
  );
  if (activeGroup) {
    setOpenKeys([activeGroup.key]);
  }
}, [location.pathname, collapsed]);

const handleOpenChange = (keys: string[]) => {
  if (collapsed) {
    setOpenKeys([]);
    return;
  }
  // Acordeón: quedarse solo con el último abierto
  const latest = keys.find((k) => !openKeys.includes(k));
  setOpenKeys(latest ? [latest] : []);
};
```

Ajusta dependencias si `menuItems` se recrea cada render (extrae keys de `GROUPS` estático para el effect).

### 3. Props del `Menu` (desktop)

```tsx
<Menu
  mode="inline"
  selectedKeys={[location.pathname.replace(/\/$/, '') || '/admin']}
  openKeys={collapsed ? [] : openKeys}
  onOpenChange={handleOpenChange}
  onClick={({ key }) => {
    // ignorar clicks en keys de grupo
    if (String(key).startsWith('group-')) return;
    navigate(key);
  }}
  items={menuItems}
  style={{ borderRight: 0, background: 'transparent', paddingTop: 8 }}
  inlineCollapsed={false}
/>
```

**Importante:** con `collapsedWidth={0}` el Sider no se muestra colapsado “en modo iconos”; cuando `collapsed` es true el ancho es 0. Forzar `openKeys={[]}` evita submenus popup.

Si en algún breakpoint el sider usara ancho > 0 colapsado, también: `openKeys={collapsed ? [] : openKeys}`.

### 4. Móvil

En el menú mobile, puedes:

- **Opción A:** mismos `openKeys` / `onOpenChange` (acordeón), o  
- **Opción B:** dejar todos cerrados por defecto y que el usuario abra.

Al navegar (`onClick`), cerrar el drawer/sider con `onToggle()` como ahora.

### 5. CSS (`admin-mobile.css`)

El label dentro de un submenu title necesita un poco de espacio para la flecha de Ant Design:

```css
/* Título de categoría colapsable */
.admin-sider .ant-menu-submenu-title {
  padding-inline-end: 34px !important; /* espacio para flecha */
  height: auto !important;
  line-height: 1.3 !important;
  margin-block: 4px !important;
}

.admin-menu-group-label--submenu {
  display: block;
  width: 100%;
  padding: 6px 10px;
  margin: 0;
  border-radius: 6px;
  background: var(--group-bg);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary) !important;
}

/* Flecha con color del tema */
.admin-sider .ant-menu-submenu-arrow {
  color: var(--text-secondary) !important;
}

.admin-sider .ant-menu-submenu-open > .ant-menu-submenu-title .admin-menu-group-label--submenu {
  color: var(--text-primary) !important;
}
```

Mantén `.admin-menu-group-label` base si aún se usa; la variante `--submenu` evita márgenes dobles.

### 6. No reintroducir

- ❌ `icon: <span>📁</span>` en el grupo  
- ❌ `collapsedWidth={80}` (debe seguir en `0`)  
- ❌ Dejar `openKeys` con valores cuando `collapsed === true`

---

## Checklist

- [ ] Click en “OPERACIONES” (etc.) expande/colapsa hijos
- [ ] Solo un grupo abierto a la vez (acordeón)
- [ ] Ruta activa: su grupo queda abierto al cargar
- [ ] Al cerrar el sider (✕ / ☰), no hay menú flotante
- [ ] Sin ícono de carpeta; label con fondo `--group-bg`
- [ ] Ítem activo sigue con barra primary / `--menu-selected`
- [ ] Light y dark correctos

## Criterio de aceptación

Categorías colapsables + sider a ancho 0 sin popups residuales + estilo de label actual (fondo, uppercase, sin 📁).

Aplica los cambios ahora.
