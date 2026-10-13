Actúa como Desarrollador Frontend Senior experto en React, TypeScript y Ant Design (v5).

Corrige el archivo `OmniCatalog.tsx` (módulo omnicanal de catálogo social para redes sociales y mensajería). 

### Diagnóstico del Problema Visual
En la pestaña "Página y configuración", los paneles de configuración se deformaron y quedaron acoplados horizontalmente en una sola fila estrecha (scroll horizontal roto), perdiendo el layout vertical limpio a ancho completo (100% width) que tenía la interfaz original. Esto ocurrió por mezclar la sintaxis obsoleta `<Collapse.Panel>` con inputs y bloques `<Space wrap>` huérfanos sueltos dentro del formulario.

---

### Requerimientos de Corrección y Refactorización

1. **Maquetación Vertical del Acordeón (Ant Design v5 `items`):**
   - Elimina todas las etiquetas `<Collapse.Panel>` y migra a la prop declarativa `items` de Ant Design.
   - El `<Collapse>` debe ocupar el 100% del ancho del contenedor y apilar verticalmente sus secciones:
     ```tsx
     <Collapse '100%', 24 accordion defaultActiveKey="{['contact']}" items="{accordionSections}" marginBottom: style="{{" width: }}/>
     ```

2. **Estructura limpia de las 8 secciones (Sentence case en títulos y etiquetas):**
   Agrupa rigurosamente todos los campos dentro de su respectivo panel:
   - **`📱 Datos de contacto`:** Número de WhatsApp / contacto directo, mensaje de bienvenida, subtítulo, dirección física, enlace de Google Maps.
   - **`🌐 Redes sociales`:** Enlaces de Instagram, Facebook y canales sociales.
   - **`🚚 Envíos`:** Costo de envío base por defecto, administración de zonas de entrega y tarifas.
   - **`🛒 Modo de venta`:** Modo (`free`, `premium`, `static`) y pasarela de pago.
   - **`🎨 Personalización y ajuste visual`:** Colores de fondo/texto (encabezado y cuerpo), selectores/ajustes de Banner y Logo (cover, contain, posición, márgenes), selector de tema (sistema/claro/oscuro), modo de visualización (tarjetas/lista) y editores de plantilla de mensaje / anuncio con inserción de variables en la posición del cursor.
   - **`⭐ Banner de productos destacados`:** Interruptor de activación, modo (etiqueta o lista manual), tabla reordenable por arrastre y modal de selección.
   - **`👁️ Visibilidad en catálogo público`:** Grilla limpia (2 columnas) con todos los interruptores booleanos (`showBusinessName`, `showWelcomeMessage`, `showWelcomeSubtitle`, `showAddress`, `showAnnouncement`, `showProductImages`, `showProductCounts`, `showStock`, `showRibbons`, etc.).
   - **`🏷️ Gestión de categorías`:** Reordenamiento dinámico (Drag & Drop y botones arriba/abajo), paleta de color e imagen de fondo por categoría.

3. **Correcciones funcionales clave:**
   - **Autoasignación de imagen en categoría:** Al subir una imagen desde el botón "Subir archivo" de una categoría, actualizar de inmediato el estado local `categoryBackgrounds` con la URL retornada para que se asigne automáticamente.
   - **Ubicación del Live Preview y Guardado:** Fuera del `<Collapse>`, coloca el widget de previsualización en vivo `<CatalogLivePreview />` y debajo el botón principal de acción "Guardar cambios" a ancho completo.
   - **Nomenclatura limpia:** Asegurar que el componente principal se exporte como `OmniCatalog` (o `OmniCatalogPage`) coherente con el archivo `OmniCatalog.tsx`.

Devuelve el código fuente completo, ordenado, sin elementos huérfanos en el layout y listo para producción.