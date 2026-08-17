# Prisma multi-file layout (Fase 0)

## Estado

**Completado parcial — 2026-08-13**

Prisma 5.22.0 no soporta multi-file nativo con referencias en este proyecto. Se adoptó un **schema plano documentado** como Fase 0:

- `backend/prisma/schema.prisma` contiene todos los modelos, pero con comentarios de bounded context (Platform Core / Commerce Core / Feature Modules).
- La clasificación de modelos está documentada en `docs/planes/SCHEMA_DECOUPLING_PLAN.md`.
- El schema standalone de Giveaways (`services/giveaways-standalone/prisma/schema.prisma`) **sí** está listo para Fase 1.

## Estructura actual

```
backend/prisma/
├── schema.prisma              # Schema plano documentado (todos los modelos)
└── schema.prisma.monolith.bak # Backup del schema original (no trackeado)

services/giveaways-standalone/
└── prisma/
    └── schema.prisma          # Schema standalone Giveaways (Fase 1 lista)
```

## Próximo paso

Ejecutar **Fase 1 — Giveaways standalone**:
1. Crear schema PostgreSQL `giveaways`.
2. Ejecutar migración inicial.
3. Migrar datos con `scripts/migrate-from-core.ts`.
4. Cut-over de tráfico y eliminación de modelos del core.
