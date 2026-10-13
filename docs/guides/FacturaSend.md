# FacturaSend — Manual de Usuario y Configuración

## 1. Descripción General

FacturaSend es la integración de facturación electrónica (SIFEN) de Paraguay en OrderFlow. Permite emitir Documentos Electrónicos (DE) — facturas, notas de crédito, notas de débito, facturas de remisión — directamente desde la plataforma.

### Características

- **Emisión directa:** OrderFlow → FacturaSend sin pasar por Odoo
- **Soporte multi-moneda:** PYG, USD y otras (con tipo de cambio)
- **IVA automático:** 5% y 10% según tasa del producto
- **Clientes B2B/B2C/B2F:** Contribuyentes, consumidores finales e internacionales
- **Modo borrador:** Genera DE sin enviar a SIFEN para pruebas
- **Reintentos automáticos:** Reintenta en caso de errores transitorios (no reintentas errores de validación)
- **Cache de API key:** En memoria, con invalidación al actualizar config
- **Histórico de DEs:** Todos los documentos emitidos se guardan con XML, QR, CDC y estado

---

## 2. Credenciales

### Entorno de Prueba (Test)

| Campo | Valor |
|---|---|
| **Email / Usuario** | `soporte@crossnexion.com` |
| **Password** | `Cross1983_` |
| **Server IP** | `192.168.96.3` |
| **API Key** | `api_key_D7B70187-F641-45A7-B974-AF31A6C4E5B6` |
| **URL base** | `http://174.138.49.55:85/api/crossnexioneastest_9085` |

> **Nota:** En el entorno de prueba, el `tenantId` no se incluye en la URL (el tenant está codificado en la ruta base). Configurar `tenantInPath: false`.

### Entorno de Producción

Las credenciales de producción se proporcionan por FacturaSend / CrossNexión. Contactar a `soporte@crossnexion.com`.

---

## 3. Configuración por Tenant

### 3.1 Endpoints REST API

Todos los endpoints requieren autenticación JWT y pertenecen al grupo `ApiKeyGuard` + `JwtAuthGuard`.

**Base URL:** `https://api.provecchio.com/api/v1/integrations/facturasend`

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/config` | Obtener configuración (sin API key) |
| `POST` | `/config` | Crear o actualizar configuración |
| `DELETE` | `/config` | Desactivar configuración |
| `POST` | `/test` | Testear conexión con FacturaSend |
| `POST` | `/emit/:orderId` | Emitir DE para un order |
| `GET` | `/documents` | Listar DEs del tenant |
| `GET` | `/documents/:cdc` | Detalle DE (XML, KuDE, QR) |
| `POST` | `/documents/:cdc/status` | Refrescar estado SIFEN |
| `POST` | `/documents/:cdc/cancel` | Anular DE |
| `POST` | `/webhook` | Recepción de notificaciones de FacturaSend |

### 3.2 Crear Configuración

```bash
curl -X POST https://api.provecchio.com/api/v1/integrations/facturasend/config \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "api_key_D7B70187-F641-45A7-B974-AF31A6C4E5B6",
    "baseUrl": "http://174.138.49.55:85/api/crossnexioneastest_9085",
    "establishment": 1,
    "point": "001",
    "nextNumber": 1,
    "defaultTaxType": "1",
    "defaultIvaRate": 10,
    "defaultIvaType": 1,
    "defaultIvaProportion": 100,
    "enabled": true,
    "draftMode": true,
    "syncToOdoo": false,
    "tenantInPath": false
  }'
```

**Campos explicados:**

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `apiKey` | string | — | API key con prefijo `api_key_` |
| `baseUrl` | string | `https://api.facturasend.com.py` | URL base de la API |
| `establishment` | int | 1 | Número de establecimiento SIFEN |
| `point` | string | `"001"` | Punto de exposición |
| `nextNumber` | int | 1 | Próximo número de DE |
| `defaultTaxType` | string | `"1"` | Tipo de impuesto (1=IVA, 2=ISC, 3=Renta, 4=Ninguno) |
| `defaultIvaRate` | decimal | 10 | Tasa IVA por defecto (5 o 10) |
| `defaultIvaType` | int | 1 | Tipo IVA (1=Gravado, 2=Exonerado, 3=Exento) |
| `defaultIvaProportion` | decimal | 100 | Proporción IVA (%) |
| `responsibleUser` | JSON | — | Usuario responsable `{ documentoTipo, documentoNumero, nombre, cargo }` |
| `enabled` | boolean | true | Activar/desactivar integración |
| `draftMode` | boolean | true | Si true, genera en borrador sin enviar a SIFEN |
| `syncToOdoo` | boolean | false | Si true, prioriza vía Odoo→FacturaSend |
| `tenantInPath` | boolean | true | Si false, no incluye tenantId en URL (para APIs de test) |

---

## 4. Emisión de Documentos Electrónicos

### 4.1 Emisión Manual

```bash
curl -X POST https://api.provecchio.com/api/v1/integrations/facturasend/emit/<orderId> \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"overrides": {"tipoDocumento": 7}}'
```

**Parámetros:**
- `orderId` (URL): ID del pedido en OrderFlow
- `overrides` (body, opcional): Overrides de configuración, ej: `{"tipoDocumento": 7}`

### 4.2 Emisión Automática

Cuando `orders.service.confirm()` marca un pedido como `CONFIRMED`, se dispara automáticamente `facturasendService.emitFromOrder()` si:

1. El tenant tiene `FacturasendTenantConfig` con `enabled: true`
2. `syncToOdoo` es `false` (emisión directa)

---

## 5. Tipos de Documento

| Tipo | Código SIFEN | Descripción |
|---|---|---|
| Factura | 1 | Factura electrónica |
| Autofactura | 4 | Autofactura |
| Nota de Crédito | 5 | NC asociada a factura |
| Nota de Débito | 6 | ND asociada a factura |
| Nota de Remisión | 7 | Remisión |

---

## 6. Clientes

FacturaSend mapea clientes según el **tipo de contribuyente**:

| Tipo | Condición | Tipo Operación |
|---|---|---|
| **B2B** | Cliente con RUC válido (8+ dígitos) | `1` (Jurídica) / `1` (Natural) |
| **B2C** | Cliente sin RUC, país PRY | `2` (Innominado) |
| **B2F** | Cliente sin RUC, país distinto a PRY | `4` (Exterior) |

### Datos requeridos del cliente (`metadata`):

```json
{
  "direccion": "Avda Calle Segunda",
  "numeroCasa": "1515",
  "departamento": 11,
  "distrito": 143,
  "ciudad": 3344,
  "documentoTipo": 5,
  "documentoNumero": "0",
  "pais": "PRY"
}
```

### Códigos SIFEN de ubicaciones:

| Campo | Descripción | Código de ejemplo |
|---|---|---|
| `departamento` | Departamento | 11 (Alto Paraná) |
| `distrito` | Distrito | 143 (Domingo Martínez de Irala) |
| `ciudad` | Ciudad | 3344 (Paso Ita) |
| `pais` | País (ISO 2) | PRY, USA, ARG |

---

## 7. Consulta de Documentos

### 7.1 Listar DEs

```bash
curl -X GET "https://api.provecchio.com/api/v1/integrations/facturasend/documents" \
  -H "Authorization: Bearer <jwt_token>"
```

### 7.2 Detalle de DE

```bash
curl -X GET "https://api.provecchio.com/api/v1/integrations/facturasend/documents/<cdc>" \
  -H "Authorization: Bearer <jwt_token>"
```

**Respuesta:**
```json
{
  "cdc": "01801206405001001000000722026080115609711925",
  "estado": "0-Generado",
  "numero": "001-001-0000007",
  "xml": "<rDE>...</rDE>",
  "qr": "https://ekuatia.set.gov.py/consultas-test/qr?...",
  "tipoDocumento": 1,
  "error": null
}
```

### 7.3 Refrescar Estado

```bash
curl -X POST "https://api.provecchio.com/api/v1/integrations/facturasend/documents/<cdc>/status" \
  -H "Authorization: Bearer <jwt_token>"
```

---

## 8. Anulación de Documentos

```bash
curl -X POST "https://api.provecchio.com/api/v1/integrations/facturasend/documents/<cdc>/cancel" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"motivo": "Error en factura"}'
```

---

## 9. Troubleshooting

### Error: "Algun/os error/es no permitio/tieron generar el XML"

Errores comunes de SIFEN:

| Error | Causa | Solución |
|---|---|---|
| `Valor de la Fecha ... no válido. Formato: yyyy-MM-ddTHH:mm:ss` | Formato de fecha incorrecto | El mapper corrige automáticamente (no requiere intervención) |
| `El código del Cliente ... debe tener de 3 a 15 caracteres` | ID de cliente demasiado largo (UUID) | El mapper trunca a 15 caracteres automáticamente |
| `RUC inválido` | Tax ID con formato incorrecto | Verificar dígitos verificadores |
| `Departamento/Ciudad inválido` | Código SIFEN incorrecto | Consultar códigos en SIFEN o usar geolocalización |

### Error: "No hay configuración activa de backup para el tenant"

El tenant necesita tener configurado FacturaSend (`facturasend_tenant_configs` con `enabled: true`).

### Error: "FacturaSend no configurado o inactivo para tenant"

Verificar que el tenant tenga configuración en la tabla `facturasend_tenant_configs` y que `enabled` sea `true`.

### Retries automáticos

| Escenario | Reintenta | Delay |
|---|---|---|
| Error 500 (server error) | Sí (3 veces) | 1s, 2s, 4s |
| Error 400/422 (validación) | No | Inmediato |
| Error 401/403 (auth) | No | Inmediato |

---

## 10. Verificación de Configuración

### Test de conexión

```bash
curl -X POST "https://api.provecchio.com/api/v1/integrations/facturasend/test" \
  -H "Authorization: Bearer <jwt_token>"
```

**Respuesta exitosa:**
```json
{"success": true, "message": "Conexión con FacturaSend exitosa"}
```

---

## 11. Testing (init.sh)

La suite de validación automatizada `scripts/init.sh` ejecuta:

```
✅ 58 test suites / 498 tests passed
✅ Backend build clean
✅ Frontend build clean
✅ Playwright E2E: all admin routes HTTP 200, no JS errors
```

Ver logs detallados en: `docs/troubleshooting/facturasend-validation.md`
