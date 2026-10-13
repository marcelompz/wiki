# Plan de Licenciamiento, Gobierno y Ecosistema OmniFlow

**Documento de trabajo para asesoría legal**  
**Fecha:** 7 de septiembre de 2026  
**Proyecto:** OmniFlow Ecosystem

---

# 1. Objetivo del documento

Este documento tiene como objetivo presentar al asesor legal la visión de propiedad intelectual, licenciamiento, gobierno del código y estrategia comercial del ecosistema OmniFlow, con el fin de definir y redactar los instrumentos jurídicos necesarios para su lanzamiento y crecimiento.

OmniFlow se plantea como una plataforma **open-core**, donde:

- **OmniFlow Community** constituye el núcleo abierto de la plataforma.
- **OmniFlow Enterprise** constituye una capa propietaria de inteligencia, automatización, compliance, integración y capacidades empresariales.
- **OmniFlow Marketplace** permite que terceros desarrollen y comercialicen aplicaciones, módulos e integraciones.
- Un **OmniFlow Harness** audita técnicamente los desarrollos antes de permitir su publicación oficial en el Marketplace.
- La **marca OmniFlow** permanece bajo control del titular del proyecto, independientemente de los derechos otorgados por la licencia open source.
- Los forks del código Community son técnicamente posibles bajo los términos de AGPLv3, pero no implican autorización para utilizar la marca OmniFlow ni para presentarse como distribución oficial, certificada o soportada por OmniFlow.

El objetivo no es impedir la creación de software derivado, sino construir un ecosistema abierto **sin perder control sobre la calidad, seguridad, identidad y reputación de OmniFlow**.

---

# 2. Visión estratégica

OmniFlow no pretende competir únicamente como un producto de software tradicional.

La visión es construir un **ecosistema tecnológico extensible**, donde el núcleo abierto facilite la adopción y terceros puedan construir negocios sobre la plataforma.

El modelo buscado es:

```text
                    OMNIFLOW ECOSYSTEM
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      COMMUNITY        ENTERPRISE       MARKETPLACE
       AGPLv3           PRIVATIVO         TERCEROS
          │                │                │
      Plataforma      Inteligencia       Apps
      extensible      Compliance         Modules
      APIs            Integración        Connectors
      operación       Automatización     Verticales
          │                │                │
          └────────────────┼────────────────┘
                           │
                    OMNIFLOW HARNESS
                           │
                    CERTIFICACIÓN
                           │
                    OMNIFLOW MARKETPLACE
```

La estrategia busca simultáneamente:

1. Alta adopción de OmniFlow Community.
2. Formación de una comunidad de desarrolladores.
3. Creación de un mercado de aplicaciones de terceros.
4. Generación de ingresos para desarrolladores.
5. Monetización de Enterprise.
6. Protección de propiedad intelectual.
7. Protección de la marca OmniFlow.
8. Control de calidad del ecosistema oficial.
9. Evitar que la experiencia de usuario de productos no certificados perjudique la reputación de OmniFlow.

---

# 3. Principio fundamental: Open Source no significa Open Brand

Una premisa central del modelo es separar jurídicamente:

```text
Código
  ≠
Marca
  ≠
Certificación
  ≠
Distribución oficial
  ≠
Soporte oficial
```

La licencia AGPLv3 determinará los derechos sobre el código Community.

La marca OmniFlow deberá protegerse mediante instrumentos de propiedad industrial y una política específica de uso de marca.

La certificación deberá estar regulada por las condiciones del Marketplace.

Por lo tanto, un tercero podrá eventualmente:

- modificar OmniFlow Community;
- crear un fork;
- redistribuir el código conforme a AGPLv3;
- desarrollar módulos;
- prestar servicios alrededor de OmniFlow;

pero ello no deberá implicar automáticamente:

- autorización para utilizar la marca OmniFlow;
- certificación de compatibilidad;
- reconocimiento como distribución oficial;
- derecho a utilizar logotipos oficiales;
- derecho a afirmar que un producto es “OmniFlow Certified”;
- derecho a representar soporte oficial de OmniFlow.

El abogado deberá determinar la forma jurídicamente adecuada de instrumentar esta separación.

---

# 4. Licencia de OmniFlow Community

## 4.1 Decisión estratégica

La decisión preliminar es utilizar:

**GNU Affero General Public License v3.0 (AGPLv3)**

como licencia del núcleo Community.

La elección de AGPLv3 responde a una estrategia deliberada:

- permitir adopción amplia;
- permitir modificaciones;
- permitir desarrollo de extensiones;
- permitir explotación comercial del software bajo las condiciones de la licencia;
- evitar que modificaciones relevantes del core puedan convertirse fácilmente en servicios propietarios cerrados;
- favorecer que las mejoras realizadas sobre el núcleo permanezcan disponibles para el ecosistema cuando la AGPLv3 así lo exige.

No se busca maximizar la permisividad de la licencia, sino encontrar un equilibrio entre **adopción, apertura y protección del ecosistema**.

## 4.2 No utilizar la licencia como mecanismo de protección de marca

La protección frente a forks que puedan perjudicar la reputación de OmniFlow no debe intentarse resolver mediante restricciones incompatibles con una licencia open source.

La estrategia será:

**AGPLv3 para el código + protección de marca + certificación + control del canal oficial.**

---

# 5. OmniFlow Community

Community debe ser una plataforma real y funcional.

No debe convertirse en una versión artificialmente limitada cuyo único objetivo sea inducir al usuario a comprar Enterprise.

Debe permitir:

- instalación;
- operación en producción;
- creación de empresas/tenants según las capacidades Community;
- desarrollo de módulos;
- modificación del código;
- integración mediante APIs;
- creación de verticales;
- desarrollo de aplicaciones de terceros;
- contribución al proyecto.

La filosofía ya definida es:

> **Community es la plataforma. Enterprise es la capa de inteligencia y operación empresarial.**

Community no debe depender de Enterprise para funcionar.

---

# 6. OmniFlow Enterprise

Enterprise será software propietario.

Su función principal será aportar capacidades de:

- inteligencia;
- automatización;
- compliance;
- integración empresarial;
- forecasting;
- analítica avanzada;
- operación multiempresa/multisucursal;
- SaaS empresarial;
- funcionalidades verticales de alto valor;
- conectores empresariales;
- capacidades avanzadas de seguridad y administración.

Las funcionalidades Enterprise nuevas deberán nacer como código privado desde el principio.

No se deberá publicar primero código Community para posteriormente convertirlo en código propietario.

Esta regla evita conflictos de titularidad y expectativas con la comunidad.

---

# 7. Separación arquitectónica Community / Enterprise

La separación deberá realizarse principalmente mediante arquitectura, no mediante ocultamiento de código.

Se establecen tres mecanismos:

## 7.1 Microservicio privado

Cuando una funcionalidad constituye un producto o servicio completo:

```text
Community Repository
       │
       └── Community Services

Private Repository
       │
       └── Enterprise Service
```

Ejemplo:

- Site-builder Community
- OmniSites Enterprise

## 7.2 Paquetes o módulos privados

Cuando un servicio necesita compartir infraestructura con Community:

```text
OmniLedger
│
├── Community Core
│
└── Enterprise Packages
       ├── Fiscal
       ├── Banking
       └── Legacy Connectors
```

## 7.3 Feature flags / license keys

Podrán utilizarse exclusivamente para:

- diferencias menores de UI;
- reporting;
- configuración;
- funcionalidades que no representen el mecanismo principal de separación del código.

No deben constituir el principal mecanismo de protección de Enterprise.

---

# 8. Propiedad intelectual e IP Audit

Antes de publicar Community deberá realizarse una auditoría completa de propiedad intelectual.

El audit deberá abarcar:

## 8.1 Titularidad

Determinar quién posee los derechos sobre:

- código;
- documentación;
- diseños;
- interfaces;
- algoritmos;
- scripts;
- infraestructura;
- assets;
- nombres;
- logos;
- bases de datos;
- documentación técnica.

## 8.2 Código desarrollado por terceros

Revisar todo código desarrollado por:

- freelancers;
- contratistas;
- colaboradores;
- proveedores;
- Crossnexion;
- terceros bajo contratos específicos.

Debe determinarse si existen cesiones de derechos suficientes.

## 8.3 Trabajo realizado para clientes

Debe identificarse cualquier código desarrollado para terceros que pudiera estar sujeto a:

- propiedad del cliente;
- confidencialidad;
- restricciones contractuales;
- derechos de reutilización limitados.

Esto incluye específicamente soluciones white-label o desarrollos B2B realizados para terceros.

## 8.4 Dependencias

Realizar un Software Bill of Materials (SBOM) y auditoría de licencias de:

- npm;
- PyPI;
- librerías;
- frameworks;
- componentes frontend;
- componentes backend;
- imágenes;
- herramientas;
- código generado;
- assets de terceros.

## 8.5 Influencia o derivación de Odoo

Debe determinarse jurídicamente qué componentes:

- derivan de Odoo;
- fueron inspirados en Odoo;
- reutilizan estructuras;
- reutilizan código;
- reproducen modelos de datos;
- reutilizan nombres de campos;
- reutilizan conceptos sujetos a derechos o licencias.

No deberá publicarse código Community hasta completar esta evaluación.

---

# 9. Gobierno de contribuciones

Debe definirse el mecanismo mediante el cual terceros pueden aportar código.

La decisión preliminar es evaluar:

### DCO

Ventajas:

- menor fricción;
- sencillo para comunidad;
- adecuado para proyectos abiertos;
- el contribuyente certifica que tiene derecho a aportar el código.

### CLA

Ventajas:

- mayor control sobre las contribuciones;
- puede facilitar determinados usos futuros;
- permite estructurar de manera más explícita los derechos concedidos al proyecto.

La decisión deberá tomarse teniendo en cuenta una cuestión fundamental:

> ¿Podrá alguna contribución de Community ser incorporada posteriormente en Enterprise?

Si la respuesta es sí, deberá diseñarse el mecanismo jurídico correspondiente antes de aceptar dichas contribuciones.

---

# 10. Regla de oro sobre contribuciones

Se recomienda establecer una política interna:

> **Ningún código de procedencia externa podrá incorporarse a Enterprise sin verificar previamente su cadena de titularidad y los derechos concedidos.**

Especialmente:

```text
Community contribution
        │
        ▼
IP / License verification
        │
        ▼
Approved for Community only
        │
        └──► Enterprise reutilization only
             if legally authorized
```

Esto debe formar parte del proceso de desarrollo, no ser una revisión retrospectiva.

---

# 11. OmniFlow Marketplace

El Marketplace será el mecanismo oficial para crear un ecosistema económico alrededor de OmniFlow.

Los desarrolladores podrán crear:

- módulos;
- aplicaciones;
- conectores;
- integraciones;
- verticales;
- reportes;
- componentes;
- extensiones;
- herramientas de productividad;
- agentes de IA;
- temas;
- soluciones especializadas.

El objetivo es que terceros puedan **comercializar sus desarrollos**.

Esto genera un incentivo económico para construir sobre OmniFlow.

---

# 12. Marketplace ≠ repositorio de código

El hecho de que OmniFlow sea open source no implica que cualquier software de terceros deba formar parte automáticamente del ecosistema oficial.

Debe existir una diferencia entre:

```text
Código compatible con OmniFlow
              │
              ▼
Puede existir fuera del Marketplace
```

y:

```text
Producto publicado oficialmente
              │
              ▼
Debe cumplir requisitos OmniFlow
```

El Marketplace representa una **certificación de calidad y compatibilidad**, no simplemente un directorio de módulos.

---

# 13. OmniFlow Harness

El Harness será el mecanismo técnico de certificación.

Todo módulo destinado a publicación oficial deberá pasar un conjunto de pruebas automatizadas.

El Harness deberá poder verificar, como mínimo:

### Seguridad

- vulnerabilidades conocidas;
- dependencias;
- permisos;
- acceso a datos;
- exposición de APIs;
- secretos;
- patrones peligrosos.

### Licenciamiento

- licencia declarada;
- dependencias compatibles;
- ausencia de componentes incompatibles;
- cumplimiento de obligaciones de terceros.

### Arquitectura

- APIs permitidas;
- interfaces;
- convenciones;
- estructura de módulos;
- aislamiento;
- acceso a servicios.

### Base de datos

- migraciones;
- integridad;
- compatibilidad;
- índices;
- operaciones peligrosas;
- aislamiento entre tenants.

### Multi-tenancy

Especialmente importante para aplicaciones que funcionen sobre el SaaS OmniFlow.

Debe verificarse que un módulo no pueda acceder accidentalmente a información de otro tenant.

### Compatibilidad

Debe declararse:

```text
OmniFlow version
API version
Module version
Dependencies
Supported editions
```

### Rendimiento

El Harness deberá detectar:

- consultas excesivas;
- operaciones costosas;
- bloqueos;
- procesos innecesariamente largos;
- consumo excesivo de recursos.

### Tests funcionales

Los módulos deberán proporcionar tests mínimos según su categoría.

---

# 14. Certificación

El resultado del Harness deberá generar un estado verificable.

Ejemplo:

```text
OMNIFLOW CERTIFICATION

Module: Example CRM Connector
Version: 2.4.1

Harness: PASS
Security: PASS
License: PASS
Compatibility: PASS
Multi-tenant: PASS
Performance: PASS

OmniFlow Compatibility:
2026.x

Status:
CERTIFIED
```

La certificación deberá poder revocarse posteriormente si:

- se detecta una vulnerabilidad;
- el módulo deja de cumplir los requisitos;
- el desarrollador viola las condiciones del Marketplace;
- existe incompatibilidad con nuevas versiones;
- se descubre incumplimiento de licencias.

---

# 15. Certificación no significa garantía absoluta

Jurídicamente deberá evaluarse cómo definir el alcance de:

> **“OmniFlow Certified”**

La certificación debe significar que el software cumplió un conjunto definido de controles en una versión determinada.

No necesariamente debe significar:

- garantía absoluta de ausencia de vulnerabilidades;
- garantía de funcionamiento permanente;
- garantía comercial del producto de terceros;
- responsabilidad de OmniFlow sobre el software del desarrollador.

El abogado deberá establecer los disclaimers y condiciones correspondientes.

---

# 16. Relación con los desarrolladores

El Marketplace deberá contar con términos específicos para desarrolladores.

Deberán contemplarse, como mínimo:

- aceptación de términos;
- titularidad del módulo;
- responsabilidad del desarrollador;
- licencias del módulo;
- obligaciones sobre dependencias;
- seguridad;
- protección de datos;
- mantenimiento;
- compatibilidad;
- actualizaciones;
- vulnerabilidades;
- derecho de retirada;
- reglas de certificación;
- uso de marca;
- uso de logos;
- descripción comercial;
- propiedad intelectual;
- contenido prohibido;
- mecanismos de resolución de conflictos.

---

# 17. Modelo económico del Marketplace

El objetivo estratégico es permitir que los desarrolladores puedan monetizar sus productos.

El modelo comercial podrá contemplar:

```text
Developer
    │
    ▼
Develops Module
    │
    ▼
Harness
    │
    ▼
Certification
    │
    ▼
Marketplace
    │
    ├── Free
    ├── Paid
    ├── Subscription
    └── Commercial License
```

El abogado deberá ayudar a estructurar jurídicamente:

- términos comerciales;
- relación entre OmniFlow y desarrolladores;
- revenue share;
- impuestos;
- facturación;
- responsabilidad;
- refunds;
- chargebacks;
- licencias;
- propiedad del código.

---

# 18. Política de forks

Los forks de Community no deberán ser considerados una violación simplemente por existir.

AGPLv3 permite la creación de derivados bajo sus propios términos y obligaciones.

La estrategia será:

### Permitido

```text
Fork OmniFlow
       │
       ├── modificar
       ├── redistribuir
       ├── ofrecer servicios
       └── crear producto derivado
```

siempre dentro de las condiciones de AGPLv3.

### No automáticamente permitido

```text
Fork
 │
 ├── "Official OmniFlow"
 ├── "OmniFlow Certified"
 ├── uso de logos oficiales
 ├── representación como producto oficial
 └── representación de soporte oficial
```

La regulación de estos puntos deberá realizarse mediante la política de marca y los instrumentos contractuales correspondientes.

---

# 19. Protección de la reputación

El problema que se pretende resolver no es solamente jurídico.

Existe un riesgo comercial:

```text
OmniFlow
   │
   ├── Fork A — excelente
   ├── Fork B — mediocre
   ├── Fork C — inseguro
   └── Fork D — abandonado
```

El usuario final podría asociar esas experiencias con OmniFlow.

Por eso se propone que la comunicación oficial se base en:

**Official / Certified / Compatible / Community**

con significados claramente definidos.

Ejemplo:

| Estado | Significado |
|---|---|
| OmniFlow Official | desarrollado/controlado por OmniFlow |
| OmniFlow Enterprise | producto propietario oficial |
| OmniFlow Certified | tercero aprobado por el Marketplace |
| OmniFlow Compatible | declara compatibilidad, sin certificación |
| Community Fork | distribución independiente |

El abogado deberá determinar qué denominaciones y claims pueden protegerse jurídicamente.

---

# 20. Protección de la marca

Debe evaluarse el registro de:

- OmniFlow;
- logotipo;
- isotipo;
- nombres de productos;
- Marketplace;
- nombres Enterprise relevantes.

También deberá establecerse una política de uso de:

- OmniFlow;
- logos;
- iconografía;
- dominiio;
- denominaciones “Official”;
- denominaciones “Certified”.

El objetivo es que la apertura del código no implique la pérdida de control sobre la identidad comercial.

---

# 21. Enterprise: módulos que nacen privados

Como regla general, determinados componentes deberán permanecer privados desde su creación.

Entre ellos:

- OmniSites avanzado;
- AxonEcosystem;
- Fiscal Plugins;
- adaptadores legacy;
- nómina completa;
- funcionalidades enterprise de compliance;
- determinados componentes de SaaS;
- funcionalidades avanzadas de inteligencia.

Esto coincide con la estrategia ya definida de separar capacidades Enterprise desde el inicio.

---

# 22. OmniLedger Connect

La arquitectura de interoperabilidad constituye una pieza estratégica.

OmniFlow no debe depender exclusivamente de que el cliente abandone su ERP actual.

La plataforma podrá conectarse con:

- Odoo;
- SAP;
- Microsoft Dynamics;
- NetSuite;
- sistemas legacy;
- otros ERPs.

La arquitectura de conectores deberá permanecer como capacidad comercial propia.

Conceptualmente:

```text
                   EXISTING ERP
                        │
                        ▼
               OMNILEDGER CONNECT
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
       OmniFlow       OmniBI       Other Apps
```

Esta capacidad permite posicionar OmniFlow como una plataforma de **modernización e interoperabilidad**, además de como ERP.

---

# 23. Principios jurídicos que deben quedar definidos

El asesor legal deberá determinar la instrumentación adecuada para:

### A. Community

- AGPLv3;
- copyright notices;
- headers;
- política de contribuciones;
- DCO o CLA.

### B. Enterprise

- licencia propietaria;
- derechos de uso;
- restricciones de redistribución;
- restricciones de modificación;
- SaaS;
- sublicenciamiento;
- OEM/white-label;
- partners;
- reventa;
- auditoría/licensing.

### C. Marketplace

- términos para desarrolladores;
- términos para compradores;
- licencia de aplicaciones;
- revenue share;
- responsabilidad;
- certificación;
- retirada;
- mantenimiento.

### D. Marca

- registro;
- política de uso;
- trademark guidelines;
- certificación;
- uso de logos;
- forks.

### E. IP

- cesiones;
- contractors;
- freelancers;
- colaboradores;
- clientes;
- terceros.

---

# 24. Documentos jurídicos requeridos

Se solicita al asesor legal evaluar y/o preparar como mínimo:

```text
legal/
│
├── community-license/
│   └── AGPLv3
│
├── enterprise/
│   ├── enterprise-license
│   ├── SaaS-terms
│   └── partner-terms
│
├── contributors/
│   ├── DCO o CLA
│   └── contribution-policy
│
├── marketplace/
│   ├── developer-agreement
│   ├── marketplace-terms
│   ├── certification-terms
│   └── buyer-terms
│
├── trademark/
│   ├── trademark-policy
│   └── brand-guidelines
│
└── privacy/
    ├── privacy-policy
    ├── DPA
    └── data-processing-terms
```

La estructura exacta deberá definirse jurídicamente.

---

# 25. Orden de implementación

El orden recomendado es:

## Fase 0 — IP Audit

**Bloqueante.**

No publicar código Community hasta completar:

- titularidad;
- contratos;
- dependencias;
- Odoo;
- terceros;
- clientes;
- código white-label;
- assets.

## Fase 1 — Propiedad intelectual

Definir:

- titular;
- copyright;
- marca;
- cesiones;
- contributors.

## Fase 2 — Licenciamiento

Cerrar:

- AGPLv3 Community;
- Enterprise License;
- términos SaaS;
- partner licensing.

## Fase 3 — Arquitectura de repositorios

Definir:

- repos públicos;
- repos privados;
- paquetes;
- dependencias;
- CI/CD;
- mecanismos para impedir contaminación accidental.

## Fase 4 — Governance

Implementar:

- DCO/CLA;
- contribution policy;
- review;
- IP checks;
- dependency scanning.

## Fase 5 — Harness

Implementar el sistema de certificación:

```text
Source
  ↓
Build
  ↓
Tests
  ↓
Security
  ↓
License
  ↓
Architecture
  ↓
Compatibility
  ↓
Performance
  ↓
Certification
```

## Fase 6 — Marketplace

Implementar:

- developer onboarding;
- submission;
- certification;
- publication;
- billing;
- reviews;
- versioning;
- withdrawal.

## Fase 7 — Lanzamiento Community

Solo después de completar las fases anteriores.

---

# 26. Modelo de gobierno resultante

El ecosistema deberá operar con cuatro niveles:

```text
LEVEL 1
OPEN SOURCE
AGPLv3
        │
        ▼
LEVEL 2
ECOSYSTEM
Developers / Partners
        │
        ▼
LEVEL 3
CERTIFICATION
OmniFlow Harness
        │
        ▼
LEVEL 4
OFFICIAL MARKETPLACE
Certified ecosystem
```

Esto permite maximizar la adopción sin renunciar al control sobre la experiencia oficial.

---

# 27. Decisiones que se solicitan al abogado

La asesoría legal deberá responder específicamente:

1. ¿Es jurídicamente adecuada AGPLv3 para OmniFlow Community considerando el modelo SaaS y Marketplace?
2. ¿Qué componentes del proyecto podrían estar afectados por licencias o derechos de terceros?
3. ¿Existe algún riesgo derivado del código inspirado o derivado de Odoo?
4. ¿Qué forma de DCO, CLA o CAA resulta más conveniente?
5. ¿Cómo debe estructurarse jurídicamente Enterprise?
6. ¿Cómo debe regularse la distribución SaaS?
7. ¿Cómo proteger OmniFlow frente a usos de marca por forks?
8. ¿Qué puede y no puede denominarse “OmniFlow Certified”?
9. ¿Cómo estructurar jurídicamente el Marketplace?
10. ¿Cómo regular la relación entre OmniFlow y los desarrolladores?
11. ¿Cómo estructurar revenue sharing?
12. ¿Qué responsabilidad debe asumir OmniFlow respecto de aplicaciones de terceros?
13. ¿Cómo regular la suspensión o retirada de aplicaciones?
14. ¿Cómo deben tratarse vulnerabilidades y actualizaciones obligatorias?
15. ¿Cómo debe protegerse la propiedad intelectual de módulos desarrollados por terceros?
16. ¿Qué derechos necesita OmniFlow para operar el Marketplace?
17. ¿Qué registros de marca deben realizarse?
18. ¿Qué jurisdicción y estructura contractual resulta más adecuada para operar inicialmente desde Paraguay y posteriormente a nivel regional/internacional?

---

# 28. Principio rector final

La estrategia de OmniFlow puede resumirse en:

> **Open the platform. Protect the brand. Certify the ecosystem. Monetize the enterprise.**

O, conceptualmente:

```text
             OPEN SOURCE
                  │
              AGPLv3
                  │
                  ▼
           OMNIFLOW COMMUNITY
                  │
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   DEVELOPERS           OMNIFLOW
        │               ENTERPRISE
        │                   │
        ▼                   ▼
     MODULES            PROPRIETARY
        │               TECHNOLOGY
        ▼
     HARNESS
        │
        ▼
   CERTIFICATION
        │
        ▼
    MARKETPLACE
        │
        ▼
  COMMERCIAL ECOSYSTEM
```

El propósito no es construir un proyecto open source donde el propietario pierda control.

Tampoco es construir un producto propietario disfrazado de open source.

La intención es construir un **ecosistema abierto y comercialmente sostenible**, donde:

- el core pueda ser adoptado ampliamente;
- las modificaciones al core estén sujetas a AGPLv3;
- Enterprise conserve propiedad intelectual propia;
- terceros puedan desarrollar negocios;
- las aplicaciones comerciales puedan distribuirse oficialmente;
- la calidad técnica sea verificable;
- la marca permanezca protegida;
- y OmniFlow conserve control sobre aquello que identifica como parte de su ecosistema oficial.

---

# 29. Resultado esperado de la asesoría

Al finalizar esta etapa, OmniFlow debería contar con una estructura jurídica y técnica donde pueda responder claramente:

**¿Qué puedo hacer con OmniFlow Community?**

→ Lo determina AGPLv3.

**¿Qué pertenece a OmniFlow?**

→ Lo determina la cadena de titularidad y los derechos de propiedad intelectual.

**¿Qué puedo hacer con la marca OmniFlow?**

→ Lo determina la política y registro de marca.

**¿Qué puedo vender?**

→ Lo determinan AGPLv3, la licencia correspondiente y los términos del Marketplace.

**¿Qué es oficialmente compatible?**

→ Lo determina el proceso de certificación.

**¿Qué es oficialmente OmniFlow?**

→ Lo determina OmniFlow y su política de marca/certificación.

**¿Qué es Enterprise?**

→ Software propietario separado arquitectónica y jurídicamente de Community.

**¿Quién puede construir sobre OmniFlow?**

→ Cualquier desarrollador que respete las licencias aplicables.

**¿Quién puede formar parte del ecosistema oficial?**

→ Quien cumpla las reglas técnicas, legales y comerciales del Marketplace.