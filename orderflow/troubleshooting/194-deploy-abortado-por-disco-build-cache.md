# 194 — Deploy abortado por disco: 4.8 G libres y 16.87 GB de build cache que "no se puede reclamar"

**Fecha:** 2026-10-22
**Componente:** `scripts/pre-deploy-diagnostic.sh` / Docker en Hetzner (`/var/lib/docker`)
**Estado:** ✅ Mitigado (ver pendiente estructural)

## Síntoma

`./scripts/deploy-production.sh production` aborta antes de construir:

```
🔍 Docker storage (/var/lib/docker) space... FAIL: Only  4.8G available (need >= 5G)
🔍 OrderFlow directory (/srv/orderflow) space... FAIL: Only  4.8G available (need >= 5G)
❌ CRITICAL: 2 check(s) failed
```

A la vez, `docker system df` reportaba:

```
Build Cache     119       119       16.86GB   0B
```

Es decir: 16.86 GB ocupados por caché de BuildKit pero **0 B reclamables**, por lo que
`docker builder prune -af` responde `Total: 0B`.

## Causa

1. El host de Hetzner comparte disco con otros servicios (Axon) y `/` es de 38 G; el umbral del
   diagnóstico (5 G) es deliberado para no llenar el disco durante el build.
2. El caché de BuildKit se marca como "in use" cuando las capas están referenciadas por imágenes
   existentes; `docker builder prune` (sin `--all`) no las libera y, aun con `--all`, el builder
   puede reportar 0 B si el cache está asociado a un builder distinto al activo.

## Solución aplicada (2026-10-22)

```bash
ssh root@178.105.226.175 'docker buildx prune -af; docker image prune -af; df -h /'
```

`docker image prune -af` liberó **3.235 GB** (imágenes viejas sin contenedores asociados) y dejó el
host en **7.8 G libres**, suficiente para pasar el umbral de 5 G y completar el build.

## Pendiente estructural

- El build cache de 16.86 GB sigue ocupando espacio. Conviene recrear el builder
  (`docker buildx rm <builder>` + `docker buildx create --use`) en una ventana de mantenimiento para
  recuperarlo.
- Alternativa: mover `/var/lib/docker` a un volumen mayor o añadir disco al host.
- El deploy elimina los contenedores **antes** del build; si el build falla por disco el sitio queda
  en 502. Conviene mover la limpieza de contenedores a después del build exitoso (mejora pendiente
  del script, no aplicada todavía para no cambiar el flujo en caliente).
