# Comparación: Gestión de Contactos — Odoo (`res.partner`) vs OrderFlow (`Contact`)

> **Fecha:** 2026-08-05  
> **Objetivo:** Entender la gestión de contactos en Odoo y compararla con OrderFlow para identificar mejoras, especialmente en relación con empresas (Tenants/Tiers).

---

## 1. Visión General del Modelo de Odoo (`res.partner`)

### 1.1 Filosofía Central
Odoo usa **una sola tabla** (`res_partner`) para representar **todos** los contactos: personas físicas, empresas (proveedores, clientes), contactos internos y direcciones de envío/facturación. La distinción se hace con campos booleanos y relaciones jerárquicas, no con tablas separadas.

### 1.2 Campos Clave de `res.partner`

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `name` | Char | Nombre del contacto o razón social |
| `is_company` | Boolean | `true` = es una empresa, `false` = persona |
| `company_type` | Selection (computed) | `'person'` o `'company'` (derivado de `is_company`) |
| `parent_id` | Many2one → `res.partner` | Contacto padre (empresa dueña) |
| `child_ids` | One2many | Contactos hijos (personas vinculadas a la empresa) |
| `commercial_partner_id` | Many2one (computed) | La entidad comercial raíz (la empresa principal) |
| `commercial_company_name` | Char (computed) | Nombre de la entidad comercial |
| `company_name` | Char | Nombre de la empresa (cuando es contacto persona) |
| `company_id` | Many2one → `res.company` | Compañía a la que pertenece (multi-compañía) |
| `type` | Selection | Tipo de dirección: `contact`, `invoice`, `delivery`, `other`, `private` |
| `customer_rank` | Integer | > 0 = es cliente |
| `supplier_rank` | Integer | > 0 = es proveedor |
| `vat` | Char | RUC/NIT/CIF (Tax ID) |
| `same_vat_partner_id` | Many2one (computed) | Detecta duplicados por Tax ID |
| `function` | Char | Cargo/puesto (ej: "Gerente Comercial") |
| `category_id` | Many2many → `res.partner.category` | Etiquetas/tags |
| `user_id` | Many2one → `res.users` | Vendedor asignado |
| `user_ids` | One2many → `res.users` | Todos los usuarios vinculados |
| `bank_ids` | One2many → `res.partner.bank` | Cuentas bancarias |
| `credit_limit` | Float | Límite de crédito |
| `website` | Char | Sitio web |
| `comment` | Text | Notas |
| `active` | Boolean | Soft delete |

### 1.3 Jerarquía de Empresas en Odoo

```
res.partner (Empresa Raíz — is_company=true)
├── res.partner (Contacto 1 — parent_id=empresa, type=contact)
│   ├── Dirección de facturación (type=invoice)
│   └── Dirección de envío (type=delivery)
├── res.partner (Contacto 2 — parent_id=empresa, type=contact)
└── res.partner (Contacto 3 — parent_id=empresa, type=contact)
```

**Mecanismos clave de la jerarquía:**
- **`commercial_partner_id`**: Se propaga recursivamente. Un contacto hijo hereda la entidad comercial de su padre.
- **`_commercial_fields()`**: Campos como `vat` y `credit_limit` se sincronizan automáticamente del padre comercial a los hijos.
- **`_address_fields()`**: Campos de dirección (`street`, `city`, `zip`, etc.) se sincronizan del padre `type=contact` a los hijos.
- **`_fields_sync()`**: Después de crear/actualizar, propaga cambios comerciales y de dirección a hijos y ancestros.
- **`address_get()`**: DFS para encontrar direcciones por tipo (invoice, delivery, contact) dentro de los límites de la empresa.
- **`create_company()`**: Convierte un contacto existente en empresa creando un padre `is_company=true`.

### 1.4 Roles y Categorías en Odoo
- **No hay tabla intermedia de roles**: un contacto es cliente si `customer_rank > 0`, proveedor si `supplier_rank > 0`, y puede ser ambos simultáneamente.
- **Tags**: `res.partner.category` (many2many) para categorizar contactos.
- **Vendedor**: `user_id` (Many2one a `res.users`) y `user_ids` (One2many).

---

## 2. Visión General del Modelo de OrderFlow (`Contact`)

### 2.1 Filosofía Central
OrderFlow usa **una sola tabla** (`contacts`) con un campo `tenantId` para aislamiento multi-tenant. El concepto de "empresa" se maneja a nivel de Tenant, no a nivel de contacto.

### 2.2 Campos Clave de `Contact`

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `name` | String | Nombre del contacto o razón social |
| `isCompany` | Boolean | `true` = es una empresa |
| `parentId` | String? | Contacto padre (simplificado) |
| `type` | ContactType | `CUSTOMER`, `SUPPLIER`, `USER`, `LEAD`, `OTHER` |
| `customerRank` | Int | > 0 = es cliente |
| `supplierRank` | Int | > 0 = es proveedor |
| `taxId` | String? | RUC/NIT/CIF |
| `email` | String? | Email |
| `phone` | String? | Teléfono |
| `mobile` | String? | Móvil |
| `website` | String? | Sitio web |
| `jobTitle` | String? | Cargo |
| `department` | String? | Departamento |
| `employeeNumber` | String? | Número de empleado |
| `hireDate` | DateTime? | Fecha de contratación |
| `notes` | String? | Notas |
| `metadata` | Json? | Metadatos flexibles |
| `active` | Boolean | Soft delete |
| `tenantId` | String | Aislamiento multi-tenant |

### 2.3 Roles en OrderFlow (`ContactRole`)
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `contactId` | String | Referencia al contacto |
| `tenantId` | String | Aislamiento por tenant |
| `role` | ContactRoleType | `CUSTOMER`, `SUPPLIER`, `USER` |
| `isPrimary` | Boolean | Rol principal |

**Diferencia clave**: OrderFlow usa una tabla intermedia (`contact_roles`) para permitir múltiples roles simultáneos, mientras que Odoo usa `customer_rank`/`supplier_rank` como contadores.

### 2.4 Usuario vinculado (`UserTenantAccess`)
| Campo | Propósito |
|-------|-----------|
| `userId` | Usuario del sistema |
| `tenantId` | Tenant al que pertenece |
| `role` | `ADMIN`, `MANAGER`, `SELLER`, `VIEWER` |
| `contactId` | Contacto vinculado (res.partner equivalente) |

---

## 3. Comparación Directa

### 3.1 Aislamiento de Empresas/Tenants

| Aspecto | Odoo | OrderFlow |
|---------|------|-----------|
| **Unidad de aislamiento** | `company_id` (res.company) | `tenantId` |
| **Multi-empresa** | Nativo: `company_id` en cada partner | No existe: un tenant = una empresa |
| **Compartir contactos entre empresas** | Sí (contacto sin company_id o con company_id compartida) | No: contacto pertenece a un solo tenant |
| **Jerarquía de empresas** | `parent_id` + `commercial_partner_id` | `parentId` (simple, sin propagación) |

**Análisis**: Odoo permite que un contacto pertenezca a múltiples empresas (compartido). OrderFlow aísla completamente por tenant. Para OrderFlow, esto es correcto dado su modelo multi-tenant, pero limita la posibilidad de tener contactos compartidos entre tenants (como un proveedor global).

### 3.2 Jerarquía Padre-Hijo

| Aspecto | Odoo | OrderFlow |
|---------|------|-----------|
| **Campo padre** | `parent_id` (Many2one) | `parentId` (String FK) |
| **Hijos** | `child_ids` (One2many con dominio) | No existe |
| **Propagación automática** | Sí (`_fields_sync`, `_commercial_sync`, `_children_sync`) | No |
| **Sincronización de dirección** | Automática del padre `type=contact` a hijos | No |
| **Sincronización de campos comerciales** | Automática (vat, credit_limit) | No |
| **Conversión contacto→empresa** | `create_company()` | No existe |

**Análisis**: La jerarquía de Odoo es mucho más sofisticada. Cuando creas un contacto hijo bajo una empresa, la dirección y los campos comerciales se sincronizan automáticamente. OrderFlow tiene `parentId` pero sin ningún mecanismo de propagación. Esto significa que si una empresa cambia su dirección, los contactos hijos no se actualizan.

### 3.3 Tipos de Dirección

| Aspecto | Odoo | OrderFlow |
|---------|------|-----------|
| **Tipos de dirección** | `contact`, `invoice`, `delivery`, `other`, `private` | No existe |
| **Dirección por defecto** | `type='contact'` | No aplica |
| **Búsqueda de direcciones** | `address_get()` (DFS) | No existe |

**Análisis**: Odoo permite tener múltiples direcciones para el mismo contacto (facturación, envío, privado). OrderFlow solo tiene una dirección por contacto. Para un sistema de e-commerce con pedidos, tener direcciones de facturación y envío separadas es importante.

### 3.4 Detección de Duplicados

| Aspecto | Odoo | OrderFlow |
|---------|------|-----------|
| **Duplicado por Tax ID** | `same_vat_partner_id` (computed) | No existe |
| **Duplicado por email** | `find_or_create` busca por email | `UsersService.findByEmail` existe, pero no en ContactsService |
| **Duplicado por teléfono** | No nativo | No existe |

**Análisis**: Odoo detecta automáticamente si otro contacto tiene el mismo VAT. OrderFlow no tiene esta protección, lo que puede llevar a contactos duplicados con el mismo RUC.

### 3.5 Tags/Etiquetas

| Aspecto | Odoo | OrderFlow |
|---------|------|-----------|
| **Sistema de tags** | `res.partner.category` (many2many) | No existe |
| **Uso** | Categorización de contactos | N/A |

**Análisis**: Los tags de Odoo permiten segmentar contactos (ej: "VIP", "Distribuidor", "Interno"). OrderFlow no tiene este concepto.

### 3.6 Vendedor/Asignación

| Aspecto | Odoo | OrderFlow |
|---------|------|-----------|
| **Vendedor asignado** | `user_id` (Many2one) | No existe |
| **Todos los usuarios** | `user_ids` (One2many) | No existe |

### 3.7 Cuentas Bancarias y Crédito

| Aspecto | Odoo | OrderFlow |
|---------|------|-----------|
| **Cuentas bancarias** | `bank_ids` (One2many) | No existe |
| **Límite de crédito** | `credit_limit` | No existe |

### 3.8 Búsqueda y Nombre Visual

| Aspecto | Odoo | OrderFlow |
|---------|------|-----------|
| **`name_get`** | Computado con prefijo de empresa: `"Empresa S.A., Juan Pérez"` | Solo `name` |
| **`display_name`** | Computado y almacenado | No existe |
| **Búsqueda por email** | `name_search` incluye email | No en ContactsService |
| **`find_or_create`** | Nativo por email | No existe en ContactsService |

---

## 4. Lo Bueno de Odoo (para aprender)

1. **Jerarquía con propagación automática**: `_fields_sync` es elegante — cuando una empresa cambia su dirección, todos los contactos hijos se actualizan automáticamente.
2. **Detección de duplicados por VAT**: `same_vat_partner_id` evita contactos duplicados.
3. **`find_or_create`**: Crear o encontrar un contacto por email en una sola operación.
4. **`commercial_partner_id`**: El concepto de "entidad comercial" es poderoso — permite que contactos individuales hereden la entidad comercial de su empresa.
5. **`address_get()`**: DFS para encontrar direcciones por tipo es muy útil para e-commerce.
6. **`create_company()`**: Convertir un contacto en empresa es un caso de uso común que Odoo maneja nativamente.
7. **Tags/Categories**: `res.partner.category` permite segmentación flexible.
8. **Multi-compañía**: `company_id` permite que un contacto pertenezca a múltiples empresas.

## 5. Lo Malo de Odoo (dolor de cabeza)

1. **Complejidad excesiva**: El modelo `res.partner` tiene ~90 campos y docenas de métodos computed. Es difícil de entender y mantener.
2. **Tabla única para todo**: Mezclar personas, empresas, direcciones y contactos en una sola tabla genera confusión y queries complejas.
3. **Propagación mágica**: `_fields_sync` es implicitamente complejo — los efectos secundarios no son obvios y pueden causar comportamiento inesperado.
4. **Dependencia de `parent_id` para todo**: La jerarquía se usa para dirección, empresa, y entidad comercial, lo cual es confuso.
5. **Sin aislamiento multi-tenant nativo**: `company_id` no es lo mismo que `tenantId`. Odoo está diseñado para una sola organización con múltiples compañías, no para SaaS multi-tenant.
6. **`type` field overloaded**: El campo `type` en Odoo significa "tipo de dirección" (contact, invoice, delivery), no "tipo de contacto" (customer, supplier). Esto es confuso.
7. **`is_company` como boolean**: No hay distinción clara entre persona y empresa en el nivel del registro — depende de un boolean.
8. **Rendimiento**: Los campos computed (`commercial_partner_id`, `display_name`, `same_vat_partner_id`) requieren recomputación constante y pueden ser lentos con miles de contactos.

## 6. Lo Bueno de OrderFlow (ventajas)

1. **Aislamiento multi-tenant nativo**: `tenantId` en cada tabla es limpio y explícito.
2. **Tabla intermedia de roles**: `ContactRole` permite roles múltiples con `isPrimary`, más flexible que los contadores de Odoo.
3. **Simplicidad**: Menos campos, menos magia, más predecible.
4. **Separación de concerns**: Contactos, roles y acceso de usuario están separados en tablas distintas.
5. **`syncUserForContact`**: La integración directa con usuarios del sistema es nativa y limpia.
6. **`groupBy=email`**: El nuevo endpoint de agrupación es útil para el directorio global de SuperAdmin.

## 7. Lo Malo de OrderFlow (áreas de mejora)

1. **Sin propagación de dirección**: Si una empresa (tenant) cambia su dirección, los contactos hijos no se actualizan.
2. **Sin detección de duplicados**: No hay verificación de VAT duplicado ni de email duplicado a nivel de contacto.
3. **Sin `find_or_create`**: No hay un método unificado para buscar/crear contactos por email.
4. **Sin jerarquía de direcciones**: Un contacto solo tiene una dirección. No hay direcciones de facturación vs envío.
5. **Sin tags/categorías**: No hay forma de segmentar contactos.
6. **Sin vendedor asignado**: No hay `userId` o `salespersonId` en el contacto.
7. **Sin cuentas bancarias**: Para un sistema de pagos, sería útil tener datos bancarios del contacto.
8. **`parentId` sin utilidad real**: El campo existe pero no tiene mecanismos de propagación ni validación.
9. **`ContactType` enum limitado**: Solo 5 tipos vs la flexibilidad de Odoo.
10. **Sin `display_name` computado**: El nombre se muestra tal cual, sin prefijo de empresa.

---

## 8. Mejoras Propuestas para OrderFlow

### 8.1 Prioridad Alta

| Mejora | Descripción | Inspiración en Odoo |
|--------|-------------|---------------------|
| **Detección de duplicados por taxId** | Al crear un contacto, verificar si ya existe uno con el mismo `taxId` en el mismo tenant | `same_vat_partner_id` |
| **`findOrCreateByEmail`** | Método en `ContactsService` que busca por email y crea si no existe | `find_or_create` |
| **Propagación de dirección** | Cuando `parentId` cambia o la dirección del padre se actualiza, propagar a hijos | `_fields_sync` + `_address_fields` |
| **`display_name` computado** | Campo computado que muestra `"Empresa, Contacto"` cuando tiene padre | `display_name` |

### 8.2 Prioridad Media

| Mejora | Descripción | Inspiración en Odoo |
|--------|-------------|---------------------|
| **Direcciones múltiples** | Tabla `ContactAddress` con `type` (invoice, delivery, contact, other) | `type` field en res.partner |
| **Tags/Categories** | Tabla `ContactCategory` many2many para segmentar contactos | `res.partner.category` |
| **Vendedor asignado** | Campo `userId` en Contact para asignar vendedor | `user_id` |
| **`findByEmail` en ContactsService** | Método de búsqueda por email (ya existe en UsersService, no en ContactsService) | `find_or_create` |

### 8.3 Prioridad Baja

| Mejora | Descripción | Inspiración en Odoo |
|--------|-------------|---------------------|
| **Cuentas bancarias** | Tabla `ContactBankAccount` para datos bancarios | `bank_ids` |
| **Límite de crédito** | Campo `creditLimit` en Contact | `credit_limit` |
| **`commercialPartnerId`** | Campo que apunta a la entidad comercial raíz del contacto | `commercial_partner_id` |
| **Conversión contacto→empresa** | Método que convierte un contacto en empresa (crea padre `is_company=true`) | `create_company()` |

---

## 9. Diagrama Comparativo de Modelos

### Odoo res.partner (simplificado)
```
res_partner
├── id (PK)
├── name
├── is_company (boolean)
├── parent_id (FK → res_partner)
├── child_ids (O2M)
├── commercial_partner_id (FK → res_partner, computed)
├── company_id (FK → res_company)
├── type (selection: contact/invoice/delivery/other/private)
├── customer_rank (integer)
├── supplier_rank (integer)
├── vat (string)
├── email, phone, mobile
├── address fields (street, city, zip, country_id, state_id)
├── function (job position)
├── category_id (M2M → res_partner_category)
├── user_id (FK → res_users)
├── user_ids (O2M → res_users)
├── bank_ids (O2M → res_partner_bank)
├── credit_limit (float)
├── website
├── comment (notes)
├── active (boolean)
├── display_name (computed)
├── same_vat_partner_id (computed)
└── company_type (computed: person/company)
```

### OrderFlow Contact (actual)
```
contacts
├── id (PK, UUID)
├── tenantId (FK → tenants)
├── type (enum: CUSTOMER/SUPPLIER/USER/LEAD/OTHER)
├── name
├── email
├── phone, mobile
├── taxId
├── website
├── address fields (street, city, state, zip, country)
├── isCompany (boolean)
├── parentId (FK → contacts, simple)
├── customerRank, supplierRank
├── jobTitle, department, employeeNumber, hireDate
├── notes, metadata
├── active (boolean)
├── createdAt, updatedAt
├── roles (M2M via contact_roles)
└── userAccess (FK → user_tenant_access)
```

### OrderFlow Contact (propuesto con mejoras)
```
contacts
├── id (PK, UUID)
├── tenantId (FK → tenants)
├── type (enum: CUSTOMER/SUPPLIER/USER/LEAD/OTHER)
├── name
├── display_name (computed: "Company, Contact" si tiene parent)
├── email
├── phone, mobile
├── taxId
├── website
├── address fields (street, city, state, zip, country)
├── isCompany (boolean)
├── parentId (FK → contacts, con propagación)
├── commercialPartnerId (FK → contacts, la entidad comercial raíz)
├── customerRank, supplierRank
├── jobTitle, department, employeeNumber, hireDate
├── notes, metadata
├── active (boolean)
├── createdAt, updatedAt
├── roles (M2M via contact_roles)
├── userAccess (FK → user_tenant_access)
├── categoryId (FK → contact_categories, nullable)
└── userId (FK → users, vendedor asignado, nullable)

contact_addresses (nuevo)
├── id (PK, UUID)
├── contactId (FK → contacts)
├── type (enum: contact/invoice/delivery/other/private)
├── street, street2, city, state, zip, country
├── isDefault (boolean)
└── createdAt

contact_categories (nuevo)
├── id (PK, UUID)
├── name
├── tenantId (FK → tenants)
└── color (string)

contact_category_map (nuevo, M2M)
├── contactId (FK → contacts)
├── categoryId (FK → contact_categories)
└── @@unique([contactId, categoryId])
```

---

## 10. Conclusiones

1. **Odoo es un monstruo de complejidad**: `res.partner` tiene ~90 campos y docenas de métodos computed. Es el modelo de datos más complejo de Odoo y está diseñado para cubrir todos los casos de uso de ERP.

2. **OrderFlow es más simple pero incompleto**: El modelo de Contact es limpio y fácil de entender, pero le faltan funcionalidades clave para un sistema de e-commerce (direcciones múltiples, detección de duplicados, propagación de cambios).

3. **La jerarquía de Odoo es su mayor fortaleza**: La propagación automática de campos comerciales y de dirección desde la empresa padre a los contactos hijos es un patrón que OrderFlow debería adoptar.

4. **El aislamiento multi-tenant de OrderFlow es superior**: `tenantId` en cada tabla es más limpio que el `company_id` de Odoo, que está diseñado para empresas con múltiples subsidiarias, no para SaaS multi-tenant.

5. **Las mejoras propuestas son incrementalmente implementables**: No es necesario replicar toda la complejidad de Odoo. Las mejoras de prioridad alta (detección de duplicados, findOrCreate, propagación de dirección) son independientes y de alto impacto.
