# Módulo: OrderFlow Global Directory (Inteligencia Colectiva)

## 1. Problema a Resolver
En sistemas de comercio electrónico y facturación (especialmente en integraciones con la SET / DNIT de Paraguay), los únicos datos públicos oficiales a los que se puede acceder mediante el número de RUC son la Razón Social y el Estado del contribuyente. 
Sin embargo, para una experiencia de usuario fluida, las cajas rápidas (POS) y los checkouts en línea requieren completar automáticamente otros datos vitales como:
- Número de Teléfono
- Correo Electrónico
- Dirección Física (Ciudad, Calle)

## 2. Estrategia: "Crowdsourcing" (Colaboración Multi-Tenant)
Al ser OrderFlow una plataforma **Multi-Tenant** (múltiples comercios operando sobre la misma base de datos estructural), tenemos la oportunidad de construir una base de datos colectiva sin depender de proveedores de APIs de pago externos.

El enfoque es el siguiente:
1. **Recolección Silenciosa:** Cada vez que el comercio "A" guarda o edita a un cliente, OrderFlow detecta si este cliente tiene un `taxId` (RUC/Documento) válido. De ser así, extrae su teléfono, correo y dirección y los sube a una tabla global compartida.
2. **Autocompletado Mágico:** Cuando el comercio "B" busca o intenta crear un cliente usando el mismo `taxId`, OrderFlow busca ese RUC en la tabla global compartida. Si lo encuentra, autocompleta el teléfono, correo y dirección ahorrándole todo el trabajo de tipeo.

## 3. Arquitectura del Modelo de Datos
Se implementó el siguiente modelo en Prisma (`schema.prisma`):

```prisma
// ============================================
// GLOBAL DIRECTORY - Base de datos colectiva (Crowdsourcing)
// ============================================
model GlobalDirectory {
  taxId       String   @id // RUC / Cédula, es la llave principal
  name        String?
  phone       String?
  email       String?
  city        String?
  street      String?
  updatedAt   DateTime @updatedAt
  
  @@map("global_directory")
}
```

## 4. Flujo de Funcionamiento
1. **Punto de Inyección (`upsert`)**:
   En el controlador de Clientes (`CustomersController`), durante las acciones de Crear o Actualizar (`POST` y `PUT`), el sistema toma los valores (`email`, `phone`, `city`, `street`) y realiza un `upsert` en la tabla `GlobalDirectory` usando el `taxId` como llave principal.
   De esta manera, si un cliente cambia su número de teléfono y un tenant lo actualiza, el directorio global reflejará el cambio más reciente (gracias al `updatedAt`).

2. **Punto de Extracción (`lookup`)**:
   Se implementará un nuevo endpoint `GET /api/v1/directory/lookup/:taxId` que será consumido por el frontend (Checkout y POS). Al tipiar el RUC, el frontend hará un `fetch` a este endpoint y si hay coincidencias, rellenará los campos de formulario vacíos.

## 5. Ventajas del Modelo
- **Costo Cero**: No se requiere pagar a Burós de Crédito ni a APIs comerciales locales.
- **Evolutivo**: La base de datos se vuelve exponencialmente más robusta a medida que OrderFlow escale a nuevos tenants.
- **Respeto a la Privacidad**: No se extraen ni comparten datos transaccionales, hábitos de compra ni listas de facturación; únicamente información de contacto de directorio telefónico o comercial que el propio cliente ya ofrece al público para que se lo contacte.

## 6. Optimizaciones de Experiencia de Usuario (UX)
Para potenciar la fricción cero en el punto de venta, se desarrollaron dos mejoras visuales clave:
1. **Detección Inteligente de Documento**: Al tipear en el buscador global, si el valor ingresado es un número o texto alfanumérico sin espacios (ej: `4178182-1` o pasaportes como `A1234567`), el sistema asume inteligentemente que se trata de un documento y lo coloca automáticamente en el campo `taxId` en lugar del campo `name`, y hace un *pre-fetch* mágico del `GlobalDirectory` antes de siquiera renderizar el formulario.
2. **Selección Automática Post-Creación**: Tras crear un cliente exitosamente a través del modal, el sistema ejecuta una búsqueda automática por su RUC y lo selecciona inmediatamente como el cliente activo de la orden actual, eliminando la necesidad de buscarlo manualmente de nuevo en la barra superior.
