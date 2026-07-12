---
layout: default
title: Home
---

# 📚 Wiki - Documentación y Manuales

Bienvenido a la wiki central de documentación para todos los proyectos SaaS.

---

## 📖 Proyectos SaaS

### OrderFlow
![OrderFlow Isotipo](./images/orderflow-isotipo.png){: width="100" }

**Sistema Multi-Tenant de Gestión de Pedidos**

- **Tipo:** SaaS E-commerce + POS + Bookings
- **Stack:** Node.js + NestJS + React + PostgreSQL
- **Usuarios:** Administradores, Vendedores, Clientes
- **Estado:** ✅ Producción operativa

**[Ver documentación →](./orderflow/README.md)**

---

### AIEER
![AIEER Isotipo](./images/aieer-isotipo.png){: width="100" }

**Plataforma de Seguimiento Longitudinal de Residentes Médicos**

- **Tipo:** SaaS Healthcare + EMA (Experience Sampling Method)
- **Stack:** FastAPI + Python + React + PostgreSQL
- **Usuarios:** Admin, Residentes, Internos, Docentes
- **Estado:** ✅ Producción operativa

**[Ver documentación →](./aieer/README.md)**

---

### VitaLog
![VitaLog Isotipo](./images/vitalog-isotipo.png){: width="100" }

**Plataforma de Monitoreo de Salud Mental + Integración Biométrica**

- **Tipo:** SaaS Digital Health + Wearables Integration
- **Stack:** FastAPI + Python + React + React Native + PostgreSQL
- **Usuarios:** Terapeutas, Pacientes
- **Estado:** 🔄 En desarrollo

**[Ver documentación →](./vitalog/README.md)**

---

### Axon Ecosystem
![Axon Isotipo](./images/axon-isotipo.png){: width="100" }

**Plataforma de Planificación Estratégica + Colaboración Local-First**

- **Tipo:** SaaS B2B + Strategic Planning + Real-time Collaboration
- **Stack:** Next.js + React + React Native + CouchDB + PostgreSQL + Prisma
- **Usuarios:** Corporaciones, Consultoras, Equipos
- **Estado:** 🔄 En desarrollo (MVP v2.1)

**[Ver documentación →](./axon/README.md)**

---

### LeadQualifierCRM
![LeadQualifier Isotipo](./images/leadqualifier-isotipo.png){: width="100" }

**Plataforma Automatizada de Prospección + Demo Web Generator**

- **Tipo:** SaaS B2B + Lead Generation + Web Scraping
- **Stack:** FastAPI + Python + Next.js + PostgreSQL + MongoDB
- **Usuarios:** Admin, Vendedores
- **Estado:** 🔄 En desarrollo (MVP v1.0)

**[Ver documentación →](./leadqualifier/README.md)**

---

## 🏗️ Arquitectura Común

Todos los proyectos comparten patrones arquitectónicos:

- ✅ **Multi-Tenant SaaS:** Aislamiento de datos por tenant
- ✅ **Docker + Compose:** Contenedores para desarrollo/producción
- ✅ **CI/CD:** GitHub Actions (staging + production)
- ✅ **Nginx + SSL:** Reverse proxy con Let's Encrypt
- ✅ **Cloudflare:** DNS + SSL Flexible/Full

**Ver:** [SaaS Common Library](./docs/saas-common-library.md) - Patrones y configuraciones compartidas

---

## 📜 Proyectos Históricos

### MEE
**Antecesor de AIEER** - Sistema de evaluación emocional

- **Tipo:** Healthcare monitoring (legacy)
- **Estado:** 📜 Descontinuado (reemplazado por AIEER v2.0)

---

## 🆘 Soporte

¿Necesitás ayuda?

- 📧 **Email:** marcelo@pesallaccia.com
- 🐛 **Reportar un bug:** [GitHub Issues de cada proyecto]
- 💡 **Solicitar feature:** [GitHub Issues de cada proyecto]

---

## 🚀 Quick Links

| Acción | OrderFlow | AIEER | VitaLog | Axon | LeadQualifier |
|--------|-----------|-------|---------|------|---------------|
| **Staging** | [staging.orderflow.app](https://staging.orderflow.app) | [staging.aieer.pesallaccia.com](https://staging.aieer.pesallaccia.com) | - | - | - |
| **Production** | [orderflow.app](https://orderflow.app) | [aieer.pesallaccia.com](https://aieer.pesallaccia.com) | - | - | - |
| **GitHub** | [Repo](https://github.com/marcelompz/orderflow) | [Repo](https://github.com/marcelompz/aieer) | [Repo](https://github.com/marcelompz/vitalog) | [Repo](https://github.com/marcelompz/axon-ecosystem) | [Repo](https://github.com/marcelompz/LeadQualifierCRM) |
| **Docs** | [/docs](./orderflow/) | [/docs](./aieer/) | [/docs](./vitalog/) | [/docs](./axon/) | [/docs](./leadqualifier/) |

---

*Última actualización: {{ site.time | date: "%Y-%m-%d" }}*
