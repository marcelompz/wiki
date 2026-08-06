# 🛠️ Troubleshooting #25: El script init.sh cuelga el SO por alta carga de CPU/RAM

**Fecha:** 2026-08-05  
**Módulo / Área:** Scripts / Entorno de Desarrollo Local  
**Severidad:** Media (Bloquea el desarrollo local si no se gestiona)  
**Estado:** ✅ **RESUELTO**

---

## 1. Síntoma / Problema

Al ejecutar el script de validación `./scripts/init.sh` en un entorno de desarrollo local, el sistema operativo experimenta una saturación extrema de CPU (picos del 100% sostenidos) y memoria RAM.

Esto provoca que el sistema se vuelva muy lento o se congele por completo, obligando a forzar el cierre de aplicaciones como Visual Studio Code para recuperar el control.

---

## 2. Análisis Técnico y Causa Raíz

El análisis del script `init.sh` revela que no es un simple script de inicio, sino una **barrera de validación de ingeniería completa**, diseñada para simular un pipeline de Integración Continua (CI) de forma local.

El script encadena secuencialmente cuatro de los procesos más intensivos en recursos del desarrollo de software:

1.  **`npm run test` (Backend):** Jest ejecuta cientos de pruebas unitarias, utilizando múltiples núcleos de CPU por defecto para paralelizar la carga, lo que ya de por sí puede saturar la CPU.
2.  **`npm run build` (Backend):** El compilador de TypeScript (`tsc`) necesita cargar en memoria una gran cantidad de archivos y analizar el árbol de dependencias completo, un proceso muy demandante en CPU y RAM.
3.  **`npm run build` (Frontend):** Vite (usando Rollup) realiza el empaquetado de la aplicación de React, un proceso que incluye transpilación, minificación y *code splitting*, consumiendo también una cantidad significativa de recursos.
4.  **`python3 scripts/qa_e2e_check.py` (E2E):** Playwright lanza una instancia completa de un navegador (Chromium) para ejecutar pruebas End-to-End. Los navegadores son aplicaciones muy pesadas, y automatizar la interacción con la UI es la tarea más intensiva de todo el ciclo.

La ejecución consecutiva de estas cuatro tareas crea una "tormenta perfecta" de consumo de recursos que agota la RAM, fuerza el uso de memoria de intercambio (swap) y mantiene la CPU al 100%, causando el cuelgue del sistema.

---

## 3. Solución Aplicada

Se modificó el script `./scripts/init.sh` para aceptar **argumentos (flags)** que permiten una ejecución selectiva. Esto da al desarrollador el control para ejecutar solo las validaciones que necesita en un momento dado, evitando la sobrecarga del sistema.

La solución se implementó directamente en el script, añadiendo un bloque de parseo de argumentos al inicio.

### Ejemplos de Uso

*   **Ejecución completa (comportamiento original):**
    ```bash
    ./scripts/init.sh
    ```

*   **Saltarse las pruebas E2E (la causa más común de cuelgues):**
    ```bash
    ./scripts/init.sh --skip-e2e
    ```

*   **Validar únicamente el backend:**
    ```bash
    ./scripts/init.sh --only-backend
    ```

---

## 4. Prevención y Buenas Prácticas

- **Para desarrollo diario:** Utilizar los flags para ejecutar solo las validaciones relevantes a la tarea actual. Por ejemplo, si solo se está trabajando en el backend, usar `--only-backend` o `--skip-frontend --skip-e2e`.
- **Antes de un `git push`:** Se recomienda ejecutar el script completo (`./scripts/init.sh`) o al menos la versión sin E2E (`--skip-e2e`) para asegurar la integridad del código que se va a subir.
- **Entornos de CI:** En los servidores de Integración Continua (como GitHub Actions), el script se debe seguir ejecutando sin flags para garantizar que se pase la barrera de calidad completa.