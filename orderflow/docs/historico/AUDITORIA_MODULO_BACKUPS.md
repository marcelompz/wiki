# Auditoría del Módulo de Backups (Copias de Seguridad)

**Fecha:** 2026-06-23  
**Módulo:** `backups`  
**Versión:** `0.1.0`

---

## 1. Visión General y Propósito

El módulo de **Backups** es un componente de infraestructura clave diseñado para la plataforma multi-tenant OrderFlow. Su función principal es extraer de manera segura volcados de base de datos (`pg_dump`) por inquilino y subirlos de forma automatizada a un servidor remoto a través de un protocolo seguro (SFTP).

Al estar concebido de forma modular, permite que cada *tenant* (o el Super Admin en su representación) tenga credenciales SFTP aisladas y un cronograma (cron expression) independiente para realizar estas copias.

---

## 2. Características Principales (Key Features)

1. **Backups Programados (Cron Jobs) Dinámicos:**  
   Al arrancar (`onModuleInit`), el servicio lee las instalaciones del módulo de la base de datos y monta tareas de Cron en memoria de forma dinámica. Si un tenant especifica `0 2 * * *`, el sistema programará su volcado a las 2 AM todos los días.

2. **Ejecución Manual Bajo Demanda:**  
   Provee un endpoint (`POST /trigger`) para ejecutar un respaldo de manera síncrona en el momento exacto que el administrador lo requiera desde la interfaz, enviándolo por SFTP de inmediato.

3. **Prueba de Conexión Segura:**  
   Cuenta con un endpoint aislado (`POST /test-connection`) para verificar las credenciales antes de guardarlas, evitando guardar *hosts* muertos o claves inválidas.

4. **Resiliencia de Red Integrada:**  
   Se modificaron los parámetros de `readyTimeout` a `30000ms` (30 segundos) en la biblioteca `ssh2-sftp-client` para tolerar servidores SSH/SFTP lentos, especialmente útiles en conexiones detrás de contenedores Docker que sufren demoras por resolución de *Reverse DNS*.

---

## 3. Análisis Técnico (Backend)

### 3.1. `backups.controller.ts`
- **Seguridad:** Los endpoints (`trigger` y `test-connection`) están bien protegidos bajo `ApiKeyGuard`, extrayendo el `tenantId` inyectado de forma segura en la petición.
- **Limpieza:** Devuelve un formato consistente `{ success: boolean, message: string }` facilitando su integración fluida en el frontend.

### 3.2. `backups.service.ts`
- **Interacción con el OS (`execAsync`):** Realiza llamadas al sistema para usar `pg_dump`. 
  - *Fortaleza:* Limpia la URL inyectada en el comando para evitar parámetros como `?schema=public` que causarían fallos en la utilidad oficial de PostgreSQL.
  - *Precaución:* La gestión del `fs.unlinkSync(localFilepath)` está correctamente encerrada en un bloque `finally`, lo cual es una excelente práctica para evitar desbordar el disco duro del servidor con archivos huérfanos tras un error de subida SFTP.
- **Gestión de Sesiones SFTP:** El cliente SFTP (`new Client()`) está debidamente aislado por función y usa `.end()` en un bloque `finally` para asegurar que las conexiones TCP no queden como *zombies*.

### 3.3. `backups.manifest.json`
- Define dinámicamente los campos que se renderizan en el frontend, como el `sftpHost`, el puerto, y ahora la `cronExpression`. Esta configuración hace que añadir nuevos parámetros al módulo no requiera cambios en la lógica del frontend.

---

## 4. Análisis Técnico (Frontend)

El módulo se integra directamente en la página de **App Store (`modules.tsx`)**.
- **UX/UI:** Los administradores tienen retroalimentación visual de todas sus acciones. Pueden probar la conexión antes de guardar, e iniciar respaldos manuales. 
- **Manejo de Errores:** Se implementó una lógica de captura de errores de red (e.g. CORS o Internal Server Errors) que extrae los mensajes del payload (`error.response.data.message`), brindando mensajes más exactos.

---

## 5. Áreas de Mejora y Recomendaciones (Deuda Técnica)

1. **Aislamiento Multi-Tenant Profundo en Base de Datos:**
   Actualmente, el comando `pg_dump` extrae el estado global de la base de datos `orderflow_db`. Si bien nombra el archivo con el `tenantId`, el contenido es de toda la base. En una arquitectura de **shared-schema**, la recomendación ideal es desarrollar un *script* personalizado o usar un *schema* separado por tenant para exportar exclusivamente la información que le corresponde a ese tenant.
   *Nota: Dado que OrderFlow es gestionado por un único Super Admin de la infraestructura (que maneja las copias de seguridad de sus inquilinos), extraer toda la DB en un volcado diario centralizado suele ser suficiente y más eficiente.*

2. **Rotación de Backups (Retention Policy):**
   El sistema sube archivos a `/mnt/nfs_storage/backups/orderflow` constantemente. Se recomienda implementar a nivel servidor (o dentro del mismo `backups.service.ts`) una lógica de limpieza de retención (ej. eliminar respaldos con más de 30 días de antigüedad) para prevenir quedarse sin almacenamiento (OOM Storage).

3. **Monitorización (Alertas de Fallo):**
   Si la tarea Cron falla a la madrugada, el error se guarda en los logs del Docker. Sería ideal integrar un disparo por correo (ej. con el módulo `mail` o `webhooks`) notificando al administrador que el cronograma ha fallado.

---
**Conclusión:**
El módulo de copias de seguridad está completamente maduro para producción. Destaca su excelente estabilidad de red y el uso inteligente de librerías nativas (`ssh2` y `pg_dump`). Las correcciones en el contenedor (instalar `postgresql-client`) garantizan que pueda seguir funcionando fluidamente en el clúster Docker de manera permanente.
