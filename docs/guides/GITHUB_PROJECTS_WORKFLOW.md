# 📋 Flujo de Trabajo con GitHub Projects

**Fecha:** 2026-06-22
**Documento de Soporte a:** `ESTRATEGIA_VERSIONAMIENTO.md`

Este documento define cómo el equipo de OrderFlow gestionará el ciclo de vida del desarrollo usando GitHub Projects (V2), integrando metodología ágil (Kanban) con nuestro flujo de ramas (Git Flow).

---

## 1. Estructura del Tablero Kanban

El tablero debe tener las siguientes columnas (Status):

1. **Backlog / Todo:** Ideas, bugs reportados y tareas priorizadas que aún no se han empezado.
2. **In Progress:** Tareas en desarrollo activo (hay una rama `feature/*` o `hotfix/*` viva).
3. **In Review / QA:** El desarrollo terminó, se abrió un Pull Request (PR) y está esperando revisión de código y aprobación del pipeline CI/CD (Jest, TSC, Build).
4. **Done:** El Pull Request fue aprobado y mergeado a `develop` o `main`.

---

## 2. Campos Personalizados Recomendados

Para mantener el orden en la arquitectura modular de 13 módulos, cada Issue debe tener los siguientes campos configurados:

- **Component (Single Select):** `Backend`, `Frontend`, `Mobile`, `Infraestructura`, `DevOps/QA`
- **Module (Single Select):** `core`, `auth`, `tenants`, `orders`, `products`, `customers`, `bookings`, `quotations`, `backups`, etc.
- **Priority (Single Select):** `P1 (Crítico)`, `P2 (Alto)`, `P3 (Normal)`
- **Milestone:** Se utiliza para agrupar las tareas que formarán parte de una versión específica (Ej. `v0.2.0-beta`).
- **Iteration (Sprints):** Sprints de 1 o 2 semanas para planificación ágil.

---

## 3. El Flujo de Vida de una Tarea (Issue a Producción)

### Fase A: Planificación
1. Se crea una nueva "Tarjeta" en el tablero de GitHub Projects.
2. Se convierte en un "Issue".
3. Se asignan sus campos (`Component`, `Module`, `Priority`) y se define en la descripción el Criterio de Aceptación.

### Fase B: Desarrollo
1. El desarrollador asignado mueve el Issue a **In Progress**.
2. En la terminal local, el desarrollador parte desde `develop` y crea una rama nombrando el número del issue.
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/42-multiples-sesiones-pos
   ```
3. Se desarrolla la característica y se escriben/pasan los tests automáticos (Jest).

### Fase C: Revisión (Pull Request)
1. Se pushea la rama a GitHub:
   ```bash
   git push origin feature/42-multiples-sesiones-pos
   ```
2. Se abre un **Pull Request (PR)** apuntando hacia `develop`.
3. **CRÍTICO:** En la descripción del PR, se debe incluir la frase `Closes #42` (reemplazando 42 por el número real del Issue).
4. El pipeline `ci-cd.yml` se ejecuta.
5. El tablero mueve automáticamente el Issue a **In Review / QA** (mediante automatización de GitHub).

### Fase D: Finalización
1. Cuando el PR es aprobado y se hace el merge a `develop`:
   - La rama `feature/*` se borra.
   - El Issue #42 se cierra automáticamente gracias al comando `Closes`.
   - El tablero mueve el Issue a la columna **Done**.

---

## 4. Gestión de Releases

1. Todos los Issues planeados para una versión deben estar atados a un **Milestone** (Ej. `v0.2.0`).
2. Cuando el Milestone alcanza el 100% de Issues en "Done", se crea la rama `release/v0.2.0` desde `develop`.
3. Se actualizan las versiones con el script de sincronización, se prueba exhaustivamente en Staging.
4. Se hace merge a `main` y se genera el **Git Tag** oficial (Ej. `git tag v0.2.0`).
