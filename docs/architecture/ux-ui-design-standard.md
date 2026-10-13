# 🎨 Estándar de Diseño UX/UI & Sistema de Temas (OmniFlow Standard)

> **Estado:** Estándar Vigente v2.0  
> **Alcance:** Frontend Web (Vite + React + Refine), Ant Design 5, Mobile (React Native + Expo)  
> **Objetivo:** Garantizar la coherencia visual, accesibilidad (WCAG 2.1 AA), respuesta táctil responsive y comportamiento fluido entre Modo Claro y Modo Oscuro en todo el ecosistema.

---

## 🎯 1. Principios Fundamentales de Diseño

1. **Arquitectura Theme-Aware (Cero Colores Hardcodeados):**
   - Prohibido utilizar valores hexadecimales fijos como `background: "#f8fafc"` o `color: "#000000"` en componentes.
   - Es mandatorio el uso de variables CSS dinámicas (`var(--bg-app)`, `var(--bg-surface)`, `var(--bg-elevated)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--border)`) o tokens de **Ant Design 5** (`colorBgContainer`, `colorBgElevated`, `colorText`).

2. **Consistencia de Formularios & Reset de Autofill:**
   - Todo formulario autocompletado en Dark Mode debe aplicar la clase de reset WebKit para evitar el resplandor amarillo/oliva (`-webkit-box-shadow: 0 0 0 1000px var(--input-bg) inset`).

3. **Internacionalización i18n Obligatoria:**
   - Prohibido quemar cadenas de texto o placeholders en español o inglés directo en componentes vista. Todo texto visible debe consumirse mediante `useTranslation()` (`t('namespace.key')`).

4. **Objetivos Táctiles Mobile (Mobile-First 44px):**
   - Todos los botones, elementos interactivos de tablas y menús desplegables deben tener un área táctil mínima de `44px x 44px` en pantallas móviles (`< 768px`).

---

## 📊 2. Matriz de Variables CSS & Tokens AntD

| Categoría | Variable CSS | Token AntD Equiv. | Modo Claro | Modo Oscuro |
|---|---|---|---|---|
| **Fondo App** | `--bg-app` | `colorBgLayout` | `#F4F6F9` | `#0D1117` |
| **Superficie / Cards** | `--bg-surface` | `colorBgContainer` | `#FFFFFF` | `#161B22` |
| **Paneles / Modales** | `--bg-elevated` | `colorBgElevated` | `#F8FAFC` | `#21262D` |
| **Texto Principal** | `--text-primary` | `colorText` | `#0F172A` | `#F0F3F6` |
| **Texto Secundario** | `--text-secondary` | `colorTextSecondary` | `#64748B` | `#A0AEC0` |
| **Bordes** | `--border` | `colorBorder` | `#E5E9F0` | `#30363D` |
| **Color Acento** | `--accent` | `colorPrimary` | `#3B82F6` | `#3B82F6` |

---

## 📋 3. Plan Integral de Auditoría & Ajustes UX/UI (Fases)

### 📍 Fase 1 (Completada): Corrección de Login & Modales Gastro
- [x] Reset de Autofill WebKit para Dark Mode en `admin-mobile.css`.
- [x] Resolución de claves i18n para la pantalla de inicio de sesión (`/login`).
- [x] Adaptación de contenedores dinámicos en el modal de gestión de mesas (`/admin/gastro`).

### 📍 Fase 2 (Completada): Eliminación de Colores Hardcodeados en Módulos Admin
- [x] Migración del resumen de despliegue en `deploy-manager.tsx` a `var(--bg-elevated)` y `var(--border)`.

### 📍 Fase 3 (Próxima Iteración): Auditoría de Tablas & Filtros Mobile
- [ ] Verificación de scroll horizontal y touch-targets de 44px en vistas de `DataTableContainer.tsx`.
- [ ] Homogeneización de la barra de búsqueda rápida y selectores de filtros en todas las páginas admin.

---

## 📑 Referencias Técnicas
- Configuración de Temas en Admin: [AdminApp.tsx](file:///opt/orderflow/frontend/src/AdminApp.tsx)
- Archivo Global de Tokens & CSS: [styles/admin-mobile.css](file:///opt/orderflow/frontend/src/styles/admin-mobile.css)
- Configuración i18n: [i18n.ts](file:///opt/orderflow/frontend/src/i18n.ts)
