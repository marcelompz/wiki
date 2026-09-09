# **OmniCRM: Especificación Técnica de Google AI Studio y Function Calling**

Este documento detalla la arquitectura técnica para la integración de capacidades de Inteligencia Artificial Generativa en el ecosistema OmniCRM, utilizando la infraestructura de Google AI Studio y el framework de Function Calling para la optimización comercial de Provecchio.

# **1\. Configuración del Entorno en Google AI Studio**

La implementación se basa en un despliegue híbrido utilizando modelos de la familia Gemini, ajustados para equilibrar la profundidad analítica con la velocidad de respuesta.

## **Selección de Modelo**

| Caso de Uso | Modelo Recomendado | Justificación |
| :---- | :---- | :---- |
| Análisis Estratégico | Gemini 1.5 Pro | Ideal para auditoría de métricas, correlación compleja de datos de marketing y POS, y razonamiento de largo alcance. |
| Operación en Tiempo Real | Gemini 1.5 Flash | Optimizado para latencia baja en consultas rápidas de clientes y respuestas automáticas de soporte comercial. |

## **Parámetros del Modelo**

* **Temperature:** 0.2 (Configurado para priorizar la precisión y consistencia en la interpretación de datos numéricos).  
* **Top\_P:** 0.95.  
* **Max Output Tokens:** 8192\.  
* **Safety Settings:** Umbrales configurados para bloquear contenido de odio o acoso, permitiendo la libre interpretación de datos de facturación y comportamiento de usuario.

## **System Instructions (Prompt de Sistema)**

Las siguientes instrucciones deben configurarse en el campo "System Instructions" de Google AI Studio:

"Actúa como el Analista de Datos Senior de OmniCRM para Provecchio. Tu objetivo es cruzar datos de marketing digital (Meta/Google Ads), SEO (Search Console) y ventas físicas (OmniFlow POS). Debes ser preciso, basar tus conclusiones estrictamente en los datos obtenidos mediante herramientas y entender el contexto gastronómico de Encarnación. Siempre que analices ventas, busca correlaciones con campañas activas o tendencias orgánicas de búsqueda. Además, debes analizar las reglas de seguimiento de provecchio.com/admin/follow-up-rules para correlacionar la retención posventa con el LTV. Si los datos son insuficientes, solicita aclaraciones a través de los parámetros de las herramientas disponibles."

# **2\. Catálogo Detallado de Herramientas (Function Calling Schemas)**

Para que el modelo interactúe con los datos de Provecchio, se definen los siguientes esquemas JSON:

## **1\. get\_ad\_spend\_and\_metrics**

Consulta la inversión y rendimiento en plataformas de publicidad pagada.{

  "name": "get\_ad\_spend\_and\_metrics",

  "description": "Obtiene la inversión publicitaria y métricas de rendimiento (CPC, CTR, impresiones) de plataformas de anuncios.",

  "parameters": {

    "type": "object",

    "properties": {

      "platform": { "type": "string", "enum": \["meta", "google\_ads"\] },

      "start\_date": { "type": "string", "format": "date" },

      "end\_date": { "type": "string", "format": "date" },

      "campaign\_id": { "type": "string", "description": "Opcional: ID específico de la campaña" }

    },

    "required": \["platform", "start\_date", "end\_date"\]

  }

}

## **2\. get\_search\_console\_insights**

Métricas orgánicas de visibilidad en Google Search para el dominio provecchio.com.{

  "name": "get\_search\_console\_insights",

  "description": "Consulta clics, impresiones y posición media de palabras clave en Google Search Console.",

  "parameters": {

    "type": "object",

    "properties": {

      "start\_date": { "type": "string", "format": "date" },

      "end\_date": { "type": "string", "format": "date" },

      "dimension": { "type": "string", "enum": \["query", "page", "device"\] },

      "limit": { "type": "integer", "default": 10 }

    },

    "required": \["start\_date", "end\_date"\]

  }

}

## **3\. get\_pos\_sales\_report**

Reporte de facturación consolidada directamente desde el sistema OmniFlow.n  
{  
"name": "get\_pos\_sales\_report",  
"description": "Extrae datos de ventas reales del punto de venta, filtrados por canal o cupones.",  
"parameters": {  
"type": "object",  
"properties": {  
"start\_date": { "type": "string", "format": "date" },  
"end\_date": { "type": "string", "format": "date" },  
"channel": { "type": "string", "enum": \["salon", "delivery", "take\_away"\] },  
"coupon\_code": { "type": "string" }  
},  
"required": \["start\_date", "end\_date"\]  
}  
}

\#\#\# 4\. get\_attribution\_summary

Reporte agregado de ROAS real cruzando inversión y tickets.

\`\`\`json

{

  "name": "get\_attribution\_summary",

  "description": "Calcula el retorno de inversión publicitaria (ROAS) cruzando gastos de marketing con ventas efectivas.",

  "parameters": {

    "type": "object",

    "properties": {

      "start\_date": { "type": "string", "format": "date" },

      "end\_date": { "type": "string", "format": "date" },

      "group\_by": { "type": "string", "enum": \["campaign", "channel", "day"\] }

    },

    "required": \["start\_date", "end\_date"\]

  }

}

## **5\. get\_customer\_profile**

Consulta el historial detallado de un cliente específico.{

  "name": "get\_customer\_profile",

  "description": "Obtiene el historial de compras, preferencias y valor de vida del cliente (LTV).",

  "parameters": {

    "type": "object",

    "properties": {

      "customer\_id": { "type": "string" },

      "phone": { "type": "string" },

      "document\_id": { "type": "string" }

    }

  }

}

## **6\. get\_follow\_up\_rules\_and\_metrics**

Evalúa la efectividad de las automatizaciones de follow-up y su impacto en la re-compra.{

  "name": "get\_follow\_up\_rules\_and\_metrics",

  "description": "Obtiene las reglas de seguimiento activas y métricas de rendimiento como mensajes enviados, tasa de respuesta y tickets de re-compra generados en el POS.",

  "parameters": {

    "type": "object",

    "properties": {

      "rule\_type": { "type": "string", "description": "Tipo de regla de seguimiento a evaluar" },

      "start\_date": { "type": "string", "format": "date" },

      "end\_date": { "type": "string", "format": "date" }

    },

    "required": \["start\_date", "end\_date"\]

  }

}

# **3\. Implementación del Runner en Python (SDK google-genai)**

El siguiente código implementa el ciclo de ejecución para procesar llamadas a funciones de manera iterativa.from google import genai

from google.genai import types

\# Inicialización del cliente

client \= genai.Client(api\_key="TU\_API\_KEY")

\# Definición de funciones Mock para pruebas locales

def mock\_executor(function\_call):

    \# Aquí se conectarían los servicios reales o bases de datos

    responses \= {

        "get\_ad\_spend\_and\_metrics": {"spend": 450.0, "conversions": 120, "currency": "USD"},

        "get\_pos\_sales\_report": {"total\_revenue": 3500.0, "currency": "USD", "tickets": 145}

    }

    return responses.get(function\_call.name, {"status": "success", "data": "no\_data"})

def run\_omnicrm\_agent(user\_prompt):

    model\_id \= "gemini-1.5-pro"

    

    \# Configuración de herramientas

    tools \= \[

        types.Tool(function\_declarations=\[

            \# (Aquí se incluyen los esquemas JSON definidos en la sección 2\)

        \])

    \]

    

    chat \= client.chats.create(model=model\_id, config=types.GenerateContentConfig(tools=tools))

    response \= chat.send\_message(user\_prompt)

    

    \# Ciclo de ejecución de Function Calling

    while response.function\_calls:

        tool\_outputs \= \[\]

        for fc in response.function\_calls:

            result \= mock\_executor(fc) \# Enlace a la lógica de negocio

            tool\_outputs.append(types.Part.from\_function\_response(

                name=fc.name,

                response=result

            ))

        

        \# Enviar resultados de vuelta al modelo para la respuesta final

        response \= chat.send\_message(tool\_outputs)

    

    return response.text

\# Ejemplo de uso

\# print(run\_omnicrm\_agent("¿Cuál es el ROAS de la última semana?"))

# **4\. Batería de Prompts de Prueba y Validación**

A continuación se presentan los casos de prueba para validar la lógica del modelo:

## **Caso 1: Comparativa de ROAS**

**Prompt:** "¿Cuál fue el ROAS real de la campaña de Meta de este fin de semana comparado con lo cobrado en el POS?"

* **Pasos de razonamiento:** 1\. Llamar a `get_ad_spend_and_metrics` para Meta. 2\. Llamar a `get_pos_sales_report` filtrado por fecha. 3\. Calcular la relación Inversión/Venta.  
* **Resultado esperado:** Un informe detallado comparando el gasto reportado en Ads vs. los ingresos registrados en el sistema OmniFlow.

## **Caso 2: Correlación SEO-Ventas**

**Prompt:** "¿Qué relación hay entre el aumento de búsquedas en Search Console de 'pastas en Encarnación' y las ventas de platos de pasta en salón?"

* **Pasos de razonamiento:** 1\. Llamar a `get_search_console_insights` para filtrar por el término 'pastas'. 2\. Llamar a `get_pos_sales_report` segmentado por el canal 'salon'. 3\. Identificar picos coincidentes en ambos datasets.  
* **Resultado esperado:** Análisis narrativo que confirme si la visibilidad orgánica está impulsando el tráfico físico al restaurante.

## **Caso 3: Fidelización y Retorno**

**Prompt:** "¿Cuántos clientes captados por Click-to-WhatsApp volvieron a consumir en el restaurante en los últimos 30 días?"

* **Pasos de razonamiento:** 1\. Identificar clientes cuyo origen sea WhatsApp. 2\. Iterar con `get_customer_profile` o filtrar el reporte de ventas POS por dichos identificadores en los últimos 30 días.  
* **Resultado esperado:** Cantidad exacta de clientes recurrentes y su frecuencia de consumo tras el primer contacto digital.

## **Caso 4: Impacto de Reglas de Follow-up**

**Prompt:** "Audita el impacto en ventas de las reglas de follow-up activas. ¿Cuánta facturación en el POS proviene de clientes que recibieron un mensaje de seguimiento en los últimos 15 días?"

* **Pasos de razonamiento:** 1\. Llamar a `get_follow_up_rules_and_metrics` para identificar mensajes enviados. 2\. Cruzar identificadores con `get_pos_sales_report`. 3\. Correlacionar la tasa de respuesta con el incremento en tickets.  
* **Resultado esperado:** Informe sobre la efectividad de la retención automática y su peso porcentual en las ventas totales del periodo.

