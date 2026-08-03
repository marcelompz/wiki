# Matriz de Compatibilidad de Módulos

## OrderFlow Core v0.4.x

| Módulo | Versión Actual | Compatible con Core | Dependencias |
|--------|----------------|---------------------|--------------|
| auth | 0.4.2 | 0.4.x | - |
| tenants | 0.4.2 | 0.4.x | auth |
| products | 0.4.2 | 0.4.x | tenants |
| orders | 0.4.2 | 0.4.x | tenants, customers, products |
| customers | 0.4.2 | 0.4.x | tenants |
| bookings | 0.4.2 | 0.4.x | tenants, customers |
| contacts | 0.4.2 | 0.4.x | tenants, customers |
| users | 0.4.2 | 0.4.x | tenants, auth |
| integrations | 0.4.2 | 0.4.x | tenants |
| health | 0.4.2 | 0.4.x | - |
| webhooks | 0.4.2 | 0.4.x | tenants |
| backups | 0.4.2 | 0.4.x | - |
| quotations | 0.4.2 | 0.4.x | customers, products |

## Notas de Compatibilidad

### Módulos Core
Todos los módulos core (auth, tenants, products, orders, customers, bookings, contacts, users, integrations, health, webhooks) están sincronizados y son **100% compatibles** dentro de la misma familia de versión (0.4.x).

### Módulos de Infraestructura
- `backups`: Compatible con Core 0.4.x, versionado de forma independiente ya que su lógica de cron/SFTP no impacta la API core.

### Módulos Opcionales
- `quotations`: Compatible con Core 0.4.x, requiere `customers` y `products`. Se puede instalar/desinstalar sin afectar el core ni romper el versionamiento del flujo principal.
