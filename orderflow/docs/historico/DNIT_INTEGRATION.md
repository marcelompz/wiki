# Integración con la DNIT (Registro Único de Contribuyentes)

Este documento explica la arquitectura implementada en OrderFlow para consultar los datos de contribuyentes en Paraguay (RUC, Razón Social) de forma segura y optimizada, sin incurrir en problemas de CORS ni exponer credenciales en el cliente.

## 1. Regla de Oro Aplicada
**Nunca llamar a la API de la DNIT u otro integrador directamente desde React.**

Las peticiones HTTP que requieren enrutamiento a servidores gubernamentales o integradores de facturación (PACs) pueden enfrentar dos grandes problemas si se ejecutan en el frontend:
- **CORS (Cross-Origin Resource Sharing):** La mayoría de las APIs públicas bloquean llamadas directas desde navegadores para evitar abusos.
- **Seguridad:** Los tokens y certificados digitales estarían expuestos en el código fuente del cliente.

## 2. Arquitectura de "Proxy" Backend
La consulta se centraliza en el backend de NestJS a través de un endpoint dedicado.

* **Endpoint:** `GET /api/v1/sync/customers/dnit/:documento`
* **Implementación:** `backend/src/customers/customers.controller.ts`

### Funcionamiento del Controlador:
En lugar de conectar a un PAC costoso, el backend de OrderFlow aprovecha una API pública gratuita (`turuc.com.py`) que es la misma que utiliza el módulo de facturación electrónica de Odoo (`electronic_invoice_cross`).
Esto mantiene la compatibilidad y consistencia de los datos entre OrderFlow y el ERP.

## 3. Estrategia Optimista en el Frontend (POS y Admin)
La experiencia de usuario al cargar un RUC debe ser fluida, rápida y a prueba de fallos externos.

Se han modificado los siguientes componentes:
- **POS Simplificado:** `frontend/src/pages/checkout-simple.tsx`
- **Gestión de Clientes (Admin):** `frontend/src/pages/admin/customers.tsx`

### Flujo de la Consulta (Evento `onBlur`):
1. El usuario digita el número de RUC o Cédula y sale del campo (Tab o Click fuera).
2. React dispara la función asíncrona y coloca un estado de carga (`Spin`).
3. **Paso 1 (Memoria Rápida):** React verifica si el documento ya existe en la base local (Directorio Global de OrderFlow). Si es así, autocompleta instantáneamente.
4. **Paso 2 (Consulta SIFEN):** Si no existe, React llama a nuestro backend (`/dnit/:documento`).
5. El backend consulta a la API y devuelve un JSON estándar: `{ ruc, dv, razonSocial, estado }`.
6. React recibe la data, autocompleta el campo de Nombre/Razón Social y concatena el Dígito Verificador (DV) al documento ingresado.

### Manejo de Fallos Silencioso
Si la API externa de la DNIT está caída (Time-out de 10 segundos) o si devuelve error 404:
- React **no bloquea** la pantalla.
- Se deshabilita el Spinner.
- Se muestra una alerta leve: *"Documento no encontrado o sin conexión"*.
- El campo "Nombre/Razón Social" vuelve a ser editable para que el cajero pueda cargar los datos manualmente y continuar con la venta sin obstáculos.
