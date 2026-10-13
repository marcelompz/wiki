# Error de Build Frontend: Componente `AdaptiveTable` Faltante

**Fecha:** 2026-08-03  
**Versión afectada:** v1.8.1 (deploy inicial fallido)  
**Área:** Frontend / Docker Build / TypeScript  

---

## Síntoma

El despliegue a producción fallaba en la etapa de build del frontend con el siguiente error:

```
src/pages/admin/contacts.tsx(5,31): error TS2307: Cannot find module '../../components/common/AdaptiveTable'
src/pages/admin/products.tsx(5,31): error TS2307: Cannot find module '../../components/common/AdaptiveTable'
```

El contenedor `orderflow-frontend-prod` no lograba iniciarse y Traefik devolvía **502 Bad Gateway**.

## Causa Raíz

Los archivos `frontend/src/pages/admin/contacts.tsx` y `frontend/src/pages/admin/products.tsx` importaban el componente `AdaptiveTable` desde `../../components/common/AdaptiveTable`, pero el archivo `frontend/src/components/common/AdaptiveTable.tsx` **nunca fue creado**.

El componente `AdaptiveTable` fue introducido en la refactorización UX/UI v1.7.0 para renderizar tablas Ant Design en escritorio y listas de tarjetas en móvil, pero su archivo fuente no se incluyó en el commit correspondiente.

## Solución Aplicada

1. **Crear el directorio** `frontend/src/components/common/`
2. **Crear `AdaptiveTable.tsx`** con la interfaz `AdaptiveTableProps<T>` que extiende `TableProps<T>` de Ant Design y acepta:
   - `columns` — columnas de la tabla
   - `dataSource` — datos de la tabla
   - `renderCard` — función para renderizar tarjetas en modo mobile
   - `rowKey` — clave única por fila
3. **Implementar detección de breakpoint** con `window.innerWidth >= 1200` (desktop) vs mobile
4. **Exportar** el componente desde `frontend/src/components/index.ts`
5. **Commit y push** del fix, re-ejecutar `./scripts/deploy-production.sh production`

## Prevención

- Verificar que todos los componentes referenciados en imports existan antes de hacer commit
- Ejecutar `npm run build` en el frontend local antes de desplegar
- El script `init.sh` valida el build del frontend como parte de la barrera de calidad

## Referencias Cruzadas

- [PLAN_DESKTOP_UX_REFINEMENT.md](../PLAN_DESKTOP_UX_REFINEMENT.md) — plan de refinamiento UX que introdujo `AdaptiveTable`
- [AGENTS.md](../00-contexto-agentes.md) — protocolo de despliegue y validación
- [CHANGELOG.md](../CHANGELOG.md) — v1.7.0: refinamiento UX/UI escritorio