# Troubleshooting — Odoo-Adapter Restart Loop: Python f-String in JS File

**Fecha:** 2026-08-05  
**Versión:** v1.16.0  
**Alcance:** `orderflow-odoo-adapter-prod` crash loop por sintaxis Python en archivo JavaScript

---

## 1. Síntoma

El contenedor `orderflow-odoo-adapter-prod` entra en un bucle de reinicio continuo:

```
orderflow-odoo-adapter-prod Restarting (1) 42 seconds ago
```

Los logs muestran un `SyntaxError` en `odoo-invoice.plugin.js`:

```
/app/src/plugins/odoo/odoo-invoice.plugin.js:35
        sku_interno: line.name || f"INV-{invoice.invoice_id}",
                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^
SyntaxError: Unexpected string
```

## 2. Causa Raíz

El archivo `odoo-invoice.plugin.js` contenía **sintaxis de f-string de Python** en lugar de **template literals de JavaScript**:

- **Incorrecto (Python):** `f"INV-{invoice.invoice_id}"`
- **Correcto (JavaScript):** `` `INV-${invoice.invoice_id}` ``

Esto provocaba que Node.js no pudiera parsear el archivo al iniciar el contenedor, causando un crash inmediato.

## 3. Solución Aplicada

Reemplazar las dos ocurrencias de f-string Python con template literals JS en `odoo-invoice.plugin.js`:

| Línea | Antes | Después |
|-------|-------|---------|
| 35 | `f"INV-{invoice.invoice_id}"` | `` `INV-${invoice.invoice_id}` `` |
| 45 | `f"INV-{invoice.invoice_id}"` | `` `INV-${invoice.invoice_id}` `` |

### Pasos de recuperación:

1. Corregir el archivo fuente en el host:
   ```bash
   sed -i 's/f"INV-{invoice\.invoice_id}/`INV-${invoice.invoice_id}/g' /srv/orderflow/odoo-adapter/src/plugins/odoo/odoo-invoice.plugin.js
   ```
2. Reconstruir la imagen Docker:
   ```bash
   docker compose -f docker-compose.prod.yml build odoo_adapter
   ```
3. Reiniciar el contenedor:
   ```bash
   docker compose -f docker-compose.prod.yml up -d odoo_adapter
   ```

## 4. Verificación

```bash
docker ps --format "{{.Names}} {{.Status}}" | grep odoo-adapter
# Esperado: orderflow-odoo-adapter-prod Up ... (healthy)

docker logs orderflow-odoo-adapter-prod --tail 5
# Esperado: sin SyntaxError, plugins cargados correctamente
```

## 5. Prevención

- Revisar que no haya sintaxis Python en archivos `.js` antes de hacer deploy.
- Agregar un check de lint/syntax en el pipeline de CI para el `odoo-adapter`.

---

**Archivo afectado:** `odoo-adapter/src/plugins/odoo/odoo-invoice.plugin.js`
**Referencia:** [AGENTS.md — Reglas Inviolables](../00-contexto-agentes.md)
