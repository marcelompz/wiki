# Diferencia entre `/opt` y `/srv` en Linux (FHS)

Este documento detalla la diferencia conceptual y práctica entre los directorios `/opt` y `/srv` según el **Filesystem Hierarchy Standard (FHS)** de Linux, analizando además el enfoque de usar `/opt` en desarrollo local y `/srv` en entornos de producción.

---

## 1. La Diferencia Conceptual (según el Estándar FHS)

### `/opt` (Optional Software)
* **Propósito:** Software de terceros y paquetes opcionales que **no vienen del gestor de paquetes nativo de la distribución** (o que se instalan como un paquete monolítico en un único directorio sin esparcir binarios por `/usr/bin`).
* **Enfoque:** Orientado a **aplicaciones o código ejecutable**.
* **Estructura típica:** Toda la aplicación vive de forma autocontenida dentro de su propio directorio:
  * `/opt/miapp/bin/` (ejecutables)
  * `/opt/miapp/lib/` (librerías y dependencias)
  * `/opt/miapp/config/` (archivos de configuración local)
* **Ejemplos comunes:** Google Chrome (`/opt/google/chrome`), Node.js instalado manualmente, IntelliJ IDEA, Apache Tomcat, etc.

---

### `/srv` (Service Data)
* **Propósito:** Datos específicos del sitio que son **servidos por este sistema a la red** (servidores web, FTP, bases de datos, repositorios Git, etc.).
* **Enfoque:** Orientado a **datos y recursos entregados** al cliente o usuario final.
* **Estructura típica:** Organizado usualmente por protocolo o servicio:
  * `/srv/www/` o `/srv/http/` (sitios web y aplicaciones web)
  * `/srv/ftp/` (archivos expuestos por FTP)
  * `/srv/git/` (repositorios de código)
* **Ejemplos comunes:** El código fuente de la aplicación en producción, assets estáticos, archivos multimedia servidos por Nginx/Apache.

---

## 2. Resumen Comparativo

| Criterio | `/opt` | `/srv` |
| :--- | :--- | :--- |
| **¿Qué contiene primariamente?** | Código ejecutable y software autocontenido | Datos y recursos que el servidor *sirve* a la red |
| **Punto de vista** | *"AQUÍ vive una aplicación instalada"* | *"DESDE AQUÍ se entrega un servicio"* |
| **Uso típico** | Binarios, herramientas de desarrollo, software de terceros | Sitios web, APIs, buckets locales, servidores FTP/Git |
| **Frecuencia de modificación** | Durante actualizaciones de la herramienta o paquete | Durante despliegues de contenido / cambios en producción |

---

## 3. Análisis de la Estrategia (`/opt` Local vs. `/srv` Producción)

Usar `/opt` en el entorno de desarrollo (*localhost*) y `/srv` en el entorno de producción es una convención sistemática con importantes ventajas prácticas:

1. **Prevención de errores en automatizaciones y scripts:**  
   Al diferenciar las rutas, un script de despliegue que contenga referencias a `/opt` fallará o será identificado inmediatamente como un path local, evitando la ejecución accidental de configuraciones locales en producción.

2. **Alineación con el Estándar FHS:**  
   En producción, el servidor está activamente *prestando un servicio a la red*, por lo que alojar la aplicación bajo `/srv/mi-proyecto` encaja con la semántica del sistema operativo.

3. **Gestión de Persistencia, Discos y Backups:**  
   En servidores de producción es habitual montar `/srv` en una partición, disco secundario o volumen independiente (por ejemplo, Amazon EBS, volúmenes SAN/NAS). Esto facilita realizar backups del contenido servido sin involucrar el sistema operativo raíz.

4. **Seguridad y Permisos:**  
   Asignar la aplicación en `/srv` facilita la gestión de permisos en producción (restringiendo la propiedad al usuario del servicio como `www-data` o `deploy`), aislando los procesos del sistema global.
