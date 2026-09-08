# Informe de Estandarización de Estructura de Documentación y Reubicación de Tests

**Fecha:** 4 de Septiembre de 2026  
**Autor:** Antigravity AI Agent  
**Proyecto:** OrderFlow / OmniFlow  
**Ubicación:** `docs/info/informe-estandarizacion-docs-2026-09-04.md`

---

## 📋 Resumen Ejecutivo

Con el objetivo de mantener la alta mantenibilidad de la base de código, evitar la saturación de contexto de los agentes de IA y asegurar una taxonomía predictible en el repositorio, se realizó una auditoría y reestructuración completa del directorio `docs/`. 

Además, se incorporó formalmente la norma de estructura documental dentro del protocolo de actuación [AGENTS.md](../../AGENTS.md).

---

## 🎯 Objetivos Cumplidos

1. **Reubicación de Documentos de Tests:**
   - Se trasladó `docs/manual/feat125_gastro.md` a [docs/tests/FEAT-125/FEAT-125_gastro.md](../tests/FEAT-125/FEAT-125_gastro.md), alineándolo con la convención de especificaciones y evidencias de QA por feature.

2. **Normalización de Nombres e Idioma de Directorios:**
   - **`docs/planes/` ➔ `docs/plans/`:** Se renombró el directorio para consistencia en inglés técnico.
   - **Unificación de Manuales de Usuario:** Se migraron los contenidos de `docs/manual/` a [docs/user-manuals/](../user-manuals/) y se removió el symlink duplicado legacy `docs/user-manual`.

3. **Creación de Subdirectorios Taxonómicos Faltantes:**
   - `docs/architecture/` (`system/`, `modules/`, `integrations/`, `decisions/`)
   - `docs/specifications/` (`features/`, `api/`, `data-model/`, `integrations/`)
   - `docs/operations/` (`restaurant/`, `procedures/`, `roles/`)
   - `docs/user-manuals/` (`omniflow/`, `omnigastro/`, `omnibi/`, `omniledger/`)
   - `docs/tests/` (`FEAT-125/`)

4. **Actualización de Protocolo Vivo (`AGENTS.md`):**
   - Se registró la sección **`2.3 Estándar de Estructura de Documentación (docs/)`** en [AGENTS.md](../../AGENTS.md) haciendo vinculante esta taxonomía para futuros desarrollos y agentes de IA.

---

## 🌳 Estado Actual del Directorio `docs/` (Nivel 1)

```text
docs/
├── architecture/          # Arquitectura del sistema, módulos, integraciones y ADRs
├── audits/                # Auditorías técnicas y de seguridad
├── brand/                 # Identidad de marca, logos y assets
├── guides/                # Guías técnicas y tutoriales
├── historico/             # Archivo de documentos legacy u obsoletos
├── info/                  # Información general del ecosistema e informes
├── legal/                 # Contratos y licencias
├── observability/         # Monitoreo, dashboards y métricas
├── operations/            # Manuales operativos, runbooks y procedimientos
├── plans/                 # Planes de implementación y roadmaps (antes docs/planes)
├── prompts/               # Prompts y especificaciones para IA
├── screenshots/           # Capturas de pantalla de la aplicación
├── specifications/        # Especificaciones funcionales, API y modelos de datos
├── tests/                 # Documentación y reportes de suites de pruebas y features
├── troubleshooting/       # Índice y soluciones de problemas
└── user-manuals/          # Manuales de usuario finales por producto
```

---

## 🔄 Impacto en Flujos de Trabajo y Git

- **Control de Versiones:** Todos los cambios en la estructura de carpetas fueron procesados mediante operaciones nativas de Git (`git mv` / `git rm`) preservando la trazabilidad del historial de commits.
- **Protocolo de Agentes:** Toda interacción futura de agentes de IA respetará esta clasificación sin dejar archivos fuera de su directorio correspondiente.
