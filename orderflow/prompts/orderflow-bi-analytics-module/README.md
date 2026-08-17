# Módulo de BI & Business Analytics para OrderFlow

## 📦 Contenido del Paquete

Este módulo añade capacidades de Business Intelligence, rankings comparativos matriciales (mes a mes / YoY) y resúmenes ejecutivos de KPIs para la plataforma SaaS multi-tenant **OrderFlow**.

### Estructura de Archivos:
- `src/analytics/analytics.manifest.json`: Manifiesto para el App Store interno de módulos.
- `src/analytics/analytics.module.ts`: Definición del módulo NestJS.
- `src/analytics/analytics.controller.ts`: Controlador de endpoints REST (`/api/v1/analytics/*`).
- `src/analytics/analytics.service.ts`: Lógica de agregación SQL optimizada en PostgreSQL y armado matricial.
- `src/analytics/dto/product-ranking-query.dto.ts`: DTOs de validación con class-validator.
- `src/analytics/interfaces/analytics.interface.ts`: Tipos e interfaces de respuesta TypeScript.

## 🚀 Integración en el Backend

1. Copiar la carpeta `src/analytics` dentro de `backend/src/`.
2. Registrar `AnalyticsModule` en `backend/src/app.module.ts`:
   ```typescript
   import { AnalyticsModule } from './analytics/analytics.module';

   @Module({
     imports: [
       // ...
       AnalyticsModule,
     ],
   })
   export class AppModule {}
   ```
3. Iniciar el backend en localhost:
   ```bash
   cd backend
   npm run start:dev
   ```

## 📊 Endpoints Disponibles

1. **Matriz Comparativa de Productos:**
   `GET /api/v1/analytics/product-ranking-matrix?years=2025,2026&startMonth=1&endMonth=8&sortBy=revenue`

2. **Resumen Ejecutivo de KPIs:**
   `GET /api/v1/analytics/executive-summary?currentYear=2026&previousYear=2025`
