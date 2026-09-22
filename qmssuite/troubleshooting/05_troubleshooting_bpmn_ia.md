# Troubleshooting: Generador IA de Diagramas BPMN 2.0

**Fecha:** 2026-09-22  
**Versión:** 1.9.0  
**Módulo:** Control Documental y Lista Maestra (§7.5 ISO 9001:2015)

---

## BPMN-01: Proveedor de IA no configurado

**Síntoma:** `"Gemini API key no configurada. Configurela desde el panel de Configuración del sistema."` o similar para OpenAI/Ollama.

**Causa raíz:** No se ha configurado ningún proveedor de IA en **Configuración > IA**, o faltan credenciales/modelos según el proveedor seleccionado.

**Solución aplicada:**
1. Ir a **Configuración > IA**.
2. Seleccionar proveedor: `Gemini`, `OpenAI` u `Ollama`.
3. Completar los campos requeridos:
   - Gemini: API key.
   - OpenAI: API key, base URL y modelo.
   - Ollama: base URL y modelo local.
4. Guardar y reintentar la generación.

---

## BPMN-02: Respuesta de la IA no es JSON válido

**Síntoma:** `"La respuesta de la IA no es un JSON válido."`

**Causa raíz:** El modelo de IA devuelve texto narrativo o JSON formateado con markdown en lugar del JSON puro requerido por el esquema BPMN.

**Solución aplicada:**
1. El sistema intenta extraer JSON de bloques markdown.
2. Si falla, reintentar generación o cambiar a un modelo con mejor cumplimiento de esquema.
3. Mejorar el prompt reduciendo la ambigüedad del texto del procedimiento.

---

## BPMN-03: Error en el motor de layout determinista

**Síntoma:** `"Error en el motor de layout: ..."`

**Causa raíz:** El XML semántico generado desde el JSON contiene nodos huérfanos o referencias cruzadas inválidas que `bpmn-auto-layout` no puede procesar.

**Solución aplicada:**
1. El sistema valida el JSON antes de generar XML.
2. En caso de fallo, regenerar el flujograma tras corrección del texto.

---

## BPMN-04: bpmn-js no renderiza el diagrama

**Síntoma:** El área del editor queda en blanco o muestra errores de CSS.

**Causa raíz:** Falta de importación de hojas de estilos de `bpmn-js`.

**Solución aplicada:**
1. Verificar importaciones en `BpmnEditor.tsx`:
   - `bpmn-js/dist/assets/diagram-js.css`
   - `bpmn-js/dist/assets/bpmn-font/css/bpmn.css`

---

## BPMN-05: Error de conexión con proveedor local/remoto

**Síntoma:** `"OpenAI API error"` / `"Ollama API error"` / `"Gemini API error"`.

**Causa raíz:** URL incorrecta, API key inválida, modelo no disponible o servicio caído.

**Solución aplicada:**
1. Verificar conectividad a la base URL configurada.
2. Verificar API key y modelo en el panel de Configuración.
3. Para Ollama local: confirmar que el servicio está corriendo (`ollama serve`) y que el modelo está descargado (`ollama pull llama3.2`).

---

## BPMN-06: XML BPMN 2.0 inválido

**Síntoma:** `"Validación BPMN fallida: El XML generado no parece ser un documento BPMN 2.0 válido."`

**Causa raíz:** El XML semántico generado desde el JSON carece de elementos obligatorios de BPMN 2.0.

**Solución aplicada:**
1. El sistema valida la presencia de `<definitions>`, `<process>` y `<sequenceFlow>` antes de aplicar layout.
2. Reintentar generación o corregir el texto del procedimiento.

---

## BPMN-07: Importación de archivo BPMN fallida

**Síntoma:** Al importar un archivo `.bpmn` o `.xml`, el editor no carga el diagrama.

**Causa raíz:** El archivo no es un BPMN 2.0 válido o está corrupto.

**Solución aplicada:**
1. Verificar que el archivo sea un XML BPMN 2.0 válido.
2. Verificar que el archivo no esté vacío o corrupto.
3. Usar la opción de regenerar desde el texto del procedimiento si el diagrama original es irreparable.

---

## BPMN-08: Exportación SVG/PNG/PDF vacía o corrupta

**Síntoma:** El archivo SVG, PNG o PDF descargado está vacío, corrupto o no representa el diagrama.

**Causa raíz:** El canvas de `bpmn-js` no estaba listo en el momento de la exportación, o el navegador bloqueó la generación de blob.

**Solución aplicada:**
1. Asegurarse de que el diagrama esté completamente cargado antes de exportar.
2. Verificar que el navegador permita descargas automáticas.
3. Reintentar la exportación después de ajustar el zoom con **Ajustar a vista**.

---

## BPMN-09: Drag & drop no responde

**Síntoma:** Al arrastrar un archivo `.bpmn` o `.xml` sobre el editor, no se importa.

**Causa raíz:** El evento `drop` no se propagó correctamente o el archivo no es un BPMN válido.

**Solución aplicada:**
1. Asegurarse de soltar el archivo directamente sobre el área del diagrama.
2. Verificar que el archivo sea un XML BPMN 2.0 válido.
3. Revisar la consola del navegador para errores de parsing XML.

---

## BPMN-10: Historial de cambios vacío

**Síntoma:** El botón **Historial** no muestra versiones anteriores del diagrama.

**Causa raíz:** El diagrama nunca fue editado o guardado previamente en la versión documental.

**Solución aplicada:**
1. Editar y guardar el diagrama al menos una vez para generar un punto de restauración.
2. El historial se genera automáticamente al guardar cambios en el editor BPMN.

