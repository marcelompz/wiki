# 🛠️ Troubleshooting #27: Error de Inyección de Dependencias por Alcance (Scope) de AuditService en Procesadores BullMQ

**Fecha:** 2026-08-06  
**Módulo / Área:** Backend / NestJS / BullMQ / Inyección de Dependencias  
**Severidad:** Alta (Causa que el backend falle al arrancar en producción con `Nest can't resolve dependencies`)  
**Estado:** ✅ **RESUELTO**

---

## 1. Síntoma / Problema

Al arrancar la aplicación backend en producción o entorno real con trabajadores BullMQ activos, NestJS falla durante la inicialización del contenedor de inyección de dependencias con el siguiente error:

```text
[Nest] 1  - 08/06/2026, 4:03:47 PM   ERROR [ExceptionHandler] Nest can't resolve dependencies of the WebhookQueueProcessor (?). Please make sure that the argument AuditService at index [0] is available in the QueuesModule context.

Potential solutions:
- Is QueuesModule a valid NestJS module?
- If AuditService is a provider, is it part of the current QueuesModule?
- If AuditService is exported from a separate @Module, is that module imported within QueuesModule?
```

Esto provocaba el reinicio o la falta de respuesta en los *health checks* del contenedor `orderflow-backend-prod`.

---

## 2. Análisis Técnico y Causa Raíz

Existen dos factores principales que causaban este fallo:

1. **Misincompatibilidad de Alcances de Inyección de Dependencias (Scoped vs Singleton):**
   - El servicio `AuditService` estaba anotado originalmente con `@Injectable({ scope: Scope.REQUEST })` (alcance por solicitud HTTP).
   - Los consumidores/procesadores de colas BullMQ (`WebhookQueueProcessor` con `@Processor('webhook-events')`) se instancian como servicios **Singleton** en segundo plano cuando la aplicación NestJS arranca.
   - En NestJS, un proveedor con alcance de solicitud HTTP (`Scope.REQUEST`) no puede ser inyectado directamente en un proveedor Singleton que se crea fuera del contexto de una petición HTTP web.
2. **Falta de exportación en un módulo de alcance Global:**
   - `AuditService` estaba declarado en `AppModule`, pero no estaba exportado dentro de un módulo `@Global()` (como `LoggerModule`), impidiendo su resolución automática en submódulos como `QueuesModule`.

---

## 3. Solución Aplicada

Se realizaron dos correcciones clave en el backend:

### A. Cambio de Alcance en `AuditService`
Se eliminó la restricción `{ scope: Scope.REQUEST }` en la definición del servicio [`AuditService`](file:///opt/orderflow/backend/src/common/audit.service.ts), permitiendo que funcione como un proveedor Singleton predeterminado:

```typescript
// backend/src/common/audit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  // ...
}
```

### B. Exportación Global en `LoggerModule`
Se añadieron `AuditService` y `PrismaService` a las listas de `providers` y `exports` de [`LoggerModule`](file:///opt/orderflow/backend/src/common/logger.module.ts) (módulo decorado con `@Global()`):

```typescript
// backend/src/common/logger.module.ts
import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { AuditService } from './audit.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [LoggerService, AuditService, PrismaService],
  exports: [LoggerService, AuditService, PrismaService],
})
export class LoggerModule {}
```

---

## 4. Prevención y Buenas Prácticas

- **Evitar `Scope.REQUEST` salvo estricta necesidad:** El uso de `Scope.REQUEST` en servicios generales degrada el rendimiento (crea una nueva instancia por cada request) e impide su reutilización en consumidores en segundo plano (WebSockets, CronJobs, BullMQ Workers).
- **Procesadores de Colas en Segundo Plano:** Todos los servicios inyectados dentro de un `@Processor()` de BullMQ deben ser Singletons o resolver sus dependencias dinámicamente mediante `ModuleRef` si requieren datos de request HTTP.
