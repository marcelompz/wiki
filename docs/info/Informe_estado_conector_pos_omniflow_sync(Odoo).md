# Informe: estado del conector `pos_omniflow_sync` (Odoo)

Análisis del pack OmniGastro/OrderFlow · 26 de octubre de 2026

## Resumen

Hay cuatro variantes de la lógica repartidas en cinco carpetas, y ninguna corresponde a Odoo 19, que según el Traefik es el entorno productivo (`odoo-19-ce`). La inconsistencia de idempotencia existe en las cuatro variantes y no está resuelta del todo ni en la versión más avanzada (14.0.1.1.0). El pack tampoco incluye el backend que llama a estos endpoints (`backend/`, `frontend/`, `docs/` y `context/` están vacíos), así que parte del diagnóstico queda condicionada.

## Inventario

| Carpeta | Versión | Estado |
| --- | --- | --- |
| `14.0/` | 14.0.1.0.0 | Base, sin correcciones |
| `14.0/...-14.0.1.1.0/` | 14.0.1.1.0 | La más completa: FEAT-184, FEAT-185 y FEAT-190 (transferencia a cliente) |
| `18.0/` | 18.0.1.0.0 | Equivale a la base de 14, sin ninguna corrección |
| `odoo-addons/odoo-addons/` | 18.0.1.0.0 | Igual que `18.0/`, salvo el formato de `pos_reference` (otro código con el mismo número de versión) |

Los entornos que aparecen en `services.yml` son Odoo 19 CE (producción pesallaccia), Odoo 18 local y Odoo 14 (Provecchio). Faltan el addon 19.0 y el despliegue real de cada versión.

## La inconsistencia: qué es la clave del pedido

El conector no decide si un pedido de OrderFlow equivale a un `pos.order` completo o solo aporta líneas a la cuenta abierta de la mesa, y mezcla los dos modelos. Eso produce varios fallos concretos:

1. **Las líneas se duplican al reintentar.** Incluso en 14.0.1.1.0, que sí reutiliza el `pos.order` por `pos_reference`, el código siempre ejecuta `order.write({'lines': [(0,0,...)]})`. Reenviar el mismo payload (reintento de red o de BullMQ) duplica todas las líneas. La corrección evita duplicar la cabecera, pero no las líneas.
2. **Con dos pedidos en la misma mesa, el segundo se duplica al reintentar.** Si el pedido B no encuentra su referencia, cae al borrador de la mesa, que ya lleva la referencia de A. El reintento de B vuelve a no encontrar su referencia y vuelve a añadir sus líneas.
3. **`OmniFlow-unknown` colisiona.** Sin `order_uuid`, todos los pedidos comparten esa referencia, y la búsqueda por `pos_reference` devuelve el primero creado, de cualquier mesa o sesión.
4. **La búsqueda por referencia no filtra estado.** Un reintento tardío puede escribir líneas sobre un pedido ya pagado o facturado.
5. **La referencia truncada colisiona.** En 14.0 base y en 18.0, `external_order_ref[-6:]` solo conserva los últimos 6 caracteres. En la variante `odoo-addons/odoo-addons`, el formato 5-3-4 se calcula a partir de dígitos del UUID, por lo que no es reversible y rellena con ceros si hay menos de 12 dígitos. En ninguna de las dos se busca por esa referencia, así que no hay idempotencia.
6. **El formato de `pos_reference` choca con el core.** La variante de 18 deja un comentario: `pos_restaurant` espera `\d{5,}-\d{3,}-\d{4,}`. La versión 14.0.1.1.0 usa `OmniFlow-<uuid>`, que incumple ese formato. El README menciona un parche local de `pos_restaurant` dentro del contenedor (FEAT-164) que no está en el pack. Probablemente existe por esto, y entonces el addon depende de un parche fuera del repositorio que no se puede reproducir. Esto se infiere del comentario y del README, no se comprobó contra el core de Odoo.

## Otros hallazgos, por severidad

### Alta

- **Transferencia a cliente (solo 14.0.1.1.0):** si no encuentra el pedido por uuid, toma el último borrador de esa mesa sin filtrar sesión y puede traspasar la cuenta equivocada a un cliente. Además, el cliente se busca por nombre exacto cuando no hay `tax_id`, y dos homónimos se fusionan.
- **Odoo 18 casi seguro no funciona como está.** Faltan `amount_*` y `price_subtotal*`, que en 14 causaron FEAT-185, y el bus se llama sin `try/except`, de modo que cualquier fallo de notificación aborta la sincronización. Hay que confirmarlo en una instancia de prueba.
- **Brecha de versiones:** los arreglos de 14 nunca se portaron a 18, y no existe addon para 19.

### Media

- Todo corre con `sudo()` y `auth='user'`, sin comprobar compañía ni permisos POS. Cualquier usuario interno con sesión puede escribir en cualquier sesión de caja. Conviene un usuario de servicio con el grupo mínimo de POS.
- Las notas de línea se guardan en `notice`. En 14, según el conocimiento del autor, es el aviso de descuento, mientras que `note` es la nota del mozo de `pos_restaurant`. En 18 podría ni existir. Hay que verificarlo.
- Fuera de 14.0.1.1.0, los ids no numéricos (el "G5" de FEAT-184) rompen con `ValueError`.

### Baja

- `ir.model.access.csv` no está en `data` del manifest en ninguna versión, así que no se carga.
- En 18, `models/` no se importa, y el modelo `pos.omniflow.sync` es un stub vacío.

## Resolución propuesta

1. **Decidir el contrato.** Recomendación: una mesa tiene un `pos.order` abierto, como en Odoo, y OrderFlow le añade líneas.
2. **Idempotencia por línea.** El emisor manda un `line_uuid` estable, y Odoo lo guarda en un campo `omniflow_line_ref` de `pos.order.line`, con unicidad por pedido. Así el envío es un upsert, igual de seguro con deltas o con snapshots.
3. **Separar la clave externa de `pos_reference`.** Un campo indexado `omniflow_order_uuid` en `pos.order`, mientras `pos_reference` mantiene el formato del core. Esto probablemente elimina la dependencia del parche FEAT-164.
4. **Validar la entrada.** Rechazar si falta `order_uuid` (sin `unknown`) y aceptar escrituras solo sobre pedidos en `draft`.
5. **Endurecer la transferencia.** Match solo por uuid, con sesión como filtro si se mantiene el fallback, y sin fusión de clientes por nombre.
6. **Un solo código base.** Un módulo común con adaptadores finos por versión (14, 18, 19), con los arreglos de 14.0.1.1.0 portados.
7. **Tests de regresión.** Enviar el mismo payload dos veces, dos uuid en la misma mesa, pedido cerrado, uuid ausente y un id no numérico.

## Lo que no se pudo verificar

No se dispone del código del backend que llama al addon, así que no se sabe si envía deltas o snapshots, ni si ya manda ids de línea. Tampoco están FEAT-164 ni `featurelist.json`. Todo lo dicho sobre el comportamiento del core de Odoo (regex de `pos_reference`, campos requeridos en 18, `notice` frente a `note`) sale del código del pack y del conocimiento general, y debe confirmarse en una instancia real.

## Próximo paso

Para cerrar el diseño hace falta el módulo del backend que invoca `sync_table_order` y `transfer_table_order`, junto con FEAT-164. Con eso se puede escribir el módulo consolidado y sus tests.
