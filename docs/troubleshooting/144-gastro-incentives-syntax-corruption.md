# Corrupción de Sintaxis en `gastro-incentives.tsx`

> **Área:** Frontend / OmniGastro / TypeScript  
> **Síntoma principal:** Archivo corrompido tras edición: imports faltantes y estructura rota; página de incentivos gastronómicos no compilaba  
> **Estado:** ✅ Resuelto

---

## Síntomas

- Errores de compilación TypeScript en `gastro-incentives.tsx` por imports faltantes (`theme`, `api`).
- Estructura del archivo rota tras una edición fallida.

## Causa raíz

Edición manual incorrecta que eliminó imports y corrompió la estructura del componente React.

## Solución aplicada

Reescribir el componente completo:
- Restaurar imports de `theme`, `api`, tipos y componentes Ant Design.
- Implementar carga dinámica de promociones y staff.
- Normalizar valores undefined con `?? []` y `?? 0`.

## Archivos modificados

- `frontend/src/pages/admin/gastro-incentives.tsx`

## Prevención

- Usar edits precisos en lugar de reescrituras parciales.
- Verificar compilación TypeScript después de cada cambio estructural.
