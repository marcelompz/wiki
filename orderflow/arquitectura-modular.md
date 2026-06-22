# 🏗️ Arquitectura Modular - OrderFlow SaaS

**Última actualización:** 2026-06-22  
**Versión:** 0.1.0-alpha.3

---

## 📋 ¿Qué es la Arquitectura Modular?

OrderFlow está construido como un **ecosistema de módulos interconectados** que funcionan como aplicaciones instalables, similar a Odoo pero modernizado para la web.

**Concepto clave:** En vez de un monolito rígido, OrderFlow es una **plataforma base** sobre la cual se pueden instalar/desinstalar módulos según las necesidades de cada tenant.

---

## 🎯 Beneficios Clave

### **Para tu Negocio:**
- ✅ **Personalización:** Cada tenant instala solo los módulos que necesita
- ✅ **Escalabilidad:** Nuevas features sin tocar el core
- ✅ **Mantenimiento:** Actualizaciones por módulo, no del sistema completo
- ✅ **Monetización:** Módulos premium como add-ons pagos

### **Para Desarrolladores:**
- ✅ **Aislamiento:** Cada módulo tiene su propia lógica y DB
- ✅ **Testing:** Tests unitarios por módulo
- ✅ **Reutilización:** Módulos pueden compartirse entre tenants
- ✅ **Extensibilidad:** Crear módulos custom sin modificar el core

---

## 📦 Módulos Disponibles

### **Módulos Core (Siempre Instalados)**

Estos módulos son la base del sistema y **no pueden desinstalarse**:

| Módulo | Descripción | Endpoints Principales |
|--------|-------------|----------------------|
| **Auth** | Autenticación JWT + API Keys | `/api/v1/auth/login`, `/api/v1/auth/refresh` |
| **Tenants** | Gestión multi-tenant | `/api/v1/tenants`, `/api/v1/tenants/config` |
| **Products** | Catálogo de productos | `/api/v1/sync/products` |
| **Orders** | Pedidos y webhooks | `/api/v1/orders`, `/api/v1/orders/:id/confirm` |
| **Customers** | Clientes y contactos | `/api/v1/sync/customers` |
| **Bookings** | Turnos y agenda | `/api/v1/bookings/availability`, `/api/v1/bookings/slots` |
| **Users** | Usuarios y permisos | `/api/v1/users`, `/api/v1/users/authenticate` |
| **Integrations** | Conexiones ERP (Odoo, MIDA) | `/api/v1/integrations`, `/api/v1/integrations/:id/test` |
| **Health** | Health checks del sistema | `/api/v1/health` |
| **Webhooks** | Reintentos automáticos | (interno, cada 5 min) |

---

### **Módulos de Infraestructura**

Módulos que mejoran la operación pero no son críticos:

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **Backups** | Copias de seguridad automáticas vía SFTP | ✅ Disponible |

**Backups Module:**
- Respaldos automáticos de PostgreSQL
- Destino: servidor SFTP configurable
- Frecuencia: cada 24 horas (configurable)
- Retención: últimos 7 backups
- **Configuración:** Se gestiona desde el dashboard de administración

---

### **Módulos Opcionales (Add-ons)**

Módulos que se instalan según necesidad:

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **Quotations** | Presupuestos y cotizaciones | ✅ Disponible |

**Quotations Module:**
- Crear presupuestos para clientes
- Validez configurable (ej: 15 días)
- Convertir presupuesto → pedido
- Términos y condiciones customizables
- **Ideal para:** B2B, ventas complejas, negociaciones

---

## 🛠️ Gestión de Módulos (App Store)

### **Acceso:**

1. Ingresar al **Panel de Administración** (`/admin`)
2. Navegar a **"Módulos"** o **"App Store"**
3. Ver lista de módulos disponibles

### **Interfaz:**

Cada módulo muestra:
- 📦 **Nombre y descripción**
- 🔢 **Versión actual**
- 📋 **Dependencias** (módulos requeridos)
- ⚙️ **Configuración** (si tiene settings)
- 🔘 **Botón Instalar/Desinstalar**

### **Instalar un Módulo:**

1. Click en **"Instalar"**
2. El sistema valida dependencias
3. Se ejecutan migraciones (si existen)
4. Se guarda configuración en DB
5. Módulo queda **activo inmediatamente**

### **Desinstalar un Módulo:**

1. Click en **"Desinstalar"**
2. El sistema verifica que no haya dependencias
3. Se eliminan datos del módulo (opcional)
4. Módulo queda **desactivado**

⚠️ **Precaución:** Algunos módulos pueden eliminar datos al desinstalarse.

---

## ⚙️ Configuración de Módulos

Cada módulo puede tener **settings personalizados** que se guardan en la base de datos por tenant.

### **Ejemplo: Módulo Backups**

```json
{
  "sftpHost": "sftp.miempresa.com",
  "sftpPort": 22,
  "sftpUser": "backups",
  "sftpPassword": "********",
  "remotePath": "/backups/orderflow",
  "frequency": "0 3 * * *",  // Daily at 3 AM
  "retention": 7
}
```

### **Ejemplo: Módulo Quotations**

```json
{
  "validityDays": 15,
  "termsAndConditions": "Este presupuesto es válido por 15 días hábiles. Los precios incluyen IVA."
}
```

**¿Dónde se configura?**
- Dashboard de Administración → Módulos → [Nombre del Módulo] → **Configuración**

---

## 🔧 Creación de Nuevos Módulos

### **Estructura de un Módulo:**

```
src/quotations/
├── quotations.manifest.json    # Metadata del módulo
├── quotations.module.ts        # Módulo NestJS
├── quotations.controller.ts    # Endpoints HTTP
├── quotations.service.ts       # Lógica de negocio
├── dto/
│   ├── create-quotation.dto.ts
│   └── update-quotation.dto.ts
├── entities/
│   └── quotation.entity.ts
└── migrations/
    └── 0.1.0-init.ts          # Migraciones (futuro)
```

### **Manifiesto (`*.manifest.json`):**

```json
{
  "name": "quotations",
  "displayName": "Presupuestos / Cotizaciones",
  "description": "Permite crear y enviar cotizaciones a clientes",
  "version": "0.1.0",
  "category": "sales",
  "depends": ["customers", "products"],
  "installable": true,
  "autoInstall": false,
  "application": true,
  "settings": [
    {
      "key": "validityDays",
      "type": "number",
      "description": "Días de validez por defecto",
      "default": 15
    }
  ]
}
```

**Campos clave:**
- `name`: Identificador único (sin espacios)
- `displayName`: Nombre visible en UI
- `depends`: Lista de módulos requeridos
- `autoInstall`: Si se instala automáticamente (core) o manual (opcional)
- `settings`: Configuración editable por el usuario

---

## 📊 Matriz de Compatibilidad

### **OrderFlow Core v0.1.x**

| Módulo | Versión | Compatible con Core | Dependencias |
|--------|---------|---------------------|--------------|
| auth | 0.1.0-alpha.3 | 0.1.x | - |
| tenants | 0.1.0-alpha.3 | 0.1.x | - |
| products | 0.1.0-alpha.3 | 0.1.x | tenants |
| orders | 0.1.0-alpha.3 | 0.1.x | tenants, customers, products |
| backups | 0.1.0-alpha.1 | 0.1.x | orders, webhooks |
| quotations | 0.1.0 | 0.1.x | customers, products |

**Notas:**
- Todos los módulos core son **100% compatibles** dentro de la misma familia (0.1.x)
- Módulos opcionales pueden tener su propia versión semántica
- El campo `depends` asegura que las dependencias estén instaladas

---

## 🚀 Roadmap de Módulos

### **Próximamente (2026 Q3-Q4):**

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **CRM** | Gestión de leads y pipeline de ventas | 📋 Planeado |
| **Reports** | Reportes BI y dashboards avanzados | 📋 Planeado |
| **Email Marketing** | Campaigns y automatización | 💡 En diseño |
| **Inventory** | Gestión de inventario multi-almacén | 💡 En diseño |
| **Payroll** | Nómina y recursos humanos | 💡 En diseño |

---

## 📚 Recursos Técnicos

### **Para Desarrolladores:**

- [Guía de Creación de Módulos](./arquitectura-modular-guia-dev.md)
- [Especificación de Manifiestos](./manifiestos-spec.md)
- [API de System Modules](./system-modules-api.md)

### **Para Administradores:**

- [Cómo Instalar Módulos](./como-instalar-modulos.md)
- [Configuración de Backups](./backups-config.md)
- [Módulo Quotations - Guía de Uso](./quotations-guia.md)

---

## 🤔 Preguntas Frecuentes

### **¿Puedo desinstalar un módulo core?**

❌ **No.** Los módulos core (auth, tenants, products, orders, etc.) son esenciales para el funcionamiento del sistema.

### **¿Qué pasa si desinstalo un módulo con dependencias?**

El sistema **bloquea la desinstalación** si hay otros módulos que dependen de él.

### **¿Los módulos opcionales tienen costo?**

Algunos módulos opcionales pueden ser **premium** (requieren suscripción adicional). Los módulos core y de infraestructura están incluidos en todos los planes.

### **¿Puedo crear módulos custom para mi tenant?**

✅ **Sí.** Contactanos para desarrollo de módulos customizados para tu negocio.

---

## 📞 Soporte

¿Tenés dudas sobre módulos?

- 📧 Email: soporte@orderflow.com
- 💬 Chat: Disponible en el dashboard
- 📚 Docs: [wiki.orderflow.com](https://wiki.marcelompz.github.io/orderflow/)

---

**Documentación creada:** 2026-06-22  
**Última revisión:** 2026-06-22  
**Próxima revisión:** 2026-07-22 (mensual)
