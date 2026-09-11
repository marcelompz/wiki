# **OmniRealState: Informe de Arquitectura y Recomendaciones Funcionales (Alineado)**

Ecosistema OmniFlow — Módulo Vertical PropTech & Real Estate ERP  
Fecha: Septiembre 2026  
Documento: INFORME\_ARQUITECTURA\_Y\_RECOMENDACIONES\_OMNIREALSTATE.md  
Estado: Documento Técnico y Estratégico Oficial (Alineado con Repo OrderFlow v1.28.0)

---

## **1\. Resumen Ejecutivo y Enfoque Arquitectónico**

OmniRealState se concibe como un vertical inmobiliario desacoplado estructurado bajo el patrón estándar de microservicio del ecosistema: services/real-estate-standalone/.

A diferencia de los enfoques ERP tradicionales monolíticos, OmniRealState opera como un Sistema de Acción (System of Action) de alta velocidad:

* Backend de Dominio: Construido sobre NestJS \+ Prisma \+ PostgreSQL, adoptando las librerías compartidas del monorepo (@packages/auth-shared para autenticación por JWT/API-Key y control de suscripción).  
* Blindaje Multi-Tenant Estricto: Todo acceso a datos implementa de forma obligatoria el decorador @TenantPrisma() y el helper contextual getDb(db) para aislar rigurosamente la información entre inmobiliarias y desarrolladoras.  
* Frontend SPA & Navegación: Integración nativa en el panel administrativo de OmniFlow (apps/admin) mediante una nueva entrada en la barra lateral (SideBar), con recursos registrados en Refine.dev y soporte visual para Dark/Light Mode.  
* Integración Contable Asíncrona: No genera asientos contables directos ni se acopla a Odoo; despacha eventos canónicos a través de BullMQ hacia el Integration Worker, el cual rutea las transacciones hacia OmniLedger de forma desacoplada e idempotente.

---

## **2\. Consolidación de Funcionalidades Base**

### **2.1. Catastro, Amojonamiento y Topografía (GIS)**

* Georreferenciación Pragmática: Almacenamiento de geometrías vectoriales (polígonos de terrenos y coordenadas de mojones P1..Pn) mediante el tipo nativo Json en PostgreSQL y Prisma, evitando dependencias externas complejas (como PostGIS) en la fase inicial de adopción.  
* Ficha Técnica de Tasación: Registro de cota de elevación (msnm), declive porcentual, tipo de suelo y disponibilidad de servicios públicos (red eléctrica, agua corriente, cloaca, fibra óptica, tipo de pavimento).  
* Identificación Catastral: Padrón, Cuenta Corriente Catastral, Finca, Distrito, Manzana, Lote y Matrícula del Registro Público.

### **2.2. Modelo de Contactos y Propietarios**

* Integración Nativa con OrderFlow: Vinculación directa con los modelos Customer, Contact, ContactAddress y ContactBankAccount existentes en Prisma, eliminando toda dependencia heredada de res.partner.  
* Soporte de Copropiedad: Registro de condominios con porcentaje de titularidad por copropietario.

### **2.3. Comercialización y OmniCRM**

* Ciclo Comercial del Lote: Disponible \-\> Reservado \-\> Señado \-\> Vendido / Financiado.  
* Bloqueo y Liberación de Stock: La creación de reservas en OmniCRM bloquea temporalmente la unidad; si la seña no se confirma en el plazo fijado, el lote se libera automáticamente.

### **2.4. Comisiones de Fuerza de Ventas**

* Reglas de Split Configurables: Distribución porcentual entre agente captador de la propiedad, agente cerrador del cliente y honorarios de la agencia inmobiliaria.  
* Liquidación de Comisiones: Registro de órdenes de pago a asesores comerciales atadas a la cobranza efectiva.

### **2.5. Property Management y Consorcios**

* Gestión de Edificios y Alquileres: Maestro de complejos inmobiliarios con unidades funcionales (departamentos, locales, oficinas, cocheras) y contratos de locación con garantías y plazos.  
* Liquidación Mensual a Propietarios (Owner Settlement): Cobro al inquilino, descuento automático de la comisión de administración de la inmobiliaria, compensación de gastos de mantenimiento aprobados y emisión de rendición de cuentas en PDF.  
* Expensas Consorciales: Prorrateo de gastos comunes según coeficientes de copropiedad basados en m², discriminando gastos ordinarios (inquilino) de extraordinarios (propietario).

---

## **3\. Extensiones Estratégicas y Modelo de Licenciamiento**

&nbsp;

| Componente | Nivel de Licenciamiento | Justificación y Alcance |
| :---- | :---- | :---- |
| Catastro, Inventario y Mapa de Lotes | Community (AGPLv3) | CRUD de proyectos, manzanas, lotes, visor de mapa interactivo, ficha técnica y captura básica. |
| Financiación Propia (Cuotas & Mora) | Enterprise (Privativo) | Motor de amortización (Francés/Alemán), cálculo diario de intereses punitorios y reajustes. |
| Property Management & Liquidaciones | Enterprise (Privativo) | Rendición a propietarios, prorrateo de expensas, contratos y actas digitales de entrega/salida. |
| Integración Contable OmniLedger | Enterprise (Privativo) | DTOs canónicos, fan-out dinámico en BullMQ y conciliación contable multi-empresa. |

---

## **4\. Matriz de Integración y Arquitectura**

&nbsp;

| Sistema Destino | Mecanismo de Integración | Responsabilidad |
| :---- | :---- | :---- |
| OmniFlow Frontend (apps/admin) | Componente SideBar.tsx \+ Refine Data Provider | Navegación, catálogo visual y gestión operativa en React. |
| OmniCRM | Webhooks internos / REST API | Sincronización de leads, visitas y cambio de estado a reserva. |
| OmniLedger (vía BullMQ) | Integration Worker con DTO canónico | Registro contable desacoplado de cobranzas, intereses y facturas. |
| OmniBI | Vistas y réplica analítica PostgreSQL | Reportes de Cap Rate, ocupación, mora proyectada y ranking de ventas. |

&nbsp;

&nbsp;