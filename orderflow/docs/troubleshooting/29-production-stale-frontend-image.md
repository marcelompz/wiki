# 🛠️ Producción: Imagen Docker Stale + Fallbacks de Versión Hardcodeados

**Fecha:** 2026-08-08  
**Módulo / Área:** DevOps / Frontend / Docker  
**Severidad:** Alta (`pesallaccia.com` muestra versión `1.16.0` y contraste dark incorrecto tras deploy de `v1.16.1`)  
**Estado:** ✅ **RESUELTO**

---

## 1. Descripción del Problema

Tras el deploy a producción (`pesallaccia.com`) de la versión `v1.16.1`:

- El frontend servido seguía mostrando **`1.16.0`** en el tag de versión de `App.tsx`, `Sidebar.tsx` y `super-admin-dashboard.tsx`.
- El modo oscuro perdía los tokens de contraste alto definidos en `PROMPT_DARK_CONTRAST.md` (`#F0F3F6`, `#30363D`, `rgba(59,130,246,0.15)`).
- El backend y migraciones estaban correctos; solo el frontend visual quedía desactualizado.

## 2. Causa Raíz

**Imagen Docker stale + fallbacks de versión hardcodeados.**

1. El contenedor `orderflow-frontend-prod` en Hetzner estaba corriendo una imagen buildeada el `2026-08-07 23:19 UTC`, previa al sync final de `v1.16.1`.
2. El sync con rsync actualizó el código fuente en `/srv/orderflow`, pero el deploy no forzó rebuild del frontend; Docker reutilizó la imagen cacheada vieja.
3. Adicionalmente, tres archivos frontend tenían fallbacks hardcodeados `1.16.0` que ignoraban `package.json` y `VERSION`.

## 3. Solución Ejecutada

### 3.1 Forzar rebuild sin cache en Hetzner

```bash
ssh hetzner-orderflow "cd /srv/orderflow && docker compose -f docker-compose.prod.yml build --no-cache frontend"
ssh hetzner-orderflow "cd /srv/orderflow && docker compose -f docker-compose.prod.yml up -d --remove-orphans frontend"
```

### 3.2 Corregir fallbacks hardcodeados

```bash
# Bump de 1.16.0 → 1.16.1 en:
# - frontend/src/App.tsx
# - frontend/src/components/Sidebar.tsx
# - frontend/src/pages/admin/super-admin-dashboard.tsx
```

### 3.3 Commit y deploy completo

```bash
git add frontend/src/App.tsx frontend/src/components/Sidebar.tsx frontend/src/pages/admin/super-admin-dashboard.tsx docs/guides/analisis_roadmap.md
git commit -m "fix(frontend): bump hardcoded version fallbacks to 1.16.1; update roadmap to v1.16.1"
git push origin main
./scripts/deploy-production.sh production
```

## 4. Verificación Post-Solución

| Verificación | Resultado |
|---|---|
| `docker inspect orderflow-frontend-prod` (created) | `2026-08-09T01:17:55Z` (nueva imagen) |
| Bundle servido `index-Cnt3I0c8.js` | `1.16.1` |
| Tokens dark en bundle | `rgba(59, 130, 246, 0.15)`, `#F0F3F6`, `#30363D` |
| `curl -I https://pesallaccia.com` | `Cache-Control: no-cache, no-store, must-revalidate` |
| QA post-deploy | ✅ Catálogo público, admin, auth/health sin errores JS |

## 5. Protocolo de Prevención

1. **Forzar rebuild del frontend en deploy si cambia `VERSION` o `theme.*`**: el deploy script debe detectar diff en `frontend/src/theme` o `VERSION` y usar `--no-cache frontend`.
2. **No hardcodear versión en UI**: leer dinámicamente desde `package.json` o `VERSION` con un único helper compartido.
3. **Verificar hash de imagen en deploy**: comparar `docker images orderflow-frontend --format '{{.CreatedAt}}'` antes y después del deploy.
4. **Validar bundle en producción**: después de deploy, `curl -s $DOMAIN/assets/index-*.js | grep -o 'VERSION'` debe coincidir con `VERSION`.

---

**Referencias:**
- [#01](01-traefik-routing-and-spa-cache.md) — caché SPA y assets viejos en `serve`
- [#13](13-provecchio-missing-frontend-502.md) — contenedor frontend no iniciado
- `scripts/deploy-production.sh` — script de deploy
- `frontend/Dockerfile.prod` — build multi-stage con `serve`
