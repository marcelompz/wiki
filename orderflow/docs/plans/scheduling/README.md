# Scheduling — Feature Granular Core

> **Proyecto:** OrderFlow / OmniFlow  
> **Versión Baseline:** v1.35.0  
> **Fecha:** 2026-09-21  
> **Área:** Motor de scheduling/availability multi-tenant

---

## Índice

- [ROADMAP_SCHEDULING.md](./ROADMAP_SCHEDULING.md) — Roadmap ejecutivo con fases, dependencias y milestones.
- [PLAN_MAESTRO_CALDIY_INTEGRATION.md](./PLAN_MAESTRO_CALDIY_INTEGRATION.md) — Plan maestro consolidado con arquitectura, modelo de datos y fases detalladas.

---

## Descripción

Scheduling es una **feature granular core** de OmniFlow, extraída selectivamente de cal.diy. Provee lógica de scheduling reutilizable por:

- **Bookings** — disponibilidad doble, slots, bloqueos
- **OmniCRM** — programación de seguimientos, recordatorios
- **HR / Attendance** — turnos laborales, disponibilidad de empleados
- **POS / KDS** — disponibilidad de mesas, estaciones de cocina

## Características Principales

| Feature | ID | Estado | Milestone |
|---------|-----|--------|-----------|
| ISchedulingService Core | FEAT-141 | 📋 Planificado | v1.36.0 |
| Calendar Sync Providers | FEAT-142 | 📋 Planificado | v1.37.0 |
| Video Conferencing Providers | FEAT-143 | 📋 Planificado | v1.38.0 |
| Recurrencia y Reglas | FEAT-144 | 📋 Planificado | v1.39.0 |
| Webhooks Enriquecidos | FEAT-145 | 📋 Planificado | v1.40.0 |
| Payment Adapter | FEAT-146 | 📋 Planificado | v1.41.0 |

## Documentación Relacionada

- `/opt/orderflow/docs/plans/scheduling/ROADMAP_SCHEDULING.md`
- `/opt/orderflow/docs/plans/scheduling/PLAN_MAESTRO_CALDIY_INTEGRATION.md`
- `/opt/orderflow/ROADMAP.md`
- `/opt/orderflow/featurelist.json`
