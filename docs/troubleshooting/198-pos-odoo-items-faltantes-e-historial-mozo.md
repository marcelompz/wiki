# 198 — Ítems que desaparecen del POS de Odoo y pérdida del historial en el Mozo POS

**Fecha:** 2026-10-23 10:05 (America/Argentina)
**Componentes:** Odoo 14 (`available_in_pos`) + addon `pos_omniflow_sync` + `frontend/src/pages/admin/gastro-pos.tsx`
**Severidad:** 🟠 Media (pedidos incompletos en el ERP y pérdida de contexto para el mozo)
**Estado:** ✅ Resuelto (v1.41.4)

---

## Síntoma 1 — Falta un ítem en el POS de Odoo

Pedido de OrderFlow con 3 ítems (`Chai latte`, `Cappuccino`, `Moscow mule`, total 82.000).
En Odoo el `pos.order` mostraba sólo 2 (`Chai latte`, `Cappuccino`, total 52.000).

## Causa raíz 1

El producto `product.product` **1748 — Moscow mule** tenía:

```
available_in_pos = False
pos_categ_id     = False
```

El POS de Odoo **descarta silenciosamente** las líneas de productos que no están habilitados
para POS al cargar/guardar el pedido (`pos.order` → `_load_server_data`). El sync había creado
las 3 líneas correctamente; la POS las redujo a 2 al guardar.

Alcance real: **123 productos de menú** en la misma situación:

| Categoría de producto | Productos sin POS | POS category asignada |
|---|---|---|
| `Para beber` (9) | 36 | 16 — Para beber |
| `Para comer` (11) | 87 | 17 — Para comer |

Los 39 restantes son insumos/expensas (`All`, `All / Expenses`, `Discount`) y **no** deben
habilitarse en POS.

## Solución 1

1. **Backfill** vía XML-RPC: `available_in_pos=True` + `pos_categ_id` (16/17) a los 123 productos.
2. **Addon `pos_omniflow_sync` v14.0.1.3.0** (defensivo): al sincronizar una línea, si el producto
   no está disponible en POS se habilita automáticamente y se registra un warning:
   ```python
   if not product.available_in_pos:
       product.write({'available_in_pos': True})
   ```
3. **Reparación del pedido 32061:** se creó la línea faltante (`Moscow mule` 1×30.000) y se
   recalcularon los totales a 82.000.

> El POS que ya tenía el pedido abierto debe **refrescarse** (F5) para volver a cargar las 3 líneas
> desde el servidor; de lo contrario su memoria puede volver a guardar 2.

## Síntoma 2 — El mozo no ve el historial del pedido

Después de cerrar la mesa, el Mozo POS (`/admin/gastro/pos`) mostraba «No hay pedido activo en
esta mesa» y no había forma de ver los ítems enviados a cocina.

## Causa raíz 2

La vista consulta sólo estados activos:

```
GET /api/v1/orders?tableId=<id>&status=DRAFT,CONFIRMED,PREPARING,READY&limit=1
```

Al cerrar la mesa el pedido pasa a `DELIVERED` (y `closedAt` queda en `metadata.guestDraft`).
El pedido **no se pierde**: `GET /api/v1/orders/guest/history` lo devuelve y la pestaña «Atendidos»
del panel Gastro lo muestra. Pero el POS por mesa no lo cargaba, y el detalle regular no expone
`meta.closedAt`, así que la UI tampoco podía marcarlo como cerrado.

## Solución 2

En `gastro-pos.tsx`:

- Si no hay pedido activo y la mesa está `FREE`, se consulta el último pedido de la mesa
  (`GET /api/v1/orders?tableId=<id>&limit=1`) y se muestra en **modo lectura**.
- `isClosed` ahora también se deriva del estado:
  `DELIVERED | CANCELLED | COMPLETED` → sólo lectura (tag «Cerrado»).
- Se bloquea agregar/editar líneas y las acciones de envío a cocina/cierre sobre pedidos cerrados.

## Verificación

| Check | Resultado |
|---|---|
| Productos de menú sin POS | 0 (de 123) |
| `Moscow mule` | `available_in_pos=True`, `pos_categ_id=16` |
| Pedido 32061 en Odoo | 3 líneas · total 82.000 · `uid=32061-002-1598` |
| Módulo Odoo | `14.0.1.3.0` instalado |
| Mozo POS (mesa G3 cerrada) | muestra las 3 líneas en modo lectura, tag «Cerrado» |
| Mozo POS (mesa libre sin historial) | sigue mostrando «No hay pedido activo» |

## Lecciones

- `available_in_pos=False` es un fallo **silencioso**: el pedido se crea bien y se pierde al
  guardarse en el POS. Cualquier alta masiva de productos debe setear el flag y `pos_categ_id`.
- El historial de una mesa no debe depender de los estados «activos»: el cierre es un cambio de
  estado, no un borrado.
- Los flags de POS viven en `product.template`; al importar catálogos hay que incluirlos
  explícitamente (el import de ejemplo de `deploy-manager` ya trae la columna `available_in_pos`).

## Referencias

- `odoo-adapter/odoo-addons/pos_omniflow_sync/controllers/main.py`
- `frontend/src/pages/admin/gastro-pos.tsx`
- `docs/troubleshooting/197-odoo-pos-reference-incompatible-caja.md`

## ⚠️ Nota crítica: el POS mantiene el pedido en memoria

La reparación de datos no alcanza si el pedido estaba abierto en el POS de Odoo. El
frontend del POS guarda su propia copia del pedido y, ante cualquier interacción, la
reescribe completa (`sync_from_ui`), **borrando las líneas agregadas desde el servidor**.

Caso real (2026-10-23): el pedido 32061 se reparó a 3 líneas y, minutos después, el POS
lo volvió a guardar con 2 (nuevas líneas `create_date`, sin Moscow mule). Se reparó de
nuevo a las 14:46.

**Protocolo obligatorio tras reparar un pedido en Odoo:**

1. En la tablet/PC del POS, **recargar la pantalla (F5)** o cerrar y volver a abrir el POS.
2. Verificar que el pedido muestre las 3 líneas antes de agregar notas, cambiar mesa o cobrar.
3. Recién entonces operar normalmente.

Si el POS vuelve a guardar sin recargar, la línea desaparece otra vez (no es un fallo del
sync ni del addon).
