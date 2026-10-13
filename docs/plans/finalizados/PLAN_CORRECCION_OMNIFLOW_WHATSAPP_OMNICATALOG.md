Actúa como desarrollador frontend senior. La refactorización anterior de la extensión de WhatsApp Web sigue presentando errores graves de maquetación:
1. La barra superior (TopBar) salta de posición horizontal (de left: 0 a left relativo en el medio de la pantalla) según el estado del botón "Panel Activo".
2. La lista de contactos y el catálogo de productos se están montando como capas flotantes sobre el área de conversación (#main) en lugar de estar confinados dentro de un sidebar derecho dedicado.
3. Al hacer clic en "Panel Activo", los elementos flotantes permanecen en pantalla tapando los mensajes.

### Corrección obligatoria de arquitectura:

1. Estilos Globales de Layout (Inyectar en document.head):
Asegura que #app solo ocupe el ancho restante cuando el panel esté abierto:
```css
html, body {
  width: 100vw !important;
  height: 100vh !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Base: WhatsApp Web siempre baja 48px por la TopBar */
#app {
  position: fixed !important;
  top: 48px !important;
  left: 0 !important;
  height: calc(100vh - 48px) !important;
  transition: width 0.2s ease;
}

/* Cuando el panel lateral está activo: */
body.omniflow-panel-open #app {
  width: calc(100vw - 380px) !important;
}

/* Cuando el panel lateral está cerrado: */
body:not(.omniflow-panel-open) #app {
  width: 100vw !important;
}

Hosts únicos e independientes:

    #omniflow-topbar-root:

        Estilos inline forzados: position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 48px !important; z-index: 99999 !important; background: #0f172a !important;

        NUNCA cambiar su left ni su width. Debe ocupar siempre el 100% superior de la pantalla.

    #omniflow-sidebar-root:

        Estilos inline forzados: position: fixed !important; top: 48px !important; right: 0 !important; width: 380px !important; height: calc(100vh - 48px) !important; z-index: 99998 !important; background: #0b141a !important; border-left: 1px solid rgba(255,255,255,0.1) !important; display: flex !important; flex-direction: column !important;

        Si el panel está cerrado (body:not(.omniflow-panel-open)), aplicar display: none !important;.

    Agrupación de componentes:

    La lista de contactos, los avatares, los datos de Andrea González y el catálogo blanco (Americano, Cappuccino) DEBEN renderizarse EXCLUSIVAMENTE dentro de #omniflow-sidebar-root.

    Queda estrictamente prohibido inyectar estos elementos dentro de #main, .copyable-area o como hijos directos de body.

    El botón "Panel Activo" debe simplemente conmutar la clase document.body.classList.toggle('omniflow-panel-open').

Reescribe la inicialización en content-script.js asegurando que los dos hosts contengan a sus respectivos componentes y que ningún elemento quede flotando sobre el chat.
