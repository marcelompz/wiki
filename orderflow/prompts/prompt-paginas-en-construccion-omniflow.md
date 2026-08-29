# Prompt de Desarrollo – Páginas en Construcción (OmniFlow)

**Proyecto:** OmniFlow (SaaS Omnicanal)  
**Stack:** NestJS + Prisma + React + Vite + Ant Design + Refine  
**Rol objetivo:** SuperAdmin  
**Fecha de solicitud:** 22 de agosto de 2026

---

## Objetivo

Desarrollar una funcionalidad que permita al **SuperAdmin** marcar uno o varios endpoints/rutas públicas como **“En construcción”**.  

Cuando un usuario visite esas rutas, en lugar del contenido real se mostrará una página profesional de “En construcción”.

---

## Requisitos funcionales

### 1. Acceso solo para SuperAdmin

- Nueva opción en el **sidebar** del panel de administración visible **únicamente** para usuarios con rol `SuperAdmin`.
- Nombre de la opción: **“Páginas en Construcción”** (o “Under Construction”).
- Icono sugerido: `BuildOutlined` o `ToolOutlined` de Ant Design.

### 2. Panel de administración

Página de administración con las siguientes capacidades:

- Lista de todos los endpoints/rutas que actualmente están marcados como “En construcción”.
- Formulario para agregar nuevas rutas.
- Campos por cada regla:
  - **Ruta / Endpoint** (ej: `/social-catalog/menudigital`, `/social-catalog/*`, `/menu`, etc.).  
    Debe soportar coincidencia exacta y wildcards simples (`*` al final).
  - **Título** personalizable (default: “En construcción”).
  - **Mensaje / Subtítulo** personalizable.
  - **Estado** (Activo / Inactivo).
  - **Fecha de activación** y **fecha de desactivación** opcionales (programación).
  - **Botón de acción** opcional (texto + URL, ej: “Contactar por WhatsApp”).
- Poder **editar** y **eliminar** reglas existentes.
- Poder **activar/desactivar** rápidamente con un switch.
- Poder aplicar la misma configuración a **múltiples endpoints** de una sola vez (selección múltiple o agregar varias rutas en un solo formulario).

### 3. Comportamiento en el frontend público

- Middleware o componente de orden superior (HOC / layout) que intercepte las rutas públicas.
- Si la ruta actual coincide con alguna regla activa de “En construcción”, renderizar la página de Under Construction en lugar del contenido original.
- La página de Under Construction debe ser:
  - Responsive y limpia.
  - Con el logo del tenant (si existe).
  - Título y mensaje configurables.
  - Botón opcional configurable.
  - Diseño profesional (usar Ant Design `Result` + icono de construcción).

### 4. Backend

- Crear modelo Prisma `UnderConstructionRule` (o nombre similar) con los campos necesarios.
- Endpoints REST protegidos solo para SuperAdmin:
  - `GET /admin/under-construction` → listar reglas
  - `POST /admin/under-construction` → crear (soportar array de rutas)
  - `PATCH /admin/under-construction/:id` → actualizar
  - `DELETE /admin/under-construction/:id` → eliminar
  - `PATCH /admin/under-construction/bulk` → activar/desactivar o aplicar a múltiples
- La verificación de si una ruta está en construcción debe ser eficiente (cachear las reglas activas en memoria o Redis si es posible).

### 5. Extras deseables

- Preview de cómo se verá la página de “En construcción” desde el panel de admin.
- Log de cuándo se activó/desactivó cada regla.
- Opción de “Aplicar a todos los catálogos sociales” o filtros por tipo de ruta.
- Soporte multi-tenant: las reglas pueden ser globales (SuperAdmin) o por tenant (opcional, pero priorizar global primero).

---

## Entregables esperados

- Migración Prisma
- DTOs + Controller + Service en NestJS
- Página de administración en Refine (con tabla + formulario modal o drawer)
- Componente público `UnderConstructionPage`
- Lógica de interceptación de rutas (en el router o en un layout público)
- Instrucciones de cómo probarlo

---

## Notas de implementación

- Seguir las convenciones actuales del proyecto OmniFlow.
- Código limpio, tipado y mantenible.
- Priorizar la experiencia del SuperAdmin (rápido de usar y claro).
- La funcionalidad debe funcionar correctamente en el tenant de ejemplo `provecchio.com` y en cualquier otro tenant.

---

**Fin del prompt**
