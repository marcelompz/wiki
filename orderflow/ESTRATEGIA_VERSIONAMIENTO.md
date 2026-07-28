# 📦 Estrategia de Versionamiento - OrderFlow SaaS

**Fecha:** 2026-06-22  
**Estado:** 📋 Propuesta para evaluación  
**Contexto:** Sistema modular con 12 módulos + Core

---

## 🎯 CONTEXTO ACTUAL

### **Arquitectura de OrderFlow:**

```
OrderFlow Core v0.1.0-alpha.3
├── Backend (NestJS) - v0.1.0
├── Frontend (React) - v0.1.0
├── Mobile (React Native) - v0.1.0
└── Odoo Adapter (Node.js) - v0.1.0

Módulos Backend (12):
├── auth - v0.1.0
├── tenants - v0.1.0
├── products - v0.1.0
├── orders - v0.1.0
├── customers - v0.1.0
├── bookings - v0.1.0
├── contacts - v0.1.0
├── users - v0.1.0
├── integrations - v0.1.0
├── health - v0.1.0
├── webhooks - v0.1.0
└── backups - v0.1.0
```

---

## 🤔 PREGUNTA CLAVE

> **¿Manejamos versiones del Core con ramas de GitHub y las versiones de los módulos deben ser coherentes con las versiones del Core?**

---

## 📊 OPCIONES DISPONIBLES

### **OPCIÓN A: Versionamiento Sincronizado (Monolítico)**

**Concepto:** Todos los módulos tienen la MISMA versión que el Core.

```
OrderFlow Core v0.1.0
├── auth v0.1.0
├── tenants v0.1.0
├── orders v0.1.0
└── ... todos v0.1.0
```

**Ramas Git:**
```
main (v0.1.0)
├── release/v0.1.0
├── release/v0.2.0
└── develop
```

**Ventajas:**
- ✅ Simple de entender
- ✅ Un solo número de versión para todo
- ✅ Fácil de comunicar a clientes ("tenés la v0.1.0")
- ✅ Todos los módulos son compatibles entre sí por definición

**Desventajas:**
- ❌ Versión mayor aunque un módulo tenga cambios menores
- ❌ No podés actualizar solo un módulo
- ❌ Releases más pesados (todo junto)
- ❌ Difícil hacer hotfix en un módulo sin versionar todo

**Recomendado para:**
- Equipos pequeños (1-5 devs)
- Proyectos en fase MVP/alpha
- Cuando los módulos están muy acoplados

---

### **OPCIÓN B: Versionamiento Independiente (Microservicios)**

**Concepto:** Cada módulo tiene su propia versión semántica.

```
OrderFlow Core v0.1.0
├── auth v0.1.0
├── tenants v0.2.3  (tuvo más cambios)
├── orders v1.0.0   (breaking changes)
└── backups v0.0.5  (nuevo módulo)
```

**Ramas Git:**
```
main
├── module-auth/v0.1.0
├── module-auth/v0.2.0
├── module-orders/v1.0.0
├── module-orders/v1.1.3
└── module-tenants/v0.2.3
```

**Ventajas:**
- ✅ Cada módulo evoluciona a su ritmo
- ✅ Podés actualizar solo un módulo
- ✅ Versionado semántico real (MAJOR.MINOR.PATCH)
- ✅ Releases más livianos y frecuentes

**Desventajas:**
- ❌ Complejidad de gestión (12 versiones distintas)
- ❌ Difícil saber compatibilidad entre módulos
- ❌ Matriz de compatibilidad compleja
- ❌ Overhead de mantenimiento

**Recomendado para:**
- Equipos grandes (10+ devs)
- Módulos bien desacoplados
- Ecosistema de terceros (otros devs crean módulos)

---

### **OPCIÓN C: HÍBRIDA (RECOMENDADA PARA ORDERFLOW)** ⭐

**Concepto:** Core versionado con ramas, módulos con versión semántica PARENT-CHILD.

```
OrderFlow Core v0.1.0-alpha.3
├── auth v0.1.0-alpha.3      (misma versión que Core)
├── tenants v0.1.0-alpha.3   (misma versión que Core)
├── orders v0.1.0-alpha.3    (misma versión que Core)
└── backups v0.1.0-alpha.1   (nuevo, versión independiente)
```

**Ramas Git:**
```
main (Core v0.1.0)
├── release/v0.1.0
│   ├── auth/v0.1.0
│   ├── tenants/v0.1.0
│   └── orders/v0.1.0
├── feature/new-module-quotations
└── hotfix/orders-webhook-fix
```

**Reglas:**
1. **Módulos core** (auth, tenants, products, orders, customers): misma versión que Core
2. **Módulos nuevos/experimentales**: versión independiente (ej: `backups v0.1.0-alpha.1`)
3. **Módulos opcionales**: versión semántica propia (ej: `quotations v1.0.0`)

**Ventajas:**
- ✅ Balance entre simplicidad y flexibilidad
- ✅ Core estable con versión única
- ✅ Módulos nuevos pueden evolucionar rápido
- ✅ Fácil de comunicar ("OrderFlow v0.1.0")
- ✅ Compatibilidad garantizada para módulos core

**Desventajas:**
- ⚠️ Dos reglas de versionamiento (core vs nuevos)
- ⚠️ Requiere documentación de compatibilidad

**Recomendado para:**
- ✅ **OrderFlow actual** (equipo 2-5 devs, MVP avanzado)
- ✅ SaaS multi-tenant con módulos opcionales
- ✅ Transición suave hacia ecosistema de terceros

---

## 🎯 RECOMENDACIÓN PARA ORDERFLOW

### **Usar OPCIÓN C (Híbrida) con Git Flow**

**Estrategia detallada:**

### **1. Versionamiento del Core**

**Archivo:** `/opt/orderflow/VERSION`

```
0.1.0-alpha.3
```

**Formato:** `MAJOR.MINOR.PATCH-PRERELEASE.N`

**Significado:**
- `MAJOR` (0): API breaking changes
- `MINOR` (1): Nuevas features backwards compatible
- `PATCH` (0): Bug fixes backwards compatible
- `PRERELEASE` (alpha): `alpha`, `beta`, `rc`
- `N` (3): Número incremental del prerelease

**Ramas Git:**

```
main (producción, estable)
├── develop (integración, inestable)
├── release/v0.1.0 (congelado para release)
├── release/v0.2.0 (próximo release)
├── feature/health-checks
├── feature/modulos-ui
└── hotfix/orders-webhook
```

**Flujo:**
1. Features van a `feature/*` branches
2. Se mergean a `develop` cuando están listas
3. Cuando `develop` está estable, se crea `release/vX.Y.Z`
4. `release` se teste, se hacen hotfixes si es necesario
5. `release` se mergea a `main` y se taggea `vX.Y.Z`
6. `release` se mergea a `develop` (para sync)

---

### **2. Versionamiento de Módulos**

**Regla general:**

```
Módulos Core = Versión del Core
Módulos Nuevos = Versión independiente (empieza en 0.0.1)
Módulos Opcionales = Versión semántica propia
```

**Ejemplo:**

```
OrderFlow Core: 0.1.0-alpha.3

Módulos Core (sincronizados):
├── auth: 0.1.0-alpha.3
├── tenants: 0.1.0-alpha.3
├── products: 0.1.0-alpha.3
├── orders: 0.1.0-alpha.3
├── customers: 0.1.0-alpha.3
├── bookings: 0.1.0-alpha.3
├── contacts: 0.1.0-alpha.3
├── users: 0.1.0-alpha.3
├── integrations: 0.1.0-alpha.3
├── health: 0.1.0-alpha.3
└── webhooks: 0.1.0-alpha.3

Módulos Infraestructura (semi-independientes):
└── backups: 0.1.0-alpha.1  (nuevo, puede ir más lento)

Módulos Opcionales (independientes):
└── quotations: 1.0.0-beta.2  (feature opcional, versión propia)
```

**Manifiesto de cada módulo:**

```json
{
  "name": "orders",
  "version": "0.1.0-alpha.3",
  "coreCompatibility": "0.1.x",
  "depends": ["tenants", "customers", "products"],
  "autoInstall": true,
  "application": false
}
```

**Campo nuevo:** `coreCompatibility`

- Indica con qué versiones del Core es compatible
- Formato semántico: `0.1.x` = compatible con toda la familia 0.1

---

### **3. Scripts de Automatización**

**Archivo:** `/opt/orderflow/scripts/sync-module-versions.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Leer versión del Core
const coreVersion = fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim();

// Módulos que DEBEN sincronizarse con el Core
const CORE_MODULES = [
  'auth', 'tenants', 'products', 'orders', 'customers',
  'bookings', 'contacts', 'users', 'integrations', 'health', 'webhooks'
];

// Actualizar manifiestos de módulos core
CORE_MODULES.forEach(moduleName => {
  const manifestPath = path.join(__dirname, '..', 'backend', 'src', moduleName, `${moduleName}.manifest.json`);
  
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = coreVersion;
    manifest.coreCompatibility = coreVersion.split('.').slice(0, 2).join('.') + '.x';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✅ ${moduleName} actualizado a ${coreVersion}`);
  }
});

console.log(`\n🎉 Módulos core sincronizados con Core v${coreVersion}`);
```

**Uso:**
```bash
# Después de hacer bump de versión del Core
node scripts/version.js 0.1.0-alpha.4
node scripts/sync-module-versions.js

# Resultado: todos los módulos core actualizados a 0.1.0-alpha.4
```

---

### **4. Matriz de Compatibilidad**

**Archivo:** `/opt/orderflow/COMPATIBILITY.md`

```markdown
# Matriz de Compatibilidad de Módulos

## OrderFlow Core v0.1.x

| Módulo | Versión | Compatible con Core | Dependencias |
|--------|---------|---------------------|--------------|
| auth | 0.1.0-alpha.3 | 0.1.x | - |
| tenants | 0.1.0-alpha.3 | 0.1.x | auth |
| orders | 0.1.0-alpha.3 | 0.1.x | tenants, customers, products |
| backups | 0.1.0-alpha.1 | 0.1.x | orders, webhooks |
| quotations | 1.0.0-beta.2 | 0.1.x | orders, products |

## Notas de Compatibilidad

### Módulos Core
Todos los módulos core (auth, tenants, products, orders, customers, bookings, contacts, users, integrations, health, webhooks) son **100% compatibles** dentro de la misma familia de versión (0.1.x).

### Módulos de Infraestructura
- `backups`: Compatible con Core 0.1.x, requiere orders y webhooks

### Módulos Opcionales
- `quotations`: Compatible con Core 0.1.x, requiere orders y products
- Puede instalarse/desinstalarse sin afectar el core
```

---

### **5. Tags de Git**

**Formato de tags:**

```bash
# Core
git tag -a v0.1.0-alpha.3 -m "Release OrderFlow v0.1.0-alpha.3"

# Módulos individuales (solo opcionales)
git tag -a quotations/v1.0.0-beta.2 -m "Release Quotations v1.0.0-beta.2"

# Scripts
git tag -a scripts/v0.1.0-alpha.3 -m "Release Scripts v0.1.0-alpha.3"
```

**Automatización:**

```bash
# script: scripts/create-release-tag.js
const { execSync } = require('child_process');
const version = require('../VERSION').trim();

// Tag del Core
execSync(`git tag -a v${version} -m "Release OrderFlow v${version}"`);

// Tags de módulos core
const coreModules = ['auth', 'tenants', 'products', 'orders', 'customers'];
coreModules.forEach(module => {
  execSync(`git tag -a ${module}/v${version} -m "Release ${module} v${version}"`);
});

console.log('✅ Tags creados exitosamente');
```

---

## 📋 WORKFLOW RECOMENDADO

### **Release de Nueva Versión del Core**

```bash
# 1. Actualizar CHANGELOG.md
# Editar CHANGELOG.md con los cambios

# 2. Bump de versión
node scripts/version.js 0.1.0-alpha.4

# 3. Sincronizar módulos core
node scripts/sync-module-versions.js

# 4. Verificar cambios
git status
git diff

# 5. Commit
git add VERSION packages.json **/package.json **/*.manifest.json CHANGELOG.md
git commit -m "chore: bump version to 0.1.0-alpha.4"

# 6. Crear tag
git tag -a v0.1.0-alpha.4 -m "Release OrderFlow v0.1.0-alpha.4"

# 7. Push
git push origin main --tags
```

### **Release de Módulo Opcional (ej: quotations)**

```bash
# 1. Actualizar versión en quotations.manifest.json
# Editar manualmente o con script

# 2. Commit específico del módulo
git add src/quotations/
git commit -m "feat(quotations): add discount support v1.0.0-beta.2"

# 3. Tag del módulo
git tag -a quotations/v1.0.0-beta.2 -m "Release Quotations v1.0.0-beta.2"

# 4. Push
git push origin main --tags
```

---

## 🎯 DECISIONES CLAVE

### **¿Ramas por módulo?**

**NO recomendado:**
```
❌ module-auth/
❌ module-orders/
❌ module-tenants/
```

**Por qué no:**
- Demasiada complejidad para 2-5 devs
- Difícil mantener sincronizados
- Merge conflicts constantes
- Overhead de gestión

**Recomendado:**
```
✅ main (todos los módulos juntos)
✅ feature/* (features que pueden tocar múltiples módulos)
✅ release/vX.Y.Z (congelar para release)
```

---

### **¿Cuándo versionar módulos independientemente?**

**Sí, cuando:**
- ✅ Módulo opcional (no es parte del core)
- ✅ Módulo experimental (puede romperse)
- ✅ Módulo mantenido por terceros
- ✅ Módulo con ciclo de release distinto

**No, cuando:**
- ❌ Módulo core del sistema
- ❌ Módulo con dependencias críticas
- ❌ Módulo que siempre se actualiza junto con el core

---

## 📊 RESUMEN DE RECOMENDACIONES

| Decisión | Recomendación | Por qué |
|----------|---------------|---------|
| **Estrategia** | Opción C (Híbrida) | Balance simplicidad/flexibilidad |
| **Ramas Git** | Git Flow (main, develop, feature/*, release/*) | Estándar de industria |
| **Versión Módulos Core** | = Versión del Core | Compatibilidad garantizada |
| **Versión Módulos Opcionales** | Semántica independiente | Flexibilidad |
| **Tags Git** | `vX.Y.Z` para Core, `module/vX.Y.Z` para opcionales | Claridad |
| **Compatibilidad** | Campo `coreCompatibility` en manifiestos | Documentación automática |
| **Automatización** | Scripts para sync de versiones | Menos error humano |

---

## 🚀 PRÓXIMOS PASOS

### **Inmediatos (esta semana):**

1. **Crear script `sync-module-versions.js`** (2h)
2. **Agregar campo `coreCompatibility`** a manifiestos (1h)
3. **Crear `COMPATIBILITY.md`** (2h)
4. **Documentar Git Flow en README** (1h)

### **Próxima semana:**

5. **Configurar Git Flow** (ramas develop, release/*) (1h)
6. **Primer release con nueva estrategia** (2h)
7. **Automatizar tags en CI/CD** (4h)

---

## 📁 ARCHIVOS A CREAR/MODIFICAR

| Archivo | Acción | Propósito |
|---------|--------|-----------|
| `scripts/sync-module-versions.js` | Crear | Sincronizar módulos con Core |
| `scripts/create-release-tag.js` | Crear | Automatizar tags |
| `COMPATIBILITY.md` | Crear | Matriz de compatibilidad |
| `GIT_FLOW.md` | Crear | Documentación de ramas |
| `backend/src/**/*.manifest.json` | Modificar | Agregar `coreCompatibility` |
| `README.md` | Modificar | Sección de versionamiento |

---

**Documento para evaluación del equipo**  
**Recomendación:** Implementar Opción C (Híbrida)  
**Tiempo estimado:** 6-8 horas  
**Próxima revisión:** Post-implementación (semana 5)
