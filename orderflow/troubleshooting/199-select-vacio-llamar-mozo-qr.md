# 199 — Select vacío («undefined») en el modal «Llamar al mozo» del QR de mesa

**Fecha:** 2026-10-23
**Componente:** `frontend/src/pages/omni-catalog.tsx` (QR público `/?t=<token>`)
**Severidad:** 🟡 Baja (UI confusa; el mensaje libre sí funcionaba)
**Estado:** ✅ Resuelto (v1.41.5)

---

## Síntoma

Al escanear el QR de una mesa (ej. `https://provecchio.com/?t=<token>`) y pulsar
«Llamar al mozo», el modal mostraba:

- un `<Select>` con opciones **«undefined»** (o un select vacío), y
- el campo de mensaje libre.

## Causa raíz

La configuración del tenant guarda las opciones como **strings**:

```json
"waiterOptions": ["call_waiter", "request_bill", "waiter_take_order"]
```

`GET /api/v1/guest/tables/by-token/:qrToken` (`guest-tables.controller.ts`) devuelve el
array tal cual, sin normalizar. El frontend esperaba objetos:

```tsx
options={tableInfo.waiterOptions.map((opt) => ({
  label: `${opt.icon || '🔔'} ${opt.label}`,  // opt.label = undefined
  value: opt.id,                              // opt.id = undefined
}))}
```

Como `waiterOptions.length > 0` (3 strings), la condición `length > 0` era verdadera y
se renderizaba el Select con etiquetas/valores indefinidos. El editor del panel
(`WaiterOptionsEditor` en `social-catalog.tsx`) sí espera `{id,label,icon}`, por lo que
la config quedó con un formato legacy incompatible.

## Solución

Se eliminó el `<Select>` de los **dos** modales de «Llamar al mozo» y queda únicamente el
campo de mensaje libre (decisión del cliente). Se retiraron también el estado
`selectedWaiterOption` y el envío de `optionId`.

El endpoint sigue aceptando `optionId`/`optionLabel` para otros consumidores; enviar solo
`qrToken` + `freeText` (o vacío) es válido.

## Verificación

| Check | Resultado |
|---|---|
| `tsc --noEmit` frontend | OK |
| Modal QR de mesa | solo textarea, sin select |
| Envío sin mensaje | crea `WaiterCall` PENDING y emite `waiterCallNew` |
| Envío con mensaje | el mozo recibe el texto libre |

## Prevención

- Cualquier consumidor de `config.gastro.waiterOptions` debe tolerar el formato legacy
  (strings) o el backend debe normalizarlo a `{id,label,icon}`.
- Pendiente (opcional): migrar la config del tenant al formato de objetos y/o normalizar
  en `byToken`.

## Referencias

- `frontend/src/pages/omni-catalog.tsx`
- `backend/src/guest/guest-tables.controller.ts`
- `backend/src/guest/guest-call-waiter.controller.ts`
