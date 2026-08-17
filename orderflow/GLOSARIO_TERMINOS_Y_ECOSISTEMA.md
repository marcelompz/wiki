# GLOSARIO_TERMINOS_Y_ECOSISTEMA.md — OrderFlow SaaS

> **Diccionario Oficial de Términos, Infraestructura y Aislamiento**  
> **Versión:** 1.0.0  
> **Propósito:** Evitar ambigüedades entre entornos de servidor, organizaciones/clientes (tenants), modelos de datos y herramientas de infraestructura.

---

## 🏢 1. Entornos & Servidores de Infraestructura

| Término | Definición Técnica | Identificador / Red | Rol en el Ecosistema |
| :--- | :--- | :--- | :--- |
| **`Production (Hetzner)`** | Servidor VPS principal en la nube. | `hetzner-orderflow` (`178.105.226.175`) | Instancia primaria de producción multi-tenant. |
| **`Servidor Provecchio`** | Servidor físico local / On-Premise dedicado. | `192.168.69.240` (LAN) / `38.52.135.227:2021` (Jump Host) | Servidor de producción local in-house y nodo de backup / réplica. |
| **`Staging Server`** | Entorno de pre-producción y pruebas E2E. | *(En preparación)* | Servidor para homologar versiones antes de pasar a producción. |

---

## 👥 2. Modelo Multitenant & Organizaciones

| Término | Definición Técnica | Ejemplo / ID | Observaciones |
| :--- | :--- | :--- | :--- |
| **`Tenant`** | Organización o cliente comercial que utiliza la plataforma. | `provecchio-dimora-001`, `spa-wellness-001` | Entidad lógica identificada por `tenantId` en la base de datos. |
| **`Tenant Provecchio Di Mora`** | El cliente u organización comercial de la firma Provecchio. | `tenantId: provecchio-dimora-001` | Habita como tenant en Hetzner y como tenant principal en el Servidor Provecchio. |
| **`Shared Isolation Tier`** | Aislamiento lógico multi-tenant sobre una base de datos PostgreSQL compartida. | `isolationTier: shared` | Todos los tenants comparten la misma base de datos `orderflow_db`. |
| **`Dedicated Isolation Tier`** | Aislamiento físico/esquema con base de datos o esquema propio para un cliente Enterprise. | `isolationTier: dedicated` | La organización cuenta con su propio string de conexión o esquema aislado. |

---

## ⚙️ 3. Modos de Operación (`ORDERFLOW_MODE`)

| Término | Definición Técnica | Comportamiento |
| :--- | :--- | :--- |
| **`community`** | Modo por defecto. Multi-tenant habilitado. | Requiere resolver `tenantId` en cada HTTP Request vía Headers o Subdominios. |
| **`enterprise`** | Modo Single-Tenant dedicado. | `tenantId` inyectado globalmente desde entorno para un solo cliente corporativo. |

---

## 🔀 4. Proxies, Rutas y DNS

| Término | Definición Técnica | Ubicación |
| :--- | :--- | :--- |
| **`Traefik Production`** | Reverse proxy exclusivo Traefik v3.4 en la nube Hetzner. | `/srv/traefik` (servidor) / `/opt/traefik-orderflow` (repo) |
| **`Traefik Provecchio`** | Instancia local aislada de Traefik v3.4 para el servidor local. | `/srv/traefik` en IP `192.168.69.240` |
| **`Dedicated Schema Version`** | Metadata que registra qué versión de estructura Prisma/PostgreSQL tiene un tenant determinado. | Campo `dedicatedSchemaVersion` en tabla `tenants`. |

---

## 🛡️ 5. Convención de Uso Obligatoria para Agentes AI

1. Al mencionar **`Provecchio`**, especificar explícitamente si se habla del **`Servidor Provecchio`** (`192.168.69.240`) o del **`Tenant Provecchio Di Mora`** (`provecchio-dimora-001`).
2. Al mencionar **`Producción`**, distinguir si es **`Production Hetzner`** o **`Production Servidor Provecchio`**.
