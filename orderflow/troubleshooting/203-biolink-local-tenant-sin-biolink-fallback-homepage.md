# #203 — Homepage de `provecchio.local` muestra fallback de texto en vez del frontpage BioLink

> **Fecha:** 2026-10-26 · **Vertical:** OmniGastro / OmniBio (bio-links + homepage) · **Relacionados:** #97, #100, #107, #143, #167 · **Impacto:** homepage pública del tenant local sin contenido (solo fallback)

## Síntoma

Al abrir `https://provecchio.local/` (homepage = frontpage BioLink) se muestra solo texto plano:

```
PR
Provecchio Local
Powered by ⚡ OmniFlow (0% Comisión de Plataforma)
```

En producción (`provecchio.com`) el mismo frontpage funciona con todo el contenido (isotipo, WhatsApp, Menú digital…).

## Causa raíz

1. **Resolución de tenant por hostname:** el endpoint público `GET /api/v1/tenants/public/tenant-by-subdomain/:subdomain` matchea en OR: `{subdomain: completo}`, `{subdomain: primer segmento}`, `{id}`, `{customDomain}` (backend `tenants.controller.ts`). El hostname `provecchio.local` tiene match **exacto** contra el tenant field-test **`tid-provecchio-local` ("Provecchio Local", `subdomain='provecchio.local'`)**, no contra `provecchio-dimora-001` (subdomain `dimora`, customDomain `provecchio.com`) → el frontend (`public-biolink.tsx) consulta `GET /api/v1/bio/tenant/tid-provecchio-local`.
2. **El tenant field-test no tenía ninguna fila en `bio_links`** → la página pública renderiza su fallback (iniciales + nombre + Powered by) sin poder distinguir "no hay bio" de "bio vacío".
3. **Agravante: uploads faltantes en local** — el directorio `backend/uploads/social-catalog/provecchio-dimora-001/` estaba **vacío** (0 archivos), por lo que aunque el BioLink existiera, el avatar devolvía 404 (regla §9.1.11: los uploads no se sincronizan con git).

## Solución aplicada (2026-10-26 — datos, solo local, sin tocar código)

1. **Sincronizar uploads desde producción** (flujo estándar §3.1.2 deploy-to-local-first):
   ```bash
   rsync -a -e "ssh" root@192.168.69.240:/srv/orderflow/uploads/social-catalog/provecchio-dimora-001/ \
     /opt/orderflow/backend/uploads/social-catalog/provecchio-dimora-001/   # 43 archivos
   ```
2. **Clonar el BioLink para el tenant local** (la tabla `bio_links` solo tiene PK; **no** hay unique sobre `slug`):
   ```sql
   INSERT INTO bio_links (id, "tenantId", slug, title, bio, avatar_url, theme_color, text_color,
     button_style, meta_pixel_id, ga_measurement_id, tiktok_pixel_id, blocks, show_branding,
     is_active, created_at, updated_at)
   SELECT gen_random_uuid()::text, 'tid-provecchio-local', 'provecchio-local', title, bio,
     avatar_url, theme_color, text_color, button_style, meta_pixel_id, ga_measurement_id,
     tiktok_pixel_id, blocks, show_branding, true, now(), now()
   FROM bio_links WHERE "tenantId" = 'provecchio-dimora-001';
   ```
   Se usó una `slug` **distinta** (`provecchio-local`) para no crear ambigüedad en el endpoint público `GET /bio/:slug` (que resuelve por slug sin tenant).
3. **Verificación:**
   ```bash
   curl -sk https://provecchio.local/api/v1/tenants/public/tenant-by-subdomain/provecchio.local
   #  → tid-provecchio-local
   curl -sk https://provecchio.local/api/v1/bio/tenant/tid-provecchio-local          # → 200 con blocks
   curl -sk -o /dev/null -w "%{http_code}" https://provecchio.local/api/v1/uploads/...\jpg  # → 200
   ```

## Prevención / Lecciones

1. Todo **tenant creado para field-testing en local** debe llevar su fila `bio_links` (aunque sea mínima) para que `/` no degenere en el fallback — el fallback de `public-biolink.tsx` es válido pero ambiguo ("¿no hay bio?" = "¿bio vacío?").
2. Los **uploads nunca viajan por git**: ante síntomas de imágenes rotas en homepage/biolinks, verificar primero `ls backend/uploads/social-catalog/<tenantId>/` y sincronizar desde el ambiente fuente (§9.1.11).
3. La resolución de tenant por hostname es **match-exacto primero**: para probar localmente un tenant específico, o se le asigna el subdominio `.local` correspondiente (con su bio), o se neutraliza el tenant field-test — no mezclar.
4. Tablas curadas con datos de producción → `rsync` de binarios (uploads) + `INSERT` de filas de configuración; nunca asumir que la configuración existe solo porque el tenant existe.
