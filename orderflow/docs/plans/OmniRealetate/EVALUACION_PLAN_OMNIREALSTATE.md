# **Evaluación del Plan OmniRealState**

**Documentos evaluados:** `INFORME_ARQUITECTURA_Y_RECOMENDACIONES_OMNIREALSTATE.md`, `PLAN_DE_IMPLEMENTACION_OMNIREALSTATE.md`, `PROMPTS_DE_IMPLEMENTACION_OMNIREALSTATE.md` **Contrastado contra:** el repo real de OrderFlow v1.28.0 y las decisiones de arquitectura ya tomadas (blindaje multi-tenant, transición OmniLedger, licenciamiento dual).

---

## **1\. Lo que el plan hace bien**

- **Alcance funcional maduro y realista** para un vertical inmobiliario: cubre los dos modelos de negocio correctos (loteamientos con financiación propia y property management de terceros), y no se queda solo en el CRUD de propiedades — llega hasta mora, refinanciación, expensas y liquidación a propietarios, que es donde normalmente fallan los sistemas inmobiliarios genéricos.  
- **Descomposición en 5 fases incrementales con entregables verificables** — mismo formato que ya usás en otros módulos (Capital Humano, OmniGastro), lo que facilita ejecutarlo con el mismo protocolo de 3 roles (Líder/Implementador/Revisor).  
- **Modelo de datos conceptual claro** (Project → Property → Unit → Cadastre/Contract/Inspection → Installment/Settlement) — la jerarquía es correcta y extensible.  
- El patrón de **"informe \+ plan \+ prompts de implementación"** es exactamente el que ya usás para blindaje y otros módulos — coherente con tu flujo de trabajo.

---

## **2\. Inconsistencias contra el estado real del ecosistema**

Estos son los puntos donde el plan se desalinea con decisiones ya tomadas o con el repo real (fue generado, aparentemente, sin ese contexto):

### ***2.1 Stack tecnológico mezclado e incorrecto***

El **Prompt 1** pide código para "SQLAlchemy / SQLModel / Odoo Model (especificar ambos)" y el informe menciona "extensiones de Odoo 18/19". Pero:

- El backend real de OrderFlow es **NestJS \+ Prisma \+ PostgreSQL**, no FastAPI/SQLAlchemy.  
- El único componente FastAPI del ecosistema es **OmniLedger**, y es un motor contable puro — no un lugar para modelar propiedades, unidades o catastro.  
- El ecosistema está **desconectando** Odoo (roadmap de 4 fases hacia el reemplazo total por OmniLedger en FastAPI), no extendiéndolo con módulos nuevos como `real.estate.property`.

Si estos prompts se usan tal cual para generar código, el resultado no compilará contra el repo real ni seguirá el patrón `getDb(db) + @TenantPrisma()` que ya está validado en `products`. Conviene reescribir los prompts asumiendo **NestJS \+ Prisma**, con OmniRealState como microservicio `*-standalone` (ver 2.4) que consume el core vía API, igual que el resto de los servicios.

### ***2.2 Vinculación a `res.partner` en vez del modelo de contactos propio***

El informe (2.2) y el Prompt 1 proponen FK polimórfica a `res.partner`. OrderFlow ya tiene su propio modelo de contactos en Prisma (`Customer`, `Contact`, `ContactAddress`, `ContactCategory`, `ContactBankAccount`, `ContactRole`) — vincular a `res.partner` reintroduce terminología y dependencia de Odoo justo en el módulo donde menos hace falta, dado que Odoo se está retirando del ecosistema.

### ***2.3 Integración contable ambigua***

El Prompt 3 y la matriz de integración tratan **"OmniLedger / Odoo Accounting"** como intercambiables, y el Prompt 3 pide generar directamente "Débito: Caja/Banco, Crédito: Deudores por Ventas" contra ese destino ambiguo. Según el roadmap vigente de OmniLedger, el patrón correcto ya existe y está probado: emitir eventos con un **DTO canónico** hacia el Integration Worker (BullMQ), que hace fan-out dinámico según qué integración tenga activa el tenant (Odoo, OmniLedger, o ambos) — el módulo de real estate no debería decidir el destino contable ni generar el asiento directamente.

### ***2.4 No sigue la convención de microservicio `*-standalone`***

El resto de módulos verticales del ecosistema (`biolinks-standalone`, `bookings-standalone`, `omnibi-standalone`, etc.) siguen un patrón fijo: carpeta `services/<nombre>-standalone/`, puerto en el rango 302x/303x, prefijo de subdominio propio (`bio.*`, `turnos.*`), y `packages/auth-shared` para JWT/API-key. Ninguno de los 3 documentos asigna nombre de servicio, puerto ni subdominio siguiendo esa convención — vale la pena definirlo antes del Prompt 1 (ej. `real-estate-standalone`, `propiedades.*`, próximo puerto libre revisando que no colisione con `omnibi-standalone`/`omniledger-standalone`, ambos documentados en `:3027`).

### ***2.5 Aislamiento multi-tenant: ausente por completo***

Ninguno de los 3 documentos menciona `tenantId`, `@TenantPrisma()` ni aislamiento por tenant — la regla más inviolable del `AGENTS.md`. Esto es especialmente delicado acá porque OmniRealState maneja datos de alta sensibilidad por diseño (contratos, cobranzas, comisiones de venta, datos catastrales de terceros) y, según la auditoría del repo actual (ver `AUDITORIA_ORDERFLOW_v1.28.0.md`), el patrón `this.prisma` sigue siendo el que se usa por defecto en desarrollo nuevo — 67 archivos así contra apenas 5 con `@TenantPrisma()`. Si OmniRealState se construye siguiendo los prompts tal como están, va a heredar la misma falla de aislamiento de entrada, en un módulo donde una fuga cross-tenant sería más grave que en la mayoría (datos legales/financieros de propietarios reales). Conviene agregar un requisito explícito en el Prompt 1: todo endpoint usa `@TenantPrisma()` con el patrón `getDb(db)` ya validado en `products`, sin excepción.

### ***2.6 Licenciamiento no definido***

El plan no posiciona OmniRealState en la matriz Community/Enterprise ya decidida. Dado que el módulo es, en esencia, "capa de inteligencia/compliance financiera" (motor de cuotas, mora, liquidación a propietarios) — la misma categoría que ya definiste como Enterprise para OmniLedger y EventOps — tiene sentido decidir esto en la Fase 1, no al final: por ejemplo, catastro/GIS básico en Community, motor financiero \+ liquidaciones \+ comisiones en Enterprise.

### ***2.7 PostGIS: dependencia nueva sin precedente en el repo***

Sería la primera vez que el ecosistema introduce PostGIS. Vale la pena confirmar si realmente hace falta la extensión completa (consultas espaciales avanzadas, índices GIN espaciales) o si, para el alcance real de las Fases 1–3 (guardar y mostrar polígonos, sin queries de intersección/superposición complejas en el roadmap), alcanza con un campo `Json` en Prisma para el GeoJSON — evitando sumar una dependencia de infraestructura nueva al primer sprint.

---

## **3\. Tamaño y prioridad relativa**

5 fases / 10 sprints es un módulo comparable en tamaño a OmniGastro completo, para un dominio (inmobiliario) fuera del negocio actual de Provecchio. Antes de secuenciarlo contra lo que ya está en curso (Capital Humano en diseño, OmniMessaging recién cerrado, blindaje de tenant aún pendiente), conviene confirmar el destino: ¿cliente propio, servicio a terceros, o expansión de producto del ecosistema? Eso cambia si conviene arrancarlo ahora o después de cerrar la Fase 1 del blindaje.

---

## **4\. Recomendación**

El informe y el plan funcional son sólidos y reutilizables tal cual. Antes de ejecutar los Prompts 1–5 como están, conviene una pasada de "traducción" que:

1. Reemplace FastAPI/SQLAlchemy/Odoo Model por **NestJS \+ Prisma**, siguiendo el patrón `*-standalone`.  
2. Reemplace `res.partner` por los modelos `Customer`/`Contact` ya existentes.  
3. Reemplace la integración contable directa por el **DTO canónico** hacia el Integration Worker.  
4. Agregue el requisito explícito de `@TenantPrisma()` en cada endpoint desde el Prompt 1\.  
5. Asigne nombre de servicio, puerto y subdominio siguiendo la convención vigente.

Puedo generar esa versión corregida de los 5 prompts si querés avanzar con eso.

&nbsp;