# Testing E2E y Carga — OrderFlow

## Objetivo

Aumentar la confianza de release cubriendo flujos críticos de usuario end-to-end
y validando performance baseline del backend.

## Suite actual

### Frontend — Playwright

Archivo: `frontend/e2e/app.spec.ts`

Comandos:

```bash
cd frontend
npm run test:e2e
npm run test:e2e:ui
```

Notas:
- Usa `webServer` de Playwright para levantar `npm run dev`.
- **14 tests passing (100% de éxito)**.
- Valida renderizado de páginas públicas: landing, login, `/bio/:slug`, checkout, catálogo WhatsApp, storefront `/tienda`.
- Valida guards de navegación sin autenticación para `/admin`, `/admin/biolinks`, `/admin/pos` y `/admin/kds`.

### Backend — Jest E2E

Archivo: `backend/test/e2e/app.e2e-spec.ts`

Comandos:

```bash
cd backend
npm run test:e2e
```

Notas:
- Requiere `DATABASE_URL` válida y base de datos accesible.
- Usa `supertest` contra la app NestJS en memoria.
- Incluye smoke tests de `/api/v1/health` y `/api/v1/bio/:slug`.

### Carga — k6

Scripts:

- `scripts/k6-load-test.js`: flujos autenticados (health, products, customers, orders, create order draft).
- `scripts/k6-biolinks-smoke.js`: smoke público (health + bio 404) contra backend en ejecución.

Ejecución ejemplo con Docker:

```bash
docker run --rm \
  --network=orderflow-network \
  -v /opt/orderflow/scripts:/scripts \
  -e BASE_URL=http://172.20.0.7:3010 \
  -e API_KEY=dev-master-key-change-in-prod \
  grafana/k6 run /scripts/k6-biolinks-smoke.js
```

Resultado BioLinks smoke (backend dev):
- Requests: 56
- P95: ~15ms
- Threshold p95 < 500ms: PASS

## Próximos pasos

- Playwright: agregar flujos de login, admin biolinks y checkout completo.
- k6: incorporar escenario de Bio-Link público con cache Redis y escenario de carga continua en CI.
- Backend E2E: ampliar a flujos de booking, orders y giveaways con datos semilla.
