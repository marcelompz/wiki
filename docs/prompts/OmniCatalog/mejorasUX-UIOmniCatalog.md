Actúa como un Desarrollador Senior Full Stack y Diseñador UX/UI experto en optimización de aplicaciones web. 

Tu tarea es implementar una serie de correcciones de bugs, 
çmejoras de interfaz y optimizaciones de flujo de trabajo para el módulo **OmniCatalog**. 

A continuación se detallan los requerimientos técnicos y funcionales divididos por área:

---

### 1. Convención Tipográfica y Microcopy (UI/UX)
Aplica la regla estricta de **Sentence case (Mayúscula inicial)** en todos los títulos, subtítulos, etiquetas y botones de la interfaz, eliminando el estilo Title Case en español:
* **Inicio de texto:** Solo la primera palabra de una oración o la posterior a un punto lleva mayúscula inicial (ejemplo: *Configuración del catálogo*, *Información general*).
* **Nombres propios:** Mantener mayúsculas en nombres de personas, lugares o marcas registradas (ejemplo: *OmniCatalog*, *WhatsApp*).
* **Siglas:** Preservar en mayúsculas completas (ejemplo: *DNI*, *ID*, *SKU*).
* **Resto del texto:** Todo en minúsculas, evitando capitalizaciones innecesarias intermedias.

---

### 2. Corrección de Bugs

* **Inserción de variables en plantillas de mensajes:**
  * **Problema:** En *Plantilla de mensaje personalizada* y *Mensaje de anuncio*, al hacer clic sobre los chips/tarjetas de variables dinámicas (ejemplo: `{{clientName}}`, `{{clientPhone}}`), el valor no se inserta en el editor de texto.
  * **Solución requerida:** Hacer que el evento `onClick` del tag/chip inserte la variable seleccionada directamente en la posición actual del cursor (caret) dentro del `textarea` o `input` activo.

* **Flujo de subida y autoasignación de imágenes de categorías:**
  * **Problema:** Al usar la acción "Subir archivo" dentro de una categoría, la imagen se almacena en la galería multimedia pero no se asigna automáticamente a la categoría, obligando al usuario a buscarla y seleccionarla manualmente.
  * **Solución requerida:** Tras completar la subida exitosa, autoasignar el `ID`/URL del archivo subido al campo de imagen de la categoría actual de forma automática en el estado local.

---

### 3. Nuevas Funcionalidades y Mejoras de Interfaz

* **Vista previa en tiempo real (Live Preview):**
  * Implementar un panel o visor responsivo en tiempo real (similar al funcionamiento de OmniBio / BioLink) que refleje de inmediato cualquier cambio de configuración, estilos o datos del catálogo sin requerir recargar la página ni guardar previamente.

* **Reorganización en paneles colapsables (Acordeón):**
  * Agrupar y colapsar las opciones de configuración bajo un componente de tipo acordeón, permitiendo expandir/contraer cada sección de forma limpia. 
  * Estructura de secciones requerida (con sus respectivos emojis):
    1. 📱 Datos de contacto
    2. 🌐 Redes sociales
    3. 🚚 Envíos
    4. 🛒 Modo de venta
    5. 🎨 Personalización y ajuste visual
    6. ⭐ Banner de productos destacados
    7. 👁️ Visibilidad en catálogo público
    8. 🏷️ Gestión & reordenamiento de categorías dinámicas

---

### Formato de Entrega Esperado
1. **Plan de ejecución:** Breve desglose técnico de los archivos o componentes a intervenir.
2. **Código fuente:** Bloques de código limpios, comentados y listos para producción (HTML/CSS/JS/Framework correspondiente) que resuelvan cada punto.
3. **Manejo de estados y eventos:** Asegurar que la reactividad del Live Preview y la inserción de tags no generen re-renders innecesarios.