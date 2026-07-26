# Estrategia Multi-Tenant en OrderFlow

OrderFlow adopta una arquitectura Multi-Tenant híbrida, fuertemente inspirada en las capacidades multiempresa de **Odoo**. Esta flexibilidad permite optimizar costos en la gran mayoría de los casos y a la vez soportar clientes "Enterprise" con estrictos requisitos de seguridad.

---

## 1. Nivel Base: Aislamiento Lógico (Shared Database, Shared Schema)
Es el **Modelo 1**, configurado por defecto.
- **Funcionamiento:** Todos los inquilinos (Tenants) almacenan sus datos en la misma base de datos PostgreSQL. 
- **Aislamiento:** Cada tabla de negocio (Orders, Products, Customers) tiene una columna `tenantId`. El aislamiento ocurre a nivel de aplicación (y puede respaldarse con *Row-Level Security* nativo de Postgres).
- **Ventajas:** Bajos costos de mantenimiento, despliegues (CI/CD) simples y rápidos, consumo eficiente de memoria y recursos.

## 2. Nivel Enterprise: Aislamiento Físico (Database-per-Tenant)
Es el **Modelo 2**, disponible como "As bajo la manga".
- **Funcionamiento:** Para aquellos clientes corporativos gigantes que exigen no compartir base de datos con otras empresas (por compliance o HIPAA).
- **Estrategia:** La misma instancia de backend de NestJS puede resolver dinámicamente cadenas de conexión distintas por cliente. El usuario inicia sesión en la base de datos central (Modelo 1) pero sus peticiones al sistema son derivadas automáticamente a un `schema` o base de datos externa de uso exclusivo.
- **Ventajas:** Aislamiento perfecto sin necesidad de mantener un clúster enorme de Kubernetes con cientos de contenedores.

---

## Acceso Multi-Empresa (Cross-Tenant) para Usuarios
Para emular el comportamiento de Odoo, la entidad `User` se ha rediseñado a nivel global:

1. **Email Único:** Un usuario usa las mismas credenciales de email y contraseña independientemente de a cuántas empresas tenga acceso.
2. **Tabla Intermedia (`UserTenantAccess`):** 
   Un usuario puede pertenecer al "Tenant A" con el rol de `ADMIN`, y simultáneamente al "Tenant B" con el rol de `VIEWER`. Esta tabla también guarda el ID del contacto local (`contactId`, equivalente al *res.partner* de Odoo) exclusivo de cada empresa.
3. **Administrador TI Global:** 
   Se implementó el flag `isSuperAdmin` en la tabla global de usuarios. Solo el Administrador TI tiene privilegios transversales para crear o asignar a un usuario el acceso a múltiples Tenants de forma concurrente.
