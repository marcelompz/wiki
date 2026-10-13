# Plan de Optimización de Espacio en Monorepo (De 4.2 GB a ~600 MB)

## 🔍 Causa Raíz del Peso Actual
Al ejecutar `du -h -d 1 /opt/orderflow`, se observa que:
- `services/`: 2.1 GB (debido a 7 carpetas `node_modules` independientes).
- `backend/`: 754 MB (`node_modules` de 743 MB).
- `frontend/`: 656 MB (`node_modules` de 637 MB).
- `mobile/`: 529 MB (`node_modules` de 523 MB).

---

## 🛠️ Plan de Acción Progresivo (PNPM Workspaces)

### Paso 1: Configurar `pnpm-workspace.yaml` en la raíz
Crear/actualizar la configuración de Workspaces en la raíz del proyecto:
```yaml
packages:
  - 'backend'
  - 'frontend'
  - 'mobile'
  - 'services/*'
  - 'packages/*'
```

### Paso 2: Deduplicación con Simlinks
Con PNPM, todas las dependencias compartidas (NestJS, React, Prisma, Typescript, Jest) se descargan e instalan **una sola vez** en la tienda global/raíz (`.pnpm-store`).
Cada carpeta (`services/pos-standalone`, `backend`, `frontend`) solo contendrá enlaces simbólicos (symlinks), reduciendo drásticamente el espacio en disco local.

### Paso 3: Script de Limpieza Rápida (Para Entornos de Dev)
Para recuperar espacio de forma rápida cuando sea necesario:
```bash
# Limpiar todos los node_modules
find . -name "node_modules" -type d -prune -exec rm -rf {} +
```
