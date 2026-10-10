# OmniGastro

## 2026-10-10

-- Acabo de desplegar la version 1.38.16 en localhost provecchio.local

1. d

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
bf0bd8b9-42a5-4119-be9c-da4108a09df3:1 <meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">
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
[https://provecchio.com/admin/gastro/tabless]
[super-admin:1 <meta name="apple-mobile-web-app-capable"content="yes">] is deprecated. Please include <meta name="mobile-web-app-capable"content="yes">]
vendor-react-BL24cwRE.js:17 [Violation] 'message' handler took 282ms
vendor-react-BL24cwRE.js:17 [Violation] 'message' handler took 248ms
VM104:2 Uncaught TypeError: Cannot read properties of undefined (reading 'startTime')
    at X.reportAllChanges (<anonymous>:2:19627)
    at <anonymous>:2:14832
    at <anonymous>:2:313
    at d (<anonymous>:2:6931)
    at <anonymous>:2:7118
    at <anonymous>:2:2912
    at n.timeout (<anonymous>:2:6432)
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

## OmniFlow general:

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

Puedes iniciar el desarrollo de la vertical OmniGastro, siguiendo los lineamientos de [AGENTS.md](file;file:///opt/orderflow/AGENTS.md) y actualizar la documentación. 
Mantener viva la documentación en el roadmap detallado de cada vertical en @directory:docs/plans/omnigastro

/context cada 20 minutos el informe de estado de la actividad.

                              Table "public.restaurant_tables"
   Column    |              Type              | Collation | Nullable |        Default        
-------------+--------------------------------+-----------+----------+-----------------------
 id          | text                           |           | not null | 
 tenantId    | text                           |           | not null | 
 floorId     | text                           |           |          | 
 tableNumber | text                           |           | not null | 
 name        | text                           |           |          | 
 seats       | integer                        |           | not null | 4
 positionX   | integer                        |           | not null | 0
 positionY   | integer                        |           | not null | 0
 shape       | text                           |           | not null | 'SQUARE'::text
 status      | "TableStatus"                  |           | not null | 'FREE'::"TableStatus"
 ownerId     | text                           |           |          | 
 token       | text                           |           | not null | 
 rfidTag     | text                           |           |          | 
 active      | boolean                        |           | not null | true
 isDeleted   | boolean                        |           | not null | false
 deletedAt   | timestamp(3) without time zone |           |          | 
 createdAt   | timestamp(3) without time zone |           | not null | CURRENT_TIMESTAMP
 updatedAt   | timestamp(3) without time zone |           | not null | 
Indexes:
    "restaurant_tables_pkey" PRIMARY KEY, btree (id)
    "restaurant_tables_floorId_idx" btree ("floorId")
    "restaurant_tables_ownerId_idx" btree ("ownerId")
    "restaurant_tables_rfidTag_key" UNIQUE, btree ("rfidTag")
    "restaurant_tables_tenantId_active_idx" btree ("tenantId", active)
    "restaurant_tables_tenantId_floorId_tableNumber_key" UNIQUE, btree ("tenantId", "floorId", "tableNumber")
    "restaurant_tables_token_key" UNIQUE, btree (token)

git tag v1.25.0-alpha-omnigastro && git push origin main --tags 2>&1 | tail -10
ps aux | grep -i site-inspect; netstat -tuln || ss -tuln

clone-wars

/btw haz un incremento menor en cada feat nuevo, para validar el correcto deploy.

Verifica que esté la nueva directriz @AGENTS.md de crear un proyecto en @docs/plans/"Nombre_de_la_vertical" con su documentación individual (ROADMAP, Plan, Prompts, etc.). En su ausencia creala.

/btw debo poder editar globalmente desde el perfil del Super Admin los pines y contraseñas de los usuarios y los usuarios modificar su propia contraseña y pin.

I need to update the users controller to include positionId in create and update, and update the findAll to return position info. Also need to update the user-tenant-access service to handle positionId.

obs: toma nota de que tenemos que trabajar en el POS mas adelante, para que el módulo padre (general) tenga apertura, cierre de caja e ingreso / egreso de dinero.

Shannon -> Open Source para validar la seguridad 
bash-it

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
