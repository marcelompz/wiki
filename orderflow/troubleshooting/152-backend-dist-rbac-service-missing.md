# Troubleshooting 152: Backend dist `rbac.service.js` Eliminado

## 🎯 Síntoma
`/app/dist/src/common/rbac.service.js` no existe en el contenedor `orderflow-backend-prod` (solo existe `.d.ts`). El backend sigue funcionando porque el código está en memoria, pero un reinicio del contenedor fallará.

## 🔍 Causa Raíz
Durante la corrección de permisos HR, se intentó ejecutar `npm run build` dentro del contenedor con timeout insuficiente. La compilación parcial eliminó archivos `.js` del dist sin completarla.

## 🛠️ Solución Pendiente
1. **En progreso**: Rebuild de la imagen `orderflow-backend` usando `docker build` con `Dockerfile.prod`
2. Alternativa: Compilar solo `src/common/rbac.service.ts` → `dist/src/common/rbac.service.js` con `npx tsc`
3. Al completar: `docker restart orderflow-backend-prod`

## ⚠️ Impacto
- Backend funciona actualmente (código en memoria)
- HR permissions fix (commit `4fd2756b`) NO aplicado en runtime
- Container debe reiniciarse una vez con dist completo
