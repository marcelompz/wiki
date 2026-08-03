# OrderFlow - Estrategia de Testing CI/CD

**Fecha:** 2026-06-21  
**Estado:** ✅ Implementado

---

## 📊 Resumen de la Estrategia

OrderFlow implementa una estrategia de testing en **2 niveles**:

| Nivel | Dónde | Qué Tests | Duración |
|-------|-------|-----------|----------|
| **Nivel 1** | GitHub Actions | Tests unitarios + Build | 5-7 min |
| **Nivel 2** | Servidor Staging | Tests de integración + E2E | 3-5 min |

---

## 🏗️ Arquitectura de Testing

```
┌─────────────────────────────────────────────────────────────────┐
│                    Push a GitHub                                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions (Nivel 1)                                       │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ test-backend    │  │ test-frontend   │                       │
│  │ - npm ci        │  │ - npm install   │                       │
│  │ - npm test      │  │ - npm run lint  │                       │
│  │ - npm run build │  │ - npm run build │                       │
│  └─────────────────┘  └─────────────────┘                       │
│         │                       │                                │
│         └───────────┬───────────┘                                │
│                     ▼                                            │
│         ¿Todos los tests pasaron?                                │
│                     │                                            │
│              ┌──────┴──────┐                                     │
│             Sí            No                                     │
│              │              └──▶ Fin (falló, no deploy)          │
│              ▼                                                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Deploy a Staging (Nivel 2)                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Deploy (git pull + docker compose up)                │   │
│  │ 2. Esperar 15 segundos                                  │   │
│  │ 3. Health checks (backend + frontend)                   │   │
│  │ 4. Tests de integración (13 tests)                      │   │
│  │    - test-auth-flow.sh (8 tests)                        │   │
│  │    - test-users-flow.sh (8 tests)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│                  ¿Tests de integración OK?                      │
│                            │                                    │
│                    ┌───────┴───────┐                            │
│                   Sí              No                            │
│                    │               │                            │
│                    ▼               └──▶ Rollback automático     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Deploy a Producción (solo si staging OK)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Backup pre-deploy                                    │   │
│  │ 2. Deploy (git pull + docker compose up)                │   │
│  │ 3. Migraciones de Prisma                                │   │
│  │ 4. Health checks                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Tests por Nivel

### Nivel 1: GitHub Actions (Unit Tests)

**Backend:**
- ✅ Tests unitarios de servicios (`*.spec.ts`)
- ✅ Build de TypeScript (`npm run build`)
- ✅ Cobertura de código (`npm run test:cov`)

**Frontend:**
- ✅ Lint (`npm run lint`)
- ✅ Build (`npm run build`)

**Duración estimada:** 5-7 minutos

### Nivel 2: Servidor Staging (Integration Tests)

**Tests de Autenticación (8 tests):**
1. Login global - Obtener accessToken
2. Login global - Obtener refreshToken
3. Login global - Obtener lista de tenants
4. Seleccionar tenant - Obtener accessToken contextual
5. Acceder a recurso protegido (/auth/me)
6. Refresh token
7. Logout
8. Logout - Verificar refresh token invalidado

**Tests de Usuarios (8 tests):**
1. Listar usuarios del tenant (línea base)
2. Crear usuario global + asignar acceso
3. Login con usuario creado
4. Listar usuarios del tenant (después de crear)
5. Obtener detalle de usuario
6. Actualizar usuario (cambiar nombre)
7. Revocar acceso al tenant
8. Verificar usuario global sigue existiendo

**Duración estimada:** 3-5 minutos

---

## 🔧 Configuración Requerida

### GitHub Secrets

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `SERVER_HOST` | IP del servidor | `178.105.226.175` |
| `SERVER_USER` | Usuario SSH | `root` |
| `SERVER_SSH_KEY` | Private key SSH | `-----BEGIN...` |
| `STAGING_API_KEY` | API key del tenant de staging | `staging-api-key-xxx` |

### Servidor Staging

**Requisitos:**
- ✅ Docker + Docker Compose instalados
- ✅ `/srv/orderflow-staging/` con el repo clonado
- ✅ `docker-compose.prod.yml` configurado
- ✅ `.env.staging` con variables de entorno
- ✅ Tenant de prueba creado (`juan@example.com` / `password123`)

---

## 📊 Métricas de Testing

### Coverage Objetivo

| Componente | Coverage Mínimo | Actual |
|------------|-----------------|--------|
| **Backend** | 70% | ~60% (pendiente) |
| **Frontend** | 60% | ~0% (pendiente) |
| **E2E** | 50% | ~100% (13 tests) |

### Tiempo de Ejecución

| Job | Tiempo Promedio |
|-----|-----------------|
| `test-backend` | 3-4 min |
| `test-frontend` | 2-3 min |
| `deploy-staging` + tests | 5-7 min |
| `deploy` | 3-5 min |
| **Total CI/CD** | **13-19 min** |

---

## 🚀 Cómo Agregar Más Tests

### Backend (Unit Tests)

```bash
# Crear archivo .spec.ts
cd backend/src
touch auth/auth.service.spec.ts

# Escribir test (ver ejemplo en auth.service.spec.ts)

# Ejecutar tests
npm run test
npm run test:cov  # con cobertura
```

### Integration Tests (Scripts Bash)

```bash
# Crear script de test
cd backend/scripts
touch test-nuevo-feature.sh

# Seguir patrón de test-auth-flow.sh:
# 1. Usar colores para output
# 2. Función print_result()
# 3. curl para llamar endpoints
# 4. jq para parsear JSON
# 5. exit 1 si falla

# Agregar a run-all-tests.sh
```

---

## 🐛 Troubleshooting

### Tests fallan en GitHub Actions

```yaml
# Ver logs completos
- name: Debug tests
  run: npm run test -- --verbose
```

### Tests de integración fallan en staging

```bash
# Conectar al servidor
ssh root@178.105.226.175

# Verificar servicios
cd /srv/orderflow-staging
docker compose ps

# Ver logs
docker compose logs backend

# Ejecutar tests manualmente
cd backend
export TEST_API_KEY='staging-api-key'
./scripts/run-all-tests.sh
```

### Health checks fallan

```bash
# Verificar puertos
netstat -tlnp | grep -E '3010|3011|3012|3013'

# Probar endpoints manualmente
curl http://localhost:3010/health
curl http://localhost:3011
```

---

## 📖 Referencias

- **Workflow CI/CD:** `.github/workflows/ci-cd.yml`
- **Tests unitarios:** `backend/src/**/*.spec.ts`
- **Tests integración:** `backend/scripts/test-*.sh`
- **Jest config:** `backend/jest.config.json`

---

*Documento creado: 2026-06-21*  
*Próxima revisión: Después de alcanzar 70% coverage en backend*
