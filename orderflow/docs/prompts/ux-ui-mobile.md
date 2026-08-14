# Prompt: Mejorar menú / navegación móvil del Admin (OrderFlow)

## Contexto
- Producto: OrderFlow Admin (multi-tenant SaaS).
- URL de referencia: `https://provecchio.com/admin/`
- En desktop el menú es una **sidebar** con grupos:
  - OPERACIONES
  - CATÁLOGO & CANALES
  - RELACIONES
  - SISTEMA
  - SUPER ADMIN
- En móvil hoy se muestra esa misma sidebar como **acordeón vertical** dentro del flujo de la página, empujando el contenido hacia abajo.
- Ya existe una **bottom navigation bar** (Inicio, Productos, Turnos, Clientes, Config).
- Stack: React + Ant Design + Refine. Dark theme actual.

## Objetivo
Hacer que en breakpoints móviles (`max-width: 768px` o el breakpoint que use el proyecto) la navegación sea:
1. **Contenido primero** (sin lista de menú ocupando el viewport).
2. **Sidebar = Drawer** (overlay) abierto solo con el hamburger.
3. **Bottom bar** solo para destinos de uso frecuente.
4. Sin duplicar la misma información en dos sitios de forma confusa.

## Requisitos funcionales

### 1. Layout responsive
- **Desktop (≥768px o breakpoint actual del Layout)**:
  - Mantener sidebar (colapsable/expandible como hoy).
  - Ocultar bottom navigation bar.
- **Mobile (<768px)**:
  - **No renderizar** la sidebar como lista/acordeón dentro del main.
  - Sidebar se convierte en `Drawer` (Ant Design) o panel overlay desde la izquierda.
  - Drawer cerrado por defecto.
  - Abrir con el botón hamburger del header.
  - Cerrar al: tocar item, tocar overlay, o botón close / swipe.
  - Bottom navigation bar visible y fija (safe-area aware).

### 2. Header móvil
- Una sola fila compacta:
  - Izquierda: hamburger (abre drawer).
  - Centro: nombre del tenant (truncado con ellipsis si hace falta).
  - Derecha: acciones prioritarias (máx. 1–2): theme toggle y/o “Ver Tienda” (icon-only o icon + texto corto).
- Evitar overflow horizontal.
- Altura táctil ≥ 44px.

### 3. Drawer (menú completo)
- Título: nombre del tenant o “Menú”.
- Misma estructura de grupos que desktop (OPERACIONES, CATÁLOGO & CANALES, etc.), pero:
  - Labels en **Title Case** o sentence case (no ALL CAPS).
  - Iconos claros por ítem.
  - Grupos colapsables (Collapse/Accordion) **dentro del drawer**, no en el main.
  - Item activo resaltado.
  - Al navegar a una ruta, cerrar el drawer automáticamente.
- Si el usuario es Super Admin, el grupo SUPER ADMIN solo aparece si tiene permiso.

### 4. Bottom Navigation Bar
- Solo en mobile.
- 4–5 destinos de **alta frecuencia** (ejemplo alineado con la UI actual):
  - Inicio / Dashboard
  - Productos
  - Turnos (Bookings)
  - Clientes / Contactos
  - Más / Config (puede abrir el drawer o ir a un hub de ajustes)
- Icono + label corto.
- Indicador de ruta activa.
- Respetar `env(safe-area-inset-bottom)`.
- No duplicar todos los ítems del sidebar; el resto vive solo en el drawer.

### 5. Contenido principal
- En mobile, el `Content` debe empezar inmediatamente debajo del header (sin bloque de menú intermedio).
- Páginas como “Infrastructure Deploy Manager” deben ser visibles sin scroll previo de menú.
- Mantener padding lateral cómodo (16px) y tipografía legible.

### 6. Accesibilidad y UX
- Targets táctiles ≥ 44×44 px.
- Contraste suficiente en dark theme.
- Focus visible para teclado (por si se usa con teclado externo).
- Animaciones del drawer cortas (≤ 250–300 ms).
- No bloquear scroll del body cuando el drawer está abierto (o bloquearlo de forma controlada).

### 7. Implementación sugerida (Ant Design + Refine)
- Usar `Layout`, `Grid.useBreakpoint()` o `useMediaQuery` / `window.matchMedia` para decidir modo.
- Componente único de menú (items + grupos) reutilizado en:
  - `Sider` (desktop)
  - `Drawer` (mobile)
- Bottom bar como componente separado, montado solo en mobile.
- Rutas y `selectedKeys` sincronizados con `react-router` / Refine.
- No hardcodear anchos mágicos; usar tokens/theme cuando sea posible.

## Criterios de aceptación
- [ ] En viewport móvil, al cargar `/admin/` se ve el contenido de la página (ej. Infrastructure Deploy Manager) sin scrollear una lista de acordeones.
- [ ] Hamburger abre drawer con el menú completo agrupado.
- [ ] Cerrar drawer al navegar o al tocar fuera.
- [ ] Bottom bar visible solo en mobile y con 4–5 ítems frecuentes.
- [ ] Desktop sin regresiones: sidebar se comporta como antes.
- [ ] Header sin overflow en anchos ~360–430 px.
- [ ] Safe area inferior respetada en iOS.
- [ ] Theme toggle y “Ver Tienda” siguen accesibles.

## Fuera de alcance
- Rediseño visual completo del design system.
- Cambiar IA de negocio de los módulos.
- App nativa Expo (solo web admin responsive).

## Entregable
- Código del layout admin (sidebar/drawer/bottom nav) actualizado.
- Estilos/CSS o tokens para mobile.
- Breve nota de qué breakpoints y qué ítems quedaron en bottom bar vs drawer.