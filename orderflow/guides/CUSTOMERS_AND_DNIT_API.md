# 👥 Guía Completa de Integración: API de Clientes & DNIT

> **Módulo:** `backend/src/customers/`  
> **Versión de API:** `v1`  
> **Ruta Base:** `/api/v1/customers`  
> **Seguridad:** `ApiKeyGuard` (`x-api-key`) + `PermissionsGuard` (Bearer JWT)  

---

## 📌 1. Descripción General

El módulo **Customers** de OmniFlow administra la base de datos unificada de clientes del tenant, su información fiscal (RUC / Cédula), datos de contacto y direcciones de entrega. Además, incluye integración inteligente con el **Directorio Global (Crowdsourcing)** y consulta directa en tiempo real con la **DNIT (Dirección Nacional de Ingresos Tributarios de Paraguay)**.

---

## 🔒 2. Seguridad y Permisos (RBAC)

Todos los endpoints (salvo las consultas públicas de consulta fiscal) requieren:
1. **Autenticación Multi-Tenant:** Encabezado `x-api-key: <API_KEY_DEL_TENANT>`
2. **Autorización JWT:** Encabezado `Authorization: Bearer <JWT_TOKEN>`
3. **Permisos RBAC Granulares:**
   - `customers:read` — Lectura y consulta de clientes.
   - `customers:create` — Registro y sincronización masiva.
   - `customers:update` — Edición de datos de clientes.
   - `customers:delete` — Eliminación de clientes.

---

## 📡 3. Especificación de Endpoints

### 3.1 Listar Clientes
Devuelve la lista de clientes pertenecientes al tenant activo, ordenados alfabéticamente.

- **HTTP Method:** `GET`
- **Path:** `/api/v1/customers`
- **Query Parameters:**
  - `search` *(opcional)*: Término de búsqueda por nombre, teléfono o RUC/CI.
  - `limit` *(opcional, default: 100)*: Cantidad máxima de registros a retornar.

#### Ejemplo de Respuesta (`200 OK`):
```json
[
  {
    "id": "cm7abc1230000xx",
    "tenantId": "tnt_prod_01",
    "taxId": "80012345-6",
    "name": "Comercial Ejemplo S.R.L.",
    "phone": "+595981111222",
    "email": "contacto@ejemplo.com.py",
    "metadata": {
      "city": "Asunción",
      "street": "Av. España 456"
    },
    "createdAt": "2026-08-01T10:00:00.000Z",
    "updatedAt": "2026-08-15T14:20:00.000Z"
  }
]
```

---

### 3.2 Sincronización Masiva / Creación (`sync`)
Permite insertar o actualizar de forma masiva clientes en el tenant (soportando tanto arquitecturas de base de datos compartida como dedicada).

- **HTTP Method:** `POST`
- **Path:** `/api/v1/customers/sync`
- **Payload (`application/json`):**

```json
{
  "customers": [
    {
      "tax_id": "80012345-6",
      "name": "Empresa Ejemplo S.A.",
      "phone": "+595981123456",
      "email": "facturacion@ejemplo.com",
      "city": "Asunción",
      "street": "Av. Mariscal López 1234"
    }
  ]
}
```

#### Respuesta (`200 OK`):
```json
{
  "created": 1,
  "updated": 0,
  "failed": 0
}
```

---

### 3.3 Consulta de RUC / Documento en la DNIT
Consulta de forma segura desde el backend los datos oficiales del contribuyente en la DNIT (Paraguay). Los resultados válidos alimentan automáticamente el **Directorio Global**.

- **HTTP Method:** `GET`
- **Path:** `/api/v1/customers/dnit/:documento`
- **Ejemplo:** `/api/v1/customers/dnit/80012345`

#### Respuesta de Éxito (`200 OK`):
```json
{
  "ruc": "80012345",
  "dv": "6",
  "razonSocial": "EMPRESA EJEMPLO S.A.",
  "estado": "ACTIVO"
}
```

---

### 3.4 Búsqueda en Directorio Global (`lookup`)
Consulta instantánea en el caché colaborativo global por RUC o Cédula.

- **HTTP Method:** `GET`
- **Path:** `/api/v1/customers/lookup/:taxId`

#### Respuesta (`200 OK`):
```json
{
  "found": true,
  "data": {
    "taxId": "80012345-6",
    "name": "EMPRESA EJEMPLO S.A.",
    "phone": "+595981123456",
    "email": "facturacion@ejemplo.com",
    "city": "Asunción"
  }
}
```

---

## 🛠️ 4. Guía de Troubleshooting

Si al consumir endpoints de clientes experimentas un error `404 Not Found`, verifica haber actualizado las llamadas legacy `/api/v1/sync/customers` hacia `/api/v1/customers`. Consulta la entrada completa en:
👉 [`docs/troubleshooting/15-sync-customers-404.md`](file:///opt/orderflow/docs/troubleshooting/15-sync-customers-404.md)
