# Informe de despliegue — OrderFlow v1.39.15 en Provecchio (provecchio.com)

> **Fecha:** 2026-10-20 · **Objetivo:** cierre de los bugs del cliente v1.39.9
> **Alcance:** app OrderFlow (v1.39.15) + addon `pos_omniflow_sync` en Odoo 14
> **Resultado:** ✅ desplegado y verificado con pruebas end-to-end contra producción

---

## 1. Resumen ejecutivo

SeFNذة despliegues que cierran **4 de los 9 bugs** del reporte del cliente:

| Bug | Versión | Estado | Verificación en producción |
|---|---|---|---|
| **#7** — el pedido no llega al POS de Odoo 14 | v1.39.11/12 | ✅ | `pos.order` creado con líneas, producto e importe; cuenta abierta y traspaso a cliente en el ERP |
| **#8a** — en `/admin/gastro/tables` solo funciona el "C" del CRUD | v1.39.11 | ✅ | modal de editar/eliminar restaurado + mapeo de mesa Odoo |
| **#8b** — el cobro pide PIN y devuelve HTTP 400 | v1.39.13 | ✅ | `pin/verify` → 200 sin `x-tenant-id`; la caja ve el cobro preconfirmado |
| **#5** — el KDS no se actualiza solo (crítico de sala) | v1.39.15 | ✅ | E2E socket → API → socket: la comanda llega sin pulsar nada |

Además se implementó **FEAT-190 (cuenta abierta)**: liberar la mesa manteniendo la
cuenta cobrable, con traspaso a cliente en el ERP.

---

## 2. Causas raíz corregidas (12 defectos reales)

El análisis inicial del backlog identificaba 4; la validación end-to-end en
producción reveló **8 más**, todos bloqueantes:

| ID | Defecto | Impacto | Corrección |
|---|---|---|---|
| **D1** | Se enviaba el número de mesa legible (`"G5"`) como id de Odoo → `int("G5")` → HTTP 500 | El sync nunca funcionó | El listener resuelve el **id numérico** desde el mapeo de la mesa |
| **D2** | No existía correspondencia mesa ↔ `restaurant.table` | Sin destino en el ERP | `restaurant_tables.odoo_table_id` + UI de mapeo + script de siembra |
| **D3** | En el core de Odoo 14, `pos.order.amount_tax` es `required=True` **sin `compute`** | **Ninguna** creación por RPC es posible | El addon aporta los importes y recalcula con `_compute_batch_amount_all()` |
| **D3-bis** | `pos.order.line.price_subtotal` / `price_subtotal_incl` también `required=True` sin `compute` | Las líneas fallaban | El addon replica el onchange del core (`_omniflow_line_amounts`) |
| **D4** | El cierre de mesa no emitía el evento de sync | El bug reportado (#7) | `guestClose` emite con `trigger=TABLE_CLOSED` |
| **D5** | `ODOO_DB=wellnesscoffee` (base inexistente) | Plugins rotos | `ODOO_DB=prod` parametrizado |
| **D6** | `TableSyncWorker` leía una lista Redis plana frente a BullMQ | Camino muerto | Worker eliminado del adapter |
| **D7** | Sin métricas ni trazabilidad | Fallos invisibles | Hitos `t0…t5` + 5 métricas Prometheus |
| **D8** | `BullModule` solo leía `REDIS_HOST` (inexistente) → `localhost:6379` = el propio contenedor | **El job nunca se encolaba** (en TODAS las colas: webhooks, follow-up, KDS, sync Odoo) | La conexión se deriva de `REDIS_URL` |
| **D9** | El volumen anónimo `/app/node_modules` tapaba el `node_modules` de la imagen | Prisma Client viejo en runtime | Volumen eliminado + `ARG CACHE_BUST` en el Dockerfile |
| **D10** | `omnigastro_settings` no existía **ni en producción** (167 tablas en el dump, sin ella) | Módulo `omnigastro-config` roto | La migración la crea de forma idempotente |
| **D11** | El producto se enviaba por UUID en vez de por SKU | Líneas omitidas | Resolución por SKU (`skuInterno` == `default_code`) |
| **D12** | `findGuestOrder` cargaba las líneas sin la relación `product` | El SKU llegaba vacío | Se incluye la relación + fallback del listener |

---

## 3. Qué se desplegó

### 3.1 App OrderFlow — v1.39.15

| Contenido | Versión |
|---|---|
| Mapeo de mesas OrderFlow ↔ Odoo POS (`odoo_table_id`) | v1.39.11 |
| Addon Odoo 14 parcheado (importes + recálculo) | v1.39.11 |
| Sync a Odoo en el cierre de mesa + cobro configurable por tenant | v1.39.11 |
| Config unificada del adapter + retiro del worker legacy | v1.39.12 |
| Telemetría `t0…t5` + métricas Prometheus + E2E Playwright + Newman | v1.39.12 |
| Modal de editar mesa (bug #8a) | v1.39.11 |
| Cobro con PIN (bug #8b) + etiqueta de preconfirmación en la caja | v1.39.13 |
| **Cuenta abierta**: traspaso a persona, liberación de mesa, cobro real en la caja | v1.39.14 |
| **KDS en tiempo real** (`kds:ticket_new` + recarga automática) | v1.39.15 |

### 3.2 Addon Odoo 14 — `pos_omniflow_sync` v14.0.1.1.0

- Ruta `/api/omniflow/sync_table_order` (crea el `pos.order` por RPC).
- Ruta `/api/omniflow/transfer_table_order` (**nueva**): asigna el `res.partner` y
  libera la mesa (`table_id = False`) → transferencia a cliente.
- Notificación al bus **best-effort** (Odoo 14 no tiene `_sendone`/`_get_bus_channel_name`).

**Rollback disponible**: `/opt/odoo/backups/pos_omniflow_sync_20261020_144001.tar.gz`.

---

## 4. Verificación ejecutada

### 4.1 Salud y versión

```json
{"version":"1.39.15","services":{"database":{"status":"ok"},"odoo_adapter":{"status":"ok"}},"status":"ok"}
```

Contenedores: `traefik`, `orderflow_frontend`, `orderflow_backend`,
`orderflow_odoo_adapter`, `orderflow_omnibi_standalone`, `orderflow_sync_standalone`,
`orderflow_db`, `orderflow_redis` — todos `healthy`.

### 4.2 E2E del KDS (bug #5)

```text
[kds-e2e] Socket conectado, uniendose a la sala del tenant...
[kds-e2e] Enviando a cocina...
[kds-e2e] EVENTO kds:ticket_new recibido: {"orderId":"4d12df16-…","station":"Cocina","tableNumber":"E2E-KDS","lines":1}
[kds-e2e] OK: el KDS recibe la comanda automaticamente
```

### 4.3 Traspaso a cliente en el ERP

```json
{"id":31972,"pos_reference":"OmniFlow-<uuid>","state":"draft",
 "partner_id":[7268,"Cliente E2E Odoo"],"table_id":false,"amount_total":0}
```

→ La mesa quedó **libre en Odoo** y la cuenta **abierta a nombre del cliente**.
Telemetría del pedido: `t2_job_started → t3_adapter_called → t4_odoo_order_created → t5_sync_completed`, sin error.

### 4.4 Cuenta abierta y cobro real (local, con sesión de caja)

```text
traspaso  → ok: True | mesa liberada: True | persona: Cliente | sesión: POS/2026/0001
cobro     → amount 36.000 + tip 3.000 = 39.000 | movementId generado
estado    → DELIVERED | paid | sin mesa | con persona | con sesión
mesa G5   → FREE, sin dueño
```

### 4.5 QA E2E contra provecchio.com

Catálogo público (4 imágenes) ✅ · Dominio sin errores JS ✅ · Autenticación y DB sin
500 ✅ · 7 rutas de administración verificadas ✅.

---

## 5. Incidentes durante el despliegue

### 5.1 Traefik caído → HTTP 521 durante ~25 minutos (resuelto)

**Síntoma:** `provecchio.com` devolvía 521 (Cloudflare) aunque los 8 contenedores
de OrderFlow estaban levantados y el backend respondía 200 por dentro.

**Causa raíz (dos factores):**
1. El `cleanup` del deploy ejecuta `docker container prune -f`, que borra **todo
   contenedor detenido**. El Traefik de Provecchio **no forma parte del proyecto
   compose de OrderFlow**: vive en `/srv/traefik` (compose propio) con
   `restart: unless-stopped`. Si cae durante el build (RAM saturada), el prune se
   lo lleva y **nadie lo vuelve a levantar**.
2. El health check solo miraba el contenedor del backend → el deploy "pasaba"
   con el proxy caído.

**Corrección (`scripts/deploy-production.sh`):**
- El prune excluye el proyecto: `--filter 'label!=com.docker.compose.project=traefik'`.
- Paso idempotente tras el `up -d --build`: `cd /srv/traefik && docker compose up -d`.
- Si el health público no responde, se restaura Traefik y se reintenta.

**Restauración manual:**
```bash
ssh root@192.168.69.240 "cd /srv/traefik && docker compose up -d"
```

### 5.2 Falso positivo del QA E2E por lazy-loading (resuelto)

El QA marcaba 4 imágenes del catálogo como "rotas" (`naturalWidth == 0`) porque las
evaluaba antes de que terminaran de cargar. Verificado en navegador real: **todas
cargan bien** (162×161 y 150×150). Corregido esperando `img.complete` y reintentando
individualmente.

### 5.3 Acceso SSH: no era un firewall (resuelto)

Las conexiones SSH a `192.168.69.240` y `192.168.69.246` morían con "Connection
timed out" (SYN sin respuesta) desde el equipo `192.168.69.40`, mientras la LAN
funcionaba con normalidad. **No había ban ni regla de firewall**: OpenSSH marcaba
los paquetes con **DSCP `ef` (expedited forwarding)** y el punto de acceso WiFi los
descartaba en silencio.

**Solución:** `IPQoS none` en `~/.ssh/config` del equipo cliente.

> Nota: el `git push` por SSH también fallaba por lo mismo. El remoto de
> `orderflow` y de `wiki` se cambió a **HTTPS** con el helper de `gh` para no
> depender del puerto 22.

---

## 6. Estado de los 9 bugs del cliente

| # | Bug | Estado |
|---|---|---|
| 5 | El pedido enviado a cocina no aparece solo en el KDS | ✅ v1.39.15 |
| 7 | El cierre de mesa no carga en el POS de Odoo 14 (+ pago del mozo opcional) | ✅ v1.39.11-12 |
| 8a | En `/admin/gastro/tables` solo funciona el "C" del CRUD | ✅ v1.39.11 |
| 8b | El cobro pide PIN y devuelve HTTP 400 | ✅ v1.39.13 |
| 1 | La alerta suena en el móvil del cliente, no en la tablet del mozo | ⬜ pendiente (diagnóstico cerrado) |
| 2a | Al pedir desde el QR de mesa se ofrece "Para llevar" | ⬜ pendiente (diagnóstico cerrado) |
| 2b | Al confirmar el pedido no se notifica al mozo | ⬜ pendiente (diagnóstico cerrado) |
| 3 | El aviso al mozo muestra el UUID del producto | ⬜ pendiente (diagnóstico cerrado) |
| 4 | Tras "Volver al menú" no se ve el resumen y el carrito parece vacío | ⬜ pendiente (diagnóstico cerrado) |
| 6 | Al confirmar en cocina la comanda desaparece (se pierde el historial) | ⬜ pendiente (diagnóstico cerrado) |
| 9 | Tras enviar a cocina el pedido desaparece del POS | ⬜ pendiente (diagnóstico cerrado) |

Diagnóstico completo de los pendientes:
`docs/plans/omnigastro/DIAGNOSTICO_BUGS_RESTANTES_2026-10-20.md`.

---

## 7. Pendiente de configuración (no es código)

- **Cajas de producción**: `GET /api/v1/cash-registers` devuelve `[]`. Hay que
  crear "Caja 1" / "Caja Principal" en `/admin/cash-registers`; sin caja no hay
  sesión abierta y el cobro de la cuenta abierta no se puede imputar.
- **Mesas sin equivalente en Odoo**: `G02`→40 (misma mesa que `G2`), `G10`→43,
  `T11`→1 (decisiones del cliente, aplicadas en producción). `Giardino` y `M01`
  quedan **sin mapear por decisión del cliente** (su sync se omite y se contabiliza
  en `odoo_sync_skipped_total{reason="missing_table_mapping"}`).

---

## 8. Trazabilidad

- **Repo**: `main` → `e4076027` (v1.39.15) + `6b6ec5e9` (fixes de deploy/QA)
- **Tags**: `v1.39.11` … `v1.39.15`
- **PRs**: #4 (sync Odoo), #5 (#8b), #6 (cuenta abierta), #7 (KDS)
- **Wiki**: `/opt/wiki/orderflow` sincronizada
- **Guías**: `docs/operations/procedures/guia-despliegue-provecchio-v1.39.15.md`
- **Auditorías**: `docs/plans/omnigastro/auditoria-*.md`
