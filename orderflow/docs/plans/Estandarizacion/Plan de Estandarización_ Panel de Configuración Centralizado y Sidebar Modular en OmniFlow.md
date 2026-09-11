# **Plan de Estandarización de OmniFlow: Panel de Configuración Centralizado y Nueva Arquitectura Modular del Sidebar**

**Propósito del Documento:** Establecer la especificación funcional y técnica para la reestructuración definitiva de la navegación lateral (Sidebar) y el Panel de Configuración Centralizado de OmniFlow, incorporando a **Omni Capital Humano** y **OmniBI** como pilares estratégicos de primer nivel, integrando Catálogos y Marketing bajo **OmniCRM**, y garantizando el desacoplamiento estricto del núcleo operativo universal (Retail/Comercio) frente a las extensiones verticales de industria (OmniGastro).

## **1\. Diagnóstico de Inconsistencias y Nueva Filosofía de Diseño**

A partir de la auditoría de interfaz en OmniFlow v1.29.0 y las directivas estratégicas de producto, se identificaron los siguientes puntos de reestructuración:

> * **Subvaloración de Omni Capital Humano:** Se encontraba relegado como un ítem menor dentro de Operaciones, cuando su alcance proyectado abarca la administración laboral completa, el desarrollo del talento, legajos documentales, capacitaciones y la gestión estructural del conocimiento institucional (MOF, MFP, organigramas).  
> * **Fragmentación de Marketing y Catálogos:** Existía una separación artificial entre "Catálogo & Canales" y "Soporte", diluyendo el poder comercial. OmniCRM debe ser el núcleo unificado que gobierna desde el catálogo maestro y los canales de venta externos (WhatsApp, E-commerce, Bio-Links) hasta las dinámicas de marketing interno y retención.  
> * **Aislamiento de Business Intelligence:** OmniBI debe situarse en el nivel superior para actuar como la torre de control analítica transversal, nutriéndose de forma bidireccional de OmniCRM, Operaciones y Capital Humano.  
> * **Contaminación de Operaciones con Gastro:** Se detectó duplicación de KDS y mezcla de lógicas de restaurantes en el core universal. Operaciones debe ser estrictamente agnóstico (Retail de mostrador, pedidos, citas).  
> * **Omisiones en OmniGastro:** El módulo gastronómico carecía de accesos clave para el POS Cajero y el POS Meseros.

## **2\. Nueva Disposición Estratégica del Menú Lateral (Sidebar)**

La nueva estructura jerárquica para el Administrador de Tenant se organiza en pilares de negocio más el acceso al sistema:

### **1\. OPERACIONES (Core Universal Agnóstico)**

> * **OmniPOS (Base / Retail):** /admin/pos (Cobro rápido de mostrador, sin mesas ni mozos)  
> * **Pedidos & Despacho:** /admin/orders (Gestión unificada de órdenes omnicanal)  
> * **OmniBookings (Citas & Turnos):** /admin/bookings  
> * **Cotizaciones & Presupuestos:** /admin/quotes  
> * **Documentos & Workflows:** /admin/documents

### **2\. OMNI CAPITAL HUMANO (Pilar Estratégico de Personas y Organización)**

> * **Administración de Personal:**  
  * Turnos & Horarios de Trabajo  
  * Asistencia & Marcaciones Biométricas  
  * Asignación de Puestos & Cargas Horarias  
  * Nómina, Salarios & Comisiones  
  * Vacaciones, Licencias & Ausentismo  
> * **Desarrollo & Talento:**  
  * Legajo Digital Integral del Colaborador  
  * Planes de Carrera & Evaluaciones de Desempeño  
  * Academia & Capacitaciones Continuas  
  * Certificaciones & Habilidades  
> * **Gestión del Conocimiento & Organización:**  
  * MOF (Manual de Organización y Funciones)  
  * MFP (Manual de Funciones y Procesos / Perfiles)  
  * Matriz de Responsabilidades (RACI)  
  * Manuales de Procedimientos y Políticas Internas  
  * Organigrama Interactivo Dinámico

### **3\. OMNICRM (Pilar Comercial, Catálogos y Marketing)**

> * **Gestión Comercial & Clientes:**  
  * Contactos: Clientes & Proveedores  
  * Pipeline de Ventas & Oportunidades  
  * Historial de Interacciones & Seguimiento  
> * **Catálogos Maestros (Padre de Catálogos):**  
  * Catálogo Global de Productos & Servicios  
  * Variantes, Atributos & Modificadores Base  
  * Listas de Precios Diferenciadas & Reglas de Tarifa  
  * Categorización & Colecciones Comerciales  
> * **Marketing Externo & Canales de Venta:**  
  * E-commerce Storefront & Canales Web  
  * Social Commerce & Bio-Links (Tridente PLG)  
  * Integración Nativa WhatsApp (Campañas y Respuestas)  
  * Cuponeras, Descuentos & Promociones Activas  
> * **Marketing Interno & Fidelización:**  
  * Programa de Puntos & CashBack  
  * Rangos y Membresías (Bronze, Silver, Gold, Platinum)  
  * Encuestas de Satisfacción & NPS  
  * Segmentación Inteligente & Automatizaciones de Retención

### **4\. OMNIBI (Business Intelligence \- Torre de Control Analítica)**

> * **Dashboards Ejecutivos:** Visión 360° en tiempo real  
> * **Analítica de Clientes & CRM:** Customer Lifetime Value (LTV), Costo de Adquisición (CAC), Tasa de Churn, Cohortes de Retención, Efectividad de Campañas WhatsApp  
> * **Analítica Operativa & Ventas:** Ticket Promedio, Margen de Contribución, Horas Pico, Rotación de SKUs (Pareto 80/20) y Análisis de Stock  
> * **Analítica de Capital Humano:** Productividad por Colaborador y Puesto, Costos de Nómina vs. Ingresos Generados, Ausentismo y Cumplimiento de Capacitaciones  
> * **Exportaciones & Auditoría Avanzada**

### **5\. OMNIGASTRO (Suite Vertical Especializada \- Condicional)**

> * **POS Cajero (Caja & Salón):** /admin/gastro/pos-cashier (Apertura/cierre de caja, arqueos X/Z, mapa de mesas, facturación y cobro)  
> * **POS Meseros (Comandero Móvil):** /admin/gastro/pos-waiter (Interfaz táctil móvil para toma rápida de comandas en mesa y modificadores)  
> * **Cocina & Bar (KDS en Tiempo Real):** /admin/gastro/kds (Pantalla táctil de preparación segmentada por estaciones: barra, cocina caliente, pastelería)  
> * **Salones & Mapa Interactivo de Mesas:** /admin/gastro/floors

### **6\. SISTEMA / AJUSTES (Gobernanza del Tenant)**

> * **Panel de Configuración Centralizado:** /admin/settings (Inspirado en Odoo res.config.settings, con pestañas dinámicas por cada módulo instalado)  
> * **Usuarios, Roles & Permisos:** /admin/users

### **7\. SUPER ADMIN (Plataforma Global)**

> * Tenants Registrados & Tier de Base de Datos  
> * Integrador Odoo (Microservicio) & Health Check Global  
> * App Store Global & Gestión de Backups

## **3\. Arquitectura del Panel de Configuración Centralizado (Inspirado en Odoo)**

El panel se diseña bajo un esquema unificado donde cada módulo instalado inyecta dinámicamente sus secciones de configuración para el Administrador de cada Tenant.

### **Modelo de Datos Prisma (tenant\_module\_configs)**

`model TenantModuleConfig {`  
  `id          String   @id @default(uuid()) @db.Uuid`  
  `tenantId    String   @map("tenant_id") @db.Uuid`  
  `moduleCode  String   @map("module_code") @db.VarChar(60)`  
  `settings    Json`  
  `isActive    Boolean  @default(true) @map("is_active")`  
  `createdAt   DateTime @default(now()) @map("created_at")`  
  `updatedAt   DateTime @updatedAt @map("updated_at")`

  `tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Restrict)`

  `@@unique([tenantId, moduleCode])`  
  `@@index([tenantId])`  
  `@@map("tenant_module_configs")`  
`}`

## **4\. Plan de Ejecución en 5 Fases**

> 1. **Fase 1 \- Reorganización del Sidebar:** Implementar la nueva jerarquía en el layout principal de Refine/React, aislando Operaciones, consolidando OmniCRM y elevando Capital Humano y OmniBI.  
> 2. **Fase 2 \- Rutas Gastronómicas:** Desplegar las vistas específicas de POS Cajero y POS Meseros bajo la ruta /admin/gastro/\*.  
> 3. **Fase 3 \- Backend de Configuraciones:** Crear la migración Prisma para TenantModuleConfig y los endpoints GET/PATCH /api/v1/tenant-settings/:module protegidos con @TenantPrisma().  
> 4. **Fase 4 \- Panel de Configuración UI:** Diseñar la interfaz de ajustes con navegación lateral modular y persistencia reactiva.  
> 5. **Fase 5 \- QA & Rollout:** Validaciones de permisos por rol, pruebas de consistencia multi-tenant y documentación técnica.