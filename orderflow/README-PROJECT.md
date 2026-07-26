# 🛒 OrderFlow SaaS Platform

![OrderFlow](./images/orderflow-banner.png)

**Multi-Tenant SaaS para E-commerce, POS y Bookings**

![Version](https://img.shields.io/badge/version-0.1.0--alpha.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![NestJS](https://img.shields.io/badge/NestJS-10-red)
![React](https://img.shields.io/badge/React-18-blue)
![React Native](https://img.shields.io/badge/React_Native-0.76-61dafb)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)
![CI/CD](https://github.com/marcelompz/orderflow/workflows/OrderFlow%20CI/CD/badge.svg)

---

## 🚀 ¿Qué es OrderFlow?

OrderFlow es una **plataforma SaaS multi-tenant** que permite gestionar pedidos, e-commerce y reservas de turnos con una arquitectura modular estilo Odoo, pero modernizada para la web.

**Casos de uso:**
- 🏪 **E-commerce:** Catálogo, carrito, checkout multi-pago
- 📱 **POS Tablet:** Interfaz split-screen para ventas rápidas
- 📅 **Bookings:** Agenda de turnos con recursos y profesionales
- 🔄 **Integración ERP:** Sync bidireccional con Odoo, MIDA, SAP
- 📦 **Inventario:** Control de stock en tiempo real
- 💾 **Backups:** Copias automáticas vía SFTP

---

## 🏗️ Arquitectura

### **Multi-Tenant SaaS**
Cada tenant tiene:
- ✅ Datos aislados (API Key única)
- ✅ Branding personalizado (logo, colores)
- ✅ Módulos instalables (App Store)
- ✅ Configuración independiente

### **Arquitectura Modular**
- 🧩 **12 módulos core:** Auth, Tenants, Products, Orders, Customers, Bookings, etc.
- 🔌 **Módulos opcionales:** Quotations (presupuestos), CRM, Reports
- ⚙️ **Módulos infraestructura:** Backups SFTP, Webhooks, Health Checks

### **Stack Tecnológico**

| Componente | Tecnologías |
|------------|-------------|
| **Backend** | NestJS + Prisma + PostgreSQL |
| **Frontend** | React + Vite + Refine + Ant Design |
| **Mobile** | React Native + Expo + Zustand |
| **DevOps** | Docker + GitHub Actions + SSH |
| **Auth** | JWT + API Keys + Refresh Tokens |

---

## ✨ Features Principales

### **E-commerce**
- 🛒 Catálogo visual con búsqueda y filtros
- 🛍️ Carrito persistente con sync offline
- 💳 Checkout multi-pago (efectivo, tarjeta, transferencia)
- 📦 Cálculo automático de impuestos y rentabilidad

### **Point of Sale (POS)**
- 📱 Interfaz split-screen para tablets
- ⚡ Ventas ultrarrápidas (modo Odoo POS)
- 🔄 Cola de sincronización offline
- 📲 Múltiples sesiones simultáneas

### **Bookings & Agenda**
- 📅 Turnos por servicio, profesional y recurso
- 🏥 Asignación de cabinas/consultorios
- 🔔 Notificaciones y recordatorios
- 📊 Disponibilidad en tiempo real

### **Módulos Dinámicos**
- 🎯 App Store de módulos instalables
- ⚙️ Configuración por tenant (JSON)
- 📦 Migraciones SQL automáticas por módulo
- 🔌 Dependencias validadas

### **Integración ERP**
- 🔄 Sync bidireccional con Odoo 19
- 📤 Webhooks con reintentos automáticos
- 📥 Importación masiva de productos/clientes
- 💾 Facturación electrónica (Paraguay)

### **DevOps & CI/CD**
- 🐳 Docker Compose (dev + prod)
- 🚀 GitHub Actions (tests + deploy)
- 💾 Backups automáticos SFTP
- 🏥 Health checks en tiempo real

---

## 📦 Módulos Disponibles

### **Core (Siempre Activos)**
| Módulo | Descripción |
|--------|-------------|
| **Auth** | Autenticación JWT + API Keys |
| **Tenants** | Gestión multi-tenant |
| **Products** | Catálogo de productos |
| **Orders** | Pedidos + webhooks |
| **Customers** | Clientes y contactos |
| **Bookings** | Turnos y agenda |
| **Users** | Usuarios y permisos |
| **Integrations** | Conexiones ERP |
| **Health** | Health checks |
| **Webhooks** | Reintentos automáticos |

### **Infraestructura**
| Módulo | Descripción |
|--------|-------------|
| **Backups** | Copias SFTP automáticas |

### **Opcionales (Add-ons)**
| Módulo | Descripción |
|--------|-------------|
| **Quotations** | Presupuestos y cotizaciones |

---

## 🚀 Quick Start

### **1. Clonar repositorio**
```bash
git clone https://github.com/marcelompz/orderflow.git
cd orderflow
```

### **2. Iniciar Docker**
```bash
docker compose up -d
```

### **3. Crear primer tenant**
```bash
curl -X POST http://localhost:3010/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Empresa S.A.",
    "webhookOrderConfirmedUrl": "https://mi-erp.com/webhook"
  }'
```

### **4. Configurar frontend**
```bash
cd frontend
cp .env.example .env
# Editar .env y agregar VITE_API_KEY=tu-api-key
```

### **5. Acceder**
- **Frontend:** http://localhost:3011
- **Backend API:** http://localhost:3010
- **Mobile:** `npm start` en `/mobile`

📖 **Ver [Guía Completa de Inicio](./docs/QUICKSTART.md)**

---

## 📊 Estado del Proyecto

| Fase | Estado | Score |
|------|--------|-------|
| **Fase 0: Health Checks** | ✅ Completo | 100% |
| **Fase 1: Versionamiento + Modularización** | ✅ Completo | 100% |
| **Fase 2: App Store UI** | ✅ Completo | 100% |
| **Fase 3: Mobile Offline + CI/CD + Tests** | ✅ Completo | 100% |
| **Fase 4: Production Ready** | ⏳ Pendiente | 0% |

**Score Global:** **84/100** ⚠️ → ✅ (MVP Avanzado)

---

## 🧪 Testing

```bash
# Backend
cd backend && npm run test

# Frontend
cd frontend && npm run test

# Mobile
cd mobile && npx tsc --noEmit
```

**Cobertura actual:** ~15% backend (en progreso a 60%)

---

## 📚 Documentación

| Tipo | Link |
|------|------|
| **Wiki Oficial** | https://wiki.marcelompz.github.io/orderflow/ |
| **Arquitectura Modular** | [docs/arquitectura-modular.md](./docs/arquitectura-modular.md) |
| **Versionamiento** | [docs/versionamiento.md](./docs/versionamiento.md) |
| **Quick Start** | [docs/QUICKSTART.md](./docs/QUICKSTART.md) |
| **API Reference** | [docs/API.md](./docs/API.md) |

---

## 🛠️ Desarrollo

### **Requisitos**
- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 15
- Git

### **Ramas**
- `main` → Producción (estable)
- `develop` → Integración (inestable)
- `feature/*` → Nuevas features
- `release/vX.Y.Z` → Pre-release

### **Commits**
Seguimos [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add new module
fix: resolve webhook retry issue
test: add unit tests for OrdersService
docs: update README.md
```

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

📖 **Ver [Guía de Contribución](./CONTRIBUTING.md)**

---

## 📄 Licencia

Distribuido bajo licencia MIT. Ver `LICENSE` para más información.

---

## 📞 Contacto

- **Email:** soporte@orderflow.com
- **Wiki:** https://wiki.marcelompz.github.io/orderflow/
- **Issues:** https://github.com/marcelompz/orderflow/issues

---

## 🎯 Roadmap 2026

### **Q3 2026**
- [ ] Tests unitarios (60% cobertura)
- [ ] Módulo CRM (leads + pipeline)
- [ ] Módulo Reports (BI + dashboards)
- [ ] SSL/HTTPS con nginx

### **Q4 2026**
- [ ] Módulo Email Marketing
- [ ] Módulo Inventory (multi-almacén)
- [ ] Tests E2E con Playwright
- [ ] Deploy a producción

---

**Hecho con ❤️ por el equipo de OrderFlow**

![OrderFlow Footer](./images/orderflow-footer.png)
