# Plan de Integración: Generador IA de Diagramas BPMN 2.0 en QMSSuite

**Proyecto:** QMSSuite (ISO 9001 Quality Management Suite)  
**Versión de Referencia:** 1.8.1  
**Módulo Destino:** Control Documental y Lista Maestra (§7.5 ISO 9001:2015)  
**Fecha de Documento:** 21 de Septiembre de 2026  

---

## 1. Visión General y Objetivos

Este documento especifica la arquitectura, flujo de datos y plan de ejecución paso a paso para incorporar la **generación automática de flujogramas de procedimientos en estándar BPMN 2.0 mediante Inteligencia Artificial** dentro de **QMSSuite**.

El objetivo primario es permitir que los responsables de calidad redacten el texto de un procedimiento o instructivo en la Lista Maestra (§7.5) y, con un solo clic, generen un diagrama de flujo interactivo, normativamente correcto, editable y auditable.

---

## 2. Arquitectura del Módulo

Para cumplir con la directiva *Local-First* de QMSSuite y evitar errores de sintaxis XML comunes en la generación directa por LLMs, la arquitectura desacopla el razonamiento de la diagramación:

```
┌─────────────────────────────────────────────────────────┐
│ Texto del Procedimiento / Instructivo (ISO 9001 §7.5)  │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Inferencia IA (Gemini API / LLM)                        │
│ ➔ Salida: JSON Estructurado (Lanes, Nodos, Aristas)    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Motor de Layout Determinista (`bpmn-auto-layout`)       │
│ ➔ Convierte JSON en XML BPMN 2.0 válido con coords X/Y │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Visor / Editor en Frontend (`bpmn-js`)                  │
│ ➔ Renderizado interactivo en Canvas React               │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Persistencia Local-First (`qmsLocalFirst.ts`)           │
│ ➔ Almacenamiento IndexedDB y réplica CouchDB (p:5985)   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Especificación del Contrato JSON (Intercambio IA ➔ Motor)

El *System Prompt* de la IA exigirá estrictamente el siguiente esquema de respuesta estructurada en formato JSON:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BPMNProcessStructure",
  "type": "object",
  "properties": {
    "processName": { "type": "string" },
    "lanes": {
      "type": "array",
      "items": {
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" }
        },
        "required": ["id", "name"]
      }
    },
    "nodes": {
      "type": "array",
      "items": {
        "properties": {
          "id": { "type": "string" },
          "type": { 
            "type": "string", 
            "enum": ["startEvent", "endEvent", "userTask", "serviceTask", "exclusiveGateway", "parallelGateway"] 
          },
          "laneId": { "type": "string" },
          "label": { "type": "string" }
        },
        "required": ["id", "type", "laneId", "label"]
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "properties": {
          "from": { "type": "string" },
          "to": { "type": "string" },
          "label": { "type": "string" }
        },
        "required": ["from", "to"]
      }
    }
  },
  "required": ["processName", "lanes", "nodes", "edges"]
}
```

---

## 4. Componentes y Stack de Software Integrado

| Componente | Paquete / Librería | Función |
| :--- | :--- | :--- |
| **Canvas UI** | `bpmn-js` | Componente React para editar, mover nodos, guardar y exportar en SVG/XML. |
| **Layout Motor** | `bpmn-auto-layout` | Algoritmo determinista que calcula las posiciones geométricas ($X, Y$) del XML BPMN. |
| **Orquestador IA** | Servidor / API Gemini | Procesa la redacción del procedimiento y extrae las reglas de negocio en JSON. |
| **Base de Datos** | `qmsLocalFirst.ts` (PouchDB / CouchDB) | Garantiza disponibilidad *offline* y sincronización continua con la base central. |
| **Edge Router** | Traefik v3 | Enrutamiento transparente bajo la política obligatoria de red QMSSuite. |

---

## 5. Cronograma de Implementación

### Fase 1: Integración del Editor Visual en Frontend (`bpmn-js`)
- Instalación de dependencias core: `npm install bpmn-js bpmn-auto-layout`.
- Creación del componente reutilizable `src/components/documents/BpmnEditor.tsx`.
- Soporte para exportación instantánea en formatos `.bpmn` (XML) y `.svg` (gráficos vectoriales para reportes de auditoría).

### Fase 2: Módulo IA y Generador de Layout
- Creación del servicio `src/services/bpmnGenerator.ts`.
- Implementación de la llamada a la API con la estructura de prompt estricta y esquematizada.
- Integración de `bpmn-auto-layout` para la conversión automática de JSON a XML BPMN 2.0.

### Fase 3: Integración con Lista Maestra ISO 9001 (§7.5)
- Actualización de tipos TypeScript en `src/types/qms.ts` incorporando el campo opcional `bpmnXml?: string` en la interfaz `DocumentItem`.
- Adición del botón **"Generar Flujograma con IA"** en el editor de borradores documentales.
- Sellado criptográfico de los diagramas mediante hash SHA-256 junto con la versión documental aprobada.

### Fase 4: Pruebas, Resiliencia y Documentación
- Verificación de replicación bidireccional en PouchDB / CouchDB (`:5985`).
- Pruebas de usabilidad en dispositivos táctiles de planta (Kiosco PWA).
- Actualización del contrato de OpenAPI en `src/components/admin/OpenApiDocs.tsx` y adición de manuales en `/docs/manuales/`.

---

## 6. Consideraciones de Seguridad y Normativa ISO 9001

1. **Gobernanza y Trazabilidad:** La generación por IA es un **asistente de borrador**. Todo flujograma requiere aprobación explícita mediante firma PIN por un usuario calificado (`QUALITY_ADMIN` o `AUDITOR`).
2. **Privacidad de Datos:** La información del procedimiento procesada por la IA no incluye datos personales identificables (PII) ni claves operativas, únicamente la secuencia de tareas industriales.
3. **Control de Versiones Atómico:** Al aprobar una nueva versión de un procedimiento, el XML BPMN anterior pasa automáticamente a estado `OBSOLETO`, manteniendo la integridad histórica demandada en las auditorías ISO.