# **PROMPT DE IMPLEMENTACIÓN: Integración de Proyecto Independiente OmniFlow en Extensión de WhatsApp Web**

**Gobernanza:** FEAT-072 / EXT-INTEGRATION v1.0.0  
**Ecosistema:** OmniFlow / WhatsApp Web Extension (Chrome MV3 & Firefox MV3)  
**Objetivo:** Incorporar de forma modular el proyecto independiente (OmniBot, OmniCatalog, OmniPOS y componentes UI) en el content-script de la extensión para WhatsApp Web (web.whatsapp.com), resolviendo los solapamientos de interfaz mediante aislamiento con Shadow DOM y ajuste de la ventana gráfica.

## 

1\. Contexto y Diagnóstico del Problema

Al compilar e inyectar el código fuente del paquete independiente en WhatsApp Web, los componentes fueron añadidos directamente al document.body con estilos flotantes (position: fixed / absolute) sin adaptar el contenedor nativo de la aplicación (\#app). Esto ocasionó:

> * **Superposición de la barra superior:** La TopBar de OmniFlow tapa el encabezado nativo, el avatar de perfil, el buscador y las primeras conversaciones fijadas de WhatsApp Web.  
> * **Solapamiento en conversaciones y chat:** Las respuestas y tarjetas autónomas se renderizan de manera duplicada o transparente sobre el panel principal (\#main) o la pantalla de bienvenida.  
> * **Falta de reserva para el panel lateral derecho:** El sidebar (OmniBot / Ficha 360° / Catálogo & POS) invade el área de conversación en vez de comportarse como una tercera columna integrada.

## 

2\. Especificaciones de Arquitectura y Layout

| Componente / Zona | Dimensiones | Mecanismo de Inyección | Comportamiento   |
| :---- | :---- | :---- | :---- |
| **TopBar OmniFlow** | Alto: 48px, Ancho: 100vw | Host: \#omniflow-topbar-root (Shadow DOM) | Fijo en top: 0, left: 0\. Empuja WhatsApp Web hacia abajo. |
| **Sidebar Derecho** | Ancho: 380px, Alto: 100vh \- 48px | Host: \#omniflow-sidebar-root (Shadow DOM) | Fijo en top: 48px, right: 0\. Contiene OmniBot, Ficha 360° y Catálogo & POS. |
| **WhatsApp Web (\#app)** | Ancho: 100vw \- 380px, Alto: 100vh \- 48px | Estilos forzados en CSS raíz | Posicionado en top: 48px, left: 0 sin colisiones ni barras de scroll desbordadas. |

## 

3\. Prompt para el Asistente de Desarrollo (Cursor / Copilot / Agy)

Actúa como un desarrollador frontend senior especializado en extensiones de navegador (Chrome/Firefox MV3) y manipulación del DOM en WhatsApp Web.

\#\#\# Contexto:  
Se requiere incorporar el proyecto independiente (que incluye TopBar, panel OmniBot, Catálogo/POS y configuración rápida) dentro del \`content-script\` de la extensión sin solapar la interfaz de WhatsApp Web.

\#\#\# Requerimientos de Implementación:

1\. Modificación de Viewport y Contenedor Principal (\#app):  
Inyecta reglas CSS prioritarias en el documento para redimensionar WhatsApp Web y reservar el espacio exacto de la barra superior y del sidebar derecho:  
\`\`\`css  
html, body {  
  height: 100vh \!important;  
  width: 100vw \!important;  
  overflow: hidden \!important;  
  margin: 0 \!important;  
  padding: 0 \!important;  
}

\#app {  
  position: fixed \!important;  
  top: 48px \!important;  
  left: 0 \!important;  
  width: calc(100vw \- 380px) \!important;  
  height: calc(100vh \- 48px) \!important;  
  min-width: 0 \!important;  
  transition: width 0.2s ease;  
}  
\`\`\`

2\. Creación de Hosts Aislados con Shadow DOM:  
Crea dos contenedores raíz en el \`body\`:  
\- \`\#omniflow-topbar-root\`:  
  \* Posición: \`position: fixed; top: 0; left: 0; width: 100vw; height: 48px; z-index: 9999;\`  
  \* Inicializar con \`attachShadow({ mode: 'open' })\`.  
  \* Vincular hoja de estilos compilada e instanciar la cabecera (OrderFlow HIGH-SPEED OMNI-SYSTEM, tenant, operador y botones de acción).  
\- \`\#omniflow-sidebar-root\`:  
  \* Posición: \`position: fixed; top: 48px; right: 0; width: 380px; height: calc(100vh \- 48px); z-index: 9998; border-left: 1px solid \#e9edef; background: \#fff;\`  
  \* Inicializar con \`attachShadow({ mode: 'open' })\`.  
  \* Montar la interfaz del proyecto independiente (OmniBot, Ficha 360°, Catálogo & POS y configuración rápida).

3\. Inyección y Limpieza en el Flujo de Chat:  
\- Asegurar que las burbujas contextuales ("OmniBot AI (RESPUESTA AUTÓNOMA)") y el banner de cifrado supervisado solo se monten cuando exista una conversación activa (\`\#main\`).  
\- Validar mediante atributos únicos (ejemplo: \`data-omniflow-id\`) para evitar nodos duplicados o solapamientos de texto al recibir eventos de WebSocket o al realizar scroll.

Genera el código modular y refactorizado de \`content-script.js\` junto con la estructura de inicialización requerida.


## 

4\. Criterios de Aceptación y Pruebas

> * **Verificación de layout:** En Chrome y Firefox, la barra superior debe mantenerse visible sin tapar la barra de búsqueda ni los chats fijados.  
> * **Sidebar acoplado:** El panel derecho de 380px debe permanecer fijo y contraer el ancho de WhatsApp Web sin generar barra de desplazamiento horizontal.  
> * **Aislamiento de estilos:** Las reglas CSS de WhatsApp Web no deben modificar los botones, swatches ni tipografías de los componentes inyectados de OmniFlow.  
> * **Estabilidad del chat:** Al alternar entre conversaciones, las respuestas y widgets deben actualizarse de forma limpia, sin duplicar capas de texto sobre el panel central.