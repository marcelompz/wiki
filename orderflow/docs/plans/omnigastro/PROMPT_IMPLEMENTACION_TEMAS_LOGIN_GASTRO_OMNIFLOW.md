# **PROMPT MAESTRO DE REFACTORIZACIÓN Y CORRECCIÓN DE TEMAS EN OMNIFLOW**

Este documento establece las directrices técnicas para la corrección de inconsistencias visuales y funcionales en el ecosistema Frontend de OmniFlow.

&nbsp;

| Atributo | Detalle |
| :---- | :---- |
| **Módulos objetivo** | Autenticación (`/login`) y Panel Gastronómico (`/admin/gastro`) |
| **Ecosistema** | React / Tailwind CSS / Refine / i18next |
| **Objetivo** | Resolver inconsistencias de Dark Mode, claves i18n y autofill de formularios. |

# **1\. CONTEXTO Y DIAGNÓSTICO DEL PROBLEMA**

Durante las pruebas de interfaz en entorno de staging/producción se evidenciaron discrepancias críticas de diseño y renderizado en dos rutas clave:

## **Caso A: Pantalla de Login (`/login`)**

* **Inconsistencia de Fondo/Tema Raíz:** El fondo de la página permanece en color claro (`#f3f4f6`) mientras la tarjeta central del formulario usa un tema oscuro (`bg-gray-900`). Esto provoca que el logo superior blanco desaparezca por falta de contraste.  
* **Falla en el Diccionario i18n:** Los textos muestran claves literales (`login.subtitle`, `login.email`, etc.), indicando que el namespace no está resuelto en el hook `useTranslation`.  
* **Autofill Desalineado:** Al autocompletar credenciales, los inputs adquieren el estilo predeterminado de WebKit (amarillo/oliva), rompiendo la estética oscura.

## **Caso B: Gestión de Mesas y Códigos QR (`/admin/gastro`)**

* **Contenedor Blanco Hardcodeado:** El bloque superior de creación de mesas posee una clase estática de fondo claro (`bg-white` o `bg-slate-50`), produciendo un choque visual severo contra el modal oscuro.  
* **Falta de Variantes Oscuras:** El campo de texto y el botón de acción no utilizan clases condicionales `dark:`, resultando en desajustes de contraste en bordes y placeholders.

# **2\. INSTRUCCIONES ESPECÍFICAS DE IMPLEMENTACIÓN**

## **Tarea 1: Unificación del Proveedor de Temas y Layout Raíz**

Garantizar que el selector de tema se aplique de forma consistente en la etiqueta `<html>` o contenedor raíz.

&nbsp;

* **Archivos:** `src/app/layout.tsx`, `src/providers/ThemeProvider.tsx`.  
* **Requisitos:**  
  1. Asegurar que rutas públicas (`/login`) y privadas (`/admin/*`) compartan el mismo contexto de tema.  
  2. En `/login`, definir el contenedor de pantalla completa con soporte de tema:

&nbsp;

\<div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200"\>

&nbsp;

  {/\* Card de Login \*/}

&nbsp;

\</div\>

## **Tarea 2: Resolución de Internacionalización (i18n)**

Sustituir las claves crudas por textos traducidos en español (`es`) con fallback en inglés (`en`).

&nbsp;

* **Namespace requerido:** `auth.json` o `login.json`.  
* **Estructura de claves:**

&nbsp;

{

&nbsp;

  "login": {

&nbsp;

    "title": "Iniciar Sesión",

&nbsp;

    "subtitle": "Accede a tu panel operativo OmniFlow",

&nbsp;

    "email": "Correo electrónico",

&nbsp;

    "password": "Contraseña",

&nbsp;

    "submit": "Ingresar al Panel",

&nbsp;

    "or": "O continúa con",

&nbsp;

    "apiKeyMode": "Acceder con API Key",

&nbsp;

    "newToOmniFlow": "¿Nuevo en OmniFlow?",

&nbsp;

    "createCatalogFree": "Crear Catálogo Gratis"

&nbsp;

  }

&nbsp;

}

## **Tarea 3: Normalización de Autofill de Navegadores**

Evitar que el autocompletado sobrescriba el fondo oscuro con tonos amarillos en `src/styles/globals.css`./\* Reset de WebKit Autofill para Dark Mode \*/

&nbsp;

.dark input:-webkit-autofill,

&nbsp;

.dark input:-webkit-autofill:hover,

&nbsp;

.dark input:-webkit-autofill:focus,

&nbsp;

.dark input:-webkit-autofill:active {

&nbsp;

  \-webkit-text-fill-color: \#f3f4f6 \!important;

&nbsp;

  \-webkit-box-shadow: 0 0 0 1000px \#111827 inset \!important;

&nbsp;

  box-shadow: 0 0 0 1000px \#111827 inset \!important;

&nbsp;

  transition: background-color 5000s ease-in-out 0s;

&nbsp;

}

## **Tarea 4: Corrección del Modal de Mesas en OmniGastro**

Eliminar contenedores claros dentro del modal en `src/components/gastro/TablesManagementModal.tsx`.{/\* Contenedor de formulario de mesa \*/}

&nbsp;

\<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 mb-6"\>

&nbsp;

  \<p className="text-sm text-gray-600 dark:text-gray-300 mb-4"\>

&nbsp;

    Agrega las mesas de tu establecimiento. El sistema creará un código QR único con el token de cada mesa.

&nbsp;

  \</p\>

&nbsp;

  \<div className="flex flex-col sm:flex-row gap-3"\>

&nbsp;

    \<input

&nbsp;

      type="text"

&nbsp;

      placeholder="Nombre o Número de Mesa"

&nbsp;

      className="flex-1 px-4 py-2.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"

&nbsp;

    /\>

&nbsp;

    \<button

&nbsp;

      type="submit"

&nbsp;

      className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium shadow-sm transition-colors flex items-center justify-center gap-2"

&nbsp;

    \>

&nbsp;

      \<span\>+ Agregar Mesa\</span\>

&nbsp;

    \</button\>

&nbsp;

  \</div\>

&nbsp;

\</div\>

# **3\. CRITERIOS DE ACEPTACIÓN Y VERIFICACIÓN (QA)**

1. **Pantalla `/login`:** El fondo mantiene una estética oscura continua (`bg-gray-950`), el logo es visible con contraste adecuado y no se visualizan claves i18n literales.  
2. **Autofill:** El autocompletado en modo oscuro no presenta artefactos amarillos ni altera la legibilidad del texto.  
3. **Modal `/admin/gastro`:** La interfaz es 100% coherente en su paleta oscura, eliminando cualquier "flash" de secciones blancas.  
4. **Adaptabilidad:** El cambio entre temas claro y oscuro es fluido y mantiene la jerarquía visual en ambos entornos.

&nbsp;