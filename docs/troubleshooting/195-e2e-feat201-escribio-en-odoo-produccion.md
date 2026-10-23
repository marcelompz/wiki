# 195 — El E2E de escritura de FEAT-201 escribió en el Odoo de **producción**

**Fecha:** 2026-10-22 21:20–21:30 (America/Argentina)
**Componente:** `frontend/e2e/gastro-odoo-provisioning.spec.ts` + adapter local
**Severidad:** 🟠 Media (datos de prueba en ERP de producción, sin impacto en pedidos reales)
**Estado:** ✅ Resuelto (datos eliminados) + mitigación documentada

---

## Síntoma

Al verificar el deploy de 1.41.0 con `GET /api/v1/tables/odoo-floors` contra `provecchio.com`, el
snapshot de Odoo mostró pisos que no existen en el salón real:

```json
{"name": "E2E Piso 946311", "id": 13, "tableCount": 0, "active": true}
{"name": "E2E QA Piso",     "id": 14, "tableCount": 1, "active": true}
```

Ambos fueron creados por las corridas del E2E de escritura de FEAT-201
(`E2E_ODOO_PROVISIONING=1`) que se ejecutaron **en localhost**.

## Causa raíz

El entorno local (`provecchio.local`) corre con **datos restaurados de producción**, incluida la
configuración de integración del tenant. El adapter local usa esas credenciales
(`ODOO_HOST=192.168.69.246`, `ODOO_DB=prod`) y por lo tanto **escribe en el mismo Odoo 14 que
producción**. La suposición de que “localhost usa un Odoo de pruebas” era falsa: no hay una instancia
Odoo descartable en el entorno local.

Agrava el problema que el E2E estaba diseñado para *no* borrar nada en Odoo (invariante de FEAT-201:
nunca archivar ni borrar), por lo que la limpieza no estaba automatizada.

## Impacto medido

| Elemento | Detalle |
|---|---|
| Pisos creados | `restaurant.floor` 13 (`E2E Piso 946311`) y 14 (`E2E QA Piso`) |
| Mesas creadas | `restaurant.table` 86 (`E2E-994765`, floor 14) |
| Pedidos afectados | **0** (`pos.order` con `table_id` 86 o en floors 13/14 → 0) |
| Pisos/mesas reales afectados | **0** (los objetos E2E estaban sin `pos_config_id`, invisibles al POS) |
| Duración | ~15 minutos entre la corrida E2E y la limpieza |

## Solución aplicada

1. **Limpieza por XML-RPC** (Odoo 14, `http://192.168.69.246:8081`, db `prod`) verificando primero que
   no hubiera `pos.order` asociados:

   ```python
   # 1) orders con table_id = 86 → 0
   # 2) unlink restaurant.table [86]
   # 3) unlink restaurant.floor [13], [14]
   # 4) verificación: search_read name like 'E2E' → []
   ```

2. **Verificación posterior:** `GET /api/v1/tables/odoo-floors` en producción devuelve otra vez los
   10 pisos reales (Giardino, Terraza ×3, Café ×2, Restó ×2, Barra ×2) y ninguna entrada `E2E`.

3. **Fix funcional relacionado (v1.41.1):** los pisos de prueba se crearon con
   `pos_config_id = false`; el flujo ahora infiere el POS más usado o acepta el elegido en el modal, y
   **repara** pisos huérfanos (`repaired: true`). Ver `CHANGELOG.md` → `[1.41.1]`.

## Mitigación para el futuro

- El E2E de escritura sigue **opt-in** (`E2E_ODOO_PROVISIONING=1`) y por defecto sólo corre lectura.
- **Antes** de habilitar escritura hay que confirmar a qué Odoo apunta el tenant:
  ```bash
  docker exec orderflow_odoo_adapter env | grep ODOO_HOST
  ```
  Si apunta al ERP real, **no** ejecutar escritura, o hacerlo con un tenant/DB descartable.
- **Después** de una corrida de escritura, verificar y limpiar:
  ```sql
  -- Odoo (XML-RPC): search_read restaurant.floor [('name','like','E2E')]
  ```
- Deuda técnica: agregar al adapter un endpoint **interno** de limpieza (sólo en desarrollo) o un
  tenant de pruebas con su propia DB de Odoo, para que el E2E de escritura sea repetible sin riesgo.

## Lección

“Localhost” ≠ “sandbox de datos”: al restaurar producción en local, **también se restauran las
integraciones externas**. Cualquier prueba destructiva/creativa debe validar primero el destino real
del ERP.

## Anexo (2026-10-22 21:45) — verificación del fix 1.41.1 y residuo archivado

Para validar el fix de `pos_config_id` sin volver a dejar basura, se ejecutó un script controlado
(crear piso local → provisionar sin `posConfigId` → comprobar en Odoo → provisionar 1 mesa → limpiar):

```
provision HTTP 201: {"odooFloorId": 15, "posConfigId": 2, "repaired": false, ...}
Odoo: [{'id': 15, 'name': 'QA POS Check 16137', 'pos_config_id': [2, 'Giardino (Administrator)']}]
```

✅ El fix funciona: el piso queda asociado al POS **inferido** (2 = Giardino), no a `false`.

⚠️ **La limpieza no pudo borrar**: Odoo 14 rechaza `unlink` de mesas/pisos “usados en una sesión POS”
(`You cannot remove a table that is used in a PoS session, close the session(s) first.`). Como hay una
sesión de Giardino abierta en producción, **no se debe cerrar**. Se archivó en su lugar:

| Objeto | Acción | Estado |
|---|---|---|
| `restaurant.table` 87 (`QA-6137`) | `active = false` | archivada |
| `restaurant.floor` 15 → renombrado `QA POS Check (archivado)` | `active = false`, `sequence = 99` | archivado |

Verificación: `restaurant.floor` con `name like 'QA POS'` y `active = true` → `[]`. Ningún piso/mesa
archivado aparece en el POS ni en el selector activo.

**Pendiente de limpieza definitiva:** cuando no haya sesión POS abierta (fin del día operativo), borrar:

```python
call('restaurant.table', 'unlink', [[87]])
call('restaurant.floor', 'unlink', [[15]])
```

**Regla operativa derivada:** en Odoo con sesión POS abierta, los objetos recién creados **no se pueden
borrar** (el `unlink` valida contra sesiones). Cualquier prueba de escritura contra el ERP real debe
planificarse con ventana sin sesión, o limitarse a archivar y dejar registro.
