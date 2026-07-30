# Propuesta de Sistema de Versionamiento Unificado - OrderFlow

**Fecha:** 2026-06-22  
**Estado:** 📋 Pendiente de evaluación  
**Prioridad:** Media (post-Fase 0)

---

## 📊 DIAGNÓSTICO ACTUAL

### Estado del Versionamiento: ❌ DESCENTRALIZADO Y DESINCRONIZADO

| Módulo | Package | Versión | Estado |
|--------|---------|---------|--------|
| **Backend** | `backend/package.json` | `0.1.0` | ⚠️ Aislada |
| **Frontend** | `frontend/package.json` | `0.1.0` | ⚠️ Aislada |
| **Mobile** | `mobile/package.json` | `0.1.0` | ⚠️ Aislada |
| **Odoo Adapter** | `odoo-adapter/package.json` | `0.1.0` | ⚠️ Aislada |
| **Raíz** | `package-lock.json` | Vacío | ❌ Sin manifiesto |

---

## ⚠️ PROBLEMAS DETECTADOS

1. **Sin versión del core:** No hay un archivo que declare la versión del sistema completo
2. **Versiones desincronizadas:** Cada módulo tiene su propia versión (aunque todas son `0.1.0`)
3. **Sin CHANGELOG:** No hay registro de cambios entre versiones
4. **Sin manifiesto de módulos:** No hay documentación de qué módulos componen el sistema
5. **Monorepo sin herramienta:** No usa Nx, Turborepo, ni Lerna para gestión coordinada
6. **Sin integración con CI/CD:** El pipeline no actualiza versiones automáticamente
7. **Sin tagging en Git:** No hay tags semánticos para releases

---

## 🎯 OBJETIVOS DEL NUEVO SISTEMA

1. ✅ **Versión única del core:** Un archivo que declare la versión de todo el sistema
2. ✅ **Sincronización automática:** Actualizar todas las versiones con un comando
3. ✅ **CHANGELOG centralizado:** Historial de cambios legible por humanos y máquinas
4. ✅ **Manifiesto de módulos:** Documentación de qué compone el sistema
5. ✅ **Integración con Git:** Tags semánticos para cada release
6. ✅ **Integración con CI/CD:** Versionado automático en deploy
7. ✅ **Soporte para múltiples ambientes:** alpha, beta, staging, production

---

## 📋 OPCIONES PROPUESTAS

### **OPCIÓN A: Simple (Recomendada para MVP)**

**Archivos a crear:**

```
/opt/orderflow/
├── VERSION                    # Versión del core (ej: 0.1.0-alpha)
├── CHANGELOG.md               # Historial de cambios
└── packages.json              # Manifiesto de módulos (custom)
```

#### 1. Archivo `VERSION`

**Propósito:** Declaración simple de la versión del core

**Contenido:**
```
0.1.0-alpha.2
```

**Formato:** [Semantic Versioning](https://semver.org/lang/es/)
- `MAJOR.MINOR.PATCH` (ej: 1.0.0)
- Pre-release: `-alpha.1`, `-beta.2`, `-rc.1`

**Uso en scripts:**
```bash
# Leer versión actual
VERSION=$(cat VERSION)
echo "Deploying OrderFlow v$VERSION"

# Bump de versión
echo "0.1.0-alpha.3" > VERSION
```

---

#### 2. Archivo `CHANGELOG.md`

**Propósito:** Historial de cambios legible por humanos y máquinas

**Formato:** [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)

**Estructura:**
```markdown
# Changelog

Todos los cambios notables en este proyecto se documentarán en este archivo.

## [0.1.0-alpha.2] - 2026-06-22

### ✅ Completed
- **P3-1:** admin/customers.tsx CRUD funcional
- **P3-2:** admin/bookings.tsx + E2E test con Odoo 19
- **Integración:** Agenda + Facturación certificada al 100%

### 📊 Audit Score
- **Global:** 73.1/100 (+2 pts desde alpha.1)
- **Frontend:** 82/100 (+4 pts)
- **Horas ahorradas:** 32h (adelantados del cronograma)

### 🐛 Bug Fixes
- Corrección de fallback de clientes anónimos (RUC nulo para invitados)
- Resiliencia de webhooks con reintentos automáticos (cada 5 min)

### 🔧 Technical Debt
- Pendiente: 0% test coverage (Jest sin tests reales)
- Pendiente: Sin health check endpoint `/health`

---

## [0.1.0-alpha.1] - 2026-06-22

### 📋 Initial Audit
- **Score global:** 71.1/100
- **Roadmap:** 12 semanas, 434 horas, 37 tareas
- **Fases:** 0 (Críticos) → 1 (Testing) → 2 (Security) → 3 (Features) → 4 (Prod Ready)

### 📦 Módulos del Sistema
- Backend (NestJS + Prisma) - Puerto 3010
- Frontend (React + Vite) - Puerto 3011
- Mobile (React Native + Expo) - SDK 54.0.0
- Odoo Adapter (NestJS Microservice)

### 🎯 Component Scores
| Componente | Score | Estado |
|------------|-------|--------|
| Backend | 78/100 | ⚠️ Production-Ready con deuda técnica |
| Frontend | 78/100 | ⚠️ Production-Ready con deuda técnica |
| Mobile | 67.5/100 | ⚠️ MVP funcional, sin persistencia |
| DevOps | 56/100 | ❌ Crítico para producción |

---

## [0.0.1] - 2026-06-13

### 🚀 Initial Commit
- Arquitectura multi-tenant definida
- Schema Prisma con 15+ modelos
- Primer tenant: Gaia Spa Wellness
- Integración con Odoo 19 (webhook-based)
```

**Ventajas:**
- ✅ Fácil de leer para humanos
- ✅ Parseable por herramientas (GitHub Releases, etc.)
- ✅ Historial completo de decisiones técnicas

---

#### 3. Archivo `packages.json` (Manifiesto Custom)

**Propósito:** Documentación centralizada de módulos y sus metadatos

**Estructura:**
```json
{
  "name": "orderflow",
  "version": "0.1.0-alpha.2",
  "description": "OrderFlow SaaS Platform - High-Speed Omni-System",
  "license": "MIT",
  "homepage": "https://orderflow.com",
  "repository": {
    "type": "git",
    "url": "https://github.com/marcelompz/orderflow"
  },
  "modules": {
    "backend": {
      "path": "./backend",
      "version": "0.1.0",
      "type": "nestjs",
      "runtime": "node-22",
      "port": 3010,
      "healthCheck": "/health",
      "dockerfile": "backend/Dockerfile.prod",
      "entryPoint": "dist/main.js"
    },
    "frontend": {
      "path": "./frontend",
      "version": "0.1.0",
      "type": "react-vite",
      "runtime": "node-22",
      "port": 3011,
      "buildCommand": "npm run build",
      "dockerfile": "frontend/Dockerfile.prod",
      "outputDir": "dist"
    },
    "mobile": {
      "path": "./mobile",
      "version": "0.1.0",
      "type": "react-native-expo",
      "sdk": "54.0.0",
      "platforms": ["ios", "android", "web"],
      "bundleId": "com.orderflow.app",
      "easBuild": "enabled"
    },
    "odoo-adapter": {
      "path": "./odoo-adapter",
      "version": "0.1.0",
      "type": "nestjs-microservice",
      "runtime": "node-22",
      "integration": "odoo-19-xmlrpc",
      "webhookEndpoint": "/api/v1/webhook/order.confirmed"
    }
  },
  "audit": {
    "lastAudit": "2026-06-22",
    "score": 73.1,
    "report": "./AUDITORIA_TECNICA.md",
    "nextAudit": "2026-09-22",
    "roadmap": {
      "totalWeeks": 12,
      "totalHours": 434,
      "totalTasks": 37,
      "completedTasks": 2,
      "currentPhase": "Fase 0 (Críticos)"
    }
  },
  "environments": {
    "development": {
      "dockerCompose": "docker-compose.yml",
      "ports": {
        "backend": 3010,
        "frontend": 3011,
        "db": 5432
      }
    },
    "staging": {
      "dockerCompose": "docker-compose.prod.yml",
      "deploy": "ssh staging.orderflow.com"
    },
    "production": {
      "dockerCompose": "docker-compose.prod.yml",
      "deploy": "ssh prod.orderflow.com"
    }
  }
}
```

**Ventajas:**
- ✅ Single source of truth para módulos
- ✅ Metadatos para CI/CD (puertos, health checks, dockerfiles)
- ✅ Estado del audit integrado
- ✅ Parseable por scripts y herramientas

---

#### 4. Scripts de Automatización

**Archivo:** `scripts/version.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Leer nueva versión desde argumentos o input
const newVersion = process.argv[2] || prompt('Nueva versión: ');

// Validar formato semántico
const semverRegex = /^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/;
if (!semverRegex.test(newVersion)) {
  console.error(`❌ Versión inválida: ${newVersion}`);
  console.error('Formato esperado: MAJOR.MINOR.PATCH[-prerelease.N]');
  process.exit(1);
}

// Actualizar archivo VERSION
fs.writeFileSync(path.join(__dirname, '..', 'VERSION'), `${newVersion}\n`);
console.log(`✅ VERSION actualizado a ${newVersion}`);

// Actualizar packages.json (manifiesto)
const manifestPath = path.join(__dirname, '..', 'packages.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`✅ packages.json actualizado a ${newVersion}`);

// Actualizar package.json de cada módulo
const modules = ['backend', 'frontend', 'mobile', 'odoo-adapter'];
modules.forEach(module => {
  const pkgPath = path.join(__dirname, '..', module, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log(`✅ ${module}/package.json actualizado a ${newVersion}`);
  }
});

console.log(`\n🎉 Versionamiento completado: v${newVersion}`);
console.log('\nPróximos pasos:');
console.log('1. Actualizar CHANGELOG.md con los cambios');
console.log(`2. git add VERSION packages.json **/package.json CHANGELOG.md`);
console.log(`3. git commit -m "chore: bump version to ${newVersion}"`);
console.log(`4. git tag -a v${newVersion} -m "Release ${newVersion}"`);
console.log('5. git push origin main --tags');
```

**Uso:**
```bash
# Bump de versión
node scripts/version.js 0.1.0-alpha.3

# O con prompt interactivo
node scripts/version.js
```

---

#### 5. Integración con CI/CD

**Archivo:** `.github/workflows/release.yml` (nuevo)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Leer versión
        id: version
        run: echo "version=$(cat VERSION)" >> $GITHUB_OUTPUT

      - name: Crear GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body_path: CHANGELOG.md
          name: Release v${{ steps.version.outputs.version }}
          draft: false
          prerelease: ${{ contains(steps.version.outputs.version, 'alpha') || contains(steps.version.outputs.version, 'beta') }}

      - name: Deploy a Staging
        if: contains(steps.version.outputs.version, 'alpha') || contains(steps.version.outputs.version, 'beta')
        run: |
          # Deploy automático a staging para pre-releases
          ./scripts/deploy-staging.sh

      - name: Deploy a Producción
        if: ${{ !contains(steps.version.outputs.version, 'alpha') && !contains(steps.version.outputs.version, 'beta') }}
        run: |
          # Deploy a producción solo para versiones estables
          ./scripts/deploy-prod.sh
```

---

### **OPCIÓN B: Enterprise (Monorepo con Nx)**

**Propósito:** Gestión profesional de monorepo con herramientas enterprise

**Instalación:**
```bash
cd /opt/orderflow
npx nx@latest init
```

**Archivos creados:**

#### 1. `nx.json`

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "lint": {
      "cache": true
    }
  },
  "defaultBase": "main",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "sharedGlobals": [],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s"
    ]
  },
  "workspaceLayout": {
    "appsDir": "apps",
    "libsDir": "libs"
  }
}
```

#### 2. `project.json` por módulo

**Ejemplo:** `backend/project.json`

```json
{
  "name": "backend",
  "$schema": "../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "backend/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npm run build",
        "cwd": "backend"
      }
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npm run start:dev",
        "cwd": "backend"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npm run test",
        "cwd": "backend"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npm run lint",
        "cwd": "backend"
      }
    }
  },
  "tags": ["scope:backend", "type:app"]
}
```

#### 3. Comandos disponibles

```bash
# Ver árbol de dependencias
nx graph

# Build de todos los módulos (en paralelo si es posible)
nx run-many --target=build --all

# Build solo de backend
nx build backend

# Test de todos los módulos
nx run-many --target=test --all

# Afectados por el último commit
nx affected --target=build

# Bump de versión coordinado
nx release --version=0.1.0-alpha.3
```

---

## 📊 COMPARACIÓN DE OPCIONES

| Criterio | Opción A (Simple) | Opción B (Nx) |
|----------|-------------------|---------------|
| **Complejidad** | Baja (4 archivos nuevos) | Media (config + migración) |
| **Tiempo de implementación** | 2-4 horas | 8-16 horas |
| **Curva de aprendizaje** | Mínima | Media (aprender Nx) |
| **Integración con CI/CD** | Manual (scripts custom) | Automática (nx release) |
| **Dependency graph** | ❌ No incluido | ✅ `nx graph` visual |
| **Task orchestration** | ❌ Manual | ✅ Paralelo + cache |
| **Versionamiento** | Script custom | `nx release` integrado |
| **Escalabilidad** | Limitada (≤5 módulos) | Alta (50+ módulos) |
| **Recomendado para** | MVP, equipos pequeños (2-5 devs) | Enterprise, equipos grandes (10+ devs) |

---

## 🎯 RECOMENDACIÓN

### **Para OrderFlow en estado actual (MVP, equipo 2-5 devs):**

**✅ OPCIÓN A (Simple) es la recomendada**

**Razones:**
1. **Suficiente para el estado actual:** 4 módulos, sin dependencias complejas
2. **Implementación rápida:** 2-4 horas vs 8-16 horas de Nx
3. **Mantenimiento mínimo:** Scripts simples, sin dependencias externas
4. **Flexibilidad:** Fácil de migrar a Nx después si crecemos
5. **Enfoque en lo crítico:** Mejor invertir tiempo en Fase 0 (health checks, backups, SSL)

**Timeline sugerido:**
- **Post-Fase 0:** Implementar Opción A (cuando tengamos health checks y backups)
- **Post-Fase 2:** Evaluar migración a Nx si el equipo crece a 10+ devs

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN (OPCIÓN A)

### Fase 1: Archivos Básicos (2 horas)

- [ ] Crear `VERSION` con `0.1.0-alpha.2`
- [ ] Crear `CHANGELOG.md` con historial desde audit
- [ ] Crear `packages.json` (manifiesto de módulos)
- [ ] Crear `scripts/version.js` (automatización)

### Fase 2: Integración con Git (1 hora)

- [ ] Agregar `.gitattributes` para version files (LF line endings)
- [ ] Crear tag inicial `v0.1.0-alpha.2`
- [ ] Documentar proceso en `CONTRIBUTING.md`

### Fase 3: Integración con CI/CD (2 horas)

- [ ] Crear `.github/workflows/release.yml`
- [ ] Actualizar `ci-cd.yml` para leer versión de `VERSION`
- [ ] Configurar deploy automático por tipo de versión (alpha/beta/stable)

### Fase 4: Documentación (1 hora)

- [ ] Actualizar `README.md` con sección de versionamiento
- [ ] Agregar badge de versión en README
- [ ] Documentar comandos de version bump

---

## 📝 EJEMPLO DE FLUJO DE TRABAJO

### Scenario: Release de nueva versión alpha

```bash
# 1. Desarrollador completa tareas de la Fase 0
git checkout -b feature/health-check
# ... implementa health check endpoint ...
git commit -m "feat: add /health endpoint with DB check"
git push origin feature/health-check

# 2. PR review y merge a main
# (vía GitHub PR)

# 3. Bump de versión
git checkout main
git pull
node scripts/version.js 0.1.0-alpha.3

# 4. Actualizar CHANGELOG
# (editar CHANGELOG.md manualmente o con changelog generator)

# 5. Commit y tag
git add VERSION packages.json **/package.json CHANGELOG.md
git commit -m "chore: bump version to 0.1.0-alpha.3"
git tag -a v0.1.0-alpha.3 -m "Release 0.1.0-alpha.3 - Health checks + backups"

# 6. Push con tags
git push origin main --tags

# 7. CI/CD automático
# - GitHub Actions detecta el tag
# - Crea GitHub Release con CHANGELOG
# - Deploy automático a staging (es alpha)
```

---

## 🔗 REFERENCIAS

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Nx Monorepo Tools](https://nx.dev/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [Conventional Commits](https://www.conventionalcommits.org/) (para automatizar CHANGELOG)

---

## 🤔 PRÓXIMOS PASOS

1. **Evaluar esta propuesta** con el equipo
2. **Decidir entre Opción A o B** (recomendamos A)
3. **Asignar tiempo en sprint** (post-Fase 0)
4. **Implementar checklist** (6 horas totales)
5. **Documentar en wiki** el proceso de release

---

**Documento para evaluación del equipo**  
**Próxima revisión:** Post-Fase 0 (semana 2-3 del cronograma)
