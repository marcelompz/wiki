Actúa como un desarrollador senior frontend/backend experto en el ecosistema de social-catalog.

### Contexto del Problema
En la vista/endpoint de confirmación de pedido (`/social-checkout`), la interfaz no está heredando ni aplicando correctamente el sistema de temas (variables CSS de tema claro/oscuro o configuración de estilos del sitio/catálogo).

Esto genera severos problemas de contraste e inconsistencia visual:
1. **Contraste de texto en tarjetas:** Títulos, subtítulos, etiquetas y resúmenes de precios se renderizan en tonos blancos/grises claros sobre fondos de tarjeta blancos, haciéndolos prácticamente invisibles.
2. **Inconsistencia en inputs y controles:** Los campos de formulario (`<input>`, `<select>`, `<textarea>`) tienen fondo oscuro (`#000` o fondo de tema oscuro) forzado dentro de contenedores claros.
3. **Falta de variables dinámicas:** El template/componente tiene estilos estáticos o no inyecta el wrapper/clase raíz del tema activo (`data-theme`, clases dinámicas o layout base de la app).

---

### Tareas a Realizar

1. **Integración con el Layout / Sistema de Temas:**
   - Asegurar que la plantilla/componente de `/social-checkout` extienda el layout base correcto o herede las variables CSS globales del tema activo (`--bg-primary`, `--bg-card`, `--text-primary`, `--text-muted`, `--border-color`, `--input-bg`, `--input-text`, etc.).
   - Verificar que el endpoint cargue y pase al contexto/render la configuración del tema o el ID de tema activo del catálogo.

2. **Refactorización de Formularios y Componentes:**
   - Reemplazar estilos hardcodeados (como fondos oscuros en inputs o colores de texto claros fijos) por las variables de diseño o clases semánticas del framework/tema.
   - Asegurar que inputs, selectores y textareas tomen automáticamente el color de fondo y de texto correspondiente al contenedor padre y tema seleccionado.

3. **Corrección de Jerarquía Visual y Legibilidad:**
   - Garantizar contraste suficiente (estándar WCAG AA) tanto en modo claro como en modo oscuro para:
     - Encabezado ("Confirmar tu Pedido", botón de volver).
     - Tarjeta de resumen de pedido (nombres de productos, cantidades, precios y total estimado).
     - Tarjeta de datos de entrega y pago (etiquetas, switches, campos de texto y notas).

4. **Entregables Requeridos:**
   - Archivos modificados (controlador/endpoint, plantilla HTML/QWeb/JSX/Vue y hojas de estilo CSS/SCSS).
   - Explicación breve de la causa raíz de la desconexión con el tema y cómo fue solventada.