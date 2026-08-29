# Plan Futuro: IDs Autoincrementales por Tenant

> **Estado:** 📋 Planificación — sin implementación  
> **Objetivo:** Evaluar la viabilidad de agregar un identificador numérico autoincremental por tenant como alternativa/adicional a los IDs string/UUID actuales, para uso como FK compacto y legible.

---

## 1. Motivación

- IDs compactos (`BIGINT`) para claves foráneas y referencias humanas.
- Secuencia controlada por tenant, no global.
- Mejor experiencia en URLs públicas, exports y reportes.
- Potencial mejora de performance en joins/indexes versus strings largos.

---

## 2. Alcance Propuesto

- **Tablas candidatas:** `Product`, `Order`, `Customer`, `Invoice`, `Quotation`, `Booking`, `Contact`, `Giveaway`, `LoyaltyCard`.
- **Nuevo campo:** `tenantScopedId` (`BIGINT`, no nulo, único compuesto `(tenantId, tenantScopedId)`).
- **Backward compatibility:** mantener `id` actual como PK; `tenantScopedId` como campo alternativo/alias numérico.
- **Exposición:** DTOs, respuestas públicas, historial, exports, QR targets.

---

## 3. Estrategias de Asignación

| Estrategia | Descripción | Pros | Contras |
|---|---|---|---|
| **Aplicación** (`findFirst` + `create`) | Leer último `tenantScopedId` por tenant y sumar 1. | Simple, sin triggers. | Riesgo de colisión bajo concurrencia alta. |
| **Secuencias por tenant** | `CREATE SEQUENCE tenant_{id}_seq` y usarla en INSERT. | Nativo DB, sin colisiones. | Gestión de many sequences en esquemas compartidos. |
| **Trigger BEFORE INSERT** | Trigger asigna siguiente número si no viene seteado. | Transparente para la app. | Complejidad de migración y mantenimiento. |
| **Hilo dedicado** | Tabla `tenant_counters(tenantId, lastId)` con `UPDATE ... RETURNING`. | Serialización por tenant sin lock pesado. | Requiere query extra por creación. |

---

## 4. Consideraciones

- **Concurrencia:** si se usa estrategia de app, debe serializarse por tenant (`SELECT ... FOR UPDATE` o similar).
- **DB dedicada por tenant (`isolationTier: dedicated`):** simplifica secuencias porque cada tenant tiene su schema/DB propio.
- **Migración/backfill:** requiere asignar números a filas existentes sin romper FKs ni histórico.
- **Prisma:** soporta `@db.BigInt` y secuencias, pero triggers/sequences por tenant requieren SQL raw en migrations.
- **Impacto API:** requiere versioneado de DTOs y posible migración de clientes externos.

---

## 5. Criterios de Aceptación

1. Sin duplicados de `(tenantId, tenantScopedId)`.
2. Performance de INSERT no degradada vs esquema actual.
3. IDs secuenciales por tenant sin importar orden global.
4. Facilidad de rollback sin perder datos.

---

## 6. Próximos Pasos

1. Definir tablas prioritarias (sugerencia: empezar por `Order` y `Customer`).
2. Evaluar estrategia de asignación según patrón de `isolationTier` predominante.
3. Prototipo en feature branch con migración + backfill script.
4. Medir impacto en carga y concurrencia antes de promover a production.

---

**Archivo creado:** `docs/planes/TENANT_SCOPED_IDS_PLAN.md`  
**Referencia cruzada:** `featurelist.json`, `docs/ROADMAP.md`.
