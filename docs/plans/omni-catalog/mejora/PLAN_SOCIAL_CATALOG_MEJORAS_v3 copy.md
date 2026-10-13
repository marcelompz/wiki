# Plan de Mejoras UX/UI Social Catalog

## Estado: ✅ Desplegado (2026-08-24)

## Objetivos
1. Habilitar o no las fotos de productos (admin config: `showProductImages`)
2. Vista en modo lista o tarjeta (admin config: `productViewMode` + toggle cliente)
3. Mejorar contraste en modo obscuro/clar

## Estado Actual (auditoría del código)

### Configuración Admin
- ✅ `showProductImages` ya existe (socialConfig?.showProductImages ?? true) - línea 416
- ✅ `productViewMode` ya existe (socialConfig?.productViewMode || 'card') - línea 419
- ⚠️ Solo se aplica dentro de acordeón (accordion mode), no en list mode

### Toggle Cliente
- ❌ No existe toggle cliente para cambiar vista (lista/tarjeta)
- ❌ No hay persistencia en localStorage

### Tema/Contraste
- ✅ Sistema de temas (light/dark/system) implementado
- ⚠️ Usa variables CSS genéricas, no optimizadas para contraste de catálogo

## Implementaciones

### 1. Toggle Cliente: Vista Lista/Tarjeta
**Archivo:** `frontend/src/pages/social-catalog.tsx`

#### Cambios:
- Agregar estado `viewMode` con persistencia en localStorage
- Agregar toggle UI en barra de filtros (IconButton + ViewModeToggle)
- Pasar `viewMode` al renderizado de productos en ambos modos (accordion y list)

#### Código:
```tsx
const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
React.useEffect(() => {
  const saved = localStorage.getItem('social-catalog-view-mode');
  if (saved === 'card' || saved === 'list') setViewMode(saved);
}, []);
React.useEffect(() => {
  localStorage.setItem('social-catalog-view-mode', viewMode);
}, [viewMode]);
```

### 2. Product Photo Toggle (Admin)
- ✅ Ya funciona en accordion mode
- ⚠️ Corregir: en list mode, `showProductImages` NO se respeta (línea 542 condicional está dentro de `productViewMode === 'list'` check)

#### Fix:
En list mode card, verificar `showProductImages` antes de renderizar imagen.

### 3. Mejora de Contraste Tema
**Archivo:** `frontend/src/theme/tokens.ts` o inline en social-catalog

#### Mejoras:
- Asegurar contraste mínimo 4.5:1 para texto
- Ajustar `--text-primary` y `--text-secondary` en modo dark
- Verificar colores de botones y badges en modo dark

## Testing
- `npm run build` (frontend) pasa sin errores
- E2E manual en https://provecchio.com/social-catalog

## Deploy
- `./scripts/deploy-production.sh provecchio`
