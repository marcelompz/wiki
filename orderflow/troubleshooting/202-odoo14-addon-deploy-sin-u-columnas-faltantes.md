# #202 — Deploy del addon `pos_omniflow_sync` sin `-u`: columnas nuevas no se crean

> **Fecha:** 2026-10-26 · **Vertical:** OmniGastro / Integración Odoo 14 · **Relacionados:** #197, #198, FEAT-207 · **Impacto:** `sync_bill` crashea al escribir (columna inexistente)

## Síntoma

El addon `pos_omniflow_sync` se actualizó en `192.168.69.246` (`/opt/odoo/addons/`) copiando los archivos y reiniciando `odoo_web_8081`. El código arranca y las rutas responden, pero al ejecutar `sync_bill` (FEAT-205) Odoo lanza:

```
ProgrammingError: column pos_order.omniflow_bill_ref does not exist
```

Además `ir_module_module.latest_version` queda desactualizado.

## Causa raíz

En Odoo, **copiar el código del addon y reiniciar solo recarga Python**: el schema de la base se actualiza durante el *upgrade* del módulo (`-u`). El contenedor de producción del `.246` corría **14.0.1.3.0**; la versión 14.0.1.4.0 (FEAT-205) introdujo el campo `omniflow_bill_ref` (`models/pos_omniflow_sync.py`), cuya columna jamás se creó porque el deploy de esa versión no pasó por `-u`.

Agravante: el `odoo.conf` de `.246` **no define `db_name`**, por lo que un `odoo -u ... --stop-after-init` sin `-d <db>` carga la base... ninguna (sale "Initiating shutdown" a los ~0,4 s sin logs de upgrade) y aparenta éxito sin haber hecho nada.

## Solución aplicada (2026-10-26)

Upgrade controlado con ventanita corta (sesiones POS de prod intactas):

```bash
# en 192.168.69.246
docker stop odoo_web_8081
docker run --rm --network odoo_default --volumes-from odoo_web_8081 odoo:14.0 \
  -d prod -u pos_omniflow_sync --stop-after-init
docker start odoo_web_8081
```

Verificado después: `ir_module_module` → `14.0.1.6.0 | installed`, columna `omniflow_bill_ref` presente, ERP `200`, sin errores en logs.

## Prevención

1. `scripts/deploy-odoo-addon.sh` ahora soporta **`--upgrade`** (con `--db`): detiene el contenedor, corre el upgrade en un one-off de la misma imagen/red/volúmenes (`--volumes-from`) y lo re-arranca.
2. Regla operativa: **`--upgrade` es obligatorio** siempre que la nueva versión del addon agregue campos al modelo; el incremento de versión en `__manifest__.py` no basta solo.
3. Verificación post-deploy obligatoria del addon:
   ```sql
   SELECT latest_version, state FROM ir_module_module WHERE name='pos_omniflow_sync';
   SELECT column_name FROM information_schema.columns
     WHERE table_name='pos_order' AND column_name LIKE 'omniflow%';
   ```
