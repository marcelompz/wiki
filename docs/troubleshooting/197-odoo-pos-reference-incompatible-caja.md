# 197 — El addon `pos_omniflow_sync` rompía la apertura de caja del POS de Odoo

**Fecha:** 2026-10-23 09:45 (America/Argentina)
**Componente:** `pos_omniflow_sync` (addon Odoo 14) + `pos_restaurant.get_table_draft_orders`
**Severidad:** 🔴 Alta (la caja del POS no abre mientras exista el pedido)
**Estado:** ✅ Resuelto (hotfix de datos + addon v14.0.1.2.0 desplegado)

---

## Síntoma

Al abrir la caja (o seleccionar una mesa) en el POS de Odoo, el servidor devuelve:

```
File ".../pos_restaurant/models/pos_order.py", line 167, in get_table_draft_orders
    order["uid"] = search(r"\d{5,}-\d{3,}-\d{4,}", order["pos_reference"] or "").group(0) ...
AttributeError: 'NoneType' object has no attribute 'group'
```

La caja queda inutilizable hasta eliminar o corregir el pedido.

## Causa raíz

`pos_restaurant` (Odoo 14) parsea `pos_reference` **sin comprobar el resultado**:

```python
order['uid'] = search(r"\d{5,}-\d{3,}-\d{4,}", order['pos_reference']).group(0)
```

El addon `pos_omniflow_sync` creaba los pedidos con:

```python
pos_reference = 'OmniFlow-%s' % order_uuid   # p. ej. OmniFlow-26255b17-6921-...
```

Ese texto no matchea el patrón → `search()` devuelve `None` → `.group(0)` → `AttributeError`.
Odoo evalúa **todos** los borradores con mesa, así que un solo pedido rompe la caja de todo el POS.

> Este fallo ya estaba documentado en `docs/troubleshooting/odoo-pos-regex-error.md`
> (identificado 2026-10-15, "fix pendiente"). Nunca se había implementado en el addon.

## Diagnóstico

```python
# 1 pedido en draft con mesa, con pos_reference inválido
{'id': 32061, 'pos_reference': 'OmniFlow-26255b17-6921-4eaf-8656-89572638de1e',
 'table_id': [75, 'G3'], 'session_id': [1598, 'POS/01598'], 'state': 'draft'}
```

## Solución aplicada

### 1. Hotfix de datos (inmediato)

Se normalizó el `pos_reference` del pedido afectado al formato de Odoo:

```
OmniFlow-26255b17-6921-4eaf-8656-89572638de1e  →  Order 32061-002-1598
```

Validación con la firma real del método (recibe `table_id`, no `session_id`):

```python
get_table_draft_orders(75)
# -> [{'uid': '32061-002-1598', 'name': 'Order 32061-002-1598', 'server_id': 32061}]
```

### 2. Fix definitivo del addon (`pos_omniflow_sync` v14.0.1.2.0)

| Cambio | Detalle |
|---|---|
| Campo nuevo `pos.order.omniflow_order_ref` | Guarda el UUID externo (idempotencia) sin contaminar `pos_reference`. |
| `pos_reference` compatible | Se genera `Order %05d-%03d-%04d` (id del pedido, config POS, sesión) → cumple `\d{5,}-\d{3,}-\d{4,}`. |
| Idempotencia | `sync_table_order` y `transfer_table_order` buscan por `omniflow_order_ref` (con fallback a `pos_reference` legacy y al borrador de la mesa). |
| Saneo defensivo | `_ensure_compatible_reference()` normaliza sobre la marcha cualquier pedido heredado con referencia inválida. |

### 3. Despliegue

```bash
# backup: /opt/odoo/backups/pos_omniflow_sync_20261023_095154.tar.gz
tar czf - --exclude=__pycache__ . | ssh root@192.168.69.246 \
  'tar xzf - -C /opt/odoo/addons/pos_omniflow_sync'

docker exec odoo_web_8081 odoo -c /etc/odoo/odoo.conf -d prod \
  -u pos_omniflow_sync --stop-after-init --no-http
docker restart odoo_web_8081
```

> El path del addon en el contenedor es `/mnt/extra-addons-customize/pos_omniflow_sync`
> (mount de `/opt/odoo/addons`). El `find` de limpieza del script `deploy-odoo-addon.sh`
> apunta a `/opt/odoo/addons` dentro del contenedor y **no existe**: es inofensivo
> (`|| true`) pero no limpia nada.

## Verificación

| Check | Resultado |
|---|---|
| Módulo Odoo | `pos_omniflow_sync` `installed` · `latest_version=14.0.1.2.0` |
| Campo | `pos.order.fields_get().omniflow_order_ref` → `char` |
| Borradores con mesa | 1 (pedido 32061) con `Order 32061-002-1598` |
| `get_table_draft_orders(75)` | OK, devuelve `uid=32061-002-1598` |
| Contrato (`test-pos-order-contract.js`) | Caso C: `pos_reference` compatible + idempotencia por `omniflow_order_ref` OK |
| Residuos de prueba | 0 (`Order 202610%` / `OmniFlow%` sin registros) |

## Lecciones

- **Nunca** usar campos que Odoo parsea con regex para guardar identificadores propios.
  El UUID externo debe vivir en un campo dedicado (`omniflow_order_ref`).
- El script `deploy-odoo-addon.sh` sólo copia y reinicia: **no ejecuta `-u`**. Cualquier
  cambio de modelo (campo nuevo) requiere el upgrade explícito que se documenta arriba.
- Este caso es la contraparte Odoo del incidente #195: una integración que escribe en el
  ERP puede romper la operación diaria (caja) con un solo registro mal formado.

## Referencias

- `odoo-adapter/odoo-addons/pos_omniflow_sync/controllers/main.py`
- `odoo-adapter/odoo-addons/pos_omniflow_sync/models/pos_omniflow_sync.py`
- `odoo-adapter/test-pos-order-contract.js`
- `docs/troubleshooting/odoo-pos-regex-error.md` (diagnóstico previo)
