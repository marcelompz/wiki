# Manual de Usuario: Generador IA de Flujogramas BPMN 2.0

**Módulo:** Control Documental y Lista Maestra (ISO 9001:2015 §7.5)  
**Versión:** 1.9.0  
**Fecha:** 2026-09-22

---

## 1. Objetivo

Este manual describe cómo utilizar el **Generador IA de Flujogramas BPMN 2.0** integrado en QMSSuite para transformar automáticamente el texto de procedimientos e instructivos en diagramas de flujo interactivos, normativamente correctos y editables.

## 2. Requisitos Previos

- Rol habilitado: `QUALITY_MANAGER`, `SUPER_ADMIN`, `PROCESS_OWNER` o `AUTHOR`.
- Proveedor de IA configurado desde **Configuración > IA**:
  - **Gemini**: API key de Google AI Studio.
  - **OpenAI / compatible**: API key, base URL y modelo.
  - **Ollama (local)**: URL de instancia local y modelo.
- Documento con contenido markdown suficiente (mínimo 20 caracteres) en la Lista Maestra.

## 3. Flujo de Trabajo

### 3.1 Generación del Flujograma

1. Abra el detalle del documento desde la **Lista Maestra**.
2. Haga clic en el botón **"Generar Flujograma con IA"** en la barra de acciones.
3. Espere a que el sistema:
   - Envíe el texto al proveedor configurado con el esquema BPMN estricto.
   - Valide la estructura JSON retornada.
   - Genere el XML BPMN 2.0 semántico.
   - Aplique el layout determinista con coordenadas X/Y.

### 3.2 Edición del Diagrama

Una vez generado, el diagrama se abre en el editor visual (`bpmn-js`):

- **Mover nodos:** arrastrar elementos para reubicarlos.
- **Conectar elementos:** usar la paleta de conexiones para crear secuencias.
- **Editar etiquetas:** doble clic sobre cualquier nodo o secuencia.
- **Zoom:** usar los controles de la barra superior o la rueda del mouse.
- **Importar BPMN:** puede cargar un archivo `.bpmn` o `.xml` arrastrándolo al área del editor o usando el botón **Importar**.
- **Exportar SVG:** botón **SVG** para descargar el diagrama como vector.
- **Exportar PNG:** botón **PNG** para descargar una imagen raster del diagrama.
- **Exportar PDF:** botón **PDF** para descargar el diagrama como documento PDF.
- **Historial de cambios:** botón **Historial** para ver las versiones anteriores del diagrama y restaurarlas.
- **Guardar:** el botón **Guardar** persiste el XML editado en la versión documental.

### 3.3 Guardado y Aprobación

1. Haga clic en **Guardar** para persistir el XML editado en la versión documental.
2. Para formalizar el flujograma:
   - Haga clic en **Aprobar Flujograma**.
   - Ingrese su PIN de re-autenticación.
   - El sistema computará el hash SHA-256 del XML y generará un certificado de aprobación inmutable.

## 4. Consideraciones de Seguridad

- La generación por IA es un **asistente de borrador**. El flujograma requiere aprobación explícita por PIN.
- Las credenciales de IA se guardan localmente en el navegador y pueden configurarse en **Configuración > IA**.
- Todo cambio posterior a la aprobación requiere crear una nueva versión borrador.

## 5. Resolución de Problemas

| Síntoma | Causa | Solución |
|---------|-------|----------|
| "Proveedor de IA no configurado" | Falta API key o modelo | Ir a **Configuración > IA** y completar los datos del proveedor seleccionado |
| "La respuesta de la IA no es JSON válido" | Modelo devolvió texto narrativo | Reintentar o cambiar de modelo/proveedor |
| "La estructura BPMN no cumple el esquema" | JSON con referencias inválidas | Verificar que el procedimiento esté bien redactado |
| "Error en el motor de layout" | XML semántico inválido | Regenerar el flujograma |
| "Validación BPMN fallida" | XML sin estructura BPMN 2.0 mínima | Regenerar o importar un BPMN válido |
| "Error de conexión con proveedor" | URL/key/modelo incorrectos | Verificar configuración en **Configuración > IA** |

## 6. Trazabilidad ISO 9001

Cada flujograma generado almacena:
- **Proveedor de IA** utilizado.
- **Prompt enviado** a la IA (primeros 200 caracteres).
- **Respuesta cruda del LLM** (JSON estructurado).
- **XML BPMN 2.0 final** con coordenadas de layout.
- **Hash SHA-256** del XML.
- **Registro de aprobación** con PIN, timestamp y certificado.
