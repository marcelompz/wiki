# Plan de Diseño y Optimización UX/UI Mobile-First para OrderFlow

> **Documento de Arquitectura de Experiencia de Usuario y Diseño de Interfaz (UX/UI)**  
> **Fecha:** 2026-08-01  
> **Estado:** Aprobado / Parcialmente Implementado (v1.5.1)  
> **Objetivo:** Transformar OrderFlow en una plataforma con UX/UI intuitiva, sencilla y 100% Mobile-First tanto para el Backoffice/SuperAdmin como para los Endpoints de Clientes (Storefront, Checkout, Turnos y Catálogos).

---

## 📐 1. Principios Fundamentales de Diseño

1. **Mobile-First & Touch-First:** Diseño pensado prioritariamente para smartphones y pantallas táctiles, escalando de forma fluida hacia tablets y desktop.
2. **Claridad Visual & Cero Ficción (Low Cognitive Load):** Reducción de elementos innecesarios. Navegación directa a 1-2 toques de distancia.
3. **Estética Modern SaaS & App-Like Experience:** Interfaces dinámicas con estética de alta gama (Dark/Light mode armonioso, micro-interacciones, retroalimentación táctil inmediata y cero recargas molestas).
4. **Respeto a la Regla Multi-Tenant:** La experiencia de branding debe personalizarse automáticamente por tenant sin alterar la ergonomía base.

---

## ✅ 2. Estado de Implementación (v1.5.1)

### Completado
- **PWA instalable:** manifest, service worker, meta tags iOS, botón de instalación
- **Admin sidebar responsive:** se oculta/colapsa en todos los breakpoints con toggle
- **Dashboard responsive:** estadísticas en grid adaptativo xs→lg
- **Tablas responsive:** scroll horizontal en mobile para mantener datos legibles
- **Contactos unificados:** página `/admin/contacts` con stats cards y filtros
- **Modal responsive:** width adaptativo y body con scroll en mobile

### En progreso
- **Tablas admin restantes:** aplicar scroll horizontal y touch targets en todas las páginas
- **Header mobile:** optimizar spacing y acciones en pantallas pequeñas
- **Formularios mobile:** labels y spacing optimizados para pantallas < 768px

### Pendiente
- **Cards en vez de tablas:** transformar tablas masivas en cards en mobile
- **Bottom navigation bar:** navegación inferior fija para admin mobile
- **Sticky action bar:** acciones rápidas en footer para checkout y POS
- **Glassmorphism:** transiciones y efectos visuales avanzados
- **Offline mode:** service worker con cache de datos

---

## 📱 2. Endpoints para Clientes (Storefront, WhatsApp Catalog, Checkout & Turnos)

### 2.1 Ergonomía Táctil y Zona del Pulgar (Thumb-Zone)
* **Sticky Action Bar:** Barra de acción fija en el borde inferior para agregar al carrito, confirmar selección o ir al checkout (`"Ver Pedido (3) - Gs. 150.000"`).
* **Bottom Sheets Modales:** Sustitución de los modales flotantes centrados por hojas deslizables desde abajo (`Bottom Sheets`) para personalizar modificadores, seleccionar variantes o ingresar fechas de turnos.
* **Smart Search & Quick Filters:** Buscador predictivo flotante + chips de categorías con scroll horizontal suave.

### 2.2 Checkout Express en 1 o 2 Pasos (One-Page Checkout)
* **Autocompletado Inteligente:** Uso de APIs del navegador para autocompletar nombre, teléfono y dirección.
* **Geolocalización con 1 Tap:** Integración de GPS para autodetectar la ubicación y sugerir la zona de entrega y costo de envío sin tipeo manual.
* **Resumen Limpio:** Desglose claro de ítems, delivery, descuentos y total sin distracciones.

---

## 🏢 3. Administración de Tenants (Backoffice Admin & SuperAdmin)

### 3.1 Navegación Adaptativa
* **Desktop:** Sidebar vertical retráctil con accesos directos por módulos activos del tenant.
* **Mobile (< 768px):** Bar de navegación inferior fija (`Bottom Navigation Bar`) con los 4 módulos de alta frecuencia:
  1. 📦 **Pedidos / POS activo** (Gestión en tiempo real).
  2. 🏷️ **Productos & Stock** (Actualización rápida).
  3. 📅 **Turnos / Agendas** (Visión diaria).
  4. 📊 **Métricas clave** (Resumen de ventas).
  5. ⚙️ **Más / Menú Hamburguesa** (Configuración, Tenants, Integraciones).

### 3.2 Transformación de Tablas a Tarjetas (Responsive Cards)
* En móviles, las tablas masivas de Ant Design se transforman en **Listas de Tarjetas Verticales (Cards)** con:
  * Badges de estado con contraste optimizado (Pendiente, En Preparación, Entregado).
  * Acciones directas mediante botones de un toque (Cambiar Estado, Ver Detalle, Llamar/WhatsApp al cliente).

### 3.3 Dashboard SuperAdmin & Tenant Switcher
* **Selector de Tenant Flotante:** Cambio instantáneo de tenant con búsqueda en tiempo real, mostrando icono/logo del tenant y badge distintivo de Tier (`👥 Shared` vs `💎 Dedicated`).
* **Acciones Rápidas:** Habilitar/Deshabilitar, Ver Métricas, Provisionar DB o Cambiar Tier a 1 toque con confirmaciones de seguridad integradas.

---

## 🎨 4. Design System & Componentes UX

1. **Tokens Tipográficos y Espaciado:**
   * Fuente principal: *Inter* / *Plus Jakarta Sans*.
   * Escala tipográfica fluida basada en `clamp()`.
2. **Glassmorphism y Transiciones:**
   * Translucidez con `backdrop-filter: blur(12px)` para barras superiores e inferiores.
   * Transiciones entre pantallas usando View Transitions API / CSS Smooth Animations.
3. **Estados de Carga y Micro-interacciones:**
   * Skeleton loaders en lugar de spinners genéricos para reducir la percepción de latencia.
