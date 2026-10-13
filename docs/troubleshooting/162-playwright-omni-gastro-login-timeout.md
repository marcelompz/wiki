# Troubleshooting #162 - Playwright E2E Login Timeout en OmniGastro

## Fecha
2026-09-26

## Síntoma
Las pruebas E2E de Playwright para OmniGastro fallan en `loginAsAdmin` con timeout en el campo de contraseña:

```
Error: page.fill: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="Contraseña"]')
```

## Causa Raíz
El selector `input[placeholder="Contraseña"]` no coincide con el campo de contraseña del formulario de login. El placeholder real en `frontend/src/pages/login.tsx` es `t('login.passwordPlaceholder')`, que en español se traduce a "Contraseña", pero el selector puede estar fallando por:

1. El placeholder no es exactamente "Contraseña" en runtime
2. El campo no está visible/enfocado en el momento del fill
3. Hay un redirect o modal que bloquea el formulario

## Solución Aplicada
Ajustar el selector en `frontend/e2e/omnigastro.spec.ts` para usar selectores más confiables:

```typescript
// Antes
await page.fill('input[placeholder="Contraseña"]', 'Provecchio2026!');

// Después - usar selectores por tipo y posición
await page.fill('input[type="password"]', 'Provecchio2026!');
```

O bien esperar explícitamente por el formulario:

```typescript
await page.waitForSelector('form', { timeout: 20000 });
await page.fill('input[type="email"]', 'marcelo@pesallaccia.com');
await page.fill('input[type="password"]', 'Provecchio2026!');
```

## Estado
- Pendiente aplicar fix en `frontend/e2e/omnigastro.spec.ts`
- Una vez corregido, re-ejecutar `npx playwright test frontend/e2e/omnigastro.spec.ts`

## Referencias
- `frontend/src/pages/login.tsx` - Formulario de login
- `frontend/e2e/omnigastro.spec.ts` - Pruebas E2E OmniGastro
- `docs/plans/omnigastro/auditoria-omni-gastro.md` - Auditoría del flujo
