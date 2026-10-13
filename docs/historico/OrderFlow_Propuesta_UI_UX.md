# OrderFlow Admin — Propuesta de Mejora Estética, Tema Oscuro y Módulos Omnicanal

**Fecha:** 6 de agosto de 2026  
**Versión base:** OrderFlow Admin v1.15.1 (/admin)  
**Referencia:** captura de Dashboard General + documentación de producto

---

## 1. Diagnóstico visual del estado actual

### Lo que funciona
- Layout clásico de admin (sidebar + topbar + content) legible y familiar.
- Badges de versión y tenant visibles.
- KPIs en la primera fila (ingresos, clientes, pedidos, conversión).
- Accesos rápidos útiles.

### Problemas de percepción y usabilidad
| Problema | Impacto |
|----------|---------|
| **UI genérica Ant Design “out of the box”** | Se percibe como plantilla, no como producto de marca |
| **Demasiado blanco / poco contraste de jerarquía** | Los bloques vacíos (“Gráfico de Ventas”, “Lista de Actividad”) dominan y dan sensación de producto incompleto |
| **Sidebar densa y plana** | 12+ ítems al mismo nivel visual; no hay agrupación por dominio (Ventas / Catálogo / Operaciones / Sistema) |
| **KPIs sin contexto temporal ni sparkline** | Números sueltos; no se entiende tendencia real |
| **Placeholders grises sin estado vacío diseñado** | Parece bug o “aún no implementado” |
| **Sin modo oscuro** | Fatiga en uso prolongado (POS, KDS, turnos nocturnos) |
| **“Diseño Web & Portada” y “Catálogo WhatsApp” se sienten módulos secundarios** | Están en el menú pero no transmiten el valor omnicanal del producto |

---

## 2. Principios de la nueva dirección visual

1. **Marca primero** — Color primario del tenant (ya existe `primaryColor` / `themePrimaryColor`) como acento real, no solo en el logo.
2. **Densidad controlada** — Menos aire vacío; más información útil por viewport sin saturar.
3. **Jerarquía clara** — Agrupar el menú; elevar KPIs y acciones primarias.
4. **Estados vacíos con intención** — Cada bloque vacío invita a la siguiente acción.
5. **Omnicanal visible** — Storefront y Catálogo Social no son “más páginas”; son el escaparate del negocio.
6. **Tema claro + tema oscuro de primera clase** — Mismo sistema de tokens, no un afterthought.

### Tokens propuestos (light / dark)

| Token | Light | Dark |
|-------|-------|------|
| `--bg-app` | `#F4F6F9` | `#0B0F14` |
| `--bg-surface` | `#FFFFFF` | `#141A22` |
| `--bg-elevated` | `#FFFFFF` | `#1C2430` |
| `--border` | `#E5E9F0` | `#2A3441` |
| `--text-primary` | `#0F172A` | `#E8EEF6` |
| `--text-secondary` | `#64748B` | `#94A3B8` |
| `--accent` | `tenant.primaryColor` (default `#3B82F6`) | mismo, +10% luminosidad |
| `--success` | `#10B981` | `#34D399` |
| `--danger` | `#EF4444` | `#F87171` |
| `--radius` | `12px` (cards) / `8px` (controles) | igual |
| `--shadow` | `0 1px 3px rgb(15 23 42 / 6%)` | `0 1px 0 rgb(255 255 255 / 4%)` |

Tipografía: mantener sistema Ant Design / Inter o pasar a **Geist / Plus Jakarta Sans** para un look más producto SaaS 2026.

---

## 3. Rediseño del shell (sidebar + topbar + dashboard)

### 3.1 Sidebar reagrupada

```
OPERACIONES
  · Dashboard
  · Punto de Venta (POS)
  · Cocina (KDS)
  · Pedidos          ← hoy diluido en “Ver Pedidos”
  · Turnos / Bookings

CATÁLOGO & CANALES
  · Productos & Catálogos
  · Catálogo Social (WhatsApp / IG / …)   ← renombrado y elevado
  · Diseñador Web & Portada (Storefront)

RELACIONES
  · Contactos
  · Sorteos / Loyalty

SISTEMA
  · Integraciones
  · Suscripción SaaS
  · App Store (Módulos)
  · Conexión / Config
```

- Ícono + label; grupo colapsable.
- Item activo: barra de acento a la izquierda + fondo sutil del color del tenant.
- Footer del sidebar: plan actual + estado de conexión (útil para soporte).

### 3.2 Topbar
- Tenant switcher más visible (chip con logo).
- “Ver Tienda” como botón primario outline (abre storefront en nueva pestaña).
- Toggle de tema claro/oscuro.
- Notificaciones (pedidos nuevos, fallos de webhook, stock bajo).
- Usuario con rol.

### 3.3 Dashboard General mejorado

**Fila de KPIs (4 cards)**
- Número grande + delta % vs periodo anterior + mini sparkline (7/30 días).
- Color semántico solo en el delta (verde/rojo), no en todo el número.
- Click → drill-down al listado filtrado.

**Ventas por Mes**
- Recharts / Ant Charts con gradiente suave del color de acento.
- Selector de rango (7d / 30d / 90d / año).
- Estado vacío: ilustración + CTA “Registrar primera venta en POS”.

**Actividad Reciente**
- Timeline compacta (pedido confirmado, cliente nuevo, webhook fallido, documento SIFEN emitido).
- Avatar/ícono por tipo de evento.
- “Ver todo” → log de auditoría filtrado.

**Accesos Rápidos**
- Botones con ícono + label en grid 2×2, estilo “elevated”.
- Primario: Nuevo pedido / Abrir POS.

**Resumen del Sistema**
- Health chips: API · DB · Redis · Webhooks · FacturaSend · Odoo.
- Verde / ámbar / rojo según último check.

---

## 4. Tema oscuro (primera clase)

### Objetivos de uso
- POS y KDS en turno noche / ambientes con poca luz.
- Preferencia del operador.
- Coherencia con storefront dark si el tenant lo elige.

### Reglas
- Mismo layout y componentes; solo cambian tokens.
- Superficies en capas (`app` → `surface` → `elevated`) para profundidad sin sombras fuertes.
- Bordes sutiles en lugar de sombras pesadas.
- Gráficos con grid lines al 8–12% de opacidad.
- El color de acento del tenant se mantiene; se ajusta luminosidad mínima para contraste WCAG AA sobre fondo oscuro.
- Persistencia: `localStorage` + preferencia de usuario en backend (opcional).

### Toggle
- En topbar (sol/luna) y en Configuración → Apariencia.
- Transición CSS 150–200 ms en `background` y `color` (no en layout).

---

## 5. Módulo: Diseñador Web & Portada (Omnichannel Storefront)

**Problema actual (inferido):** entrada de menú genérica; no transmite que es el constructor del canal web del tenant.

### Concepto de producto
Un **editor visual ligero** del storefront público del tenant (`ecommerceUrl` / subdominio / custom domain), no un page-builder infinito tipo Webflow. Enfoque: portada, catálogo público, checkout y branding.

### Estructura de pantalla propuesta

```
┌─────────────────────────────────────────────────────────────┐
│  Diseñador Web & Portada          [Preview] [Publicar] [⋯]  │
├──────────────┬──────────────────────────────┬───────────────┤
│ Secciones    │     Canvas (preview live)    │ Inspector     │
│              │                              │               │
│ ▸ Portada    │  [Hero + CTA + categorías]   │ Título        │
│ ▸ Catálogo   │                              │ Subtítulo     │
│ ▸ Promos     │                              │ Imagen        │
│ ▸ Nosotros   │                              │ Color acento  │
│ ▸ Footer     │                              │ CTA →         │
│              │                              │               │
│ + Sección    │  Device: 📱 💻 🖥             │ SEO / OG      │
└──────────────┴──────────────────────────────┴───────────────┘
```

### Capacidades (MVP → v1)
| Capacidad | MVP | Siguiente |
|-----------|-----|-----------|
| Logo, colores, tipografía (white-label ya parcial) | ✅ | — |
| Hero: imagen, título, subtítulo, CTA (catálogo / WhatsApp / externo) | ✅ | Video background |
| Bloque de categorías / productos destacados (desde catálogo real) | ✅ | Reglas de merchandising |
| Banner de promo con fecha de vigencia | ✅ | A/B simple |
| Footer: redes, horarios, dirección, links legales | ✅ | — |
| Preview por dispositivo + URL pública | ✅ | — |
| Publicar / despublicar + historial de versiones | ✅ | Rollback en 1 click |
| SEO básico (title, description, OG image) | ✅ | Schema.org LocalBusiness |
| Dominio custom + estado de DNS (ya hay campos en Tenant) | ✅ | Wizard de verificación |

### Estética del módulo
- Canvas con marco de dispositivo (mobile-first, porque gran parte del tráfico será móvil/WhatsApp).
- Inspector lateral estilo “design tool” (labels cortos, inputs compactos).
- Botón **Publicar** siempre visible y con estado (borrador / publicado / error de build).
- Empty state: “Tu tienda aún no tiene portada → Empezar con plantilla Spa / Retail / Restaurante”.

### Integración con el resto del sistema
- Lee productos y categorías reales (no duplica catálogo).
- CTA puede apuntar a: listado de productos, producto, WhatsApp (wa.me), o booking.
- Respeta `ecommerceEnabled`, `allowGuestCheckout` y branding del Tenant.

---

## 6. Módulo: Administración del Catálogo Social Omnicanal

**Renombrar en menú:** de “Catálogo WhatsApp” → **Catálogo Social** (WhatsApp, y preparado para Instagram / otros).

### Problema actual
Se percibe como un export estático a WhatsApp. El valor real es **un catálogo único que alimenta varios canales**.

### Concepto
Una vista de **catálogo maestro orientado a canales**, donde cada producto tiene:
- Datos comerciales (ya existen en `Product`)
- Assets sociales (imágenes optimizadas, copy corto, hashtags)
- Estado de publicación por canal
- Orden / destacado por canal

### Estructura de pantalla propuesta

```
┌─────────────────────────────────────────────────────────────┐
│ Catálogo Social     [Canal: WhatsApp ▾]  [Sincronizar] [+]  │
├─────────────────────────────────────────────────────────────┤
│ Filtros: Categoría · Estado · Stock · Destacados            │
├──────────────────────────────┬──────────────────────────────┤
│ Lista / Grid de productos    │  Panel del producto          │
│                              │                              │
│ [img] Nombre     WA ✓  IG —  │  Imágenes (drag)             │
│ [img] Nombre     WA ✓  IG ✓  │  Título corto (límites WA)   │
│ [img] Nombre     WA —  IG —  │  Descripción social          │
│                              │  Precio / promo              │
│                              │  CTA: Comprar | Reservar | WA│
│                              │  Canales: ☑ WhatsApp  ☐ IG   │
│                              │  [Vista previa tarjeta WA]   │
└──────────────────────────────┴──────────────────────────────┘
```

### Capacidades

| Capacidad | Descripción |
|-----------|-------------|
| **Canal activo** | Selector WhatsApp (MVP); estructura lista para Instagram Commerce / otros |
| **Ficha social del producto** | Título corto, descripción, media, orden, “destacado” |
| **Límites del canal** | Contadores de caracteres / número de imágenes según reglas de WhatsApp |
| **Vista previa** | Tarjeta tal como se ve en el catálogo de WhatsApp Business |
| **Publicación / sync** | Estado: Borrador · En cola · Publicado · Error (con log) |
| **Bulk actions** | Publicar selección, ocultar, reordenar, asignar categoría |
| **Vínculo con Storefront** | El mismo producto alimenta web + social; una sola fuente de verdad |
| **Deep link a pedido** | Desde la ficha social se puede iniciar flujo hacia OrderFlow (ya hay modos Free/Premium) |

### Estética
- Grid de tarjetas con badge de canal (ícono WA / IG con estado).
- Panel derecho tipo “inspector” con preview sticky.
- Colores de canal reconocibles (verde WhatsApp solo en badges, no en toda la UI).
- Empty state: “Conectá WhatsApp Business y elegí qué productos mostrar en el catálogo”.

### Relación con integraciones
- Depende de la integración WhatsApp ya contemplada en el producto.
- Los errores de sync aparecen en el mismo panel y en el health del Dashboard.

---

## 7. Micro-interacciones y detalle que elevan la percepción

- **Skeleton loaders** en KPIs y listas (nunca bloques grises estáticos).
- **Toasts** consistentes (éxito / error de webhook / stock).
- **Confirmaciones destructivas** con nombre del recurso.
- **Atajos de teclado** en POS (ya mencionados en roadmap Tauri) y listados (j/k, enter).
- **Favicon y PWA** ya presentes en el stack frontend; asegurar iconos adaptativos light/dark.
- **Responsive admin**: sidebar colapsable a iconos en tablet; POS priorizado en móvil.

---

## 8. Priorización sugerida

| Prioridad | Ítem | Esfuerzo relativo | Impacto en percepción |
|-----------|------|-------------------|------------------------|
| P0 | Tokens + tema oscuro + toggle | M | Alto (uso diario POS/KDS) |
| P0 | Sidebar agrupada + topbar | S | Alto |
| P1 | Dashboard KPIs + estados vacíos + actividad real | M | Alto |
| P1 | Catálogo Social (rename + ficha + preview WA + estados) | L | Alto (diferenciador) |
| P2 | Diseñador Web & Portada (editor por secciones) | L | Alto (omnicanal) |
| P2 | Health chips en Dashboard | S | Medio |
| P3 | Tipografía de marca + motion sutil | S | Medio |

---

## 9. Criterios de aceptación (resumen)

**Estética general**
- [ ] Tema claro y oscuro con los mismos componentes y contraste AA
- [ ] Sidebar agrupada por dominio
- [ ] Ningún placeholder gris sin empty state accionable

**Diseñador Web & Portada**
- [ ] Preview live mobile/desktop
- [ ] Publicar / despublicar con feedback claro
- [ ] Hero + catálogo destacado + footer editables sin código
- [ ] Respeta branding y dominio del tenant

**Catálogo Social**
- [ ] Una ficha de producto alimenta web + WhatsApp
- [ ] Preview de tarjeta WhatsApp
- [ ] Estados de publicación por canal visibles en listado
- [ ] Sync con feedback de error recuperable

---

## 10. Nota de implementación (stack actual)

El frontend ya usa **React + Vite + Ant Design + Refine + Zustand**.  
Recomendación: no abandonar Ant Design; **theme algorithm** de Ant Design 5 + tokens CSS variables del tenant es el camino de menor fricción.

```ts
// idea de integración
const theme = {
  algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: tenant.primaryColor,
    borderRadius: 8,
    fontFamily: 'Plus Jakarta Sans, Inter, system-ui',
  },
};
```

Para el Diseñador y el Catálogo Social, componentes propios (canvas + inspector) sobre Ant Design Form/Upload, sin introducir un page-builder pesado.

---

*Propuesta alineada con el posicionamiento omnicanal de OrderFlow (storefront + WhatsApp + POS + integraciones) y con los campos de branding/white-label ya presentes en el modelo `Tenant`.*
