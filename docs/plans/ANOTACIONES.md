

Bug en https://pesallaccia.com/api/v1/uploads/social-catalog/spa-wellness-001/ la imagen 1788033919475_lemon_prod_full.webp tiene 0 b. Supongo que las demas imagenes generadas estan en las mismas condiciones
bug: Al iniciar sesión con usuario de spa-wellness-002 deberia redireccionarme a la web con el subdominio gaia-wellness, correcto? Ahora mismo no sucede eso.
OmniFlow es un proyecto que ya esta maduro y necesito comercializarlo. Para ello requiero reglas de negocio y configuraciones autogestionadas a traves de un portal que incluya los planes y un wizard que lleve al cliente a comprar uno de los servicios o el ERP como Tenant o el ERP como Tier con base de datos independiente. Todas estas variables de configuracion y gestion mas la administracion de permisos, pasarela de pago, habilitacion de servicios, etc. es la que le falta a OmniFlow para ser un SaaS que opere 24/7.

Cree dos features en https://aistudio.google.com/apps/
/opt/omnivector
/opt/omnisites

Las quiero importar a OmniFlow como standalone

¿Al deshabilitarlo de App Store, si un solo tentant lo tiene instalado, se detiene el contenedor?

https://github.com/marcelompz/omnivector
La clonare en otro directorio para que la imporetes
https://ais-dev-t75xdfvlgjh6mwmgkccq5q-647709831069.us-west2.run.app

Quiero que omnisites sea el feature pro de OmniFlow. Inicialmente mejoremos sibe-builder con plantillas mas completas y agregado de titulos, y cuando el Tenant contrata el servicio pro se habilita omnisites para ediciones profesionales.

Funciona la creacion de nuevos tenants en pesallaccia.com, asignando 

Bug: En https://provecchio.com/admin/social-catalog al ver las categorias dentro de Cafe solamente tengo subcategoria Caliente y no muestra la subcategoria Frío. En el endpoint https://provecchio.com/social-catalog/menudigital si aparecen los Cafés -> Frío.
Los productos que están con categoría Cafe->Frío 
aa014dd4-584f-4566-9c70-2fb4c55fe1bc
79402844-3dea-4a1c-b536-cabdb2f2a852
c6fc3fee-a85b-4d96-9380-00c7d949bb9e
cc998c28-8d3f-4020-a4c3-66df532e56f4
20072bfb-7057-4c15-9133-c6fbfd1bb61a
3c39fdbc-41ff-4338-8d1c-2665f8482f5f
ee6c8ca2-7939-4c64-94a1-971411e9bbcf
ee85c332-8323-4752-b167-3d4282d0eef8
0ee36bd1-a2b4-45cc-8f67-aad2b2cbcecd


En https://provecchio.com/admin/products -> Gestión Completa de Categorías solo muestra Categoria de producto, no las categorias de PDV. Acabo de importar nuevamente este archivo @file:/opt/orderflow/docs/planes/omni-catalog/new_provecchio_productos_importacion.csv Que tiene una categoria de producto y dos categorias de PDV.

Dos temas:
1. En DataView de productos solo veo la Categoria de PDV nivel 1 (hija) y tengo 2 niveles.
2. En social-catalog -> Categorias, solamente muestra Categoria de producto y no Categoria de PDV en ninguna de las opciones.

ssh root@192.168.69.240 "docker exec -i orderflow-backend-prod node -e '
const { PrismaClient } = require(\"@prisma/client\");
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({});
  console.log(\"=== TENANT DETALLES ===\");
  console.log(\"ID:\", tenant?.id);
  console.log(\"Nombre:\", tenant?.name);
  console.log(\"Subdominio:\", tenant?.subdomain);

  const tenantId = tenant.id;

  // 1. Categorías de Producto (del modelo Product)
  const products = await prisma.product.findMany({
    where: { tenantId },
    select: { category: true }
  });
  
  const productCategoriesCount = {};
  products.forEach(p => {
    const cat = p.category || \"(Sin Categoría de Producto)\";
    productCategoriesCount[cat] = (productCategoriesCount[cat] || 0) + 1;
  });

  console.log(\"\n=== 1. CATEGORÍAS DE PRODUCTO (Agrupadas desde Productos) ===\");
  console.table(Object.entries(productCategoriesCount).map(([nombre, prods]) => ({ \"Categoría Producto\": nombre, \"Cantidad Productos\": prods })));

  // 2. Categorías de PDV (del modelo ProductCategory)
  const posCats = await prisma.productCategory.findMany({
    where: { tenantId },
    orderBy: [{ level: \"asc\" }, { name: \"asc\" }]
  });

  console.log(\"\n=== 2. CATEGORÍAS DE PDV (Desde la tabla ProductCategory / POS) ===\");
  console.log(`Total Registros de Categorías de PDV: ${posCats.length}`);

  const posTable = posCats.map(c => {
    const parent = posCats.find(p => p.id === c.parentId);
    return {
      ID: c.id.substring(0, 8) + \"...\",
      Nombre: c.name,
      Nivel: c.level,
      \"Categoría Padre\": parent ? parent.name : \"(Raíz / Nivel 0)\",
      Visibilidad: c.isVisible ? \"Visible\" : \"Oculta\",
      Slug: c.slug
    };
  });

  console.table(posTable);
}

main().catch(console.error).finally(() => prisma.\$disconnect());
'"

Fijate en los productos y sus atributos (campos de categoria de producto y categoria de PDV) en provecchio.com

Te cuento que en https://provecchio.com/admin/social-catalog cuando selecciono Categorías de producto me aparecen 30 valores de entre ellos: Bruschetras, Caliente, Chocolate, etc.
Estas son Categorías de PDV nivel 0: Bruschettas y Categoria de PDV nivel 1: Caliente. Ninguna es Categoría de producto, que tengo solamente 2: Para comer y Para beber.

Muestrame las categorías de producto y categorias de PDV en la base de datos de provecchio.com en el único Tenant existente.

ssh -o ProxyJump=root@38.52.135.227:2021 root@192.168.69.240 "docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c \"UPDATE products SET \\\"posCategoryId\\\" = '7000d96d-cecd-4508-956e-39addbc98254' WHERE \\\"posCategoryId\\\" = '66347ec3-8673-4c1b-8ae9-bcdfd7986142'; DELETE FROM product_categories WHERE id IN ('733255cb-a87f-4297-85a1-da8fa2f40a67', '66347ec3-8673-4c1b-8ae9-bcdfd7986142', '122d12e1-dfbf-4cbf-998d-7bdb59f5ecd4');\""

Categorias:
Necesito mejor gestion, en admin/products seria bueno que pueda gestionar las categorias de producto y categoris de pdv de manera independiente. Tal vez en pestañas distintas. Solamente desde este lugar puedo cambiar de nombre y jerarquía las categorias.

El arbol de despliegue en el social-catalog debe ser independiente. Me tiene que permitir gestionar las categorias que se ven o no en el endpoint del catalogo, incluso al eliminarlas no las elimina de las categorias que gestiona Producto, no permite cambiar nombre de categoría, a no ser que me propongas un nombre distinto para mostrar en el catálogo, pero es un campo mas y creo que complicaría. 

Lo que necesito que social-catalog me permita es mostrar o no las categorias de Producto con sus niveles y las Categorias de PDV tambien con sus niveles, de manera mas dinamica, siempre en social-catalog/admin.


Bug:
No funciona, nuevamente, la galeria de fotos en social-catalog.

También tengo mejoras UX/UI.
Desde el panel administrador:
1. Habilitar o no las fotos de productos.
2. Vista en modo lista o tarjeta.

Desde el endpoint final del cliente:
1. Quiero tener la opcion de elegir ver los productos en lista y no como tarjetas.
2. Version obscura/clara: Mejorar el contraste.


3. Mostrar o no las cantidades de productos por categoría, además poder elegir el color de fondo y color de la letra.
4, Habilitar o no las fotos de productos desde.

timeout 120 ./scripts/deploy-production.sh provecchio 2>&1 | grep -E "OK|SUCCESS|ERROR|E2E|QA|✓|Deploy Complete" | tail -15


El tridente son los: Turnos / agendamiento(OmniBooking);

Ahora bien, en la vista movil tengo un menu inferior, asemejando al de iPhone, con el primer enlace a Inicio, que me lleva a OmniFlow BI Dashboard; el segundo es BioLinks; el tercero Productos; el cuarto Turnos y el quinto Config.

Me gustaria eliminar Config de ahi y poner OmniCatalog en su lugar.

Mejoras para OmniCatalog y bugs:

Página y configuración:
1- Utilizar títulos con mayúscula inicial en la oración, pero todo lo demás en minúsculas. Cuándo usar mayúsculasInicio de texto: La primera palabra de un escrito o la que va después de un punto. Ejemplo: Llegó temprano. El sol brillaba; Nombres propios: Nombres de personas, animales, lugares, marcas y ríos. Ejemplo: María, París, Amazonas.Títulos principales: La primera palabra de títulos de libros, películas o obras de arte (a diferencia del inglés, no van todas con mayúscula). Ejemplo: Cien años de soledad.Siglas: Las abreviaturas formadas por letras iniciales. Ejemplo: OTAN, DNI.

1- Plantilla de mensaje personalizada y Mensaje de anuncio muestran las tarjetas para campos relacionados: {{clientName}}, {{clientPhone}}, etc. pero no se agregan al mensaje al pulsarlos.

2- Agregar vista previa en tiempo real, similar a OmniBio (BioLink).

3- En las categorias, al "Subir archivo" la foto queda en la galería pero no se autoasigna, es necesrio seleccionarla nuevamente en la galería.

4- Que los grupos se acoplen, estilo acordeon:  
📱 Datos de contacto
🌐 Redes sociales
🚚 Envíos
🛒 Modo de venta
🎨 Personalización y Ajuste Visual
⭐ Banner de Productos Destacados
👁️ Visibilidad en Catálogo Público
🏷️ Gestión & Reordenamiento de Categorías Dinámicas


### 1. Convención Tipográfica y Microcopy (UI/UX)
Aplica la regla estricta de **Sentence case (Mayúscula inicial)** en todos los títulos, subtítulos, etiquetas y botones de la interfaz, eliminando el estilo Title Case en español:
* **Inicio de texto:** Solo la primera palabra de una oración o la posterior a un punto lleva mayúscula inicial (ejemplo: *Configuración del catálogo*, *Información general*).
* **Nombres propios:** Mantener mayúsculas en nombres de personas, lugares o marcas registradas (ejemplo: *OmniCatalog*, *WhatsApp*).
* **Siglas:** Preservar en mayúsculas completas (ejemplo: *DNI*, *ID*, *SKU*).
* **Resto del texto:** Todo en minúsculas, evitando capitalizaciones innecesarias intermedias.

Luego de que documentes todo quiero que creemos este estandar y corrijamos lo que está fuera de esta norma
@/opt/orderflow/docs/prompts/refactorización.md 

ok. Gestión de Galeria con imagenes WEBP.
Producto - variantes - tags - ribbons. Categorías de producto y Categorías de POS.
Inventario - costo en destino.
Fabricación.

ssh -o ConnectTimeout=10 root@192.168.69.240 "sleep 8 && docker exec orderflow-backend-prod wget -qO- http://localhost:3010/api/v1/health 2>&1" 2>&1

Para poder rediseñar el módulo de importación necesito ver el código actual. Lo ideal sería que subas:

Imprescindibles:

El controller/service de importación (el archivo NestJS que procesa el CSV/XLSX actual — parseo, validación, creación de productos).
El schema de Prisma actual del módulo Productos (o al menos el modelo Product tal como está hoy, antes de nuestro rediseño con variantes) — así veo qué campos ya mapea la importación.
Un archivo de ejemplo del CSV/XLSX que usás actualmente para importar (con headers reales), para entender el formato que ya conocen tus usuarios y no romper esa convención de golpe.

Si existen, también ayudan:
4. El DTO de validación (class-validator) que usa el endpoint de importación, si es un archivo separado.
5. Cualquier librería de parseo que ya estén usando (ej. si es xlsx/papaparse/csv-parse en el backend, o si el parseo se hace en el frontend con Refine.dev antes de mandar el JSON al backend).

Con el controller/service y un CSV de ejemplo ya puedo armar el rediseño completo (plantilla con/sin variantes + validaciones); el resto es para afinar detalles y no duplicar trabajo que ya esté resuelto (ej. si ya manejan un job de BullMQ para imports grandes, lo reutilizamos en vez de proponer uno nuevo).

Ahora con esta publicación:

¡Una forma muy diferente de comer mbeju!
Mbeju napolitano: salsa de tomates de la casa + mozzarella + cherry confitado.


Mejoras UX/UI en OmniCatalog:

Mensaje de anuncio:
Ej: "Hola {clientName}, tu pedido #{orderId}.
Esto se podria mejorar con tarjetas seleccionables con un click (o pulsar en la pantalla tactil) en vez del codigo con llaves.


Mejora QR
Otra mejora que necesita el modal de QR es acceso a la galeria, en vez de solo ofrecer subir la imagen del logo.

Bug: no muestra la vista previa del logo ni cabecera del OmniCatalog, busca en troubleshooting como resolvimos eso con los permisos de la galeria del Tenant.

OmniCatalog - carga masiva no tiene una prueba de la consistencia de datos antes de subir y procesar. El modo de trabajo de Odoo en ese sentido es mas limpio, valida el nombre de los campos con el tipo de dato y nombre, para evitar cargas erroneas. Poder guardar previamente un archivo subido sin proceder a la importacion, seleccionar los campos que se importaran y los que no, porque puede que el archivo tenga mas informacion de la que quiero importar, etc. 

- Cree un producto para hacer la prueba, introduje la categoria manualmente, porque no me ofrecia las categorias disponibles, lo guarde. Luego fui a ver las categorias y estaba vacia, no asumio la categoria que ingrese en el producto que cree, tampoco me permitio crear la categoria.

Tampoco se como seleccionar el Catalogo que creé en QR generator. El modal está casi igual, no me obliga a usar el slug, pero me pide un subdominio. Quisiera seleccionar los catálogos diponibles, en caso de seleccionar esa opcion, o una biografía, etc. Quiero que me ofrezca los enlaces disponibles para generar el código QR.

Problemas permanecen:
En el modal de QR no tengo todavía el acceso a la galería, ni la seleccion de la sección que se generará (OmniCatalog, OmniBio, etc.)
El modal de la galería de OmniCatalog lista la imagen pero no la vista previa. Tenemos el mismo problema que ya tuvimos con OmniBio (BioLinks).  Tampoco tengo el campo para poner el slug.


Al crear en la pestaña de BioLink me requirió "catalogSlug es requerido para tipo CATALOG". Las pestañas del modal QR no hacen que seleccione para que seccion es el codigo QR.
Ademas el endpoint de QR ofrece accesos rapidos para URL Personalizada, Producto, Catálogo, BioLink, vCard y WiFi. Pero al seleccionar cualquiera lleva al mismo modal en la primera pestaña "URL Personalizada"

¿Por que tengo dos directorios para manual de usuario: user-manual y user-manuals?

Error al asignar roles en otros tenants.
18:55:25.510 Advertencias de política de seguridad de contenido 2
18:55:25.569 Error: An unexpected error occurred spoofer.js:1:38935
18:55:29.407 A resource is blocked by OpaqueResponseBlocking, please check browser console for details. telemetry
19:03:35.318 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:13:27
19:03:35.319 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:1:1259
19:03:35.319 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:1:1319
19:03:35.321 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:1:5400
19:03:35.321 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:1:9336
19:03:35.323 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:1:1247
19:03:35.323 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:1:3570
19:03:35.324 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:1:16968
19:03:35.324 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:1:21816
19:03:35.324 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:1:27244
19:03:35.328 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. super-admin:1:2497
19:03:35.330 Pseudo-clase o pseudo-elemento desconocido '-ms-reveal'.  Juego de reglas ignoradas debido a un mal selector. social-catalog:1:13890
19:03:35.332 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. social-catalog:1:34362
19:03:35.336 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. biolinks:1:1232
19:03:35.338 Se esperaba un nombre de una característica de medios, pero se encontró '-ms-high-contrast'. social-catalog:1:20
19:03:35.338 Se esperaba un nombre de una característica de medios, pero se encontró '-ms-high-contrast'. social-catalog:1:48
19:03:35.338 Propiedad desconocida '-moz-osx-font-smoothing'.  Declaración rechazada. 3 super-admin:1:250
19:03:35.364 Pseudo-clase o pseudo-elemento desconocido '-ms-clear'.  Juego de reglas ignoradas debido a un mal selector. index-COkc69tg.css:1:40
19:03:35.364 Error al interpretar el valor para '-webkit-text-size-adjust'.  Declaración rechazada. index-COkc69tg.css:1:193
19:03:35.364 No se reconoce la regla at o error al leer regla at '@-ms-viewport'. index-COkc69tg.css:1:308
19:03:35.364 Pseudo-clase o pseudo-elemento desconocido '-moz-focus-inner'.  Juego de reglas ignoradas debido a un mal selector. index-COkc69tg.css:1:1902
19:03:39.253 XHR GET
https://pesallaccia.com/api/v1/health
[HTTP/3 200  1350ms]
19:03:41.973 XHR GET
https://pesallaccia.com/api/v1/users/user-marcelo-001
[HTTP/3 200  986ms]
19:04:02.062 XHR PATCH
https://pesallaccia.com/api/v1/users/user-marcelo-001
[HTTP/3 200  384ms]
19:04:02.431 XHR POST
https://pesallaccia.com/api/v1/tenants/provecchio-dimora-001/users
[HTTP/3 404  289ms]
19:04:09.251 XHR GET
https://pesallaccia.com/api/v1/health
[HTTP/3 200  209ms]
19:04:10.403 XHR PATCH
https://pesallaccia.com/api/v1/users/user-marcelo-001
[HTTP/3 200  306ms]
19:04:10.718 XHR POST
https://pesallaccia.com/api/v1/tenants/spa-wellness-001/users
[HTTP/3 404  301ms]



ok. También quiero un enlace en sidebar para qr-generator. Mas adelante quiero trabajar en que sea una feature standalone, pero ahora necesito su funcionalidad para publicar ya ya el QR de OmniCatalog de Provecchio.


### OmniPulse ###
Utilizar OmniPulse para crear clickbaites.
