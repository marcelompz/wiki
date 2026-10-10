# **Plan de Implementación Fast-Track: OmniRealState**

Ecosistema OmniFlow — Módulo Vertical PropTech & Real Estate

Fecha: Septiembre 2026

Documento: PLAN\_DE\_IMPLEMENTACION\_OMNIREALSTATE.md

Estado: Plan de Ejecución Inmediata (Alineado con Repo OrderFlow v1.28.0 y Blindaje Multi-Tenant)

---

## **1\. Estrategia de Despliegue Inmediato (Fast-Track MVP)**

Para responder de forma inmediata a la oportunidad comercial con el prospecto, el plan se reconfigura en una modalidad Fast-Track:

* Lanzamiento MVP (Semana 1 \- Sprint 1): Poner en manos del cliente una interfaz completamente operativa dentro de OmniFlow con SideBar integrado, gestión de propiedades/lotes, ficha topográfica/catastral y vinculación con contactos del sistema.  
* Arquitectura de Microservicio Desacoplado: Se implementa bajo la convención estándar services/real-estate-standalone/ (NestJS \+ Prisma), consumiendo @packages/auth-shared y exponiendo endpoints seguros bajo @TenantPrisma().  
* Pragmatismo Técnico: Almacenamiento de geometrías GeoJSON mediante tipo nativo Json en PostgreSQL/Prisma (evitando la sobrecarga operativa de PostGIS en la fase de adopción).

---

## **2\. Hoja de Ruta Ajustada por Fases**

### **Fase 0: Fast-Track MVP & SideBar Integration (Sprint 1 — Inmediato)**

* Objetivo: Habilitar el módulo en producción para demo y cierre comercial con el prospecto.  
* Entregables:  
  1. Scaffold de Microservicio: Creación de services/real-estate-standalone en NestJS, asignación de puerto :3028 y subdominio propiedades.\*.  
  2. Integración UI / SideBar OmniFlow:  
     * Inyección del ítem de navegación "Inmobiliaria" / "PropTech" en la barra lateral (SideBar) del panel administrativo.  
     * Registro de recursos en Refine (real-estate-projects, real-estate-units, real-estate-contracts).  
     * Control de visibilidad del menú condicionado a suscripción/rol activo del tenant.  
  3. Esquema de Datos en Prisma:  
     * Modelos: RealEstateProject, RealEstateProperty, RealEstateUnit, RealEstateCadastre.  
     * Campo obligatorio tenantId con decorador @TenantPrisma() y helper getDb(db) en cada servicio.  
     * Geometrías de mojones y polígonos almacenadas en campo Json estructurado (GeoJSON estándar).  
  4. Vinculación de Contactos Nativos: Asociación directa con los modelos Customer y Contact de OrderFlow (eliminando toda dependencia de res.partner).  
  5. Ficha de Tasación y Visor Básico: Pantalla de consulta con dimensiones, cotas, pendiente, servicios instalados y estado comercial del lote.

### **Fase 1: Pipeline Comercial y OmniCRM (Sprint 2\)**

* Objetivo: Integrar el inventario al flujo de captación, reservas y comisiones de ventas.  
* Entregables:  
  1. Sincronización de estados de lote (Disponible, Reservado, Vendido) disparados por transiciones en OmniCRM.  
  2. Creación automática de oportunidades y reservas desde el visor de lotes.  
  3. Motor básico de split de comisiones (captador, cerrador, agencia) con estado de liquidación.

### **Fase 2: Property Management, Consorcios y Alquileres (Sprints 3–4)**

* Objetivo: Administración de unidades en alquiler y edificios de terceros.  
* Entregables:  
  1. Contratos de locación (RealEstateContract), garantías y plazos.  
  2. Liquidación mensual a propietarios (Owner Settlement): cobro al locatario, descuento de honorarios de administración y rendición de cuentas en PDF.  
  3. Prorrateo de expensas ordinarias y extraordinarias por coeficiente de copropiedad.  
  4. Actas digitales de inspección (Check-in / Check-out).

### **Fase 3: Financiación Propia y Eventos Contables (Sprints 5–6)**

* Objetivo: Gestión de loteamientos a plazos con integración contable desacoplada.  
* Entregables:  
  1. Generador de cuotas (Sistema Francés, Alemán y cuota fija) con soporte multimoneda.  
  2. Cálculo automatizado de recargos e intereses punitorios diarios por mora.  
  3. Despacho de eventos contables con DTO canónico hacia el Integration Worker (BullMQ) para sincronización con OmniLedger.

### **Fase 4: Portales de Autoservicio y Sindicación (Sprints 7–8)**

* Objetivo: Autoservicio para inquilinos/propietarios y multidifusión externa.  
* Entregables:  
  1. Portal del Inquilino y Propietario en entorno web/móvil.  
  2. Landing pages y Bio-links con código QR por lote para cartelería en calle.  
  3. Feeds XML/API para sincronización con portales inmobiliarios y WhatsApp Catalog.

---

## **3\. Arquitectura del Modelo Prisma (services/real-estate-standalone/prisma/schema.prisma)**

&nbsp;

```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum PropertyType {
  SUBDIVISION // Loteamiento / Barrio Cerrado
  BUILDING    // Edificio
  COMMERCIAL  // Complejo Comercial
}

enum UnitType {
  PLOT        // Lote / Terreno
  APARTMENT   // Departamento
  OFFICE      // Oficina
  COMMERCIAL_PREMISE // Local
  PARKING     // Cochera
  STORAGE     // Baulera
}

enum UnitStatus {
  AVAILABLE
  RESERVED
  SOLD
  RENTED
  MAINTENANCE
  LEGAL_HOLD
}

model RealEstateProject {
  id          String       @id @default(uuid())
  tenantId    String
  name        String
  type        PropertyType
  description String?
  address     String?
  city        String?
  state       String?
  country     String       @default("PY")
  metadata    Json?        @default("{}")
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  properties  RealEstateProperty[]

  @@index([tenantId])
}

model RealEstateProperty {
  id          String            @id @default(uuid())
  tenantId    String
  projectId   String
  name        String            // Manzana, Torre o Sector
  project     RealEstateProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  units       RealEstateUnit[]

  @@index([tenantId, projectId])
}

model RealEstateUnit {
  id          String             @id @default(uuid())
  tenantId    String
  propertyId  String
  unitNumber  String             // Número de lote, departamento o local
  type        UnitType           @default(PLOT)
  status      UnitStatus         @default(AVAILABLE)
  surfaceM2   Decimal            @db.Decimal(12, 2)
  frontMeters Decimal?           @db.Decimal(8, 2)
  depthMeters Decimal?           @db.Decimal(8, 2)
  listPrice   Decimal            @db.Decimal(14, 2)
  currency    String             @default("PYG")

  // Vinculación nativa con contactos de OrderFlow
  ownerId     String?            // FK a Customer / Contact
  
  property    RealEstateProperty @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  cadastre    RealEstateCadastre?

  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@index([tenantId, propertyId])
  @@index([tenantId, status])
}

model RealEstateCadastre {
  id             String         @id @default(uuid())
  tenantId       String
  unitId         String         @unique
  padronNumber   String?
  cadastralCode  String?        // Cta. Cte. Catastral
  fincaNumber    String?
  district       String?
  registrationNo String?        // Matrícula Registro Público
  
  // Geometría GeoJSON y Mojones (P1..Pn)
  geoPolygon     Json?          // Feature GeoJSON con coordenadas
  landmarks      Json?          // Array de mojones: [{ name: "M1", lat, lng, utmX, utmY, elevation }]

  // Variables de Tasación y Suelo
  elevationMsl   Decimal?       @db.Decimal(8, 2) // Altitud sobre el nivel del mar
  slopePercent   Decimal?       @db.Decimal(5, 2) // Declive porcentual
  soilType       String?
  
  // Servicios disponibles
  hasWater       Boolean        @default(false)
  hasElectricity Boolean        @default(false)
  hasSewage      Boolean        @default(false)
  hasFiberOptic  Boolean        @default(false)
  hasPavedStreet Boolean        @default(false)

  unit           RealEstateUnit @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}
```

---

## **4\. Integración en el SideBar de OmniFlow (Frontend)**

Para reflejar la presencia del nuevo módulo en el shell administrativo de OmniFlow (apps/admin):

1. Definición de Recurso en Refine: Se registra la entrada en src/resources/realEstate.tsx.  
2. Componente de Navegación: Se añade el ítem en src/components/layout/SideBar.tsx con icono temático (BuildingOfficeIcon o MapPinIcon de Lucide/Heroicons).  
3. Guard de Suscripción / Permisos: La opción de menú se renderiza dinámicamente según los claims del JWT o features habilitados para el tenant (features.includes('REAL\_ESTATE')).  
4. Rutas Base:  
   1. /admin/real-estate: Dashboard con métricas de ocupación y catálogo.  
   2. /admin/real-estate/projects: Listado de loteamientos y edificios.  
   3. /admin/real-estate/map: Visor interactivo del Master Plan y lotes.

---

## **5\. Criterios de Aceptación Inmediata para el Prospecto**

1. SideBar Funcional: El menú "Inmobiliaria" es visible, accesible y respeta los estilos de tema (Dark/Light Mode) de OmniFlow.  
2. Carga y Visualización de Lotes: Posibilidad de registrar un loteamiento con sus manzanas y lotes, mostrando superficie, precio y estado.  
3. Ficha Técnica Catastral: Despliegue de los mojones y servicios disponibles en la ficha del lote.  
4. Seguridad Multi-Tenant Verificada: Ningún dato es accesible sin pasar por el contexto de @TenantPrisma().

&nbsp;