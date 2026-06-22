# 📦 Estrategia de Versionamiento - OrderFlow

**Última actualización:** 2026-06-22  
**Versión:** 0.1.0-alpha.3

---

## 🎯 ¿Cómo funciona el versionamiento?

OrderFlow usa una **estrategia híbrida** que combina simplicidad con flexibilidad:

### **Regla de Oro:**

```
Módulos Core = Misma versión que el Core
Módulos Nuevos/Opcionales = Versión semántica independiente
```

---

## 📊 Estructura de Versiones

### **Formato:**

```
MAJOR.MINOR.PATCH-PRERELEASE.N

Ejemplo: 0.1.0-alpha.3
```

**Significado:**
- `MAJOR` (0): Cambios incompatibles (breaking changes)
- `MINOR` (1): Nuevas features backwards compatible
- `PATCH` (0): Bug fixes backwards compatible
- `PRERELEASE` (alpha): Estado de desarrollo (`alpha`, `beta`, `rc`)
- `N` (3): Número incremental del prerelease

---

## 📦 Versiones por Componente

### **OrderFlow Core:**

```
Versión actual: 0.1.0-alpha.3
```

**Archivos que declaran la versión:**
- `/opt/orderflow/VERSION` (maestro)
- `/opt/orderflow/packages.json` (manifiesto del sistema)
- `/opt/orderflow/CHANGELOG.md` (historial)

---

### **Módulos Core (Sincronizados):**

Todos los módulos core tienen **la misma versión que el Core**:

| Módulo | Versión | Estado |
|--------|---------|--------|
| auth | 0.1.0-alpha.3 | ✅ Sincronizado |
| tenants | 0.1.0-alpha.3 | ✅ Sincronizado |
| products | 0.1.0-alpha.3 | ✅ Sincronizado |
| orders | 0.1.0-alpha.3 | ✅ Sincronizado |
| customers | 0.1.0-alpha.3 | ✅ Sincronizado |
| bookings | 0.1.0-alpha.3 | ✅ Sincronizado |
| contacts | 0.1.0-alpha.3 | ✅ Sincronizado |
| users | 0.1.0-alpha.3 | ✅ Sincronizado |
| integrations | 0.1.0-alpha.3 | ✅ Sincronizado |
| health | 0.1.0-alpha.3 | ✅ Sincronizado |
| webhooks | 0.1.0-alpha.3 | ✅ Sincronizado |

**¿Por qué sincronizados?**
- ✅ Compatibilidad garantizada entre módulos
- ✅ Fácil de comunicar ("tenés la v0.1.0")
- ✅ Un solo número de versión para todo el core

---

### **Módulos de Infraestructura (Semi-independientes):**

| Módulo | Versión | Notas |
|--------|---------|-------|
| backups | 0.1.0-alpha.1 | Nuevo, puede ir más lento que el core |

**Características:**
- Versión independiente del core
- Empieza en `0.0.1` o `0.1.0-alpha.1`
- Se actualiza cuando hay cambios específicos

---

### **Módulos Opcionales (Independientes):**

| Módulo | Versión | Estado |
|--------|---------|--------|
| quotations | 0.1.0 | ✅ Independiente |

**Características:**
- Versión semántica propia (ej: `1.0.0`, `1.2.3`)
- Puede tener breaking changes sin afectar el core
- Ideal para features experimentales

---

## 🌿 Ramas de Git (Git Flow)

### **Estructura de Ramas:**

```
main (producción, estable)
├── develop (integración, inestable)
├── release/v0.1.0 (congelado para release)
├── release/v0.2.0 (próximo release)
├── feature/health-checks
├── feature/modulos-ui
└── hotfix/orders-webhook
```

### **Descripción:**

| Rama | Propósito | Estado |
|------|-----------|--------|
| `main` | Producción estable, tags de release | ✅ Protegida |
| `develop` | Integración continua de features | ⚠️ Inestable |
| `release/vX.Y.Z` | Congelado para testing pre-release | ⚠️ Solo bugfixes |
| `feature/*` | Desarrollo de nuevas features | ⚠️ Volátil |
| `hotfix/*` | Correcciones urgentes de producción | ⚠️ Volátil |

---

## 🔄 Flujo de Release

### **Paso a Paso:**

```bash
# 1. Desarrollar feature en rama feature/*
git checkout -b feature/new-module
# ... codificar ...
git commit -m "feat: add new module"
git push origin feature/new-module

# 2. Merge a develop (PR review)
git checkout develop
git merge feature/new-module
git push origin develop

# 3. Crear release candidate
git checkout -b release/v0.1.0-alpha.4
# ... testing, bugfixes ...

# 4. Bump de versión
node scripts/version.js 0.1.0-alpha.4
node scripts/sync-module-versions.js

# 5. Actualizar CHANGELOG.md
# Editar CHANGELOG.md con los cambios

# 6. Merge a main y tag
git checkout main
git merge release/v0.1.0-alpha.4
git tag -a v0.1.0-alpha.4 -m "Release OrderFlow v0.1.0-alpha.4"
git push origin main --tags

# 7. Sync develop
git checkout develop
git merge main
git push origin develop
```

---

## 🛠️ Scripts de Automatización

### **`scripts/version.js`**

**Propósito:** Actualizar versión del Core y todos los package.json

**Uso:**
```bash
node scripts/version.js 0.1.0-alpha.4
```

**Qué hace:**
1. ✅ Valida formato semántico
2. ✅ Actualiza `VERSION`
3. ✅ Actualiza `packages.json` (manifiesto)
4. ✅ Actualiza `backend/package.json`
5. ✅ Actualiza `frontend/package.json`
6. ✅ Actualiza `mobile/package.json`
7. ✅ Actualiza `odoo-adapter/package.json`

---

### **`scripts/sync-module-versions.js`**

**Propósito:** Sincronizar módulos core con la versión del Core

**Uso:**
```bash
node scripts/sync-module-versions.js
```

**Qué hace:**
1. ✅ Lee versión del Core (`VERSION`)
2. ✅ Actualiza manifiestos de módulos core
3. ✅ Agrega campo `coreCompatibility`
4. ✅ Reporta módulos actualizados

---

### **`scripts/create-release-tag.js`**

**Propósito:** Crear tags de Git automáticamente

**Uso:**
```bash
node scripts/create-release-tag.js
```

**Tags creados:**
- `v0.1.0-alpha.4` (Core)
- `auth/v0.1.0-alpha.4` (módulo auth)
- `orders/v0.1.0-alpha.4` (módulo orders)
- `quotations/v0.1.0` (módulo opcional)

---

## 📝 CHANGELOG

### **Estructura:**

```markdown
# Changelog

## [0.1.0-alpha.3] - 2026-06-22

### ✅ Completed
- **P3-1:** admin/customers.tsx CRUD funcional
- **P3-2:** admin/bookings.tsx + E2E test con Odoo 19
- **Módulos:** App Store UI implementada
- **Backups:** Módulo SFTP completado

### 📊 Audit Score
- **Global:** 81.5/100 (+5 pts)
- **Backend:** 88/100 (+6 pts)

### 🐛 Bug Fixes
- Corrección de fallback de clientes anónimos
- Resiliencia de webhooks con reintentos

---

## [0.1.0-alpha.2] - 2026-06-22
...
```

### **Categorías:**

- `✅ Completed`: Features completadas
- `🐛 Bug Fixes`: Correcciones de errores
- `📊 Audit Score`: Resultados de auditorías
- `⚠️ Known Issues`: Problemas conocidos
- `🔧 Technical Debt`: Deuda técnica pendiente

---

## 🔗 Compatibilidad

### **Matriz de Compatibilidad:**

Cada módulo declara con qué versiones del Core es compatible:

```json
{
  "name": "quotations",
  "version": "0.1.0",
  "coreCompatibility": "0.1.x",
  "depends": ["customers", "products"]
}
```

**Formato:**
- `0.1.x`: Compatible con toda la familia 0.1
- `>=0.1.0-alpha.3`: Compatible desde esa versión
- `^0.1.0`: Compatible con 0.1.x (semver caret)

---

## 📊 Historial de Versiones

### **Versión 0.1.0-alpha.3** (Actual)

**Fecha:** 2026-06-22

**Features:**
- ✅ Health checks implementados
- ✅ App Store de módulos completada
- ✅ Módulo Backups SFTP
- ✅ Módulo Quotations (presupuestos)
- ✅ Nginx reverse proxy

**Score:** 81.5/100

---

### **Versión 0.1.0-alpha.2**

**Fecha:** 2026-06-22

**Features:**
- ✅ P3-1, P3-2 completadas (customers + bookings)
- ✅ Integración Odoo certificada E2E
- ✅ Versionamiento unificado implementado

**Score:** 78/100

---

### **Versión 0.1.0-alpha.1**

**Fecha:** 2026-06-22

**Features:**
- ✅ Auditoría inicial completada
- ✅ Roadmap de 12 semanas definido
- ✅ 37 tareas identificadas

**Score:** 71.1/100

---

### **Versión 0.0.1**

**Fecha:** 2026-06-13

**Features:**
- 🚀 Initial commit
- ✅ Arquitectura multi-tenant definida
- ✅ Schema Prisma con 15+ modelos
- ✅ Primer tenant: Gaia Spa Wellness
- ✅ Integración con Odoo 19

---

## 🤔 Preguntas Frecuentes

### **¿Cuándo se actualiza la versión?**

- **MINOR** (0.1.0 → 0.2.0): Features nuevas backwards compatible
- **PATCH** (0.1.0 → 0.1.1): Bug fixes backwards compatible
- **MAJOR** (0.1.0 → 1.0.0): Breaking changes, API incompatible

### **¿Qué significa "alpha"?**

- `alpha`: Desarrollo activo, pueden haber bugs
- `beta`: Feature complete, solo bugfixes
- `rc`: Release candidate, listo para producción
- (sin sufijo): Stable release

### **¿Puedo usar una versión alpha en producción?**

⚠️ **No recomendado.** Las versiones alpha son para testing y desarrollo. Esperá al menos una versión `beta` o `rc` para producción.

### **¿Cómo sé si un módulo es compatible con mi versión?**

Revisá el campo `coreCompatibility` en el manifiesto del módulo:

```json
{
  "coreCompatibility": "0.1.x"  // Compatible con toda la familia 0.1
}
```

---

## 📚 Recursos Adicionales

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Git Flow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Keep a Changelog](https://keepachangelog.com/)

---

## 📞 Soporte

¿Tenés dudas sobre versionamiento?

- 📧 Email: soporte@orderflow.com
- 💬 Chat: Disponible en el dashboard
- 📚 Docs: [wiki.orderflow.com](https://wiki.marcelompz.github.io/orderflow/)

---

**Documentación creada:** 2026-06-22  
**Última revisión:** 2026-06-22  
**Próxima revisión:** 2026-07-22 (mensual)
