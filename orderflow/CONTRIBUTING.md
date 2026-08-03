# Cómo Contribuir a OrderFlow

Gracias por tu interés en contribuir a OrderFlow. Este documento proporciona pautas y pasos para ayudarte a colaborar de manera efectiva.

---

## 1. Código de Conducta

Al participar en este proyecto, te comprometés a:

- Usar lenguaje acogedor e inclusivo
- Ser respetuoso con puntos de vista y experiencias diferentes
- Aceptar críticas constructivas con buena predisposición
- Priorizar lo que sea mejor para la comunidad
- Mostrar empatía hacia otros miembros de la comunidad

---

## 2. Primeros Pasos

### Requisitos Previos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker & Docker Compose** (para infraestructura)
- **PostgreSQL** >= 15.x (o usar Docker)
- **Git**

### Clonar y Configurar

```bash
git clone https://github.com/marcelompz/orderflow.git
cd orderflow
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Instalar Dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### Configurar Base de Datos

```bash
cd backend
npx prisma generate
npx prisma db push
cd ..
```

### Ejecutar Entorno de Desarrollo

```bash
docker compose up -d postgres redis
cd backend && npm run start:dev
cd ../frontend && npm run dev
```

El backend corre en `http://localhost:3010`, el frontend en `http://localhost:3011`.

---

## 3. Estructura del Proyecto

```
orderflow/
├── backend/              # API NestJS
│   ├── src/
│   │   ├── common/       # Guards, decoradores y servicios compartidos
│   │   ├── tenants/      # Lógica multi-tenant
│   │   ├── products/     # Catálogo de productos
│   │   ├── orders/       # Gestión de pedidos
│   │   ├── bookings/     # Turnos y agendamiento
│   │   ├── integrations/ # Integraciones externas (Odoo, Tango, etc.)
│   │   └── ...
│   ├── prisma/           # Schema de base de datos y migraciones
│   └── test/             # Tests unitarios y E2E
├── frontend/             # React + Refine admin + storefronts públicos
├── mobile/               # React Native + Expo
├── desktop/              # Tauri POS
├── docs/                 # Documentación
├── scripts/              # Scripts de deploy, backup y QA
└── docker-compose*.yml   # Entornos dev / prod
```

---

## 4. Estándares de Código

### TypeScript

- Modo estricto activado (`strict: true`)
- Usar tipos explícitos; evitar `any`
- Preferir `readonly` para datos inmutables
- Usar `interface` para formas de objetos, `type` para uniones/intersecciones

### Convenciones NestJS

- Un módulo por dominio (`bookings/`, `products/`, etc.)
- Cada módulo: `controller`, `service`, `module`, `dto/`
- Los services contienen la lógica de negocio
- Los controllers son delgados (parsean DTOs, llaman al service, retornan respuesta)
- Usar inyección de dependencias; nunca instanciar `PrismaClient` manualmente

### Reglas Multi-Tenant

- **Nunca eliminar `tenantId`** de las queries o el schema
- Siempre filtrar por `tenantId` en los services
- Usar `this.prisma` (singleton) o `@TenantPrisma()` (dinámico)
- Nunca condicionar lógica de negocio con `if (mode === 'enterprise')`

### Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(bookings): agregar sync con Google Calendar
fix(billing): corregir validación de firma de webhook
docs(README): actualizar diagrama de arquitectura
test(orders): cubrir casos borde de confirm()
```

---

## 5. Testing

- Tests unitarios backend: `cd backend && npm test`
- Tests E2E backend: `npm run test:e2e`
- Validación completa: `./scripts/init.sh`
- Las nuevas funcionalidades deben incluir tests
- Buscar cobertura significativa, no solo números

---

## 6. Proceso de Pull Request

1. Crear una rama desde `main`: `feat/mi-funcionalidad` o `fix/mi-correccion`
2. Realizar cambios siguiendo los estándares de código
3. Asegurar que los tests pasan: `npm test` y `./scripts/init.sh`
4. Actualizar documentación si es necesario (`docs/`, `README.md`, `CHANGELOG.md`)
5. Actualizar `featurelist.json` con el ID y estado de la feature
6. Abrir un PR con:
   - Descripción clara del cambio
   - Issue vinculado (si aplica)
   - Capturas de pantalla para cambios de UI
   - Plan de testing

**Checklist de PR:**
- [ ] `npm run build` pasa
- [ ] Tests agregados/actualizados
- [ ] Documentación actualizada
- [ ] `featurelist.json` actualizado
- [ ] Sin secrets commiteados
- [ ] `tenantId` preservado en todas las queries

---

## 7. Reportar Bugs

- Usar GitHub Issues
- Incluir: versión de OrderFlow, entorno (staging/producción), pasos para reproducir, comportamiento esperado vs actual
- Adjuntar logs si son relevantes

---

## 8. Solicitar Features

- Abrir un GitHub Issue con la etiqueta `enhancement`
- Describir el problema, la solución propuesta y las alternativas consideradas
- Para features grandes, discutir primero en un issue antes de implementar

---

## 9. Licencia

Al contribuir, aceptás que tus contribuciones serán licenciadas bajo la Licencia MIT.
