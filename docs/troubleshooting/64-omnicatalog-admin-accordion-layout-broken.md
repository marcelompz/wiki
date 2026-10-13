# Troubleshooting #64: OmniCatalog admin — layout del acordeón roto (paneles horizontales / scroll lateral)

**Síntoma:**  
En la pestaña **Página y configuración** del admin de OmniCatalog, los paneles de configuración se deforman y quedan acoplados horizontalmente en una sola fila estrecha, generando scroll horizontal roto y perdiendo el layout vertical limpio a ancho completo que debería tener.

**Causa raíz:**  
El componente `Collapse` de Ant Design v5 usaba la sintaxis obsoleta `<Collapse.Panel>` combinada con bloques `<Space wrap>` y campos sueltos dentro del `<Form>`. Esa estructura generaba un contenedor interno con display/width incorrecto y anidamiento incompleto, rompiendo el flujo vertical.

**Solución aplicada:**  
- Migrado `Collapse` a la API declarativa `items` de Ant Design v5:
  - `<Collapse accordion defaultActiveKey={['contact']} items={accordionSections} style={{ width: '100%', marginBottom: 24 }} />`
- Reagrupadas las 8 secciones dentro de `items` sin elementos huérfanos:
  1. 📱 Datos de contacto
  2. 🌐 Redes sociales
  3. 🚚 Envíos
  4. 🛒 Modo de venta
  5. 🎨 Personalización y ajuste visual
  6. ⭐ Banner de productos destacados
  7. 👁️ Visibilidad en catálogo público
  8. 🏷️ Gestión de categorías
- Ubicado `CatalogLivePreview` y el botón **Guardar cambios** fuera del `<Collapse>`, debajo del acordeón.
- Mantenido el cierre completo de etiquetas (`</Collapse.Panel>`, `</Collapse>`, `</Form>`, `</Card>`, etc.) para evitar JSX desbalanceado.

**Archivos involucrados:**  
- `frontend/src/pages/admin/social-catalog.tsx`
- `frontend/src/components/admin/CatalogLivePreview.tsx`

**Validación:**  
- Frontend compila sin errores TypeScript (`tsc --noEmit`).
- En admin, el acordeón se apila verticalmente y ocupa el 100% del ancho del card.
- No quedan `<Collapse.Panel>` huérfanos ni scroll horizontal innecesario.
