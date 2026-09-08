# Backlog Técnico — Alfa OmniGastro (48hs) — Corregido contra el repo real

Este backlog reemplaza al MVP que habíamos armado antes de tener acceso al código. Los documentos generados por IA (Plan Maestro, Roadmap) sobreestimaban en algunos puntos y subestimaban en otros — esto es lo que confirmamos leyendo `schema.prisma` y los servicios reales.

---

## Correcciones al plan original

| Ítem | Se pensaba | Estado real |
|---|---|---|
| KDS | Por verificar | ✅ Funciona (semáforo, WebSocket en vivo) |
| Impresión ESC/POS | "Básica, sin bridge completo" | 🔴 No funcionaba — **ya resuelto en este chat** |
| Modificadores | "Reusar agregados de social-catalog" | ✅ **Ya están normalizados en Prisma** (`ModifierGroup`, `ModifierOption`, `OrderLineModifier`) y el backend (`orders.service.ts`) ya calcula precios con ellos correctamente. El gap real es otro (ver abajo). |
| Mesas/Salón | "Versión mínima" | 🔴 No existe ningún modelo — hoy "mesa" es un string libre dentro de `Order.metadata` |
| Cuenta abierta | "Sin split-bill" | 🔴 No existe el concepto — el ciclo es `DRAFT → CONFIRMED` directo, sin estado intermedio editable |
| Caja/cierre | "Cierre manual básico" | 🟡 Existe el modelo `CashMovement` en el schema, pero **ningún service/controller lo usa** — es letra muerta |

---

## Lo que realmente falta construir en 48hs

### 1. Modelo de Mesas (GASTRO-001)
Hoy `selectedTable` en `pos.tsx` es un `<Input>` de texto libre. Sin un modelo real, no hay forma de saber qué mesas están ocupadas, listarlas, ni evitar que dos mozos usen el mismo nombre de mesa con typos distintos.

### 2. Cuenta abierta (GASTRO-002)
Depende de tener mesas reales primero. Hoy cada "comanda" es una `Order` en `DRAFT` que se confirma de una — no hay forma de que un mozo siga agregando productos a la misma cuenta de una mesa a lo largo de la noche antes de cobrar.

### 3. Caja básica (GASTRO-003)
El modelo `CashMovement` ya tiene todos los campos necesarios (`type: IN/OUT`, `amount`, `paymentType`, `posSessionId`). Solo falta el service/controller que lo use: apertura con fondo inicial, registro de cobros (ya se generarían automáticamente al confirmar una `Order`), y un cierre que sume los movimientos del turno.

### 4. UI de modificadores en el POS (GASTRO-004)
El backend ya soporta modificadores end-to-end. El único gap es que `pos.tsx` no tiene ninguna UI para seleccionarlos al agregar un producto al carrito — hoy es imposible pedir "un café con leche de almendras" con extra, aunque el backend ya sabría calcular el precio correctamente.

### Lo que NO hace falta tocar
- KDS: ya funciona, no toques `orders.gateway.ts` ni `kds-admin.tsx` para el alfa
- Impresión: ya resuelto (`escpos.ts`, `App.tsx`, `lib.rs`, `pos.tsx` — entregados antes en este chat)
- Roles mozo/cajero: ya existen, reusar tal cual

---

## Orden sugerido

```
GASTRO-001 (Mesas) ──▶ GASTRO-002 (Cuenta abierta) ──▶ prueba de flujo mozo completo
                                                              │
GASTRO-004 (UI modificadores) ───────────────────────────────┤
                                                              │
GASTRO-003 (Caja) ────────────────────────────────────────── ┴──▶ prueba de flujo cajero completo
```

GASTRO-001 y GASTRO-004 pueden hacerse en paralelo por dos personas distintas si hay equipo — no se pisan (uno toca mesas/sesión, el otro toca selección de modificadores en el carrito).

Ver prompts de implementación en `PROMPTS_48H_ALFA_OMNIGASTRO.md`.
