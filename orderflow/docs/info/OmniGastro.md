# OmniGastro

## 2026-10-16 — v1.39.2 (PREPARADO — pendiente despliegue a provecchio.com)

- Plan: `docs/plans/omnigastro/plan_actualizacion_1.39.2.md` (aprobado y aplicado).
- **Bugs corregidos:**
  1. KDS Stations: categorías padre/hoja independientes + excluir subcategorías (`gastro-kds-stations.tsx`).
  2. Mesas: unificar fuente a `/api/v1/tables/floor-map` (modal y `/admin/gastro/tables` sincronizados) (`gastro.tsx`).
  4. Cargar pedidos por mesa / sin mesa (takeout) + backend `tableId=null` y `orderType=TAKEOUT` (`orders.controller.ts`, `orders.service.ts`).
  5. Modal responsivo en mozos, sin overflow de texto (`gastro.tsx`).
- Bug 3 (POS empty grid) ya resuelto en v1.39.1.
- Bump versión a `1.39.2` en `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json`.
- E2E Playwright: `kds-station-independent-categories.spec.ts`, `tables-modal-sync.spec.ts`, `order-modal-load-takeout.spec.ts`, `modal-responsive.spec.ts`.
- Barrera `./scripts/init.sh` pendiente de ejecución (requiere confirmación usuario por consumo CPU/RAM).
- Sin nuevas migraciones; `tenantId` sagrado; cero colores hardcodeados.

---

## 2026-10-16 — v1.39.1 DEPLOYED ✅

- Deployed v1.39.1 to `provecchio.com` (host `192.168.69.240`).

- **Bugs:**
1.At [http://provecchio.local/admin/gastro/kds-stations] when creating or editing a KDS station, the system lists all categories and subcategories; however, they do not all fit in the available space. It would be beneficial to be able to select categories and subcategories independently. For instance, selecting the 'Food' category could automatically select all (or specific) subcategories. In the kitchen, for example, all products should be included, with the exception of the 'cake' subcategory.

2.At [http://provecchio.local/admin/gastro/tables], the system fails to list the tables that appear in the 'Table Management and QR Codes (OmniGastro)' modal found at [http://provecchio.local/admin/gastro]. Furthermore, it does not allow for the editing of the tables that *are* displayed.

3.In the server-facing POS interface [http://provecchio.local/admin/gastro/pos/fa37f634-09b5-4743-8c56-baaab355a210], products are displayed under their respective categories; however, due to the high volume of items, not all products are shown.

4.The endpoint [Table Management and QR Codes (OmniGastro)] lacks options for loading orders for tables that haven't initiated the order via QR code. Add a button to load orders by selecting a table or without a table, for takeout.

5.The Table Management and QR Codes (OmniGastro) modal at the endpoint [https://provecchio.com/admin/gastro/mozos] is too small, and the text extends beyond the box (UI improvement).

- **All three field-reported issues resolved and verified:**

1. **Waiter POS — empty grid / grid instead of list (RESOLVED)**
   - `CategoryAccordion.tsx` now renders a compact list (name + price only) when `isListView={true}`.
   - `gastro-pos.tsx` passes `isListView={true}` and syncs `expandedKeys` after categories load.

2. **KDS Stations — empty category selector (RESOLVED)**
   - `gastro-kds-stations.tsx` normalizes `/api/v1/catalog/categories/tree` response with `res.data?.data || res.data`.

3. **KDS Dashboard — missing workstation pre-selection (RESOLVED)**
   - `kds.tsx` reorders effects: `loadActiveOrders` only runs after `selectedStationId` is set, with a guard `if (!selectedStationId) return;`.

- Health check: `https://provecchio.com/api/v1/health` → HTTP 200, version `1.39.1`, status `ok`.
- E2E QA (`qa_e2e_check.py`) passed: catalog, admin modules, auth sanity.
- Migrations: 37 found, 0 pending.
- Traefik `services.yml` synced to `/opt/srv/traefik/dynamic/services.yml` + HUP reloaded.
- Git commit `3184e7dc` on `origin/main`; tag `v1.39.1` pushed.
- Wiki (`/opt/wiki/orderflow/`) synced.

## 2026-10-16 (pre-deploy)

- I just deployed the v1.39.1


## 2026-10-15

- I just deployed the v1.39.0

1. Verify if this plan was fully applied /opt/orderflow/docs/plans/omnigastro/README.md

2. bumpt the version to 1.39.1 after complete the fixes and update the documentation @/opt/orderflow/AGENTS.md 

- Still on the v1.38.23 version

1. The product list on the waiter's POS:
- It appears empty; it doesn't display any text, only a box.

- I see them in grid format, not a list. On the waiter's POS, I need it to be a list so it takes up less space. It should even only show the name, without a description.


2. At the end [https://provecchio.com/admin/gastro/kds-stations], when adding a new station, the field is correct; it's already a list of categories, however, it's empty.

3. In the final section [https://provecchio.com/admin/kds], it already displays table orders, but it doesn't have the pre-selection of the workstation that it should show.

After completing the adjustments, please upload the version so we have a checkpoint.

- I just deployed the v1.38.23

1. Just change the status of the table from "Reclamado por Natalia Bado" with "Tomado por Natalia Bado" at the endopint [https://provecchio.com/admin/gastro/mozos]

- I just deployed the v1.38.22

1. The fixes worked.
2. Now I have a problem in the waiter's POS, it only has categories and subcategories of products to select, but it does not list the products.
3. Question: could the product list be hidden/shown to save space on the waiter's tablet?
4. In the KDS configuration, selecting the categories allows you to write the text in plain text, it does not select the available categories.
At the waiter's end point [https://provecchio.com/admin/gastro/mozos] two orders from the same table appear. I would think it is a previous order that was left open from the previous deployment. Add table status verification, so that it does not allow placing orders if the table is still open. Note: the cashier could close the table if customers placed an order but left without eating.
5. On the odoo endpoint [http://192.168.69.246:8081/pos/ui?config_id=2#cids=1] I get this error:
Odoo Server Error
Traceback (most recent call last):
File "/usr/lib/python3/dist-packages/odoo/addons/base/models/ir_http.py", line 237, in _dispatch
result = request.dispatch()
File "/usr/lib/python3/dist-packages/odoo/http.py", line 696, in dispatch
result = self._call_function(**self.params)
File "/usr/lib/python3/dist-packages/odoo/http.py", line 370, in _call_function
return checked_call(self.db, *args,**kwargs)
File "/usr/lib/python3/dist-packages/odoo/service/model.py", line 94, in wrapper
return f(dbname,*args, **kwargs)
File "/usr/lib/python3/dist-packages/odoo/http.py", line 358, in checked_call
result = self.endpoint(*a,**kw)
File "/usr/lib/python3/dist-packages/odoo/http.py", line 919, in __call__
return self.method(*args, **kw)
File "/usr/lib/python3/dist-packages/odoo/http.py", line 544, in response_wrap
response = f(*args,**kw)
File "/usr/lib/python3/dist-packages/odoo/addons/web/controllers/main.py", line 1370, in call_kw 
return self._call_kw(model, method, args, kwargs) 
File "/usr/lib/python3/dist-packages/odoo/addons/web/controllers/main.py", line 1362, in _call_kw 
return call_kw(request.env[model], method, args, kwargs) 
File "/usr/lib/python3/dist-packages/odoo/api.py", line 400, in call_kw 
result = _call_kw_model(method, model, args, kwargs) 
File "/usr/lib/python3/dist-packages/odoo/api.py", line 373, in _call_kw_model 
result = method(recs, *args, **kwargs) 
File "/usr/lib/python3/dist-packages/odoo/addons/pos_restaurant/models/pos_order.py", line 167, in get_table_draft_orders 
order["uid"] = search(r"\d{5,}-\d{3,}-\d{4,}", order["pos_reference"] or "").group(0) if order["pos_reference"] else None
Exception
The above exception was the direct cause of the following exception:

Traceback (most recent call last):
File "/usr/lib/python3/dist-packages/odoo/http.py", line 652, in _handle_exception
return super(JsonRequest, self)._handle_exception(exception)
File "/usr/lib/python3/dist-packages/odoo/http.py", line 317, in _handle_exception
raise exception.with_traceback(None) from new_cause
AttributeError: 'NoneType' object has no attribute 'group.
6. Version error on endpoint [https://provecchio.com/admin/super-admin] Super Admin Dashboard
v1.38.21
This error is repeated repeatedly, please take note in troubleshooting and add this endpoint to the version update list in @/opt/orderflow/AGENTS.md

- I just deploy the v1.38.21

1. When receiving the order from the table, I get these errors in the console:
[https://provecchio.com/admin/gastro/mozos]
Missing user or tenant context
/api/v1/modules/installed?tenantId=provecchio-dimora-001:1  Failed to load resource: the server responded with a status of 403 ()
index-BGLZsV2A.js:39 Error fetching installed modules AxiosError: Request failed with status code 403
    at Da (index-BGLZsV2A.js:12:10565)
    at XMLHttpRequest.b (index-BGLZsV2A.js:12:16973)
(anonymous) @ index-BGLZsV2A.js:39
/admin/gastro:1 <meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">
/api/v1/waiter/calls?waiterId=cmu498yae0001qgsy3azcyubg:1  Failed to load resource: the server responded with a status of 403 ()
gastro-vkxwrbrq.js:1 Error cargando panel gastro: AxiosError: Request failed with status code 403
    at Da (index-BGLZsV2A.js:12:10565)
    at XMLHttpRequest.b (index-BGLZsV2A.js:12:16973)
    at Dt.request (index-BGLZsV2A.js:14:2219)
    at async Promise.all (index 1)
    at async y (gastro-vkxwrbrq.js:1:3236)
y @ gastro-vkxwrbrq.js:1
/api/v1/orders/guest/pending:1  Failed to load resource: the server responded with a status of 403 ()
/api/v1/modules/installed?tenantId=provecchio-dimora-001:1  Failed to load resource: the server responded with a status of 403 ()
index-BGLZsV2A.js:39 Error fetching installed modules AxiosError: Request failed with status code 403
    at Da (index-BGLZsV2A.js:12:10565)
    at XMLHttpRequest.b (index-BGLZsV2A.js:12:16973)
(anonymous) @ index-BGLZsV2A.js:39
/api/v1/orders/guest/pending:1  Failed to load resource: the server responded with a status of 403 ()
gastro-vkxwrbrq.js:1 Error cargando panel gastro: AxiosError: Request failed with status code 403
    at Da (index-BGLZsV2A.js:12:10565)
    at XMLHttpRequest.b (index-BGLZsV2A.js:12:16973)
    at Dt.request (index-BGLZsV2A.js:14:2219)
    at async Promise.all (index 1)
    at async y (gastro-vkxwrbrq.js:1:3236)
y @ gastro-vkxwrbrq.js:1
/api/v1/waiter/calls?waiterId=cmu498yae0001qgsy3azcyubg:1  Failed to load resource: the server responded with a status of 403 ()
/api/v1/waiter/calls?waiterId=cmu498yae0001qgsy3azcyubg:1  Failed to load resource: the server responded with a status of 403 ()
gastro-vkxwrbrq.js:1 Error cargando panel gastro: AxiosError: Request failed with status code 403
    at Da (index-BGLZsV2A.js:12:10565)
    at XMLHttpRequest.b (index-BGLZsV2A.js:12:16973)
    at Dt.request (index-BGLZsV2A.js:14:2219)
    at async Promise.all (index 1)
    at async Object.y [as onClick] (gastro-vkxwrbrq.js:1:3236)
y @ gastro-vkxwrbrq.js:1
/api/v1/orders/guest/pending:1  Failed to load resource: the server responded with a status of 403 ()
/api/v1/orders/guest/pending:1  Failed to load resource: the server responded with a status of 403 ()
gastro-vkxwrbrq.js:1 Error cargando panel gastro: AxiosError: Request failed with status code 403
    at Da (index-BGLZsV2A.js:12:10565)
    at XMLHttpRequest.b (index-BGLZsV2A.js:12:16973)
    at Dt.request (index-BGLZsV2A.js:14:2219)
    at async Promise.all (index 1)
    at async y (gastro-vkxwrbrq.js:1:3236)
y @ gastro-vkxwrbrq.js:1
/api/v1/waiter/calls?waiterId=cmu498yae0001qgsy3azcyubg:1  Failed to load resource: the server responded with a status of 403 ()
/api/v1/waiter/calls/4606dac5-bb0b-422e-94ec-4181ebfc9eab/take-order:1  Failed to load resource: the server responded with a status of 403 ()

2. I received the order for "Table fa37f634-09b5-4743-8c56-baaab355a210" instead of "Table G10."

## 2026-10-14

-- I just deploy the v1.38.22

1. I now have the biolinks endpoint instead of the digital menu for table G10 at the URL [https://provecchio.com/?t=7b0075a2-811e-440c-b426-26fbf2b52e33]

2.

## 2026-10-13

-- I just deploy the v1.38.21

1. At the endpoint: [https://provecchio.com/admin/gastro/pos/fa37f634-09b5-4743-8c56-baaab355a210] the waiter can not see the products in the POS, just the name of the category.

2. The endpoint [https://provecchio.com/?t=7b0075a2-811e-440c-b426-26fbf2b52e33] shows the index page of omni-links I just scanned it with my cellphone.

-- I just deploy the v1.38.20

1. The endpoint [https://provecchio.com/admin/gastro] on the modal: Gestión de Mesas y Códigos QR (OmniGastro)
 does not show any table

2. When I open POS on  Odoo's endpoint [http://192.168.69.246:8081/pos/ui?config_id=2#cids=1] i got this error message:
 Server Error
Traceback (most recent call last):
  File "/usr/lib/python3/dist-packages/odoo/addons/base/models/ir_http.py", line 237, in _dispatch
    result = request.dispatch()
  File "/usr/lib/python3/dist-packages/odoo/http.py", line 696, in dispatch
    result = self._call_function(**self.params)
  File "/usr/lib/python3/dist-packages/odoo/http.py", line 370, in_call_function
    return checked_call(self.db, *args,**kwargs)
  File "/usr/lib/python3/dist-packages/odoo/service/model.py", line 94, in wrapper
    return f(dbname,*args, **kwargs)
  File "/usr/lib/python3/dist-packages/odoo/http.py", line 358, in checked_call
    result = self.endpoint(*a,**kw)
  File "/usr/lib/python3/dist-packages/odoo/http.py", line 919, in _call_
    return self.method(*args, **kw)
  File "/usr/lib/python3/dist-packages/odoo/http.py", line 544, in response_wrap
    response = f(*args,**kw)
  File "/usr/lib/python3/dist-packages/odoo/addons/web/controllers/main.py", line 1370, in call_kw
    return self._call_kw(model, method, args, kwargs)
  File "/usr/lib/python3/dist-packages/odoo/addons/web/controllers/main.py", line 1362, in_call_kw
    return call_kw(request.env[model], method, args, kwargs)
  File "/usr/lib/python3/dist-packages/odoo/api.py", line 400, in call_kw
    result =_call_kw_model(method, model, args, kwargs)
  File "/usr/lib/python3/dist-packages/odoo/api.py", line 373, in _call_kw_model
    result = method(recs,*args, **kwargs)
  File "/usr/lib/python3/dist-packages/odoo/addons/pos_restaurant/models/pos_order.py", line 167, in get_table_draft_orders
    order['uid'] = search(r"\d{5,}-\d{3,}-\d{4,}", order['pos_reference']).group(0)
  File "/usr/lib/python3.7/re.py", line 183, in search
    return_compile(pattern, flags).search(string)
Exception

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/lib/python3/dist-packages/odoo/http.py", line 652, in _handle_exception
    return super(JsonRequest, self)._handle_exception(exception)
  File "/usr/lib/python3/dist-packages/odoo/http.py", line 317, in _handle_exception
    raise exception.with_traceback(None) from new_cause
TypeError: expected string or bytes-like object

## 2026-10-12

**FIX (v1.38.18): Sincronización de productos/categorías OrderFlow → Odoo 14 (sync-standalone) — 203/203 productos y 74 categorías sincronizadas correctamente.**

Tres bugs de raíz encontrados y corregidos en `services/sync-standalone/src/odoo/`:

1. **Falta de header `x-tenant-id`** en `product-sync.service.ts`: las llamadas a `/api/v1/catalog/categories` y `/api/v1/sync/products` solo enviaban `x-api-key`, con lo cual ApiKeyGuard resolvía `super-admin-global` y devolvía catálogos vacíos. Se agregó `'x-tenant-id': tenantId` a ambos fetch.
2. **`searchRead()` pasaba `fields` duplicado** en `odoo.client.ts`: iba tanto en `args: [domain, fields]` como en `kwargs: { fields }`, y Odoo 14 lanzaba `TypeError: search_read() got multiple values for argument 'fields'`. Esto fallaba el

**FIX (v1.38.18): Sincronización de productos/categorías OrderFlow → Odoo 14 (sync-standalone) — 203/203 productos y 74 categorías sincronizadas correctamente.**

Tres bugs de raíz encontrados y corregidos en `services/sync-standalone/src/odoo/`:

1. **Falta de header `x-tenant-id`** en `product-sync.service.ts`: las llamadas a `/api/v1/catalog/categories` y `/api/v1/sync/products` solo enviaban `x-api-key`, con lo cual ApiKeyGuard resolvía `super-admin-global` y devolvía catálogos vacíos. Se agregó `'x-tenant-id': tenantId` a ambos fetch.
2. **`searchRead()` pasaba `fields` duplicado** en `odoo.client.ts`: iba tanto en `args: [domain, fields]` como en `kwargs: { fields }`, y Odoo 14 lanzaba `TypeError: search_read() got multiple values for argument 'fields'`. Esto fallaba el 100% de las búsquedas (categorías y productos). Corregido: `args: [domain]` + `kwargs` únicamente.
3. **Creación de impuesto con campo incorrecto**: `account.tax` en Odoo 14 usa `amount_type`, no `type`. Corregido en `getTaxId` (creación de "IVA 0%").

Verificación en Odoo 14 (192.168.69.246:8081, db prod): 48 categorías, 206 productos con `default_code` (203 sincronizados + 3 preexistentes), sin códigos duplicados. `product.product.create` escribe correctamente `categ_id` y `taxes_id` (write-through a `product.template`), no fue necesario cambiar a `product.template`.

Notas operativas:
El contenedor orderflow_sync_standalone corre con bind-mount ./services/sync-standalone:/app, así que el directorio dist/ del host tiene prioridad sobre el directorio dist compilado en la imagen. Tras ejecutar docker compose build, es necesario copiar el directorio dist desde la imagen al host (o montar node_modules en un volumen aparte) y reiniciar el servicio con docker compose restart sync_standalone.

- El backend almacena estado por categoría (`odooSyncStatus`, `odooProductCategoryId`) pero el sync actual solo lee; queda pendiente escribir el estado de retorno.

- El catálogo del backend tiene nombres de categoría duplicados (74 items, 28 nombres repetidos 2-5 veces); el sync los deduplica por nombre vía `findCategoryByName`.

- Limpieza: eliminada categoría duplicada "Para beber" (id 10, artefacto de test manual; la canónica es id 9 creada por el sync).

¿El addon que instalamos en Odoo tiene alguna funcion para actualizar los pedidos que se generaron en OmniGastro, o solamente sirve para sincronizar contactos, usuarios, mesas y productos?

## 2026-10-11

-- Acabo de desplegar la version 1.38.17 en Provecchio provecchio.com

1. En realidad los productos no estan sincronizados, tal vez ni siquiera encuentra el producto, no solamente el impuesto.

    Necesito sincronizar productos con sus categorias con Odoo para eso. Requerimos ajustar el modulo de integracion de Odoo en OrderFlow.

## 2026-10-10

-- Acabo de desplegar la version 1.38.16 en Provecchio provecchio.com

1. Al ingrear a [https://provecchio.com/admin/integrations] para verificar las integraciones y probar la sincronizacion entre el endpoint del mozo y el POS de Odoo: 17:03:37.512 XHR GET
[https://provecchio.com/api/v1/integrations]
[HTTP/2 200  188ms]
17:03:37.527 XHR GET
[https://provecchio.com/api/v1/modules/installed?tenantId=provecchio-dimora-001]
[HTTP/2 200  193ms]
17:03:42.818 XHR GET
[https://provecchio.com/api/v1/integrations/7a6688b6-2609-4719-9fb2-21a662f4abdf/odoo/users/compare]
[HTTP/2 500  418ms]

[https://provecchio.com/api/v1/integrations/7a6688b6-2609-4719-9fb2-21a662f4abdf/odoo/users/compare]
Estado
500
VersiónHTTP/2
Transferido1,28 KB (tamaño 52 B)
Política de referenciastrict-origin-when-cross-origin
Prioridad de la solicitudHighest
Resolución DNSSistema

## 2026-10-09

-- Acabo de desplegar la version 1.38.15 en localhost provecchio.local
1.Al recibir el pedido como mozo en el endpoint [https://provecchio.com/admin/gastro/pos/fa37f634-09b5-4743-8c56-baaab355a210] Error cargando datos de la mesa

-- Acabo de desplegar la version 1.38.14 en localhost provecchio.local

1. Por que en el panel del mozo [https://provecchio.com/admin/gastro/mozos] luego de acceder con el PIN de Ivan Castillo:
    - me permite seleccionar atener la mesa con otros empleados.
    - o cambiar de mozo sin solicitar PIN del mozo seleccionado.

2. Al atender el pedido no despliega el POS del mozo.

3. Descubrí quedrwxr-xr-t   2 dimora dimora    4,0K sep 26 19:03  thinclient_drives
 el endpoint que toma los pedidos es [https://provecchio.com/admin/gastro/pos/fa37f634-09b5-4743-8c56-baaab355a210] Creo que es una superposición de enpoints. Favor analiza la funcionalidad e interconección entre los endpoints.

4.Mismo derror en el endpoint del mozo: [https://provecchio.com/admin/gastro/pos/bf0bd8b9-42a5-4119-be9c-da4108a09df3] /api/v1/categories?includeProducts=true&tree=true:1  Failed to load resource: the server responded with a status of 404 ()
bf0bd8b9-42a5-4119-be9c-da4108a09df3:1 (<meta_name="apple-mobile-web-app-capable" content="yes">) is deprecated. Please include (<metaname="mobile-web-app-capable"content="yes">)
/api/v1/orders?tableId=bf0bd8b9-42a5-4119-be9c-da4108a09df3&status=DRAFT,CLAIMED,SENT_TO_KITCHEN,IN_PREPARATION,READY&limit=1:1  Failed to load resource: the server responded with a status of 500 ()

 Los endpoint: [https://provecchio.com/admin/gastro] [https://provecchio.com/admin/gastro/cashier] que tiene la administracion de los pedidos no debe ser visible por el mozo.

## 2026-10-07

1.Por que no tengo registros en [https://provecchio.local/admin/inventory/stock] siendo que en [https://provecchio.local/admin/products] si tengo productos?
Indicaciones progresivas para un LOG de pedidos al AGENTE.

Crear omni-mobile (waiter).
agy --conversation=71121deb-61c5-4e6c-a099-c08791a80be6

-- Acabo de desplegar la version 1.38.13 en localhost provecchio.local

1.El modal del mozo ya funciona y me permite incrementar o disminuir la cantidad de unidades pedidas por el cliente. Para el siguiente release necesito que cumpla con las exigencias del plan OmniGastro, donde teniamos que tener la opcion de dividir el pedido por asiento que ocupa el comensal en la mesa. Fijate en el plan dentro del directorio de OmniGastro. Tal vez un modal sea insuficiente para tener todo el control de la mesa, listado de productos por categoria, etc.

-- Acabo de desplegar la version 1.38.12 en localhost provecchio.local

1. Al iniciar sesion en [[https://provecchio.local/admin/] como [mailto:(mozo@provecchio.com)] me [redireccionó a https://provecchio.com/admin/]]

2. En el comandero [https://provecchio.local/admin/gastro/mozos], corregí manualmente la URL, tomé el pedido de Mesa G10 con el WAITER  Ivan Castillo y no abrió el modal del POS del Mozo.

3. El endpoint [https://provecchio.local/?t=e6758104-34d7-4c22-a4a1-2b7b9ae7ec7a] da error OmniBio No Encontrado
API key or valid JWT missing

4. ¿El QR generado de la mesa podría tener el Nombre de la mesa por encima?

## 2026-10-06

-- Acabo de desplegar la version 1.38.10 en localhost provecchio.local.

1. Ahora encontré el endpoint [https://provecchio.local/admin/products] pero está en el sidebar OMNICRM que no tiene nada que ver, debería estar en INVENTARIO.

2. Estoy en este endpoint: [https://provecchio.com/admin/gastro/tables]
Y no encuentro como editar las mesas, tanto nombre, cantidad de sillas o forma.

3. Los endpoint del cliente, por ejemplo de la mesa G10 [https://provecchio.com/?t=7b0075a2-811e-440c-b426-26fbf2b52e33] al llamar al mozo sigue ofreciendo seleccionar el mozo (aunque no recupera los datos y muestra 3 mozos 'undefined').

4. El endpoint de las mesas debe heredar el layout de /social-catalog/menudigital porque este [https://provecchio.com/?t=7b0075a2-811e-440c-b426-26fbf2b52e33] no muestra las imagenes de fondo de las categorías.

5. Cuando el mozo toma el pedido de la mesa en este endpoint [https://provecchio.com/admin/gastro/mozos] debería abrir un POS / Comandera / Modal con el pedido actual del cliente, pueda hacer CRUD y confirmar para tomar los pedidos. ¿Tenemos ese endpoint con todo lo planificado en @PLAN_OPERATIVO_Y_PROMPTS.md @FICHA_360_MOZO.md?

6. Agrega a @AGENTS.md la obligación de que para desplegar en localhost sea con la exportacion de datos actuales desde provecchio.com e importación en provecchio.local para hacer las pruebas. Esto debe garantizar el despliegue en producción, restaurando el backup para asegurar la consistencia de datos y evitar la perdida de información sensible.

7. bug: creo que tengo una copia de provecchio antigua, porque el PIN de Ivan Caballero actual en provecchio.com es 1234 y anteriormente era 4567. Al utilizar el PIN actual accede como Natalia Bogado.

8. Tengo un bug en produccción:
Al editar el perfil de Paula Cocina´
Internal server error
los demás perfiles, tanto Ivan como Natalia si me permiten editarlos

9. ¿Està aplicado el plan de backup @docs/guides/BACKUP_RESTORE.md ?
Creo que los archivos (filestore) no se copian dentro del backup, solamente el pg dump, o si se aplica hay problemas en el restore.
¿Solametne  el directorio uploads carga? Creo que hay otros directorios con archivos de cada tenant.

-- Acabo de desplegar la version 1.38.9 en provecchio.com
Bugs:
1.En [https://provecchio.com/admin/inventory/stock]

    - No muestra los productos y recibo la alerta: 'Cannot GET /api/v1/inventory/products-with-stock'
2. Ya no tengo el endpoint /product donde tenía las opciones de crear nuevo producto o carga masiva de productos, como tenía en versiones anteriores.

3.Al intentar hacer 'Carga Masiva de Productos del Catálogo' en [https://provecchio.local/admin/social-catalog] recibo esta alerta: 'property fileEncoding should not exist'

---

Acabo de desplegar la version 1.38.8 en provecchio.com
Bugs:
1.Los productos [que están disponibles en [https://provecchio.com/admin/inventory/stock]], sin embargo se listan en [https://provecchio.com/admin/products]

2.En [https://provecchio.com/social-catalog/] no muestra los productos que se buscan. Sería bueno que ocultara las categorías y mostrara solamente los productos buscados.
3.En los cambios previos identifiqué esto: "Editar mesas en este endpoint: [https://provecchio.com/admin/gastro/tables], ahora mismo está solamente en el endpoint del mozo." Pero sigo sin poder editar las mesas en ese endpoint.

## 2026-10-05

Despliegue en Provecchio concluido con éxito, fijate en @AGENTS.md

Bugs del sistema OmniFlow:

1. Editar mesas en este endpoint: [https://provecchio.com/admin/gastro/tables], ahora mismo está solamente en el endpoint del mozo.

2. Al llamar al mozo desde [https://provecchio.com/?t=8766be11-e368-4152-949a-6d12d1d2e2f3] el sonido de la alerta se escucha en el endpoint del cliente, no del mozo. Debería oirlo en el endpoint del mozo: [https://provecchio.com/admin/gastro/mozos]

3. El mozo sigue teniendo la opción de seleccionar otro EMPLOYEE para atender la mesa, no se autoasigna en [https://provecchio.com/admin/gastro/mozos]

4. Cuando el mozo toma el pedido falla y recibe esta advertencia: Cannot POST /api/v1/waiter/calls/8f141f64-523f-429e-a0df-e246e29cc1ce/take-order

5. En el endpoint del cliente [https://provecchio.com/social-catalog/menudigital?t=8766be11-e368-4152-949a-6d12d1d2e2f3&track=02458c8b-3c89-4374-92e9-c878460235dd] al llamar al mozo sigue ofreciendo seleccionar el mozo y escribir el mensaje para poder hacer la llamada, no puedo omitirlo.

6. El buscador de social-catalog no devuelve ningún resultado.

Cuando presento bugs o un ajuste quiero que me presentes un plan de acción antes de tocar el código. Ahora por ejemplo me di cuenta que la tablet estaba sin sonido, así que pudo haber sonado en el endpoint del mozo, no se si había o no bug.
Agrega esta regla a @AGENTS.md

## 2026-10-03

1. Menu (sidebar) solamente figura KDS: ok.
    - Faltan el POS Gastro.
    - Caja Gastro.
    - Mozo.
2. En la administracion de usuarios: SISTEMA / AJUSTES -> Usuarios, roles & personal [[https://provecchio.com/admin/users]
3. En la gestión de pisos / mesas
[https://provecchio.com/admin/gastro/tabless]]
[super-admin:1 <meta name="apple-mobile-web-app-capable"content="yes">] is deprecated. Please include [<meta_name="mobile-web-app-capable"content="yes">]
vendor-react-BL24cwRE.js:17 [Violation] 'message' handler took 282ms
vendor-react-BL24cwRE.js:17 [Violation] 'message' handler took 248ms
VM104:2 Uncaught TypeError: Cannot read properties of ```undefined (reading 'startTime')
    at X.reportAllChanges (<anonymous>:2:19627)
    at <anonymous>:2:14832
    at <anonymous>:2:313
    at d (<anonymous>:2:6931)
    at <anonymous>:2:7118
    at <anonymous>:2:2912
    at n.timeout (<anonymous>:2:6432)```

X.reportAllChanges @ VM104:2
(anonymous) @ VM104:2
(anonymous) @ VM104:2
d @ VM104:2
(anonymous) @ VM104:2
(anonymous) @ VM104:2
n.timeout @ VM104:2
requestIdleCallback
x @ VM104:2
f @ VM104:2
(anonymous) @ VM104:2
index-DxKM8gsm.js:12  POST [https://provecchio.com/api/v1/tables/floors] 403 (Forbidden)
(anonymous) @ index-DxKM8gsm.js:12
xhr @ index-DxKM8gsm.js:12
vo @ index-DxKM8gsm.js:14
Promise.then
_request @ index-DxKM8gsm.js:18
request @ index-DxKM8gsm.js:14
(anonymous) @ index-DxKM8gsm.js:18
(anonymous) @ index-DxKM8gsm.js:10
_ @ gastro-tables-Cqk12veY.js:1
M @ vendor-antd-4rYBaDLC.js:183
(anonymous) @ vendor-antd-4rYBaDLC.js:166
jf @ vendor-react-BL24cwRE.js:29
Bf @ vendor-react-BL24cwRE.js:29
Hf @ vendor-react-BL24cwRE.js:29
Vi @ vendor-react-BL24cwRE.js:29
$s @ vendor-react-BL24cwRE.js:29
(anonymous) @ vendor-react-BL24cwRE.js:29
bu @ vendor-react-BL24cwRE.js:32
is @ vendor-react-BL24cwRE.js:29
ro @ vendor-react-BL24cwRE.js:29
_u @ vendor-react-BL24cwRE.js:29
ld @ vendor-react-BL24cwRE.js:29

## OmniFlow general

4.En la gestión de Capital humano.
[https://provecchio.com/admin/hr/api/v1/hr/attendance/records:1]  Failed to load resource: the server responded with a status of 403 ()
hr-CF0xsNe2.js:1 Error al cargar marcaciones de asistencia AxiosError: Request failed with status code 403
    at Na (index-DxKM8gsm.js:12:10565)
    at XMLHttpRequest.j (index-DxKM8gsm.js:12:16973)
T @ hr-CF0xsNe2.js:1
/api/v1/hr/employees:1  Failed to load resource: the server responded with a status of 403 ()
5. En la gestion de usuarios
[https://provecchio.com/admin/users]
tengo roles como ADMIN, MANAGER, SELLER, EMPLOYEE, VIEWER. - Necesito una descripcion de cada rol general. - También necesito nivel de acceso a secciones del sistema por empleado. Ademas del nivel de acceso como usuario, a cada Empleado puedo asignarle un nivel de acceso para que puedan o no ver caja, compras, etc. Por ejemplo el mozo solamente tiene que tener acceso a 👨‍🍳 Panel de Acceso Mozos — OmniGastro
y a su vez al Panel Mozo — OmniGastro. El cocinero solamente al KDS, y así por consiguiente, permitir una administracion dinámica del acceso a los módulos y sus secciones.

Ivan Castillo

C.I.: 5655960

6.ok Al cambiar contraseña de usuario:
users:1 [DOM] Input elements should have autocomplete attributes (suggested: "current-password"): More info: [https://goo.gl.qjz9zk/9p2vKq] <input id=​"password" type=​"password" class=​"ant-input css-1ndk0wj">​
/api/v1/users/daa7834f-57c9-4250-b90d-ea24df0971ba:1  Failed to load resource: the server responded with a status of 500 ()
users:1 [DOM] Input elements should have autocomplete attributes (suggested: "current-password"): (More info: <https://goo.gl.qjz9zk/9p2vKq>) <input id=​"password" type=​"password" class=​"ant-input css-1ndk0wj">​

7.¿Por qué en la administración de Capital humano [https://provecchio.com/admin/hr] al crear colaborador no permite, ademas de crearlo desde cero, seleccionar los Contactos que ya están en el sistema?
 /btw Acabo de crear un Empleado de nombre Ivan Castillo, luego lo busqué en [https://provecchio.com/admin/contacts] y no lo encontré
/btw me acabas de decir que al crear un empleado (hr.employee) se crea automáticamente y vincula con un Contacto
  (res.partner). Si esa lógica no está en vigencia necesito que hagas una auditoría completa y valides lo que se
  planificó para res.partner y hr.employee y lo que se ejecutó.
/btw Valida y concilia lo que se planificó para copiar la lógica de res.partner y hr.employee de Odoo con lo que se desarrolló y aplicó en OmniFlow. Encuentra las brechas y crea un plan para su corrección, documentación y despliegue total.

8.En la gestión del Capital Humano [https://provecchio.com/admin/hr]
No puedo editar el Empleado, debería tener la gestión CRUD en esa sección.

9.El admin/social-catalog al habilitar pedidos del cliente con la gestión de mozo [https://provecchio.com/admin/social-catalog/menudigital] debería tener los botones para llamar al mozo o hacer el pre pedido para que el mozo reciba y se acerque a la mesa a confirmar el pedido para pasar al KDS y Caja.

/btw es solo counsulta. Cuando el cliente escanea el qr de la mesa y abre social-catalog/menudigital y envia su pedido, el mozo recibe la mesa que hizo el pedido con los productos solicitados y va hasta la mesa para confirmarlos?

10.Tengo mozos que no están fichados como Empleados en [https://provecchio.com/admin/hr]

11.En el CRM quiero una alerta de cumpleaños de los Contactos, el modulo de sorteos lo cree justamente para colectar datos de los clientes, ahora tengo numero de celular, cumpleaños y correo electrónico. Ahora necesito gestionar las alertas y gestión de CRM para obsequios, descuentos, etc. Tanto para el administrador como notificaciones Push a los clientes, según campañas que se creen en OmniCRM.
@/opt/orderflow/docs/plans/OmniCRM/plan_cumpleanos_fidelizacion_omnicrm.md evalua este plan, verifica lo oque ya tenemos desarrollado en fidelización y informame si es aplicable, tanto administrativamente como en el endpoint del cliente, para que se registre y pueda recibir el push de OmniFlow.

12./btw tenemos un endpoint para el cliente en el que pueda ver, y editar su perfil, recibir información de promociones, sus puntos por fidelidad, etc.?

/btw ¿tenemos un endpoint para el cliente en el que pueda ver y editar su perfil, recibir información de promociones, ver sus puntos por fidelidad, etc.?

13.El buscador de social-catalog no funciona

Column    |              Type              | Collation | Nullable |        Default -----------+--------------------------------+-----------+----------+-----------------------
 id        | text                           |           | not null |
 tenantId  | text                           |           | not null |
 floorId   | text                           |           |          | tableNum  | text                           |           | not null |
 name      | text                           |           |          |
 seats     | integer                        |           | not null | 4
 positionX | integer                        |           | not null | 0
 positionY | integer                        |           | not null | 0
 shape     | text                           |           | not null | 'SQUARE'::text
 status    | "TableStatus"                  |           | not null | 'FREE'::"TableStatus"
 ownerId   | text                           |           |          |
 token     | text                           |           | not null |
 rfidTag   | text                           |           |          |
 active    | boolean                        |           | not null | true
 isDeleted | boolean                        |           | not null | false
 deletedAt | timestamp(3) without time zone |           |          |
 createdAt | timestamp(3) without time zone |           | not null | CURRENT_TIMESTAMP
 updatedAt | timestamp(3) without time zone |           | not null |

Índices:

restaurant_tables_pkey PRIMARY KEY, btree (id)

restaurant_tables_floorId_idx btree (floorId)

restaurant_tables_ownerId_idx btree (ownerId)

restaurant_tables_rfidTag_key UNIQUE, btree (rfidTag)

restaurant_tables_tenantId_active_idx btree (tenantId, active)

restaurant_tables_tenantId_floorId_tableNumber_key UNIQUE, btree (tenantId, floorId, tableNumber)

restaurant_tables_token_key UNIQUE, btree (token)

🛠️ Comandos de Despliegue y Diagnóstico
Bash
git tag v1.25.0-alpha-omnigastro && git push origin main --tags 2>&1 | tail -10
ps aux | grep -i site-inspect; netstat -tuln || ss -tuln
Contexto / Clon: clone-wars

⚙️ Tareas de Desarrollo Pendientes
Gestión de Usuarios y Seguridad (BTW):

El Super Admin debe poder editar globalmente desde su perfil los PINs y contraseñas de los usuarios.

Los usuarios deben poder modificar su propia contraseña y PIN.

Actualizar el controlador de usuarios (users controller) para incluir positionId en create y update.

Actualizar el método findAll para que retorne la información de la posición (position info).

Actualizar el servicio de acceso de usuario por tenant (user-tenant-access service) para gestionar el campo positionId.

Observaciones del POS (Futuro):

Trabajar más adelante en el módulo POS para que el módulo padre (general) incorpore:

Apertura y cierre de caja.

Registro de ingresos y egresos de dinero.

Seguridad:

Shannon -> Open Source para validar la seguridad con bash-it.

Obs: necesito multiples KDS, cocina, pastelería, café, etc. No hardcodeados, sinó dinámicos, con endpoints exclusivos. Los productos que estan en el PDV pueden configurarse para aparecer en los KDS por categoria de pdv o individualmente. Pueden aparecer en mas de un KDS. Es una feature que neesito para la siguiente release, ahora voy a trabajar con un solo KDS en la cocina.

14.En la vertcial OmniGastro, en estos endpoints
[[https://provecchio.com/admin/gastro] y [https://provecchio.com/admin/gastro/mozos]
Veo varios mozos que creo que están hardcodeados, en vez de leer los datos de la base de datos de OmniHRMS.
Por favor corrige eso y busca otros datos que estén hardcodeados para resolver. El sistema debe estar listo para producción.

Cual es el endpoint del mozo, en el que recibira las notificaciones de las mesas? Necesita ver las mesas que llaman mozo y reclamarla para asistirla, asi entra en su flujo y se encarga de atender los pedidos, comandar para el KDS, servir los platos listos, imprimir la cuenta y hacer el cobro de la consumision.

en Odoo tenemos el concepto de Usuario y Empleado que no precisamente son lo mismo. Puedo tener un solo usuario para Mozo y varios empleados que utilicen el dispositivo, cambiado de Mozo con un PIN personal.
Esa es la funcionalidad que necesito.

en Odoo tenemos el concepto de Usuario y Empleado que no precisamente son lo mismo. Puedo tener un solo usuario para Mozo y varios empleados que utilicen el dispositivo, cambiado de Mozo con un PIN personal.
Esa es la funcionalidad que necesito.

Unificar el PIN del empleado para la marcacion y el la toma de puesto, ya sea como Mozo, cajero o cocinero, etc.

que la apertura de caja utilice el mismo PIN para empleado, incluso que pueda asignar desde la configuracion del POS cuales son los empleados asignados a la caja. Permitir multples cajas.

- Restart backend with the fix
docker restart orderflow_backend 2>&1
sleep 45

- Verify backend is healthy
curl -sS [http://provecchio.local/api/v1/health] 2>&1
