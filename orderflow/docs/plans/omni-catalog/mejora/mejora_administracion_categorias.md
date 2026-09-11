# SYSTEM PROMPT: Optimización del Panel de Administración y Renderizado Jerárquico en OmniCatalog (FEAT-082)

## 🎯 Rol y Objetivo del Agente
Actúas como Principal Full-Stack Engineer & Software Architect en el ecosistema OmniFlow. 
Tu objetivo es implementar mejoras críticas en la gestión administrativa y pública del catálogo social (`OmniCatalog` / `social-catalog`), permitiendo:
1. **Control de Visibilidad y Ordenamiento de Categorías:** Posibilidad de ordenar y ocultar/mostrar (`isVisible`) categorías y subcategorías de forma granular desde el panel de administración.
2. **Control de Jerarquía de Visualización:** Configuración flexible por tenant para alternar entre visualización anidada en árbol (*Nested Tree Accordion*) o visualización aplanada (*Flat List*), asegurando que el endpoint `/categories/tree` respete tanto el ordenamiento como los filtros de visibilidad.

---

## 📐 Reglas Inviolables de Arquitectura (AGENTS.md)
- **Multi-Tenant Estricto:** Toda consulta, mutación o endpoint debe filtrar explícitamente por `tenantId` (o resolver mediante el contexto de subdominio de Traefik v3).
- **Prisma Client:** Prohibido instanciar `new PrismaClient()`. Usar inyección de dependencias `this.prisma` o decoradores `@TenantPrisma()`.
- **Rendimiento Edge:** Mantener la latencia de respuesta pública por debajo de 35ms. No realizar queries N+1 para armar el árbol jerárquico.
- **Retrocompatibilidad:** Si un tenant no ha configurado estas opciones, el sistema debe comportarse con valores por defecto seguros (`isVisible = true`, `renderMode = 'nested'`).

---

## 🛠️ Especificación Técnica de Tareas

### Fase 1: Capa de Base de Datos y Schema (`backend/prisma/schema.prisma`)
1. Extender el modelo `ProductCategory` (o la tabla puente de configuración de catálogo por tenant) con los siguientes campos:
   - `sortOrder Int @default(0)`: Orden numérico de visualización.
   - `isVisible Boolean @default(true)`: Flag para ocultar/mostrar la categoría y sus productos asociados en el menú público.
2. Actualizar el modelo de configuración de catálogo `SocialCatalogConfig` (o equivalente del tenant):
   - `categoryRenderMode String @default("nested")`: Valores admitidos `'nested'` (categoría padre con sub-acordeones) o `'flat'` (muestra categorías y subcategorías en un solo nivel plano superior).
   - `hideEmptyCategories Boolean @default(true)`: Ocultar automáticamente categorías sin productos activos en stock.

### Fase 2: Backend API & Servicios (`backend/src/social-catalog/`)
1. **Endpoint Administrativo de Orden y Visibilidad:**
   - Crear `PUT /api/v1/admin/social-catalog/categories/reorder`:
     - Payload: Array de objetos `[{ id: string, sortOrder: number, isVisible: boolean, parentId?: string | null }]`.
     - Actualizar en una sola transacción Prisma interactiva (`this.prisma.$transaction`) el orden y visibilidad de las categorías del tenant.
2. **Actualización de Configuración:**
   - Extender `PUT /api/v1/admin/social-catalog/config` para persistir `categoryRenderMode` y `categorySource` (`'pos'` vs `'product'`).
3. **Optimización del Endpoint Público del Árbol (`SocialCatalogService.getCategoryTree`):**
   - Modificar `GET /api/v1/public/social-catalog/categories/tree`:
     - Filtrar solo categorías donde `isVisible: true` (y si una categoría padre está oculta, sus hijas quedan automáticamente excluidas).
     - Aplicar ordenamiento por `sortOrder ASC, name ASC`.
     - Si `categoryRenderMode === 'nested'`, retornar la estructura de árbol en N-niveles (`children: []`).
     - Si `categoryRenderMode === 'flat'`, aplanar el árbol retornando todas las categorías válidas al mismo nivel 0, concatenando o indicando el prefijo del padre si corresponde.

### Fase 3: Frontend Administrativo (`frontend/src/pages/admin/social-catalog/`)
1. **Pestaña / Módulo "Gestión de Categorías y Menú":**
   - Implementar vista de lista arrastrable (Drag-and-Drop con `@dnd-kit` o `antd Tree/Table draggable`).
   - Agregar switches o toggles de visibilidad (`Switch` con ícono de ojo/ojo tachado) por cada fila/nodo.
   - Botón de guardado rápido de orden y visibilidad con feedback inmediato vía toast/notification.
2. **Selector de Modalidad de Visualización en Configuración:**
   - Radio buttons o Segmented Control:
     - 🔘 **Modo Jerárquico / Anidado:** "Mostrar categorías principales y desplegar subcategorías adentro".
     - 🔘 **Modo Plano / Directo:** "Mostrar todas las categorías y subcategorías en pestañas/acordeones independientes".

### Fase 4: Frontend Catálogo Público (`frontend/src/pages/omni-catalog.tsx`)
1. Consumir el endpoint actualizado `/categories/tree` y la configuración de renderizado.
2. Si `categoryRenderMode === 'nested'`: Renderizar el componente `NestedCategoryAccordion` respetando el colapso jerárquico.
3. Si `categoryRenderMode === 'flat'`: Renderizar los acordeones de primer nivel directamente.
4. Asegurar que las imágenes de productos y tarjetas apliquen `LazyImage` y memoización `React.useMemo` para evitar re-renders al expandir/contraer nodos.

---

## 📋 Criterios de Aceptación (Definition of Done)
- [ ] `npx prisma migrate dev` / `prisma generate` ejecutado sin errores.
- [ ] Desde `/admin/social-catalog`, al ocultar una categoría (ej. "Bebidas Alcohólicas"), esta y sus productos dejan de aparecer en `/public/social-catalog`.
- [ ] Al reordenar las categorías arrastrando elementos, el orden se refleja de inmediato en la vista pública.
- [ ] Al alternar entre modo "Anidado" y "Plano", el catálogo público adapta su estructura de acordeones/pestañas sin romper la experiencia móvil.
- [ ] Suite de pruebas unitarias (`*.spec.ts`) cubriendo la lógica de construcción del árbol filtrado y aplanado.
- [ ] Latencia del endpoint público evaluada en `< 35ms` en entorno local/staging.