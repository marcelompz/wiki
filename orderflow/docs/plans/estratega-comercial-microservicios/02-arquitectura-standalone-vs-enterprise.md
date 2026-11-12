# Especificación Técnica: Modo Standalone (PyME) vs Modo Enterprise (ERP OmniFlow)

> **Estado: PROPUESTA — no implementada.** A v1.46.3 no existe ningún flag
> `STANDALONE_MODE`, `SYNC_TO_CORE` ni `AUTH_PROVIDER` en el código de `services/` ni del
> backend. Este documento define el diseño objetivo; su implementación es trabajo futuro.

## 🎯 Objetivo Técnico y Funcional

Garantizar que un mismo codebase en `services/<nombre>-standalone` pueda ejecutarse en dos
modos operativos según las variables de entorno de despliegue.

---

## ⚙️ Configuración de Modos de Operación

### 1. Modo Standalone (SaaS PyME)

- **Target:** clientes de pequeñas empresas que contrataron únicamente un módulo (ej. POS
  o Bookings).
- **Environment variables (propuestas):**
  ```env
  STANDALONE_MODE=true
  SYNC_TO_CORE=false
  AUTH_PROVIDER=local_jwt
  DATABASE_URL=postgresql://user:pass@localhost:5432/pos_standalone_db
  ```
- **Comportamiento esperado:**
  - El microservicio gestiona sus usuarios, clientes y productos localmente dentro de su
    propia base de datos (o schema).
  - No intenta enviar eventos a Redis/RabbitMQ hacia el backend Core.
  - Consumo de recursos objetivo (~40-60 MB RAM), a validar con benchmark real cuando se
    implemente.

---

### 2. Modo Enterprise (Suite OmniFlow)

- **Target:** empresas medianas/grandes con la suite completa contratada.
- **Environment variables (propuestas):**
  ```env
  STANDALONE_MODE=false
  SYNC_TO_CORE=true
  REDIS_URL=redis://redis-core:6379
  AUTH_PROVIDER=omniflow_sso
  DATABASE_URL=postgresql://user:pass@localhost:5432/omniflow_enterprise_db
  ```
- **Comportamiento esperado:**
  - Emisión automática de eventos de sincronización (ej. `POS_VENTA_CREADA`,
    `BOOKING_RESERVA_CONFIRMADA`).
  - Sincronización transparente hacia `odoo-adapter` y `backend`.
  - Integración total con Marca Blanca y OmniBI.

---

## 📦 Caso de Estudio: `pos-standalone` & `bookings-standalone`

Ambos servicios usan NestJS y Prisma. La propuesta es:

- **NestJS Modules:** implementar un `SyncModule` condicional con `@Module({})` dinámico
  (usando `DynamicModule.register()`).
- Si `STANDALONE_MODE === 'true'`, el `SyncModule` registra un proveedor No-Op (Dummy) que
  ignora los eventos de sincronización sin arrojar errores.

> Nota: hoy existe `services/sync-standalone` como microservicio independiente de
> sincronización. No debe confundirse con el `SyncModule` condicional que describe esta
> propuesta.

---

## ✅ Criterios de aceptación (cuando se implemente)

1. `grep -rn "STANDALONE_MODE" services/ backend/` devuelve usos reales en código, no solo
   documentación.
2. Cada servicio standalone arranca en ambos modos con las variables de entorno definidas.
3. En modo standalone no se abren conexiones a Redis ni a Odoo.
4. Tests unitarios del `SyncModule` cubren el proveedor No-Op y el proveedor real.
5. Documentar el flag en el README del servicio y en `docs/00-contexto-agentes.md`.
