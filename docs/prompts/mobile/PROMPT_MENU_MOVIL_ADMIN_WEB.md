# Prompt: Menú móvil Admin Web (sidebar → drawer + bottom bar)

## Contexto
OrderFlow Admin Web (React + Ant Design + Refine). En desktop el menú es una **sidebar** agrupada:

- OPERACIONES
- CATÁLOGO & CANALES
- RELACIONES
- SISTEMA
- SUPER ADMIN

En móvil hoy ese menú se comporta mal: se muestra como acordeón vertical **dentro del flujo de la página**, empuja el contenido (ej. Infrastructure Deploy Manager) hacia abajo y compite con una **bottom bar** ya presente (Inicio, Productos, Turnos, Clientes, Config).

URL de referencia de comportamiento actual: admin en `provecchio.com/admin/` (y equivalentes staging).

Roadmap relacionado: navegación móvil adaptativa del backoffice; admin responsive con sidebar colapsable.

Dependencia opcional pero recomendada:
- Feature flags / `GET /api/v1/modules/enabled?audience=admin` para **ocultar** ítems de módulos no instalados (si la capa ya existe; si no, filtrar solo por rol como hoy).

---

## Objetivo
En breakpoints móviles:
1. **Contenido primero** — sin lista de menú ocupando el viewport.
2. **Sidebar = Drawer** overlay, cerrado por defecto, abierto con hamburger.
3. **Bottom bar** solo para destinos de alta frecuencia.
4. Desktop sin regresiones (sidebar como ahora).
5. Sin duplicar de forma confusa la misma navegación en dos sitios.

---

## Requisitos funcionales

### 1. Layout responsive
- **Desktop** (≥ breakpoint del Layout, p. ej. 768px o el que ya use el proyecto):
  - `Sider` visible (colapsable/expandible actual).
  - Bottom navigation **oculta**.
- **Mobile** (&lt; ese breakpoint):
  - No renderizar la sidebar como acordeón dentro del `Content`.
  - Menú completo en `Drawer` (Ant Design) desde la izquierda.
  - Drawer cerrado por defecto.
  - Abrir: hamburger del header.
  - Cerrar: navegar a una ruta, overlay, botón close, o gesto atrás si aplica.
  - Bottom bar fija visible (safe-area).

### 2. Header móvil
Una fila compacta:
- Izquierda: hamburger.
- Centro: nombre del tenant (ellipsis).
- Derecha: 1–2 acciones (theme toggle y/o “Ver Tienda”, preferible icon-only en anchos chicos).
- Sin overflow horizontal en ~360–430px.
- Altura táctil ≥ 44px.

### 3. Drawer (menú completo)
- Misma estructura de grupos que desktop.
- Labels en Title Case / sentence case (evitar ALL CAPS innecesarias).
- Iconos por ítem; grupo colapsable **dentro del drawer**.
- Ítem activo resaltado; al navegar, cerrar drawer.
- SUPER ADMIN solo si el usuario tiene permiso de plataforma.
- Si hay feature flags: no listar módulos inactivos (o mostrarlos disabled según criterio de producto documentado).

### 4. Bottom Navigation Bar
- Solo mobile.
- 4–5 destinos de **alta frecuencia**, ejemplo alineado a la UI actual:
  - Inicio / Dashboard
  - Productos
  - Turnos
  - Clientes / Contactos
  - Más o Config (puede abrir el drawer o un hub)
- Icono + label corto; estado activo por ruta.
- `env(safe-area-inset-bottom)` en iOS.
- El resto de rutas vive **solo** en el drawer.

### 5. Contenido principal
- `Content` inmediatamente bajo el header en mobile.
- Páginas como Infrastructure Deploy Manager visibles sin scrollear un bloque de menú.
- Padding lateral cómodo (~16px).

### 6. Accesibilidad y UX
- Targets ≥ 44×44 px.
- Contraste en dark theme.
- Animación del drawer ≤ ~300ms.
- Scroll del body controlado con drawer abierto.

### 7. Implementación sugerida
- Un solo origen de ítems de menú (config/array) reutilizado en:
  - `Sider` (desktop)
  - `Drawer` (mobile)
- `Grid.useBreakpoint()` / `matchMedia` para el modo.
- Bottom bar componente separado, montado solo en mobile.
- `selectedKeys` / rutas sincronizados con React Router / Refine.
- No romper code splitting existente de `AdminApp.tsx`.

---

## Criterios de aceptación
- [ ] En viewport móvil, al cargar una ruta admin se ve el contenido sin scrollear acordeones de menú.
- [ ] Hamburger abre drawer con menú agrupado completo (según permisos).
- [ ] Navegar o tocar fuera cierra el drawer.
- [ ] Bottom bar solo en mobile, 4–5 ítems frecuentes.
- [ ] Desktop: sidebar igual de usable que antes; sin bottom bar.
- [ ] Header sin overflow en anchos chicos.
- [ ] Safe area inferior respetada en iOS (PWA/Safari).
- [ ] Theme toggle y “Ver Tienda” siguen accesibles.

---

## Fuera de alcance
- Apps Expo cliente o staff.
- Implementar feature flags backend (solo consumir si ya están).
- Rediseño total del design system.
- Cambiar IA de negocio de los módulos.
- Refactor masivo de todas las tablas admin a cards (puede ser prompt aparte).

---

## Entregables
1. Cambios en layout admin (Sider / Drawer / Header / BottomNav).
2. Estilos o tokens para mobile (safe-area, z-index drawer vs bottom bar).
3. Nota breve: breakpoint usado + qué ítems quedaron en bottom bar vs drawer.
4. Verificación manual en ancho ~390px y desktop.

## Problemas que debe resolver (regresión actual)
1. Sidebar acordeón ocupando el viewport móvil.
2. Navegación duplicada confusa (acordeón + bottom bar).
3. Contenido principal empujado hacia abajo.
4. Header saturado.
5. Bottom bar incompleta respecto al árbol real del admin (corregir con “Más” → drawer).
```