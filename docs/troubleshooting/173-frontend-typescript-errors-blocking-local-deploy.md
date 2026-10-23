# Frontend TypeScript Errors Blocking Local Deploy

## Síntoma principal
El script `./scripts/deploy-local.sh` fallaba en la fase de build del frontend debido a errores de TypeScript relacionados con:
1. Importación incorrecta de DTOs backend en código frontend
2. Sintaxis incorrecta en importaciones lazy loading
3. Falta de definiciones de tipos frontend compatibles

## Causa raíz
Durante el desarrollo del módulo OmniGastro Configuration, se introdujo:
1. Importación directa de un DTO backend (`../../../backend/src/modules/omnigastro-config/dto/omnigastro-settings.dto`) en un archivo frontend (`src/pages/admin/omnigastro-payment-routing-config.tsx`)
2. Sintaxis incorrecta en la importación lazy loading que esperaba un objeto con propiedad `default` pero recibía el componente directamente
3. Falta de un DTO frontend apropiado para la configuración de routing de pagos

Estos errores violaban la regla de separación entre frontend y backend y causaban fallos en la compilación TypeScript durante el proceso de deploy local.

## Solución aplicada
Se realizaron tres cambios específicos para resolver el problema:

### 1. Corrección de importación backend en frontend
**Archivo:** `/opt/orderflow/frontend/src/pages/admin/omnigastro-payment-routing-config.tsx`
```diff
- import { PaymentRoutingConfig } from '../../../backend/src/modules/omnigastro-config/dto/omnigastro-settings.dto';
+ import { PaymentRoutingConfig } from './dto';
```

### 2. Creación de DTO frontend apropiado
**Archivo:** `/opt/orderflow/frontend/src/pages/admin/dto.ts` (nuevo archivo)
```typescript
export interface PaymentRoutingConfig {
  mode: 'CUSTOM_ENDPOINT' | 'ODOO';
  customEndpointUrl?: string;
  ooConfig?: {
    endpoint: string;
    apiKey?: string;
  };
}

export interface OmnigastroSettings {
  id?: string;
  tenantId?: string;
  paymentRouting: PaymentRoutingConfig;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 3. Corrección de sintaxis de importación lazy loading
**Archivo:** `/opt/orderflow/frontend/src/AdminApp.tsx`
```diff
- const OmnigastroPaymentRoutingConfigPage = lazy(() => import("./pages/admin/omnigastro-payment-routing-config").then(m => m.default));
+ const OmnigastroPaymentRoutingConfigPage = lazy(() => import("./pages/admin/omnigastro-payment-routing-config").then(m => ({ default: m.default })));
```

## Verificación
Tras aplicar los cambios:
- ✅ El frontend ahora compila sin errores TypeScript: `npm run build` completa exitosamente
- ✅ `npx tsc --noEmit` en frontend muestra 0 errores
- ✅ El backend sigue compilando correctamente: `npm run build` en backend sigue funcionando
- ✅ Ambas aplicaciones tienen directorios `dist/` actualizados confirmando builds exitosos
- ✅ El script `deploy-local.sh` ahora puede avanzar más allá de la fase de build del frontend

## Lecciones aprendidas
1. Nunca importar código backend directamente en frontend - siempre usar DTOs/frontend-specific types
2. Las importaciones lazy loading de React deben retornar objetos con propiedad `default` que contenga el componente
3. Siempre verificar que los cambios en uno extremo (frontend/backend) no rompan la compilación del otro
4. Mantener la separación de preocupaciones entre capas de la aplicación

## Relacionado con
- [docs/00-contexto-agentes.md] - Reglas de arquitectura y separación de capas
- Sección 2.2: Convención de nombres de archivos (kebab-case)
- Sección 2.4: Convención de columnas de base de datos (snake_case en PostgreSQL)