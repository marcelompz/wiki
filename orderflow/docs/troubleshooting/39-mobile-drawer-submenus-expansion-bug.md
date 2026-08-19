# 🛠️ Troubleshooting: Submenús del Drawer Inaccesibles en Dispositivos Móviles (`#39`)

> **Área:** Frontend / Admin App / UX Móvil  
> **Síntoma:** Al abrir el menú desplegable (Drawer) en dispositivos móviles (`isMobile = true`), las categorías principales (**OPERACIONES**, **CATÁLOGO & CANALES**, **RELACIONES**, **SISTEMA**, **SUPER ADMIN**) se renderizaban correctamente, pero sus ítems internos/submenús no se expandían ni mostraban su contenido al tocar la categoría.  
> **Fecha:** 2026-08-15  
> **Estado:** ✅ Resuelto en commit `8e89440`  

---

## 🔍 1. Síntomas

1. En teléfonos móviles o pantallas pequeñas (`width < 1024px`), el usuario abre el Drawer de navegación lateral tocando el menú hamburguesa.
2. Las categorías principales son visibles en el menú estilo acordeón de Ant Design.
3. Al hacer clic sobre cualquier categoría (ej: **Catálogo & Canales**), la categoría no despliega su lista de ítems o se colapsa instantáneamente de nuevo a `openKeys: []`, imposibilitando la navegación a páginas como **Productos**, **OmniPOS**, **OmniBio**, etc.

---

## 🧠 2. Causa Raíz

En el diseño adaptativo del layout administrativo (`AdminApp.tsx`), el estado `sidebarCollapsed` se fuerza automáticamente a `true` cuando la pantalla entra en modo móvil (`isMobile = true`) para ocultar el `Sider` de escritorio.

Sin embargo, el componente `<Sidebar>` (`src/components/Sidebar.tsx`) compartía la misma instancia del menú de Ant Design tanto para la barra lateral fija de escritorio como para el `Drawer` de móviles. En el código existía la siguiente regla de seguridad en los efectos de reactividad y callbacks:

```typescript
// ❌ Código previo problemático
useEffect(() => {
  if (collapsed) {
    setOpenKeys([]);
    return;
  }
  // ...
}, [location.pathname, collapsed]);

const handleOpenChange = (keys: string[]) => {
  if (collapsed) {
    setOpenKeys([]);
    return;
  }
  // ...
};
```

Debido a que `collapsed` estaba en `true` por estar en pantalla móvil, cada intento de abrir una categoría gatillaba `if (collapsed) setOpenKeys([])`, borrando los submenús seleccionados y manteniendo el Drawer trabado en estado cerrado.

---

## 🛠️ 3. Solución Aplicada

Se ajustó la evaluación de colapso en `src/components/Sidebar.tsx` para diferenciar si el componente está siendo renderizado dentro del layout de escritorio o dentro del **Drawer móvil**:

```typescript
// ✅ Solución aplicada
useEffect(() => {
  if (!isMobile && collapsed) {
    setOpenKeys([]);
    return;
  }
  const activeGroup = menuItems.find((g) =>
    g.children?.some((c: any) => c.key === location.pathname)
  );
  if (activeGroup) {
    setOpenKeys([activeGroup.key]);
  }
}, [location.pathname, collapsed, isMobile, menuItems]);

const handleOpenChange = (keys: string[]) => {
  if (!isMobile && collapsed) {
    setOpenKeys([]);
    return;
  }
  const newKey = keys.find((k) => !openKeys.includes(k));
  setOpenKeys(newKey ? [newKey] : []);
};

const menu = (
  <Menu
    mode="inline"
    selectedKeys={[location.pathname]}
    openKeys={!isMobile && collapsed ? [] : openKeys}
    onOpenChange={handleOpenChange}
    onClick={handleMenuClick}
    items={menuItems}
  />
);
```

---

## 🔬 4. Verificación y Resultado

1. Se ejecutó `npm run build` en `frontend/` verificando 0 errores de compilación o TypeScript.
2. Se desplegó en el entorno de producción Provecchio (`provecchio.com`).
3. Se verificó en dispositivos móviles reales y emuladores que al abrir el Drawer se expanden y colapsan todas las categorías con sus submenús internos disponibles para navegación fluida.
