# Plan Estratégico Institucional & Hoja de Ruta Tecnológica — OmniFlow (2026 - 2028)

> **Versión:** 1.0.0  
> **Fecha:** 14 de Agosto de 2026  
> **Estado:** Aprobado / Plan Maestro de Arquitectura y Negocio  
> **Plataforma:** OmniFlow (Marca Pública) / OrderFlow (Infraestructura Técnica)  
> **Sistema de Seguimiento y OKRs:** Integrado con **Axon Ecosystem**  

---

## 1. Identidad Institucional & Marco Estratégico

### 🎯 Misión
Proporcionar a empresas de todos los tamaños una plataforma SaaS omnicanal de alta velocidad, modular y flexible, que optimice sus operaciones de venta, reservas, comercio social y gestión de clientes mediante una infraestructura ágil, adaptable y accesible tanto en entornos sencillos como en infraestructuras de alta escala.

### 🔭 Visión
Ser la plataforma SaaS de comercio omnicanal y gestión operativa líder en Latinoamérica para 2028, reconocida por su arquitectura de **doble distribución (Monolítica y Distribuida)**, su ecosistema dinámico de Marketplace de plugins y su integración transparente con ecosistemas ERP y herramientas de inteligencia de negocio.

### 💎 Valores Fundamentales
1. **Flexibilidad Arquitectónica sin Ficción:** Diseñar sistemas capaces de correr tanto en un servidor económico VPS On-Premise como en clústeres elásticos de Kubernetes sin duplicar esfuerzo ni código.
2. **Utilidad y Rendimiento Primero:** Priorizar la velocidad de ejecución, la ergonomía responsiva y la experiencia directa del usuario sobre la complejidad innecesaria.
3. **Aislamiento y Privacidad Sagrada (`tenantId`):** Garantizar la seguridad, integridad y separación absoluta de los datos de cada cliente en todos los modos de operación.
4. **Evolución Modular Continua:** Permitir la extensión y comercialización de funcionalidades tanto integradas como independientes (Microservicios Standalone).
5. **Excelencia Operativa e Integración:** Mantener una observabilidad total, pruebas automatizadas y sincronización fluida con sistemas de gestión corporativa (Odoo, Axon, ERPs).

---

## 2. Análisis FODA Estratégico (OmniFlow)

```
┌──────────────────────────────────────────┬──────────────────────────────────────────┐
│              FORTALEZAS (F)              │              OPORTUNIDADES (O)           │
├──────────────────────────────────────────┼──────────────────────────────────────────┤
│ • Arquitectura Híbrida Multi-Tenant/Tier │ • Crecimiento masivo del Comercio Social │
│   (shared vs dedicated DB).              │   (WhatsApp, Instagram, Telegram).       │
│ • Doble distribución (Monolito vs K8s).  │ • Demanda de soluciones SaaS híbridas    │
│ • Ecosistema de Microservicios Standalone│   capaces de correr On-Premise / VPS.    │
│   production-ready (Giveaways, BioLinks).│ • Expandir el Marketplace de plugins para│
│ • Cobertura E2E integrada (Playwright). │   desarrolladores terceros.              │
├──────────────────────────────────────────┼──────────────────────────────────────────┤
│               DEBILIDADES (D)            │               AMENAZAS (A)               │
├──────────────────────────────────────────┼──────────────────────────────────────────┤
│ • Necesidad de consolidar UX/UI          │ • Plataformas cerradas de gran escala    │
│   mobile-first en Backoffice.            │   con altos presupuestos de marketing.   │
│ • Deuda técnica en cobertura de tests    │ • Cambios de políticas o APIs en redes   │
│   en módulos secundarios.                │   sociales y pasarelas de pago.          │
│ • Curva de aprendizaje para terceros     │ • Competencia en soluciones de punto     │
│   en el uso de `@TenantPrisma()`.        │   de venta (POS) tradicionales.          │
└──────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 3. Modelo Estratégico de Doble Distribución

Para maximizar el alcance comercial e infraestructura, OmniFlow se empaqueta en dos versiones manteniendo un único código fuente:

```
                               ┌──────────────────────────────────────────┐
                               │   Repositorio Unificado OmniFlow (Core)  │
                               └────────────────────┬─────────────────────┘
                                                    │
                        ┌───────────────────────────┴───────────────────────────┐
                        ▼                                                       ▼
          ┌───────────────────────────┐                           ┌───────────────────────────┐
          │  EDICIÓN 1: MONOLÍTICA    │                           │   EDICIÓN 2: DISTRIBUIDA  │
          │  (Single-Binary / Single-  │                           │   (Microservicios / K8s)  │
          │   Container)              │                           │                           │
          └─────────────┬─────────────┘                           └─────────────┬─────────────┘
                        │                                                       │
                        ▼                                                       ▼
          • Proceso NestJS + 1 DB Postgres                         • Core Minimizado (BFF/Gateway)
          • Ideal para Pymes, VPS econó-                           • Microservicios en pods K8s
            micos (Hetzner, DigitalOcean)                            independientes
          • Cero latencia inter-servicio                           • Escalado elástico horizontal
          • Módulos habilitados por                                • Ideal para Clientes Corporativos
            App Store (`system-modules`)                             y Alta Concurrencia
```

---

## 4. Hoja de Ruta Estratégica & Fases de Desarrollo

### 🟢 FASE ACTUAL: Excelencia Monolítica & Consolidación Operativa (v1.20 - v2.0)
* **Objetivo Primario:** Perfeccionar la funcionalidad del monolito, pulir UX/UI responsiva, elevar la cobertura de pruebas unitarias/E2E y garantizar rendimiento máximo.
* **Hitos Clave:**
  * Optimización de módulos `orders`, `bookings`, `products`, `pos` y `kds`.
  * Fortalecimiento del App Store interno (`system-modules`) para habilitar/deshabilitar funcionalidades por tenant.
  * Extensión y estabilización de la suite de Microservicios Standalone (`services/*-standalone`) como productos paralelos.

### 🟡 FASE INTERMEDIA: Arquitectura Orientada a Eventos (`EventBus` & Decoupling) (v2.x)
* **Objetivo Primario:** Preparar la desacoplación de comunicación inter-módulo sin romper la edición monolítica.
* **Hitos Clave:**
  * Implementar el bus de eventos en memoria (`EventEmitter2`) para el Monolito y vía Redis/BullMQ para la edición Distribuida.
  * Separación lógica de esquemas PostgreSQL (`CREATE SCHEMA <modulo>`) en la base de datos compartida.
  * Paquete de contratos y DTOs estandarizados (`packages/contracts`).

### 🔴 FASE AVANZADA: Distribución Enterprise & Kubernetes (`v3.0.0+` Target 2028)
* **Objetivo Primario:** Despliegue elástico distribuido para clientes de alto volumen.
* **Hitos Clave:**
  * Core Minimizado (Platform Core + Auth + Tenant + Billing).
  * Helm Charts para orquestación completa en Kubernetes (`k8s/helm/`).
  * Service Mesh (Istio/Linkerd) para seguridad inter-servicio y ruteo avanzado.

---

## 5. Medición y Gobierno Estratégico vía **Axon Ecosystem**

Para monitorear la ejecución del plan estratégico y el avance de los OKRs (Objectives and Key Results), OmniFlow se integra con **Axon Ecosystem** como la plataforma de inteligencia y gobierno operativo:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AXON ECOSYSTEM                                     │
│                     (Dashboard de Gobierno Estratégico)                         │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
     ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
     │ OKRs & Métricas│          │ CI/CD & Test  │          │ Telemetría &  │
     │ Comerciales   │          │ Coverage      │          │ Infraestructura│
     │ (MRR/ARR)     │          │ (init.sh/k6)  │          │ (Sentry/Loki) │
     └───────────────┘          └───────────────┘          └───────────────┘
```

### OKRs Clave Monitoreados en Axon:
1. **OKR 1: Estabilidad y Calidad de Código**
   * *Métrica:* Cobertura de tests Jest > 85% y 0 fallas en Playwright E2E (`qa_e2e_check.py`).
2. **OKR 2: Madurez Monolítica & Performance**
   * *Métrica:* Tiempos de respuesta API < 100ms en el monolito y 0 regresiones en despliegues.
3. **OKR 3: Adopción del Marketplace**
   * *Métrica:* Módulos activados por tenant mediante `ModuleInstallation` y crecimiento de desarrolladores terceros.
4. **OKR 4: Preparación K8s / Distribuida**
   * *Métrica:* 100% de los módulos desacoplables validados con `packages/auth-shared` y eventos asíncronos.

---

## 6. Documentación Sincronizada
- [Guía de Desarrollo por Terceros y Marketplace](file:///opt/orderflow/docs/guides/12-desarrollo-modulos-terceros-y-marketplace.md)
- [Plan de Desacoplamiento de Schema](file:///opt/orderflow/docs/planes/SCHEMA_DECOUPLING_PLAN.md)
- [Contexto de Agentes y Convenciones](file:///opt/orderflow/docs/00-contexto-agentes.md)
