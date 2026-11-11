# Troubleshooting #166 — Versión desplegada en Provecchio queda vieja tras deploy

- **Fecha:** 2026-09-29
- **Área:** Deploy / Frontend / Backend / Versiones
- **Síntoma:** En producción se sigue mostrando `OmniFlow v1.36.5` o `1.36.6` aunque el repo local ya está en `1.37.1`.
- **Causa raíz:** El build de las imágenes Docker se ejecutó mientras el archivo `VERSION` aún tenía el valor anterior. El build copia `/app/VERSION` dentro de la imagen, por lo que aunque después se actualice `VERSION`, la imagen ya compilada sigue con la versión vieja.
- **Reproducción:**
  1. Modificar `VERSION`, `backend/package.json`, `frontend/package.json`, `backend/src/main.ts`.
  2. Hacer deploy sin rebuild de imágenes.
  3. El contenedor sirve la versión anterior aunque el código fuente ya cambió.
- **Solución aplicada:**
  1. Asegurar que `VERSION` esté actualizado antes de cualquier build.
  2. Hacer rebuild explícito de backend y frontend con `docker compose build --no-cache`.
  3. Forzar recreate de contenedores para que levanten la nueva imagen.
- **Archivos afectados:**
  - `VERSION`
  - `backend/package.json`
  - `frontend/package.json`
  - `backend/src/main.ts`
  - `scripts/deploy-production.sh`
  - `scripts/pre-deploy-diagnostic.sh`

## Prevención

El script `scripts/pre-deploy-diagnostic.sh` ahora compara la versión local contra la versión desplegada en el host remoto. Si difieren, emite advertencia antes de permitir el deploy.
