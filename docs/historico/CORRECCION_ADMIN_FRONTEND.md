# Prompt de Corrección — Admin Frontend (AdminApp / Sidebar / Topbar)

## Contexto
Se detectaron varios errores en los siguientes archivos del frontend de administración:
- `AdminApp.tsx`
- `Sidebar.tsx`
- `Topbar.tsx`

El objetivo es corregir **todos** los problemas listados a continuación sin cambiar la funcionalidad existente ni el diseño visual.

---

## Errores detectados

### 1. Sidebar.tsx — Violación de Rules of Hooks + import faltante (CRÍTICO)

**Problema:**
- Se usa `useState` **después** de un `return` condicional (`if (isMobile)`).
- No se importa `useState` desde React.

Esto rompe las Rules of Hooks y provoca errores en runtime.

**Corrección requerida:**
1. Importar `useState` desde `react`.
2. Mover la declaración de `const [openKeys, setOpenKeys] = useState<string[]>([]);` **antes** de cualquier return condicional (al inicio del componente).

---

### 2. AdminApp.tsx — Props faltantes al llamar a `AdminLayout` (ALTO)

**Problema:**
La función `AdminLayout` espera las siguientes props:
```ts
{
  children: React.ReactNode;
  tenantConfig?: any;
  isDark: boolean;
  toggleTheme: () => void;
  themeConfig: any;
}
```

Sin embargo se está invocando solo con:
```tsx
<AdminLayout tenantConfig={tenantConfig}>
```

Faltan `isDark`, `toggleTheme` y `themeConfig`.

**Corrección requerida:**
- Asegurarse de que `useTheme()` devuelva también `toggleTheme` (si aún no lo hace, ajustarlo).
- Pasar todas las props necesarias al componente:

```tsx
<AdminLayout
  tenantConfig={tenantConfig}
  isDark={isDark}
  toggleTheme={toggleTheme}
  themeConfig={themeConfig}
>
```

---

### 3. Topbar.tsx — Prop `onToggleSidebar` no desestructurado (MEDIO)

**Problema:**
La interfaz `TopbarProps` incluye `onToggleSidebar?: () => void`, pero en la desestructuración del componente **no se incluye**:

```tsx
export const Topbar = ({ tenantConfig, isDark, onToggleTheme, activeTenantName }: TopbarProps) => {
```

Luego se usa `onClick={onToggleSidebar}`, que queda como `undefined`.

**Corrección requerida:**
Incluir `onToggleSidebar` en la desestructuración:

```tsx
export const Topbar = ({ 
  tenantConfig, 
  isDark, 
  onToggleTheme, 
  activeTenantName, 
  onToggleSidebar 
}: TopbarProps) => {
```

---

## Instrucciones de implementación

1. Aplica **todas** las correcciones anteriores.
2. No introduzcas cambios de diseño, estilos ni lógica de negocio innecesaria.
3. Mantén la estructura actual de los componentes.
4. Asegúrate de que el código compile sin errores de TypeScript ni de React Hooks.
5. Después de corregir, verifica que:
   - El sidebar funcione correctamente tanto en mobile como en desktop.
   - El botón de menú (☰) del Topbar abra/cierre el sidebar.
   - El tema dark/light se pueda alternar sin errores.
   - No aparezcan warnings de Rules of Hooks en consola.

---

## Formato de respuesta esperado

Devuelve los tres archivos completos ya corregidos:

1. `Sidebar.tsx` (completo)
2. `Topbar.tsx` (completo)
3. Fragmento relevante de `AdminApp.tsx` donde se llama a `<AdminLayout ...>` (y el destructuring de `useTheme` si es necesario).

Indica claramente qué se modificó en cada archivo.