# Plan de Separación de OmniFlow Core AGPL y Enterprise Proprietary

> **Nota de esta revisión:** este documento fue ajustado para ser coherente con las decisiones ya cerradas en `PLAN_LICENCIAMIENTO_OMNIFLOW.md` y el documento legal `Plan_de_Licenciamiento__Gobierno_y_Ecosistema_OmniFlow.md`. Los cambios respecto a la versión anterior están marcados con **[AJUSTADO]**.

## 1. Objetivo

Definir una arquitectura y un criterio único para separar el código de **OmniFlow Core**, publicado bajo AGPLv3, de las capacidades **Enterprise/Proprietary**, manteniendo una única plataforma y una experiencia coherente.

La premisa fundamental es:

> **Todo proceso fundamental de negocio debe existir en el Core. Enterprise no debe crear un proceso completamente diferente; debe ampliar su capacidad, escala, automatización, inteligencia o gobierno.**

El objetivo no es crear un "Core limitado" y una "Enterprise completa", sino permitir que ambas ediciones resuelvan los mismos problemas fundamentales, con diferentes niveles de profundidad y capacidad empresarial.

---

## 2. Principio rector del producto

La arquitectura debe seguir este modelo:

```
                  MISMO SERVICIO
                       │
             ┌─────────┴─────────┐
             │                   │
        OmniFlow Core       OmniFlow Enterprise
           AGPLv3               Privativo
             │                   │
        operación básica      operación avanzada
        procesos esenciales   escala / inteligencia
             │                   │
             └─────────┬─────────┘
                       │
              misma plataforma
```

Enterprise debe aportar principalmente:

- escala;
- profundidad funcional;
- automatización;
- analítica;
- inteligencia;
- gobierno empresarial;
- integración avanzada;
- productividad.

No debería existir una duplicación innecesaria de los procesos fundamentales.

---

## 3. Por qué AGPLv3 (no LGPL) **[AJUSTADO — se agrega justificación, antes ausente]**

La decisión de licencia Community ya fue cerrada como **AGPLv3** en el documento legal de referencia, resolviendo la pregunta no como "self-hosted vs. SaaS" sino como una **pregunta de ecosistema**: qué tan protegido debe estar el código frente a un competidor que lo ofrezca como SaaS sin devolver mejoras a la comunidad. AGPLv3 cierra ese vector (a diferencia de LGPL, que no cubre el uso vía red) y es coherente con el modelo de negocio de SaaS propio + partners + Marketplace descrito en la §10 de este documento. Cualquier fork técnico de este plan debe asumir AGPLv3 como decisión ya tomada, no como punto abierto.

---

## 4. Modelo general de arquitectura

```
                 OmniFlow
                     │
          ┌──────────┴──────────┐
          │                     │
     OmniFlow Core         Enterprise
       AGPLv3              Proprietary
          │                     │
          ├── CRM               ├── OmniBI
          ├── POS               ├── Multisucursal avanzada
          ├── Stock             ├── HR avanzado
          ├── Clientes          ├── QMS avanzado
          ├── Ventas            ├── Automatizaciones
          ├── HR básico         ├── BI / Benchmarking
          ├── QMS básico        ├── Forecasting
          ├── OmniLedger core   ├── OmniLedger fiscal/legacy
          └── APIs              ├── Integraciones avanzadas
                                 ├── OmniGastro
                                 └── AxonEcosystem
```

La frontera entre ambos debe ser técnica y arquitectónica, no solamente una separación de carpetas.

---

## 5. Categorías de funcionalidad

Toda funcionalidad debe clasificarse inicialmente en una de estas categorías:

| Categoría | Core AGPL | Enterprise |
|---|---|---|
| Operación básica | ✅ | ✅ |
| Escala | Básica | Avanzada |
| Automatización | Básica | Avanzada |
| Analítica | Operativa | Avanzada |
| Gobierno empresarial | Básico | Avanzado |
| Integraciones | Básicas | Avanzadas |
| Inteligencia | Básica / datos | Avanzada |

### 5.1 Core AGPL

El Core debe contener todo aquello que sea necesario para que una organización pueda operar el proceso fundamental.

Ejemplos: clientes, productos, categorías, ventas, pedidos, stock básico, empleados, usuarios, roles básicos, operaciones de POS, CRM básico, reportes operativos, APIs, eventos, mecanismos de extensión, integraciones fundamentales.

### 5.2 Enterprise

Enterprise debe ampliar las capacidades sin romper el modelo conceptual del Core.

Ejemplos: multisucursal avanzada, grandes volúmenes de empleados, administración masiva, permisos avanzados, workflows complejos, dashboards ejecutivos, OmniBI, benchmarking, forecasting, planificación, consolidación, auditoría avanzada, automatización avanzada, integraciones empresariales.

---

## 6. Ejemplo: multisucursal

No conviene crear artificialmente un límite como:

```
Core       → 1 sucursal
Enterprise → ilimitadas
```

Es preferible que el concepto de sucursal exista en el modelo fundamental:

```
Empresa
   └── Sucursal principal
```

Mientras Enterprise amplía las capacidades:

```
Empresa
   ├── Sucursal A
   ├── Sucursal B
   ├── Sucursal C
   └── Sucursal D
          │
          ▼
     Consolidación
          │
          ▼
        OmniBI
```

La capacidad básica pertenece al dominio Core; las capacidades avanzadas de administración, consolidación y análisis pueden pertenecer a Enterprise.

---

## 7. Ejemplo: OmniHRMS

```
Core                            Enterprise
OmniHRMS Core                   OmniHRMS Enterprise
├── empleados                   ├── multiempresa
├── usuarios                    ├── multisucursal
├── roles                       ├── estructuras organizacionales avanzadas
├── puestos                     ├── grandes volúmenes
├── departamentos               ├── workflows
├── documentación básica        ├── evaluaciones
└── operaciones básicas         ├── planificación
                                 ├── analítica
                                 ├── integración con OmniBI
                                 └── automatización
```

Enterprise no es otro sistema de RRHH. Es una ampliación del mismo dominio.

---

## 8. Ejemplo: grandes cantidades de empleados

No es recomendable establecer una limitación puramente artificial dentro del código (`Core → máximo 50 empleados`). Es preferible separar por capacidades:

**Core:** gestión individual, altas y bajas, roles, departamentos, consultas, operaciones básicas.

**Enterprise:** administración masiva, procesamiento por lotes, workflows, estructuras organizacionales complejas, analítica, planificación, optimización para grandes volúmenes.

Si el servicio SaaS necesita límites comerciales por plan, estos pueden gestionarse en la capa comercial o de suscripción, sin convertir necesariamente el Core AGPL en un producto artificialmente restringido.

---

## 9. OmniBI como capacidad Enterprise

```
OmniFlow Core
      │
      ├── ventas, clientes, pedidos, empleados, productos, tiempos, operaciones
              │
              ▼
        eventos / datos
              │
              ▼
          OmniBI
```

**Core: reporting operativo** — ventas del día, ventas por producto, ventas por usuario, pedidos pendientes, stock, clientes, tiempos operativos.

**Enterprise: inteligencia** — benchmarking, forecasting, rentabilidad, segmentación, tendencias, análisis multidimensional, KPIs ejecutivos, comparación entre sucursales, análisis temporal, predicciones, planificación.

> Core genera datos operativos confiables; Enterprise transforma esos datos en inteligencia empresarial avanzada.

---

## 10. Frontera técnica Core / Enterprise

El Core debe exponer contratos estables para permitir que Enterprise amplíe sus capacidades: APIs, eventos, webhooks, servicios, interfaces de extensión, contratos de datos, comandos, hooks documentados.

La Enterprise debería evitar modificar arbitrariamente los internals del Core.

---

## 11. Separación de repositorios

```
omniflow-core            AGPL-3.0
omniflow-connectors       licencia definida según cada componente
omnigastro                PROPRIETARY
omnihrms                  PROPRIETARY
omnibi                    PROPRIETARY
omniledger-connect        PROPRIETARY   [AJUSTADO — ver §12]
axonecosystem              PROPRIETARY
qmssuite                  PROPRIETARY (módulo avanzado; core QMS básico vive en omniflow-core)
omniflow-enterprise        PROPRIETARY
```

Incluye además, del modelo comercial ya definido:

- **OmniFlow Marketplace** — terceros comercializando módulos y addons sobre el Core.
- **OmniFlow Harness** — certificación técnica automatizada (seguridad, licencias, arquitectura, multi-tenancy, rendimiento) para módulos de terceros publicados en el Marketplace.

La separación de repositorios ayuda a mantener una frontera clara, aunque el repositorio por sí solo no determina jurídicamente si dos componentes constituyen una obra independiente o una obra derivada/combinada. La frontera debe estar respaldada por una arquitectura técnica real y debe ser revisada jurídicamente antes de la publicación comercial.

---

## 12. Caso OmniLedger **[AJUSTADO — corrige contradicción con el plan de licenciamiento]**

La versión anterior de este documento listaba `omniledger` completo como Enterprise/PROPRIETARY, lo cual contradice la decisión ya cerrada:

```
OmniLedger
   │
   ├── Core (AGPLv3)
   │     └── motor contable NIIF/NIC 2 — libro mayor, asientos, plan de cuentas,
   │         estados financieros base
   │
   └── Enterprise (PROPRIETARY) — "OmniLedger Connect"
         ├── informes fiscales por país (RG90, SIFEN/DNIT, etc.)
         ├── adaptadores legacy (Odoo CE u otros ERPs previos)
         └── integración con AxonEcosystem / OmniBI
```

Este es el criterio vigente y debe prevalecer sobre cualquier tabla de módulos que lo contradiga.

---

## 13. Regla jurídica/arquitectónica fundamental

No basta con hacer `/core` y `/enterprise` dentro de un mismo monolito. La separación debe ser real, con comunicación diseñada deliberadamente vía API/Events/Extension Points.

Antes de distribuir la versión Enterprise, debe realizarse una revisión legal de la relación entre Core AGPL y los componentes propietarios, especialmente cuando exista código enlazado, código derivado o componentes distribuidos conjuntamente. Esta revisión está subordinada al **IP Audit** descrito como Fase 0 en la §15.

---

## 14. Matriz de clasificación de funcionalidades

| Feature | Core | Enterprise | Justificación |
|---|---|---|---|
| Clientes | ✅ | | Función fundamental |
| Productos | ✅ | | Función fundamental |
| Ventas | ✅ | | Función fundamental |
| Stock | ✅ | | Función fundamental |
| Sucursal básica | ✅ | | Modelo fundamental |
| Multisucursal avanzada | | ✅ | Escala |
| Empleados | ✅ | | Función fundamental |
| Gestión masiva | | ✅ | Escala |
| Roles básicos | ✅ | | Seguridad |
| RBAC avanzado | | ✅ | Gobierno |
| Reportes operativos | ✅ | | Operación |
| Dashboards ejecutivos | | ✅ | Analítica |
| OmniBI | | ✅ | Producto especializado |
| Benchmarking | | ✅ | Inteligencia |
| Forecasting | | ✅ | Inteligencia |
| API | ✅ | | Ecosistema |
| Integraciones avanzadas | | ✅ | Enterprise |
| Auditoría básica | ✅ | | Transparencia |
| Auditoría avanzada | | ✅ | Gobierno |
| OmniLedger core (NIIF/NIC2) | ✅ | | Función fundamental |
| OmniLedger fiscal por país / legacy | | ✅ | Integración específica de alto valor |
| Módulo Marketplace de terceros | ✅ (conector) | según módulo | Ver §16, pregunta 6/7 |

---

## 15. Plan de ejecución recomendado **[AJUSTADO — IP Audit movido a Fase 0, bloqueante]**

### Fase 0 — IP Audit (bloqueante, previa a cualquier publicación de código)

Antes de tocar código o publicar cualquier repositorio, auditar la cadena de titularidad del copyright: contribuciones externas existentes, dependencias, código de terceros, código copiado/adaptado, y registrar la marca antes de abrir el repo público. Esta fase no puede posponerse ni ejecutarse en paralelo con la publicación — es prerrequisito de todo lo que sigue.

### Fase 1 — Inventario

Identificar todas las funcionalidades actuales del monolito y clasificarlas: CORE / ENTERPRISE / CONNECTOR / SHARED LIBRARY / INFRASTRUCTURE.

### Fase 2 — Definir contratos

Documentar APIs, eventos, modelos públicos, extension points, permisos, configuración, contratos de datos.

### Fase 3 — Separar dominios

Extraer las verticales comerciales: OmniGastro, OmniHRMS, OmniBI, OmniLedger Connect, QMSSuite (módulo avanzado), AxonEcosystem.

### Fase 4 — Crear el Core

Estabilizar `omniflow-core` bajo AGPLv3.

### Fase 5 — Crear Enterprise

Extraer las capacidades propietarias a `omniflow-enterprise`.

### Fase 6 — Migración técnica

```
OrderFlow → compatibilidad → OmniFlow Core (AGPL) → Enterprise
                                                        ├── OmniGastro
                                                        ├── OmniHRMS
                                                        ├── OmniBI
                                                        ├── OmniLedger Connect
                                                        ├── QMSSuite avanzado
                                                        └── AxonEcosystem
```

### Fase 7 — Publicación

Publicar primero el Core estable. Después publicar las extensiones propietarias mediante los mecanismos comerciales definidos (SaaS, Marketplace, Harness).

---

## 16. Criterio único para futuras features

Toda nueva funcionalidad debe responder estas preguntas antes de ser asignada a una edición:

1. **¿Es necesaria para operar?** → Sí: Core AGPL.
2. **¿Amplía la capacidad para organizaciones más grandes?** → Sí: Enterprise.
3. **¿Aporta inteligencia o analítica avanzada?** → Sí: Enterprise.
4. **¿Aporta automatización avanzada?** → Sí: Enterprise.
5. **¿Aporta gobierno empresarial, auditoría o administración avanzada?** → Sí: Enterprise.
6. **¿Es una integración fundamental para que el Core funcione?** → Sí: Core o conector comunitario (Marketplace).
7. **¿Es una integración específica de alto valor empresarial?** → Sí: Enterprise / módulo propietario, sujeto a certificación Harness si es de terceros.

### Regla de oro

Toda nueva funcionalidad de OmniFlow debe clasificarse como Core, Enterprise o integración externa (Marketplace) antes de comenzar su desarrollo. Esto evita volver a crear el problema actual del monolito, donde funcionalidades, dependencias y propiedad intelectual terminan mezcladas.

---

## 17. Modelo comercial resultante

```
                   OMNIFLOW
                      │
          ┌───────────┴───────────┐
          │                       │
       COMMUNITY               ENTERPRISE
        AGPLv3                 PRIVATIVO
          │                       │
          │                       ├── OmniBI
          │                       ├── Multisucursal avanzada
          │                       ├── HR avanzado
          │                       ├── QMS avanzado
          │                       ├── OmniLedger Connect
          │                       ├── AxonEcosystem
          │                       ├── Integraciones avanzadas
          │                       └── Automatización
          │
          ├── CRM, POS, Stock, Clientes
          ├── HR básico, QMS básico
          ├── OmniLedger core
          └── APIs
```

> OmniFlow Core es la plataforma abierta. OmniFlow Enterprise es la extensión empresarial de la misma plataforma.

---

## 18. Relación con el modelo SaaS

El Core AGPL puede formar parte de una actividad comercial. El modelo comercial puede combinar hosting, SaaS, implementación, soporte, mantenimiento, infraestructura, módulos propietarios, funcionalidades Enterprise, integraciones, servicios profesionales, certificaciones (Harness), y soporte empresarial.

AGPL no significa que el software tenga que ser gratuito. La licencia permite cobrar por distribución y servicios, respetando sus condiciones.

---

## 19. Resultado esperado

```
                    OMNIFLOW
                       │
           ┌───────────┴───────────┐
           │                       │
      CORE AGPLv3            ENTERPRISE
           │                  PROPRIETARY
           │                       │
      operación base         capacidades avanzadas
      APIs                    escalabilidad
      extensibilidad          automatización
      datos                   inteligencia
      procesos                gobierno
           │                       │
           └───────────┬───────────┘
                       │
                 MISMA PLATAFORMA
```

El resultado no debe ser un Core artificialmente pobre. Debe ser un Core realmente útil y funcional, capaz de operar por sí mismo, mientras Enterprise aporta las capacidades necesarias para organizaciones con mayor escala, complejidad y necesidades de gestión.

---

## 20. Principio final

> Open Source para la base operativa y extensibilidad; Enterprise para escala, inteligencia, automatización y gobierno.

Esto permite que OmniFlow crezca como plataforma abierta sin renunciar a un modelo comercial sostenible.
