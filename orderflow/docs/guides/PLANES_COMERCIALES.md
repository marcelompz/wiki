# OrderFlow: Planes Comerciales y Pricing

[🏠 Atrás (README)](../README.md)

**Fecha:** 2026-07-16  
**Modelo:** SaaS Multi-Tenant con 3 niveles

---

## Resumen Ejecutivo

OrderFlow ofrece **3 niveles de servicio** diseñados para cubrir desde pequeños negocios hasta empresas enterprise:

| Nivel | Target | Pricing | Aislamiento | Features |
|-------|--------|---------|-------------|----------|
| **Starter** | PyMEs, emprendedores | $29-$79/mes | Lógico (shared DB) | E-commerce básico + bookings |
| **Professional** | Negocios establecidos | $149-$299/mes | Lógico + RLS | Todo Starter + POS/KDS + integraciones ERP extensibles + analytics |
| **Enterprise** | Corporaciones, cadenas | $499-$999+/mes | Físico (DB dedicada) | Todo Pro + Tauri Desktop POS + isolation + SLA + custom + white-label completo |

---

## 1. Plan Starter 🌱

### Target
- PyMEs y emprendedores
- 1-10 empleados
- Volumen: <500 pedidos/mes
- Rubros: Spas, tiendas pequeñas, servicios profesionales

### Pricing
```
Setup: GRATIS (self-service)
Mensualidad: $29/mes (básico) / $79/mes (con bookings)
```

### Infraestructura
- **Aislamiento:** Lógico (shared database, shared schema)
- **Multi-tenant:** Columna `tenant_id` en todas las tablas
- **Recursos:** Compartidos con otros tenants Starter
- **Performance:** Best-effort (sin SLA)

### Features Incluidos

#### E-commerce Básico
- ✅ Catálogo de productos (hasta 100 SKUs)
- ✅ Carrito de compras
- ✅ Checkout con cliente
- ✅ Pagos: Transferencia, efectivo
- ✅ Plantilla de web estándar (3 colores personalizables)
- ✅ Dominio: `tunegocio.orderflow.app`

#### Gestión de Pedidos
- ✅ Creación de pedidos
- ✅ Estados básicos (pendiente, confirmado, completado)
- ✅ Notificaciones por email
- ✅ Panel de administración básico

#### Clientes
- ✅ Base de clientes ilimitada
- ✅ Historial de compras
- ✅ Datos básicos (nombre, email, teléfono)

#### Bookings (Opcional - Plan +$50)
- ✅ Agenda de turnos
- ✅ Hasta 5 recursos/equipos
- ✅ Duración configurable
- ✅ Recordatorios por email

### Límites
| Recurso | Límite |
|---------|--------|
| Productos | 100 SKUs |
| Pedidos/mes | 500 |
| Clientes | Ilimitados |
| Recursos (bookings) | 5 |
| Usuarios admin | 2 |
| Almacenamiento | 1 GB |
| Requests API/día | 10,000 |

### No Incluido
- ❌ Integraciones con ERP/CRM
- ❌ Analytics avanzado
- ❌ API pública
- ❌ POS/KDS
- ❌ Personalización de branding avanzada
- ❌ SLA de uptime
- ❌ Soporte prioritario

### Conversión Esperada
- **Free trial:** 14 días
- **Conversión a paid:** 25-35%
- **Churn mensual:** 5-8%

---

## 2. Plan Professional 💼

### Target
- Negocios establecidos
- 10-50 empleados
- Volumen: 500-5000 pedidos/mes
- Rubros: Retail, distribución, servicios múltiples

### Pricing
```
Setup: $199 (configuración inicial + migración básica)
Mensualidad: $149/mes (e-commerce) / $249/mes (con bookings) / $299/mes (full)
```

### Infraestructura
- **Aislamiento:** Lógico con Row-Level Security (RLS) de PostgreSQL
- **Multi-tenant:** Shared database + RLS policies
- **Recursos:** Pool dedicado (más recursos que Starter)
- **Performance:** 99.5% uptime (sin penalizaciones)

### Features Incluidos

#### Todo lo del Plan Starter, más:

#### E-commerce Avanzado
- ✅ Productos ilimitados
- ✅ Múltiples plantillas personalizables
- ✅ Dominio personalizado (`tunegocio.com`)
- ✅ SEO avanzado (meta tags, sitemaps)
- ✅ Cupones y descuentos
- ✅ Listas de precios múltiples
- ✅ Stock multi-almacén (hasta 3 depósitos)

#### Integraciones
- ✅ Odoo (motor de integración extensible: partner, sales, cancellation; eventos/plugins sin hardcodear)
- ✅ MercadoLibre (sincronización de productos)
- ✅ WhatsApp Business (notificaciones)
- ✅ Google Analytics 4
- ✅ Facebook Pixel
- ✅ Zapier (conexión con 3000+ apps)

#### Analytics
- ✅ Dashboard de ventas
- ✅ Reportes de productos más vendidos
- ✅ Conversión de visitas a pedidos
- ✅ Ticket promedio
- ✅ Clientes recurrentes vs nuevos
- ✅ Exportación a Excel/CSV

#### POS y KDS
- ✅ POS Web dual (Modo Mozo + Modo Caja)
- ✅ KDS en tiempo real (WebSockets)
- ✅ Semáforo de criticidad por tiempo
- ✅ Control de estados de preparación
- ✅ Cobro centralizado

#### Pedidos Avanzados
- ✅ Flujos personalizables (estados custom)
- ✅ Múltiples tipos de pago (tarjeta, QR, financiado)
- ✅ Envíos con tracking
- ✅ Devoluciones y cambios
- ✅ Pedidos corporativos (con aprobación)

#### Clientes Avanzado
- ✅ Segmentación (tags, categorías)
- ✅ Historial completo (pedidos, turnos, tickets)
- ✅ Notas internas
- ✅ Blacklist
- ✅ Doble opt-in para marketing

#### Bookings Incluido
- ✅ Recursos ilimitados
- ✅ Múltiples ubicaciones
- ✅ Buffer entre turnos
- ✅ Pagos anticipados (seña)
- ✅ Recordatorios SMS/WhatsApp
- ✅ Reseñas post-servicio

#### Usuarios y Permisos
- ✅ Usuarios admin ilimitados
- ✅ Roles customizables
- ✅ Permisos granulares por módulo
- ✅ Audit log (quién hizo qué)

### Límites
| Recurso | Límite |
|---------|--------|
| Productos | Ilimitados |
| Pedidos/mes | 5,000 |
| Clientes | Ilimitados |
| Recursos (bookings) | Ilimitados |
| Usuarios admin | Ilimitados |
| Almacenamiento | 10 GB |
| Requests API/día | 100,000 |
| Integraciones | 10 activas |

### No Incluido
- ❌ Base de datos dedicada
- ❌ SLA con penalizaciones
- ❌ Soporte 24/7
- ❌ Migración de datos masiva
- ❌ Desarrollo custom
- ❌ VPC privada
- ❌ Tauri Desktop POS

### Conversión Esperada
- **Trial:** 14 días (con onboarding asistido)
- **Conversión a paid:** 40-50%
- **Churn mensual:** 3-5%
- **Upgrade desde Starter:** 15-20% en 6 meses

---

## 3. Plan Enterprise 🏢

### Target
- Corporaciones y cadenas
- 50+ empleados
- Volumen: 5000+ pedidos/mes
- Rubros: Cadenas de retail, distribuidoras grandes, franquicias
- Requisitos: Compliance, HIPAA, datos sensibles

### Pricing
```
Setup: $999-$2,499 (configuración + migración + training)
Mensualidad: $499/mes (aislamiento lógico) / $999+/mes (DB dedicada)
Personalizado: Para volúmenes muy altos o requisitos especiales
```

### Infraestructura

#### Opción A: Aislamiento Lógico Enhanced
- **Aislamiento:** Lógico con RLS + políticas reforzadas
- **Recursos:** Pool exclusivo (sin compartir con otros tenants)
- **Performance:** 99.9% uptime SLA
- **Backup:** Dedicado, retención extendida

#### Opción B: Database-per-Tenant (Aislamiento Físico)
- **Aislamiento:** Base de datos PostgreSQL dedicada
- **Recursos:** Contenedores dedicados (backend + frontend)
- **Performance:** 99.95% uptime SLA
- **Backup:** Snapshot diario + point-in-time recovery
- **Compliance:** HIPAA, GDPR-ready

### Features Incluidos

#### Todo lo del Plan Professional, más:

#### Aislamiento y Seguridad
- ✅ Database dedicada (opcional)
- ✅ VPC privada (opcional)
- ✅ Encriptación de datos en reposo
- ✅ Certificados SSL dedicados
- ✅ IP whitelisting
- ✅ SSO (Single Sign-On) con SAML/OAuth
- ✅ 2FA obligatorio para admins
- ✅ Audit log completo (inmutable)

#### Desktop POS Nativo
- ✅ Tauri Desktop Wrapper (impresión ESC/POS nativa)
- ✅ Shortcuts globales de teclado
- ✅ Fullscreen / always-on-top
- ✅ Impresión directa por dispositivo USB

#### SLA y Soporte
- ✅ SLA 99.9% uptime (con penalizaciones)
- ✅ Soporte prioritario 24/7 (phone + email + Slack)
- ✅ Account manager dedicado
- ✅ Tiempo de respuesta: <1 hora (crítico)
- ✅ Maintenance windows programables

#### Migración y Onboarding
- ✅ Migración de datos desde sistema anterior
- ✅ Importación masiva (productos, clientes, pedidos)
- ✅ Training para equipo (4 sesiones)
- ✅ Documentación customizada
- ✅ Sandbox environment para testing

#### Integraciones Enterprise
- ✅ ERP custom (API REST/SOAP)
- ✅ CRM (Salesforce, HubSpot)
- ✅ Sistemas de facturación electrónica
- ✅ Pasarelas de pago custom
- ✅ EDI (Electronic Data Interchange)
- ✅ Webhooks ilimitados
- ✅ API rate limits aumentados

#### Analytics Enterprise
- ✅ Reportes custom (SQL directo si DB dedicada)
- ✅ Data warehouse integration (BigQuery, Redshift)
- ✅ Exportación automática (SFTP, API)
- ✅ Dashboards en tiempo real
- ✅ Alertas configurables (email, Slack, SMS)

#### Multi-Location / Franquicias
- ✅ Múltiples tiendas/ubicaciones
- ✅ Stock centralizado + por ubicación
- ✅ Transferencias entre depósitos
- ✅ Reportes consolidados y por ubicación
- ✅ Branding diferente por ubicación (sub-tenants)

#### Desarrollo Custom
- ✅ Features personalizadas (cotizadas aparte)
- ✅ Integraciones a medida
- ✅ White-label completo (sin branding OrderFlow)
- ✅ Tauri Desktop POS con impresión nativa
- ✅ API pública con documentación custom

### Límites
| Recurso | Límite |
|---------|--------|
| Productos | Ilimitados |
| Pedidos/mes | Ilimitados |
| Clientes | Ilimitados |
| Recursos (bookings) | Ilimitados |
| Usuarios admin | Ilimitados |
| Almacenamiento | 100 GB+ (escalable) |
| Requests API/día | Ilimitados |
| Integraciones | Ilimitadas |
| Sub-tenants (franquicias) | Ilimitados |

### Add-ons Disponibles
| Add-on | Precio |
|--------|--------|
| Database dedicada | +$500/mes |
| VPC privada | +$300/mes |
| Soporte 24/7 extendido | +$200/mes |
| Backup retención extendida (1 año) | +$100/mes |
| Desarrollo custom (hora) | $150/hora |
| Training adicional (sesión) | $300/sesión |

### Conversión Esperada
- **Sales cycle:** 2-6 meses
- **Conversión:** 60-70% (después de POC)
- **Churn anual:** <10%
- **Upsell desde Pro:** 10-15% en 12 meses

---

## Comparativa de Planes

| Feature | Starter | Professional | Enterprise |
|---------|---------|-------------|------------|
| **Productos** | 100 | Ilimitados | Ilimitados |
| **Pedidos/mes** | 500 | 5,000 | Ilimitados |
| **Dominio personalizado** | ❌ | ✅ | ✅ |
| **Integraciones** | ❌ | 10 | Ilimitadas |
| **Bookings** | +$50 | ✅ | ✅ |
| **POS/KDS** | ❌ | ✅ | ✅ |
| **Tauri Desktop POS** | ❌ | ❌ | ✅ |
| **Analytics** | Básico | Avanzado | Enterprise |
| **API pública** | ❌ | ✅ | ✅ + custom |
| **DB dedicada** | ❌ | ❌ | ✅ (+$500) |
| **SLA** | ❌ | 99.5% | 99.9%+ |
| **Soporte** | Email | Email (priority) | 24/7 dedicado |
| **Usuarios admin** | 2 | Ilimitados | Ilimitados |
| **Almacenamiento** | 1 GB | 10 GB | 100 GB+ |
| **Setup** | GRATIS | $199 | $999-$2,499 |
| **Mensualidad** | $29-$79 | $149-$299 | $499-$999+ |

---

## Estrategia de Precios por Rubro

### Spas / Wellness / Belleza
```
Starter: $49/mes (con bookings incluido)
Professional: $199/mes
Enterprise: $599/mes (multi-location)
```

### Retail / Tiendas
```
Starter: $29/mes (sin bookings)
Professional: $149/mes
Enterprise: $499/mes
```

### Repuestos / Automotriz
```
Starter: $39/mes (catálogo básico)
Professional: $179/mes (integración Odoo)
Enterprise: $699/mes (multi-depósito)
```

### Distribuidoras / Mayoristas
```
Professional: $249/mes (pedidos corporativos)
Enterprise: $799/mes (EDI + facturación)
```

### Franquicias / Cadenas
```
Enterprise: $999+/mes (sub-tenants ilimitados)
```

---

## Modelo de Revenue Proyectado

### Supuestos
- 100 tenants totales en Año 1
- Distribución: 60% Starter, 30% Pro, 10% Enterprise
- Churn promedio: 5% mensual

### Revenue Mensual Recurrente (MRR)

| Año | Starter | Pro | Enterprise | MRR Total |
|-----|---------|-----|------------|-----------|
| **Año 1** | 60 × $49 = $2,940 | 30 × $199 = $5,970 | 10 × $699 = $6,990 | **$15,900/mes** |
| **Año 2** | 150 × $49 = $7,350 | 80 × $199 = $15,920 | 30 × $699 = $20,970 | **$44,240/mes** |
| **Año 3** | 300 × $49 = $14,700 | 150 × $199 = $29,850 | 70 × $699 = $48,930 | **$93,480/mes** |

### Revenue Anual

| Año | MRR Promedio | ARR Total |
|-----|-------------|-----------|
| **Año 1** | $15,900 | **$190,800** |
| **Año 2** | $44,240 | **$530,880** |
| **Año 3** | $93,480 | **$1,121,760** |

---

## Estrategia de Go-to-Market

### Fase 1: Lanzamiento (Mes 1-3)
- **Target:** Early adopters (Spas, tiendas pequeñas)
- **Oferta:** 3 meses gratis (piloto)
- **Canal:** LinkedIn, Facebook Ads, Google Ads
- **Meta:** 10-15 tenants Starter
- **Estado actual:** Production operativa con SPA Wellness (SPA + retail doTERRA) como tenant de referencia.

### Fase 2: Crecimiento (Mes 4-12)
- **Target:** Professional (negocios establecidos)
- **Oferta:** Setup gratis + 1 mes trial
- **Canal:** Partners (Odoo, cámaras de comercio)
- **Meta:** 50-70 tenants (mix Starter/Pro)

### Fase 3: Enterprise (Mes 12+)
- **Target:** Corporaciones, cadenas
- **Oferta:** POC gratuito (30 días)
- **Canal:** Ventas directas, referidos
- **Meta:** 5-10 tenants Enterprise

---

## Métricas Clave (KPIs)

| Métrica | Target |
|---------|--------|
| **CAC (Customer Acquisition Cost)** | <$300 (Starter), <$800 (Pro), <$3000 (Enterprise) |
| **LTV (Lifetime Value)** | >$1,500 (Starter), >$6,000 (Pro), >$25,000 (Enterprise) |
| **LTV/CAC** | >5x |
| **Churn mensual** | <5% (Starter), <3% (Pro), <1% (Enterprise) |
| **MRR Growth** | 15-20% mensual |
| **Conversion rate (trial→paid)** | >30% (Starter), >45% (Pro), >60% (Enterprise) |

---

## Próximos Pasos

1. **Definir pricing final** (validar con 5-10 prospects)
2. **Crear landing page** con comparativa de planes
3. **Configurar billing** (Stripe/Marketplace)
4. **Implementar límites** por plan en el código
5. **Crear sales deck** para Enterprise
6. **Training para equipo de ventas**

---

*Documento creado: 2026-06-21*  
*Última actualización: 2026-07-16*  
*Próxima revisión: Después de validar con 10+ prospects*
