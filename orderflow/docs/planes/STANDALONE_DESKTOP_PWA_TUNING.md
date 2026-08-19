# Plan de Ajuste y Testeo de Microservicios Standalone (Desktop + PWA)

**Objetivo:** Estabilizar y afinar los 6 microservicios standalone en sus versiones desktop y PWA antes de iniciar FEAT-012 (Mobile App React Native).

**Versión base:** OrderFlow v1.20.4 / OmniFlow rebranding completado (FEAT-066)

---

## 1. Microservicios Standalone en Alcance

| Servicio | Paquete | Alias API | Estado actual |
|---|---|---|---|
| OmniBio | `services/omni-bio-standalone` | `/api/v1/bio` | Extraído (FEAT-065) |
| OmniCatalog | `services/omni-catalog-standalone` | `/api/v1/standalone/social-catalog` | Extraído (FEAT-065) |
| OmniBookings | `services/omni-bookings-standalone` | `/api/v1/bookings` | Extraído (FEAT-066) |
| OmniPOS | `services/omni-pos-standalone` | `/api/v1/pos` | Extraído (FEAT-003) |
| OmniSync | `services/omni-sync-standalone` | `/api/v1/sync` | Extraído (FEAT-003) |
| Giveaways | `services/giveaways-standalone` | `/api/v1/giveaways` | Extraído (FEAT-064) |

Todos usan `@orderflow/auth-shared` y schema Prisma propio.

---

## 2. Categorías de Ajustes / Testeo

### 2.1 Funcionalidad Core (Desktop + PWA)
- [ ] Flujos CRUD completos por servicio (crear, leer, actualizar, borrar)
- [ ] Multi-tenancy: aislamiento `tenantId` correcto en queries y mutaciones
- [ ] Autenticación/autorización: JWT 24h, guards, roles, redirección 401 limpia
- [ ] Validación de DTOs y manejo de errores consistente
- [ ] Idempotencia en operaciones críticas (orders, bookings, sync)

### 2.2 Performance & Bundle (Desktop)
- [ ] Lazy-loading de módulos pesados (gráficos, editor, mapas)
- [ ] Code-splitting por ruta (React.lazy + Suspense)
- [ ] Bundle size < 250 KB gzipped por entry point (meta)
- [ ] Tree-shaking efectivo (sin dead code en build)

### 2.3 PWA Específico
- [ ] `manifest.json` válido por servicio (name, short_name, icons 192/512, start_url, display: standalone)
- [ ] Service Worker registrado y funcional (Workbox / Vite PWA plugin)
- [ ] Caché offline: assets estáticos + API GET críticas (stale-while-revalidate)
- [ ] Install prompt nativo funciona en Chrome/Edge/Firefox mobile y desktop
- [ ] Actualización automática (skipWaiting + clients.claim) sin recarga manual
- [ ] Push notifications (si aplica) — VAPID keys configuradas

### 2.4 Responsive & Accesibilidad (Desktop + Mobile Web)
- [ ] Breakpoints: ≤640px, 641-1024px, ≥1025px
- [ ] Navegación teclado completa (Tab, Enter, Escape, Arrow keys)
- [ ] ARIA labels, roles, landmarks en componentes clave
- [ ] Contraste WCAG AA (tokens de diseño centralizados)
- [ ] Safe-area insets (notch, home indicator) en mobile web
- [ ] Touch targets ≥ 48x48 dp

### 2.5 Integración Monorepo
- [ ] Auth compartida: `@orderflow/auth-shared` resuelve tenant + user sin colisiones
- [ ] API Gateway / Traefik routing: subdominios + paths `/api/v1/*` correctos
- [ ] Variables de entorno compartidas vs específicas por servicio
- [ ] Docker compose: cada standalone levanta aislado + healthchecks
- [ ] Migraciones Prisma: `prisma migrate deploy` por servicio en CI/CD

### 2.6 Tests & Calidad
- [ ] Unit tests: ≥ 80% cobertura por servicio (Jest)
- [ ] Integration tests: API contracts (supertest)
- [ ] E2E Playwright: flujos críticos desktop + mobile viewport
- [ ] Visual regression (opcional): Chromatic / Percy
- [ ] Lint + typecheck: `npm run lint && npm run typecheck` clean

### 2.7 Documentación & Storytelling
- [ ] `README.md` por servicio: propósito, quickstart, env vars, scripts, deploy
- [ ] `ARCHITECTURE.md`: diagramas de secuencia, data flow, límites
- [ ] Changelog por servicio (semver independiente)
- [ ] Guía de contribución específica (si difiere de monorepo)

---

## 3. Criterios de Aceptación ("Funcionando Bien")

| Nivel | Requisito |
|---|---|
| **Mínimo (Gate 1)** | `./scripts/init.sh` pasa **completo** en monorepo (unit + build + E2E) SIN tocar móvil |
| **Objetivo (Gate 2)** | Cada standalone tiene su propio `init-standalone.sh` que pasa: unit (80%+), build, E2E crítico desktop/PWA |
| **Excelencia (Gate 3)** | Lighthouse PWA ≥ 90, Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90 en staging |

---

## 4. Secuencia de Ejecución Sugerida (Por Fase AGENTS.md)

### Fase 1 — Líder / Planificador
1. Priorizar servicios por riesgo/uso (ej. OmniPOS + OmniCatalog > Giveaways)
2. Definir "Definition of Ready" por servicio (issues GitHub vinculados)
3. Asignar owners por servicio

### Fase 2 — Implementador (por servicio)
1. Fixes funcionales + performance + PWA
2. Tests unit/integration/E2E nuevos/actualizados
3. Docs actualizadas
4. Commit + push a `feature/standalone-tuning/<servicio>`

### Fase 3 — Revisor / Auditor
1. `./scripts/init.sh` en monorepo (no debe romper nada)
2. `./scripts/init-standalone.sh <servicio>` (crear si no existe)
3. Lighthouse CI en PR
4. Merge a `main` + tag `vX.Y.Z-<servicio>`
5. Sync docs → Wiki + Traefik docs

---

## 5. Próximos Pasos Inmediatos

1. [ ] Crear issue GitHub "Standalone Desktop/PWA Tuning" con checklist maestra
2. [ ] Sub-issues por servicio vinculados al padre
3. [ ] Definir `init-standalone.sh` plantilla (copiar de `scripts/init.sh` y adaptar)
4. [ ] Ejecutar auditoría rápida Lighthouse en staging actual para baseline
5. [ ] Priorizar primer servicio (recomendado: **OmniPOS** — uso diario + POS offline crítico)

---

## 6. Referencias

- `featurelist.json` — FEAT-003, FEAT-064, FEAT-065, FEAT-066
- `docs/planes/SCHEMA_DECOUPLING_PLAN.md`
- `docs/brand/manual/brand-guidelines.md` (OmniFlow naming)
- `AGENTS.md` — Sección 5 (Orquestación por Roles) y Sección 3 (Barrera `init.sh`)
- `scripts/init.sh` — Validación automatizada actual