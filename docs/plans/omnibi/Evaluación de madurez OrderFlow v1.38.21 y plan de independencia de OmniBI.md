# Evaluación de madurez: OrderFlow v1.38.21 y plan de independencia de OmniBI

Evaluación técnica · 14 de octubre de 2026

Se revisó el código del monolito (`backend/`), `services/omnibi-standalone/`, el roadmap, el `featurelist.json` y el Plan Maestro adjunto. No se ejecutaron tests ni se levantaron servicios: las conclusiones salen de leer el código.

## Veredicto

- **OrderFlow como plataforma:** madurez alta. 440 archivos TS y 126 specs en el backend, multi-tenant con RLS y vault de credenciales, colas BullMQ.
- **OmniBI standalone hoy:** prototipo avanzado de ingesta, no un servicio de Decision Intelligence. Unas 800 líneas, un solo conector y un solo spec.
- **El plan:** la visión es coherente y la arquitectura es buena. La Fase 1 está cerca de un 30–35 % hecha; las Fases 2 y 3 parten de cero.

El roadmap marca OmniBI como "Production Ready" y "Completo". Con lo que se ve en el código, esa etiqueta es optimista.

## Qué existe hoy en OmniBI standalone

### Lo sólido

- Servicio en su propio directorio, con Dockerfile, `docker-compose`, esquema Prisma y migración propios.
- Tablas de ingesta `bi_sales_history`, `bi_purchases_history`, `bi_contacts_history` y `bi_bom_history`, todas con `tenantId`.
- Upserts idempotentes sobre `(tenantId, sourceModel, sourceId)` y checkpoints incrementales por `write_date`.
- Extractor XML-RPC con paginación de 500 registros.
- El monolito ya consume el standalone por HTTP y devuelve un fallback vacío si este falla.
- Base de auth compartida (`auth-shared`) con JWT y API key.

### Los problemas reales

1. **Cifras inventadas en producción.** `getYoYComparison` calcula las "ventas en vivo" como `histórico × 1.284` y usa literales como `48520`, `342`, `15420` o `45000000` cuando no hay datos. No hay ningún dato en vivo de OmniFlow. El roadmap dice que se reemplazó el mock, pero eso solo ocurrió en el proxy del monolito. Un tablero con números plausibles pero falsos es peor que uno vacío, y es incompatible con alimentar KPIs a QMSSuite o KRs a Axon.
2. **Defaults peligrosos.** `provecchio-dimora-001` está hardcodeado en 9 lugares y las credenciales de Odoo caen por defecto a `admin/admin`. Las credenciales viajan en el body del request en vez de salir de un vault. En un modelo agnóstico, un tenant inexistente debería dar error, no caer en el cliente de Provecchio.
3. **Aislamiento OLAP incumplido.** El `docker-compose` apunta por defecto a `orderflow_db`, la misma base transaccional. El plan exige una PostgreSQL independiente.
4. **Modelo de datos todavía no canónico.** Solo hay tablas espejo de Odoo con `rawData` JSON. Faltan dimensiones y hechos, y no hay tablas de mermas, tiempos de ciclo, costos ni no conformidades.
5. **Fallas silenciosas.** `syncOdoo14Historical` captura el error y responde `{success:false}` con HTTP 200. Además, `isCustomer` vale siempre `true` por un `|| true`.
6. **Riesgos de robustez.** La paginación con `offset` no tiene orden determinista mientras se filtra por `write_date`. Los upserts se hacen uno a uno (N+1) y cada modelo carga todos sus registros en memoria. Parsear `write_date` sin zona horaria puede perder registros en el borde del checkpoint.
7. **Seguridad.** La master key se compara con `===`, sin comparación en tiempo constante. CORS queda en `*` con `credentials: true`. No hay rate limiting, aunque `@nestjs/throttler` está en las dependencias.
8. **Sin orquestación.** No hay cron ni BullMQ en OmniBI. Hoy solo funciona la sincronización manual por POST.
9. **Sin contrato de salida.** No hay DTOs versionados, ni OpenAPI efectivo, ni webhooks de salida. Hay 3 endpoints en total.

## Matriz del plan contra la realidad

| Componente del plan | Estado | Evidencia |
| --- | --- | --- |
| Servicio aislado (`services/omnibi-standalone`) | Estructura lista | Carpeta, Docker y Prisma propios, pero comparte DB por defecto |
| Conectores Odoo XML-RPC | Parcial | Solo Odoo 14, solo lectura, 4 modelos |
| Conectores OmniFlow (REST), webhooks, SQL/CSV | No existe | No hay código |
| Modelo canónico de hechos y dimensiones | No existe | Solo espejos con JSON crudo |
| Sync por cron y deltas | Parcial | Hay deltas por checkpoint, no hay cron |
| Colas Redis/BullMQ | No existe en OmniBI | Existen en el monolito y en `sync-standalone`, reutilizables |
| Live Escandallo ↔ No Conformidades | Una mitad | El escandallo existe (FEAT-118) con `wastePercentage` y `costAtSale`; no hay entidad de no conformidad en ningún lado |
| DPMO y Costo de No-Calidad | No existe | Ninguna referencia en el código |
| Integración con QMSSuite | No existe | Cero referencias |
| Integración con Axon (KRs y BSC) | No existe | Solo un `AxonDeployHandler` de despliegue, y es un stub |
| Visor Collabora/WOPI | Parcial | Funciona, pero vive en el monolito (FEAT-082), no en el standalone |

## Dónde está la inteligencia hoy

La analítica de valor (KPIs, matriz de productos, rotación y cobertura de inventario, márgenes reales, conciliación fiscal, calidad de datos, insights y recomendaciones) está en `backend/analytics` del monolito. El standalone solo hace ingesta histórica de Odoo.

El plan asume que OmniBI ya concentra la inteligencia, y no es así. Independizarlo implica **extraer ese módulo**, no solo ampliar el standalone.

## Madurez por dimensión

| Dimensión | Nivel | Comentario |
| --- | --- | --- |
| Plataforma OrderFlow (como fuente de datos) | Alto | Escandallo, mermas, costo al momento de venta, kardex, multi-moneda |
| Ingesta | Medio-bajo | Funciona, pero con un solo origen y sin robustez |
| Modelo analítico | Bajo | Sin esquema canónico |
| Cálculos y motor de correlación | Muy bajo | Datos simulados |
| Contratos de API para terceros | Muy bajo | 3 endpoints sin versionado |
| Seguridad y multi-tenancy del servicio | Medio-bajo | Auth reutilizable, pero con defaults y hardcodes riesgosos |
| Pruebas | Bajo | 1 spec con Prisma mockeado |
| Operación (cron, observabilidad, reintentos) | Bajo | Sin scheduler ni métricas propias |

## Opinión sobre el plan

El plan está bien orientado, con tres ajustes.

1. **Agregar una Fase 0 de saneamiento** (1–2 semanas), antes de la Fase 1:
   - Eliminar todo dato simulado y los multiplicadores.
   - Quitar los defaults de tenant y credenciales.
   - Dejar de devolver 200 en caso de error.
   - Separar la base de datos en su propia instancia.
   - Pasar las credenciales a un vault.
2. **Reordenar la Fase 1.** Primero el modelo canónico (`fact_sales`, `fact_cost`, `fact_waste`, `dim_product`, `dim_time`, entre otras) y una interfaz `SourceAdapter`. Después, el adaptador de OmniFlow, que aporta más valor que Odoo 14 porque trae mermas y costos al momento de la venta. Los eventos en vivo conviene recibirlos por outbox o webhook, no por polling.
3. **Definir los contratos antes de construir.** El plan lo menciona en "próximos pasos", pero debería ser un bloqueante: una especificación OpenAPI versionada (`/v1/kpis`, `/v1/facts`) con autenticación por servicio (service tokens con scopes por consumidor), no una API key maestra global.

### Dependencias que el plan no menciona

- **QMSSuite debe definir qué es una no conformidad** y dónde vive el registro. OmniBI no puede calcular DPMO ni Costo de No-Calidad sin ese modelo. Si QMSSuite no expone una API, la dirección QMS → OmniBI queda bloqueada.
- **Axon necesita un contrato de KRs.** Hay que definir si OmniBI empuja valores o Axon los consulta, con qué identificadores y con qué frecuencia. Hoy no hay ni un esquema de KR/BSC al que apuntar.
- **Las definiciones de las métricas** (qué cuenta como defecto, oportunidad o merma) deben quedar como configuración versionada por tenant. De lo contrario, el DPMO no será auditable.

## Estimación de esfuerzo (orientativa)

| Etapa | Esfuerzo aproximado |
| --- | --- |
| Fase 0: saneamiento | 1–2 semanas |
| Fase 1 completa: modelo canónico, adaptador OmniFlow, cron/colas, contratos | 5–7 semanas |
| Fase 2: puente QMS (depende de que QMSSuite exponga datos) | 4–6 semanas |
| Fase 3: salida a Axon (depende del contrato de KRs) | 3–5 semanas |

Son números sin conocer el equipo ni la disponibilidad de los otros dos sistemas.

## Siguiente paso sugerido

Lo más útil ahora es la Fase 0 más el contrato OpenAPI v1: el diff concreto del saneamiento sobre `omnibi.service.ts`, el controller y el guard, o la especificación del modelo canónico con los DTOs de entrada y salida para QMSSuite y Axon.
