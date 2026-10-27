# Auditoría: conector `pos_omniflow_sync` (OmniGastro → Odoo POS)

> **Fecha:** 2026-10-26 · **Base:** `docs/info/Informe_estado_conector_pos_omniflow_sync(Odoo).md`
> **Alcance:** verificación claim-por-claim del informe contra el código real completo del monorepo (addon, adapter, backend NestJS, Traefik, featurelist y troubleshooting).
> **Estado de la auditoría:** solo lectura. No se modificó código ni configuración.

---

## 1. Veredicto ejecutivo

El informe audita **copias desactualizadas** del addon y le faltaba el 80% del sistema (backend, adapter, featurelist). Su diagnóstico sobre las copias es **correcto**, pero el estado real del conector es más avanzado:

1. El addon canónico versionado en el repo es **14.0.1.5.0** (`odoo-adapter/odoo-addons/pos_omniflow_sync/`), 4 revisiones por encima de la 14.0.1.1.0 que el informe tomó como "la más completa".
2. De las 6 recomendaciones de resolución del informe, **3 ya están implementadas** (idempotencia por cuenta, separar la clave externa de `pos_reference`, rechazar escrituras sobre pedidos pagados — en el flujo de Cuentas/Bills).
3. **~5 hallazgos del informe siguen vigentes** incluso en 14.0.1.5.0 (duplicación de líneas por reintento en `sync_table_order`, búsqueda sin filtro de estado, traspaso a cliente con fallback débil, `sudo()` sin aislamiento de compañía, falta de addon 19).
4. La auditoría detecta **riesgos de despliegue que el informe no vio**: copias huérfanas del addon Reproducción en varias rutas, directorios `/opt/odoo-deploy/{14,18}/modules/` vacíos, y la posibilidad de que el contenedor productivo de Odoo 14 corra una versión detrás del repo.

---

## 2. Inventario real (corregido respecto al informe)

| Copia | Versión | Estado tras auditoría |
| --- | --- | --- |
| `odoo-adapter/odoo-addons/pos_omniflow_sync/` | **14.0.1.5.0** | ✅ **Canónico y actual.** FEAT-190 + #197 (`omniflow_order_ref`) + #198 (`available_in_pos`) + FEAT-205 (`sync_bill`) + FEAT-206 (`transfer_table_to_table`, purga de borradores duplicados en MERGED) |
| `/opt/odoo-addons/14.0/pos_omniflow_sync` | 14.0.1.0.0 | ⚠️ Stale (base sin arreglos). Todas las diferencias vs canónico confirmadas |
| `/opt/odoo-addons/14.0/pos_omniflow_sync-14.0.1.1.0/` | 14.0.1.1.0 | ⚠️ Stale (salvo FEAT-184/185/190) |
| `/opt/odoo-addons/18.0/pos_omniflow_sync` | 18.0.1.0.0 | ⚠️ Stale; funcionalmente inutilizable (ver §4) |
| `/opt/odoo-addons/18/18.0/pos_omniflow_sync` | 18.0.1.0.0 | ⚠️ Igual al anterior |
| `/opt/odoo-addons/pos_omniflow_sync` | 18.0.1.0.0 | ⚠️ Variante con `pos_reference` sintético 5-3-4 generado desde dígitos del UUID (no reversible, no se busca → sin idempotencia). Informe correcto |
| `/opt/odoo-deploy/14/modules/` y `/opt/odoo-deploy/18/modules/` | — | 🔴 **Directorios VACÍOS** (sin `__manifest__.py`, sin archivos, timestamps 30-sep / 10-oct). Si algún compose los monta como addons-path, Odoo no puede cargar el módulo |
| `dist/odoo-addons/pos_omniflow_sync-14.0.1.1.0.tar.gz` | 14.0.1.1.0 | ⚠️ Artefacto de release viejo (22-oct), 4 versiones detrás |
| Contenido real de producción | ? | ⏳ Hotfix inline en contenedor `odoo_web_8081` (192.168.69.246, `/opt/odoo/addons/`, troubleshooting #197 `#202`) — **hay que confirmar la versión efectiva en el contenedor** |
| Addon 19.0 (`pos_omniflow_sync`) | inexistente | ✅ El informe tiene razón. Nota: `/opt/orderflow/odoo-addons/{v14,v18,v19}/orderflow_integration` sí tiene 19, pero ese es el addon de integración general (facturación/stock), **no** el sync POS |

**Cadena de versiones reconstruida desde featurelist.json + troubleshooting (el informe la desconocía):**

```
1.0.0 base
1.1.0  FEAT-190  transfer_table_order (cuenta abierta)
1.2.0  #197      omniflow_order_ref indexado + pos_reference compatible 5-3-4
1.3.0  #198      auto-reparación available_in_pos
1.4.0  FEAT-205  sync_bill (upsert por omniflow_bill_ref, POS_ORDER_LOCKED)
1.5.0  FEAT-206  transfer_table_to_table (mover/fusionar mesas) + limpieza MERGED
```

---

## 3. Verificación claim-por-claim del informe

| # | Afirmación del informe | Resultado | Evidencia |
| --- | --- | --- | --- |
| 1 | Las líneas se duplican al reintentar (siempre `[(0,0,…)]`) | ✅ **VIGENTE en 14.0.1.5.0** para `sync_table_order` (ruta KITCHEN y cierre PER_ORDER). Resuelto a nivel cuenta por `sync_bill` (reemplazo `(5,0,0)`) | `controllers/main.py:334-359` vs `:507-535` |
| 2 | Segundo pedido en la misma mesa cae al draft de A y duplica al reintentar | ✅ **VIGENTE** en el flujo sin Bill: fallback por `session+table+draft` encuentra el draft de A y el ref de B nunca se guarda | `main.py:295-300, 326-327` |
| 3 | `OmniFlow-unknown` colisiona al faltar `order_uuid` | ⚠️ **CADUCO para la cadena real.** El adapter exige `order_uuid` (400 si falta) y el backend siempre manda `Order.id` / `Bill.id`. Solo aplica a las copias stale invocadas a mano | `odoo-adapter/src/index.js:827-829`, `processor.ts:55-61` |
| 4 | Búsqueda por referencia no filtra estado → puede escribirse sobre pedido pagado | ✅ **VIGENTE en `sync_table_order`** (busca por `omniflow_order_ref` sin `state='draft'`). Resuelto en `sync_bill` (`POS_ORDER_LOCKED`) | `main.py:292-294` vs `:461-467` |
| 5 | `external_order_ref[-6:]` colisiona / formato 5-3-4 no reversible | ✅ Confirmado en las copias stale; **resuelto en canónico** (`pos_reference` sintético solo para el parser del core, clave real en `omniflow_order_ref`) | comparativa `/opt/odoo-addons/18.0` vs `/opt/odoo-addons/pos_omniflow_sync`, `main.py:16-33` |
| 6 | `pos_reference` choca con core; parche FEAT-164 fuera del pack | ⚠️ **Caduco/superado:** FEAT-164 existe en `featurelist.json` (completed), el incidente está documentado en troubleshooting #197, y el canónico ya no depende de ese parche para la referencia (genera `Order 00000-000-0000` compatible) | `featurelist.json` FEAT-164, `troubleshooting/197-…md` |
| — | Odoo 18 casi seguro no funciona (faltan `amount_*`, bus sin try/except) | ✅ Confirmado: sin `amount_*`, `_sendone` sin try, `int()` sin try, y probablemente campo `notice` inexistente en 18 → `ValueError` | `/opt/odoo-addons/18.0/…/main.py` completo |
| — | `sudo()` + `auth='user'` sin chequeo de compañía/grupo POS | ✅ VIGENTE en todas las variantes | `main.py:61, 135, 279…` |
| — | Notas en `notice` (posible requiere verificación) | ✅ VIGENTE a verificar. Riesgo adicional detectado: el merge de FEAT-206 hace `(t_line.notice or '').strip()`; si `notice` es One2many en esta build, lanza `AttributeError` | `main.py:210, 214` |
| — | `ir.model.access.csv` no está en `data` del manifest | ✅ Confirmado (`data: []` en todas las variantes). Impacto funcional bajo: todas las operaciones usan `sudo()`; el modelo `pos.omniflow.sync` es stub | todos los `__manifest__.py` |
| — | "Backend no disponible; no se sabe si manda deltas o snapshots" | ⚠️ **Caduco:** el repo tiene la cadena completa. `orders.service.ts` / `bills.service.ts` → evento → BullMQ `odoo-table-sync` → processor → adapter → addon. **Siempre manda snapshot completo** de `items`, nunca deltas | `odoo-table-sync.listener.ts:61-86`, `bills.service.ts:480-499` |

---

## 4. Hallazgos de la auditoría no presentes en el informe

| Severidad | Hallazgo |
| --- | --- |
| 🔴 Alta | **Despliegue productivo sin verificar vs repo.** El addon en el contenedor `odoo_web_8081` fue hotfixeado inline (troubleshooting #197) y no hay registro de que se haya re-deployado desde el canon 1.5.0. Riesgo de que producción 14 corra 1.2.x con correcciones a medias. `scripts/deploy-odoo-addon.sh` existe y apunta al canon — falta ejecución + verificación de versión |
| 🔴 Alta | **Diseminación de copias del addon en el disco** (`/opt/odoo-addons/*`, `/opt/odoo-deploy/*/modules/` vacío, tarball viejo en `dist/`). Riesgo de deploy con copia stale. El FDN debería ser único: `odoo-adapter/odoo-addons/pos_omniflow_sync/` |
| 🟠 Media | **`TRANSFER_TABLE_TO_TABLE` resuelve el pedido origen con `order_uuids[0] || fromTableId`** (`listener.ts:202`): si no hay uuid, manda un UUID de mesa, que no matchea `omniflow_order_ref` de nadie → siempre cae al fallback por mesa. Funciona por diseño del fallback, pero es frágil |
| 🟠 Media | **Robustez del canal**: el processor propaga 502 del addon como error de BullMQ (reintentos ilimitados por política de cola) — combinado con el punto 1/2 de la tabla anterior re-intenta snapshots completos. Operó bien por MERGED; en PER_ORDER amplifica el duplicado |
| 🟡 Baja | `dist/odoo-addons/*.tar.gz` solo contiene hasta 14.0.1.1.0: cualquier proceso que consuma el tarball despliega 4 versiones atrasadas |
| 🟡 Baja | El IR de `pos_restaurant` parcheado en el contenedor (FEAT-164) no está versionado en el repo; el canon ya lo independiza en lo funcional, pero conviene confirmar que no quede dependencia residual |

---

## 5. Estado de las recomendaciones del informe

| Recomendación del informe | Estado |
| --- | --- |
| 1. Decidir contrato: una mesa = un `pos.order` por cuenta | ✅ Adoptado (FEAT-205): MERGED = una `pos.order` por Bill, `sync_table_order` queda para PER_ORDER |
| 2. Idempotencia por línea (`line_uuid` / upsert) | ❌ Pendiente a nivel pedido (`sync_table_order`), resuelto a nivel cuenta (snapshot replace) |
| 3. Separar la clave externa de `pos_reference` (`omniflow_order_uuid` indexado) | ✅ Implementada como `omniflow_order_ref` / `omniflow_bill_ref` (indexados, v1.2.0/v1.4.0) |
| 4. Validar la entrada (rechazar sin `order_uuid`, solo `draft`) | ⚠️ Parcial: adapter rechaza ausencia de uuid (400) y `sync_bill` guarda estado; falta el gate de estado y la invalidación por uuid ausente en `sync_table_order` |
| 5. Endurecer transferencia (match por uuid + sesión, sin fusión por nombre) | ❌ Pendiente: fallback sigue sin filtro de sesión y el partner se dedupe por nombre exacto cuando no hay vat |
| 6. Un solo código base con adaptadores por versión | ❌ Pendiente: hoy conviven 6 copias en disco (ver §2) |
| 7. Tests de regresión (mismo payload x2, 2 uuid/mesa, cerrado, uuid ausente, id no numérico) | ⚠️ Parcial: `test-pos-order-contract.js` cubre creación por RPC, reintento de contrato y limpieza, con telemetría t0…t12 y colección Newman. Faltan los 5 escenarios de regresión como suite automatizada |

---

## 6. Plan de acción propuesto (requiere aprobación; no se tocó código)

**P0 — Riesgo de producción (≤1 día)**
1. Confirmar versión efectiva en el contenedor Provecchio:
   `ssh root@192.168.69.246 "docker exec odoo_web_8081 grep -o \"'version': '[^']*'\" /opt/odoo/addons/pos_omniflow_sync/__manifest__.py"`
   Si no es `14.0.1.5.0`, ejecutar `scripts/deploy-odoo-addon.sh` (con backup/rollback que ya incluye).
2. Parche mínimo en `sync_table_order` (canon): añadir `('state', '=', 'draft')` a ambas búsquedas y rechazar payload sin `order_uuid` (`status: 'error'`), subir a 14.0.1.6.0.

**P1 — Idempotencia y transferencia (FEAT-205 en curso)**
3. Upsert por línea: campo `omniflow_line_ref` (Char indexado) en `pos.order.line`; el backend manda `lineUuid` de `OrderLine.id`; `[(1, id, vals)]` / `[(2, id)]` / `[(0,0,vals)]` según delta; alternativa recomendada: mover el 100% del flujo a `sync_bill` y degradar `sync_table_order` a KITCHEN con snapshot-replace (misma garantía que `sync_bill`).
4. Endurecer `transfer_table_order`: match exclusivo por `order_uuid` con `state='draft'`; fallback por mesa **con filtro de sesión**; dedupe de partner exclusivamente por `vat`.

**P2 — Higiene del repositorio / despliegues**
5. Purgar copias stale (`/opt/odoo-addons/14.0/*`, `/opt/odoo-addons/18.0/*`, `/opt/odoo-addons/pos_omniflow_sync`, husks vacíos de `/opt/odoo-deploy/*/modules/`), regenerar el release `dist/odoo-addons/pos_omniflow_sync-14.0.1.5.0.tar.gz` y documentar el canon en `docs/plans/omnigastro/`.
6. Suite de regresión E2E con los 5 escenarios del informe (mismo payload ×2; dos uuid misma mesa; pedido pagado; uuid ausente; id no numérico) sobre contrat de FEAT-205.

**P3 — Cobertura de versiones**
7. Puerto de los arreglos 1.2→1.5 a 18.0.1.1.0 (`amount_*`, try/except en bus, `notice`→campo de 18 correcto, guard de `int()`).
8. Crear `19.0/` para `odoo-19-ce` (odoo.pesallaccia.com) o cerrar explícitamente en `featurelist.json` que el sync POS solo está soportado en 14.
9. Decidir separación de todas las variantes de `notice` / `note` de la línea POS en una instancia real 14 y 18, y australiano de modelo `pos.order.line.notice` para el merge FEAT-206.

---

## 7. Lo que esta auditoría no verificó (pendiente de instancia real)

- Versión del addon dentro de los contenedores productivos (`odoo_web_8081` Provecchio-14 y la 18 local, `odoo_web_18`) — requiere SSH que no es parte de esta instancia.
- Comportamiento del core de Odoo 18: campos `amount_*` requeridos vía onchange, existencia/semántica de `notice`, regex exacta que `pos_restaurant` 18 aplica a `pos_reference`.
- Contenido real de `chrome embebido`/reglas de RLS: la cadena reserva sesiones con `getActivePosSession(config_id)` que **no** distingue sesión por terminal/compañía en multi-config de POS.
