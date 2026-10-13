# Informe de Auditoría General del Sistema (Documentación vs. Despliegue)

**Fecha de Ejecución:** 2026-09-04  
**Git Hash Commit:** `fe471da5`  
**Ubicación:** `docs/info/auditoria-general-sistema-2026-09-04.md`  

---

## 📊 1. Resumen de Auditoría Automatizada

| Indicador | Estado en Repositorio / docs | Estado en Despliegue / Runtime | Diagnóstico |
|---|---|---|---|
| **Versión del Sistema** | `1.24.04` | `1.24.04` | ✅ Sincronizado |
| **Base de Datos** | Schema Prisma | Health: `status` | 🔴 Error DB |
| **Contenedores Restarting** | 0 Contenedores con fallos | 🔴 Fallo en: orderflow_omnibi_standalone | 🔴 Requiere Intervención |

---

## 🐳 2. Estado de Contenedores Docker

```text
NAMES                         STATUS                         PORTS
orderflow-backend-prod        Up 43 hours (healthy)          3010/tcp
orderflow_db                  Up 2 days (healthy)            0.0.0.0:5433->5432/tcp, [::]:5433->5432/tcp
orderflow-frontend-prod       Up 3 days (healthy)            80/tcp
orderflow-redis-1             Up 3 days (healthy)            6379/tcp
orderflow-database-1          Up 3 days (healthy)            5432/tcp
orderflow_omnibi_standalone   Restarting (1) 8 seconds ago   
```

---

## 📁 3. Verificación de Estructura de Documentación

Se verificaron los 16 directorios principales bajo `docs/` según el estándar **AGENTS.md (v2.3)**.

