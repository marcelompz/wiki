# Guía del Proceso de Despliegue en Producción

**Última Actualización:** 2026-08-03  
**Versión del Proceso:** 1.0

---

Este documento detalla el procedimiento estandarizado y riguroso para realizar despliegues en el entorno de producción de OrderFlow. El objetivo es garantizar la estabilidad, seguridad y consistencia del sistema en cada actualización.

## Fases del Despliegue

El proceso se divide en 5 fases clave, desde la validación de la calidad del código hasta la sincronización final con los repositorios.

### **Fase 0: Barrera de Calidad (Pre-Despliegue)**

Este es un paso inviolable. Antes de cualquier despliegue, es **obligatorio** ejecutar y pasar la barrera de validación automatizada.

*   **Ejecución del script `init.sh`**: Este script es el guardián de la calidad del código. Su ejecución y aprobación son un paso no negociable. El script verifica automáticamente:
    1.  **Pruebas Unitarias**: El 100% de las pruebas del backend (actualmente +498 tests) deben pasar.
    2.  **Compilación Limpia**: Tanto el backend (NestJS) como el frontend (Vite) deben compilar sin errores.
    3.  **Auditoría E2E (End-to-End)**: Se ejecuta una suite de Playwright que navega por la aplicación para asegurar que no haya errores de consola, red (404/502) o recursos rotos en las rutas críticas.

### **Fase 1: Preparación del Servidor de Producción**

Se asegura que el entorno de destino (actualmente un VPS en Hetzner) cumpla con los requisitos.

1.  **Requisitos Previos**: Git, Docker y Docker Compose deben estar instalados y actualizados. Los puertos `80`, `443` y `22` deben estar abiertos.
2.  **DNS y Cloudflare**: Los registros DNS del dominio apuntan a la IP del servidor. Se utiliza un token de API de Cloudflare para la gestión automática de subdominios de tenants.

### **Fase 2: Configuración del Entorno**

1.  **Clonado del Repositorio**: Se clona la rama `main` en un directorio dedicado (ej. `/srv/orderflow`).
2.  **Variables de Entorno**: Se configura el archivo `.env` con todas las credenciales y secretos de producción. Este archivo **nunca** se versiona en el repositorio.

### **Fase 3: Despliegue de la Aplicación con Docker Compose**

1.  **Construcción y Arranque**: Se utiliza el comando `docker compose -f docker-compose.prod.yml up -d --build --remove-orphans`.
    *   `--build`: Garantiza que se construyan nuevas imágenes con los últimos cambios del código.
    *   `--remove-orphans`: Elimina contenedores de servicios que ya no existen en el archivo compose, evitando duplicados.
    *   `-d`: Ejecuta los contenedores en segundo plano.
2.  **Migraciones de Base de Datos**: El contenedor del backend ejecuta automáticamente las migraciones (`npx prisma db push`) al iniciar, asegurando que el esquema de la base de datos esté sincronizado.
3.  **Proxy (Traefik)**: Traefik, que se gestiona de forma independiente, detecta los nuevos contenedores y les asigna las rutas y certificados SSL correspondientes de manera automática.

### **Fase 4: Verificación Técnica Post-Despliegue**

Una vez que los contenedores están en línea, se realizan una serie de comprobaciones funcionales.

*   **Salud de los Servicios**: Se verifica que el frontend cargue correctamente y que el endpoint de salud del backend (`/api/v1/health`) responda con un estado `OK`.
*   **Validación de Funcionalidad Crítica**: Se realiza una prueba manual rápida de los flujos principales (ej. login, creación de pedido) para confirmar que la aplicación opera como se espera.

### **Fase 5: Cierre y Sincronización en GitHub (Verificación de Repositorio)**

Esta es la fase final que garantiza que el estado del repositorio refleje fielmente lo que se ha desplegado. Es un paso fundamental para la trazabilidad y la integridad del proyecto.

1.  **Actualización de Control de Versiones (Git)**:
    *   Se asegura que la rama `main` contenga exactamente el código desplegado.
    *   Se crea un **Git Tag** para la nueva versión (ej. `git tag v1.8.1`).
    *   Se suben los cambios y el nuevo tag al repositorio remoto (`git push && git push --tags`).

2.  **Actualización de Artefactos de Proyecto**:
    *   Se actualiza el archivo `VERSION` con el número de la nueva versión.
    *   Se actualiza el archivo `CHANGELOG.md` con las notas detalladas del release.
    *   Se actualiza el `ROADMAP.md` para marcar las características implementadas como "Completado" y reflejar la versión actual.

3.  **Gestión de Proyecto en GitHub**:
    *   Se confirma que los Pull Requests correspondientes al release hayan sido fusionados.
    *   Se verifica que los Issues asociados se hayan cerrado y que las tarjetas en el tablero Kanban de GitHub Projects se hayan movido a la columna "Done".

4.  **Sincronización de la Documentación (Wiki)**:
    *   Conforme a la regla del `AGENTS.md`, cualquier cambio en la documentación (`docs/`, `CHANGELOG.md`, `ROADMAP.md`) se sincroniza con el repositorio de la Wiki oficial (`/opt/wiki/orderflow/`) y se hace `push` para mantenerla siempre actualizada.

---

Este proceso completo, desde la barrera de calidad hasta la sincronización final en GitHub, asegura que cada despliegue no solo sea técnicamente exitoso, sino también que esté perfectamente documentado y alineado con el flujo de trabajo del proyecto.