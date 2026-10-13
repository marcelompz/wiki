# 📖 Manual de Usuario: Deploy Manager & Provisioning Zero-Touch (Odoo 18 CE)

> **Dirigido a:** SuperAdministradores de Infraestructura, DevOps y Administradores de Sistemas.  
> **Versión del Sistema:** OmniFlow Infrastructure Manager v1.20.10  
> **Fecha:** 2026-08-16  

---

## 📋 ÍNDICE

1. [Visión General](#1-visión-general)
2. [Acceso y Panel Principal de Servidores](#2-acceso-y-panel-principal-de-servidores)
3. [Asistente de Despliegue Zero-Touch (Paso a Paso)](#3-asistente-de-despliegue-zero-touch-paso-a-paso)
   - [Paso 1: Servidor Destino y Parámetros Básicos](#paso-1-servidor-destino-y-parámetros-básicos)
   - [Paso 2: Sincronización Git y Escáner Dinámico de Módulos](#paso-2-sincronización-git-y-escáner-dinámico-de-módulos)
   - [Paso 3: Plantillas e Ingesta Personalizada de Datos (CSV)](#paso-3-plantillas-e-ingesta-personalizada-de-datos-csv)
   - [Paso 4: Confirmación y Despliegue Automatizado](#paso-4-confirmación-y-despliegue-automatizado)
4. [Gestión de Llaves SSH y Servidores Remotos](#4-gestión-de-llaves-ssh-y-servidores-remotos)
5. [Monitoreo en Tiempo Real y Logs por Contenedor](#5-monitoreo-en-tiempo-real-y-logs-por-contenedor)
6. [Preguntas Frecuentes y Solución de Problemas](#6-preguntas-frecuentes-y-solución-de-problemas)

---

## 1. Visión General

El **Deploy Manager** de OmniFlow es el centro de orquestación de infraestructura que permite desplegar e inicializar instancias aisladas de **Odoo 18 Community Edition (CE)** y **Enterprise Edition (EE)** en cuestión de segundos sobre servidores propios o proveedores cloud (Hetzner, AWS, VPS locales).

![Dashboard de Deploy Manager](/opt/orderflow/docs/screenshots/deploy-manager/01-deploy-manager-dashboard.png)

### 🌟 Características Principales:
* **Escáner Dinámico SSH de Módulos**: Detecta automáticamente todas las extensiones y customizaciones ubicadas en `/srv/odoo-addons/18` y `/srv/odoo-l10n-py/18`.
* **Sincronización Git Automática**: Ejecuta `git pull origin main` en los repositorios de addons del servidor remoto antes de desplegar.
* **Ingesta Secuencial de Datos (.csv)**: Carga inteligente de Categorías con método de costeo (FIFO/PPP), Categorías del POS, Productos/Materias Primas, Recetas LdM (BOM) y distribución del Salón y Mesas.
* **Orquestación SSL/Reverse Proxy**: Registro transparente en Traefik v3.4 con certificados SSL automáticos (Let's Encrypt).

---

## 2. Acceso y Panel Principal de Servidores

Para ingresar al panel de infraestructura:
1. Inicia sesión en el **Panel de Administración** (`/admin/login`) con tus credenciales de **SuperAdmin**.
2. En la barra lateral izquierda, dirígete a **Infraestructura ➔ Despliegues & Servidores** (`/admin/deploy`).

En la vista principal encontrarás:
* **Tabla de Servidores Registrados**: Lista los servidores activos (ej. `Hetzner Production`, `VPS Paraguay`), mostrando la IP host, puerto SSH y estado de salud.
* **Tabla de Instancias Odoo**: Muestra todas las bases de datos en ejecución, versión, puerto web asignado, dominio público y fecha de último despliegue.

---

## 3. Asistente de Despliegue Zero-Touch (Paso a Paso)

Haz clic en el botón verde **`+ Nueva Instancia`** para abrir el wizard guiado de 4 pasos.

---

### Paso 1: Servidor Destino y Parámetros Básicos

![Paso 1 del Wizard](/opt/orderflow/docs/screenshots/deploy-manager/02-wizard-step1-servidor.png)

En este paso defines la identidad de la nueva base de datos de Odoo:
* **Servidor Destino**: Selecciona el VPS donde se levantará el contenedor Docker (ej. `Hetzner-OrderFlow`).
* **Sistema a Desplegar**: Selecciona `Odoo ERP`.
* **Dominio del Sitio**: Ingresa el FQDN o subdominio asignado al comercio (ej. `sucursal.provecchio.com`).
* **Tenant OmniFlow Asociado**: Vincula el comercio registrado en OmniFlow para habilitar el conector bi-direccional `orderflow_connect`.
* **Versión y Edición**: Selecciona `Odoo 18` y `Community Edition (CE)`.
* **Credenciales de Administrador Odoo**: Define el email y la contraseña inicial del usuario `admin`. Si dejas la contraseña en blanco, el sistema generará una clave aleatoria segura.

---

### Paso 2: Sincronización Git y Escáner Dinámico de Módulos

![Paso 2 del Wizard](/opt/orderflow/docs/screenshots/deploy-manager/03-wizard-step2-modulos.png)

Al seleccionar el servidor destino, OmniFlow ejecuta de fondo un escaneo SSH seguro sobre las rutas `/srv/odoo-addons/18` y `/srv/odoo-l10n-py/18`:
1. **Actualización de Repositorios**: Ejecuta un `git pull` automático para descargar los últimos commits de tus repositorios.
2. **Detección de Manifiestos**: Escanea todos los directorios que posean un archivo `__manifest__.py`.
3. **Listado Dinámico**: El desplegable **Módulos Múltiples a Pre-instalar** te presentará las opciones categorizadas con banderas e íconos:
   - 🇵🇾 `l10n_py` - Localización Paraguay (Paraguay SET / SIFEN Facturación Electrónica).
   - 🇵🇾 `l10n_py_reports` - Reportes Contables (Libro IVA Ventas/Compras y Hechauka).
   - ⚡ `orderflow_integration` - Conector OmniFlow.
   - 🧩 Módulos personalizados detectados en `/srv/odoo-addons/`.

---

### Paso 3: Plantillas e Ingesta Personalizada de Datos (CSV)

![Paso 3 del Wizard](/opt/orderflow/docs/screenshots/deploy-manager/04-wizard-step3-csv-uploads.png)

Para evitar la carga manual en Odoo post-instalación, puedes adjuntar tus archivos `.csv` en las tarjetas correspondientes. El motor Zero-Touch procesará la ingesta en el **orden contable y operativo correcto**:

1. **`1. Categorías Productos & Valoración (FIFO/PPP)`**:
   - Crea las categorías de productos configurándoles individualmente el método de costeo (`fifo`, `average` o `standard`) y su valoración de inventario (`real_time` o `manual_periodic`).
2. **`2. Categorías del Punto de Venta (POS)`**:
   - Ingesta los grupos de la carta o menú de venta (Pizzas, Bebidas, Postres, etc.).
3. **`3. Productos & Materias Primas`**:
   - Crea el catálogo de insumos y artículos listos para la venta, asociándolos automáticamente a sus categorías correspondientes.
4. **`4. Recetas LdM / Gastronomía`**:
   - Genera las Listas de Materiales (BOM) vinculando insumos con platos o combos.
5. **`5. Salón & Mesas POS`**:
   - Crea las zonas del restaurante (Salón Principal, Terraza) y las mesas asignando su capacidad de sillas.

> 💡 **Tip:** Puedes hacer clic en cualquiera de los botones de descarga de plantilla (`Cat. Productos (.csv)`, `Cat. POS (.csv)`, `Materias Primas (.csv)`, etc.) para obtener un archivo de muestra listo para completar.

---

### Paso 4: Confirmación y Despliegue Automatizado

Revisa el resumen final y haz clic en **`Desplegar Instancia Zero-Touch Ahora`**.

El motor de aprovisionamiento realizará los siguientes pasos sin intervención humana:
1. Creación de directorios aislados en `/srv/odoo-deploy/18/<nombre_instancia>`.
2. Generación del archivo `docker-compose.yml` e inicio de los servicios de Odoo 18 y PostgreSQL 15.
3. Instalación prioritaria de la Localización Paraguaya (`l10n_py`) para establecer el plan de cuentas correcto.
4. Ejecución del script Python nativo post-init vía XML-RPC para ingestar los CSVs de categorías, productos, recetas y mesas.
5. Registro en Traefik para Habilitar HTTPS / SSL.

---

## 4. Gestión de Llaves SSH y Servidores Remotos

Si necesitas agregar un nuevo servidor o actualizar la clave de acceso de uno existente:
1. Haz clic en **`Editar Servidor`** o **`+ Agregar Servidor`** en el panel principal.
2. Puedes seleccionar tres métodos de autenticación SSH:
   - **Clave SSH Pegada**: Pega directamente el contenido privado de tu llave (`-----BEGIN OPENSSH PRIVATE KEY-----`).
   - **Ruta de Archivo Local**: Especifica una ruta dentro del host (ej. `~/.ssh/id_rsa`).
   - **Fallback Automático**: Si dejas el campo en blanco, OmniFlow probará automáticamente los pares de llaves locales del sistema (`~/.ssh/id_ed25519`, `~/.ssh/id_rsa`).

---

## 5. Monitoreo en Tiempo Real y Logs por Contenedor

Para inspeccionar el comportamiento interno de cualquier instancia:
1. En la tabla de instancias de Odoo, presiona el botón **`Ver Logs`** en la columna de acciones.
2. Se abrirá una consola interactiva con auto-refresco en tiempo real (`tail -f`) mostrando las salidas del contenedor Docker de Odoo y la base de datos PostgreSQL.
3. En caso de fallas o reinicios, puedes verificar los códigos de salida y trazas de depuración de Python directamente desde esta vista.

---

## 6. Preguntas Frecuentes y Solución de Problemas

### ❓ ¿Qué ocurre si un producto en el CSV no tiene categoría especificada?
Se asignará automáticamente a la categoría por defecto **`All`** de Odoo, heredando la configuración global asignada.

### ❓ ¿Cómo actualizo el código de mis módulos personalizados antes de desplegar?
No requieres ingresar por terminal SSH. Al seleccionar el servidor en el Paso 1 del Wizard, OmniFlow ejecuta automáticamente `git pull` en las carpetas de addons del servidor remoto.

### ❓ ¿Qué versión de PostgreSQL utiliza Odoo 18?
El motor instancia contenedores optimizados de **PostgreSQL 15** con volumen de datos persistente en `/var/lib/postgresql/data`.
