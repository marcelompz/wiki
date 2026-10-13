# OrderFlow - Testing Scripts

## Scripts Disponibles

### 1. Test de Autenticación Multi-Tenant

```bash
# Test completo del flujo de auth
cd backend
./scripts/test-auth-flow.sh
```

**Qué prueba:**
1. Login global (email + password)
2. Obtener lista de tenants accesibles
3. Seleccionar tenant y obtener JWT contextual
4. Acceder a endpoints protegidos
5. Refresh token
6. Logout

---

### 2. Test de Usuarios y Tenants

```bash
# Test de gestión de usuarios
cd backend
./scripts/test-users-flow.sh
```

**Qué prueba:**
1. Crear usuario global
2. Asignar acceso a tenant
3. Listar usuarios de tenant
4. Revocar acceso
5. Verificar que usuario sigue existiendo (global)

---

### 3. Test de API Endpoints

```bash
# Test de endpoints protegidos
cd backend
./scripts/test-api-endpoints.sh
```

**Qué prueba:**
1. API Key validation
2. JWT validation
3. Acceso a recursos por tenant
4. Aislamiento de datos entre tenants

---

## Ejecutar Todos los Tests

```bash
# Desde el root del proyecto
./scripts/run-all-tests.sh
```

---

## Requisitos Previos

1. **Backend corriendo**: `docker compose up -d backend`
2. **Base de datos migrada**: `docker compose run --rm backend npx prisma migrate deploy`
3. **Tenants de prueba creados**: Ver `scripts/seed-test-data.sh`

---

## Variables de Entorno para Tests

```bash
# .env.testing (crear en backend/)
DATABASE_URL=postgresql://orderflow:orderflow@localhost:5432/orderflow_db
API_KEY_HEADER=x-api-key
TEST_TENANT_API_KEY=<api_key_del_tenant_de_prueba>
```

---

## Output Esperado

```
✅ Test 1: Login global - PASSED
✅ Test 2: Select tenant - PASSED
✅ Test 3: Access protected resource - PASSED
✅ Test 4: Refresh token - PASSED
✅ Test 5: Logout - PASSED

Tests: 5 passed, 0 failed
Time: 2.3s
```
