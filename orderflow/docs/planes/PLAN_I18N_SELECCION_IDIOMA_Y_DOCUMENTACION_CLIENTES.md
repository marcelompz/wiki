# 🌐 Plan de Implementación: Internacionalización (i18n), Persistencia de Idioma de Usuario y Documentación de Clientes

> **Código de Referencia:** `PLAN-I18N-CUST-2026`  
> **Estado:** 📝 Planificado / En Progreso  
> **Fecha de Creación:** 2026-08-21  
> **Autor:** Antigravity AI — Pair Programming Protocol  
> **Objetivo:** Formalizar la arquitectura de traducción (i18n), persistir la preferencia de idioma del usuario en la base de datos y estandarizar la documentación de los endpoints de clientes (`/api/v1/customers`) e integración DNIT.

---

## 📌 1. Diagnóstico Actual

Actualmente en OmniFlow / OrderFlow:
1. **Traducción y Selección de Idioma (`i18n`):**
   - Implementado en frontend mediante `i18next` y `react-i18next` en [`frontend/src/i18n.ts`](file:///opt/orderflow/frontend/src/i18n.ts).
   - Soporta 3 idiomas: Español (`es`, default), Inglés (`en`) y Portugués (`pt`).
   - La selección de idioma se almacena localmente en el navegador (`localStorage.getItem('i18nextLng')`).
   - **Brecha:** No existe un campo en el modelo `User` de la base de datos que guarde la preferencia de idioma del usuario para que persista entre diferentes dispositivos o sesiones.
2. **Endpoints de Clientes (`/api/v1/customers`):**
   - El backend cuenta con un controlador completo [`backend/src/customers/customers.controller.ts`](file:///opt/orderflow/backend/src/customers/customers.controller.ts).
   - Soporta listado, búsqueda, sincronización masiva (`/sync`), consulta en el Directorio Global (`/lookup/:taxId`) y validación en vivo con la **DNIT** (`/dnit/:documento`).
   - Existe una entrada en troubleshooting [`docs/troubleshooting/15-sync-customers-404.md`](file:///opt/orderflow/docs/troubleshooting/15-sync-customers-404.md) y un README conciso en [`backend/src/customers/README.md`](file:///opt/orderflow/backend/src/customers/README.md).
   - **Brecha:** Falta una guía dedicada de integración de la API de Clientes & DNIT en `docs/guides/` sincronizada con la Wiki.

---

## 🎯 2. Objetivos del Plan

1. **Documentación Formal de Arquitectura i18n:**
   - Crear `docs/architecture/i18n-and-localization-standard.md` especificando la arquitectura de traducción, manejo de diccionarios, namespaces y fallback.
2. **Documentación Oficial de API de Clientes & DNIT:**
   - Crear `docs/guides/CUSTOMERS_AND_DNIT_API.md` con ejemplos de requests/responses, códigos de error y el flujo de crowdsourcing con el `GlobalDirectory`.
3. **Persistencia de Idioma de Usuario en DB (Backend & Frontend):**
   - Extender el modelo `User` en `prisma/schema.prisma` agregando el campo `preferredLanguage` (`'es' | 'en' | 'pt'`).
   - Exponer/actualizar el endpoint `PATCH /api/v1/users/profile` para permitir guardar la preferencia de idioma.
   - Sincronizar el frontend tras el login: cargar el idioma preferido del usuario desde el JWT / objeto `user` e invocar `i18n.changeLanguage()`.
4. **Sincronización con Wiki de Producción:**
   - Replicar la documentación creada en `/opt/wiki/orderflow/` y pushear cambios según la Regla 7 de `AGENTS.md`.

---

## 🚀 3. Fases de Ejecución

### 📍 Fase 1: Documentación Estandarizada
- [x] Crear el presente plan en `docs/planes/PLAN_I18N_SELECCION_IDIOMA_Y_DOCUMENTACION_CLIENTES.md`.
- [ ] Crear la norma de arquitectura de i18n: `docs/architecture/i18n-and-localization-standard.md`.
- [ ] Crear la guía de integración API de Clientes & DNIT: `docs/guides/CUSTOMERS_AND_DNIT_API.md`.
- [ ] Sincronizar los nuevos archivos `.md` con `/opt/wiki/orderflow/`.

### 📍 Fase 2: Persistencia del Idioma en la Base de Datos (Backend)
- [ ] **Schema Prisma:** Agregar campo `preferredLanguage String @default("es")` al modelo `User`.
- [ ] Regenerar Prisma Client (`npx prisma generate`).
- [ ] **Users Module:** Actualizar DTOs y `UsersService` para permitir leer y modificar `preferredLanguage`.
- [ ] **Auth Module:** Incluir `preferredLanguage` en la respuesta de `POST /api/v1/auth/login` y `GET /api/v1/users/me`.

### 📍 Fase 3: Integración Frontend & UX de Idioma
- [ ] **Auth / Branding Provider:** Al autenticarse el usuario, invocar `i18n.changeLanguage(user.preferredLanguage)` si difiere del idioma activo.
- [ ] **User Profile Menu:** Añadir un selector de idioma en el perfil de usuario que dispare una petición `PATCH /api/v1/users/me` para guardar la preferencia en el backend.
- [ ] **Estructura de Archivos JSON para Traducciones:** Extraer los recursos embebidos de `frontend/src/i18n.ts` a archivos modulares JSON (`frontend/public/locales/{es,en,pt}/translation.json`).

### 📍 Fase 4: Validación y Calidad (Harness Engineering)
- [ ] Ejecutar tests unitarios backend (`npm --prefix backend run test`).
- [ ] Ejecutar build de frontend (`npm --prefix frontend run build`).
- [ ] Validar barrera automatizada `./scripts/init.sh` (con previa confirmación de recursos al usuario).

---

## 🛠️ 4. Estructura de Endpoints de Clientes & DNIT (Referencia)

```http
### Listar Clientes del Tenant
GET /api/v1/customers?search=Juan&limit=50
Authorization: Bearer <JWT>
x-api-key: <API_KEY>

### Obtener Cliente por ID
GET /api/v1/customers/:id
Authorization: Bearer <JWT>
x-api-key: <API_KEY>

### Sync / Upsert Masivo de Clientes
POST /api/v1/customers/sync
Content-Type: application/json
Authorization: Bearer <JWT>
x-api-key: <API_KEY>

{
  "customers": [
    {
      "tax_id": "80012345-6",
      "name": "Empresa Ejemplo S.A.",
      "phone": "+595981123456",
      "email": "contacto@ejemplo.com",
      "city": "Asunción",
      "street": "Av. Mariscal López 1234"
    }
  ]
}

### Consulta en Directorio Global (Crowdsourcing)
GET /api/v1/customers/lookup/80012345-6
Authorization: Bearer <JWT>
x-api-key: <API_KEY>

### Consulta DNIT (RUC / Documento Oficial)
GET /api/v1/customers/dnit/80012345
Authorization: Bearer <JWT>
x-api-key: <API_KEY>
```

---

## 📋 5. Criterios de Aprobación & Lista de Control

- [ ] `docs/planes/PLAN_I18N_SELECCION_IDIOMA_Y_DOCUMENTACION_CLIENTES.md` creado y registrado.
- [ ] Documentos de arquitectura y guías sincronizados en `/opt/wiki/orderflow/`.
- [ ] Compilación backend y frontend limpia sin advertencias de TypeScript.
- [ ] Persistencia de idioma funcionando en entorno de desarrollo.
