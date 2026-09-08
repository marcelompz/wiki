# Especificación Técnica: Modo Standalone (PyME) vs Modo Enterprise (ERP OmniFlow)

## 🎯 Objetivo Térmico y Funcional

Garantizar que un mismo codebase en `services/<nombre>-standalone` pueda ejecutarse en dos modos operativos según las variables de entorno de despliegue.

---

## ⚙️ Configuración de Modos de Operación

### 1. Modo Standalone (SaaS PyME)
- **Target:** Clientes pequeñas empresas que contrataron únicamente un módulo (ej. POS o Bookings).
- **Environment variables:**
  ```env
  STANDALONE_MODE=true
  SYNC_TO_CORE=false
  AUTH_PROVIDER=local_jwt
  DATABASE_URL=postgresql://user:pass@localhost:5432/pos_standalone_db
  ```
- **Comportamiento:**
  - El microservicio gestiona sus usuarios, clientes y productos localmente dentro de su propia base de datos (o schema).
  - No intenta enviar eventos a Redis/RabbitMQ hacia el backend Core.
  - Consumo de recursos mínimo (~40-60 MB RAM).

---

### 2. Modo Enterprise (Suite OmniFlow)
- **Target:** Empresas medianas/grandes con la suite completa contratada.
- **Environment variables:**
  ```env
  STANDALONE_MODE=false
  SYNC_TO_CORE=true
  REDIS_URL=redis://redis-core:6379
  AUTH_PROVIDER=omniflow_sso
  DATABASE_URL=postgresql://user:pass@localhost:5432/omniflow_enterprise_db
  ```
- **Comportamiento:**
  - Emisión automática de eventos de sincronización (ej. `POS_VENTA_CREADA`, `BOOKING_RESERVA_CONFIRMADA`).
  - Sincronización transparente hacia `odoo-adapter` y `backend`.
  - Integración total con Marca Blanca y OmniBI.

---

## 📦 Caso de Estudio: `pos-standalone` & `bookings-standalone`

Ambos servicios actualmente usan NestJS y Prisma:
- **NestJS Modules:** Se implementa un `SyncModule` condicional con `@Module({})` dinámico (usando `DynamicModule.register()`).
- Si `STANDALONE_MODE === 'true'`, el `SyncModule` registra un proveedor No-Op (Dummy) que ignora los eventos de sincronización sin arrojar errores.
