# Troubleshooting #47 — QR Generator: Bucle Infinito de `/api/v1/qr/targets` y 403 por Saturación

> **Estado:** ✅ Resuelto  
> **Área:** Frontend / QR Generator / API  
> **Síntoma principal:** Múltiples llamadas repetidas a `/api/v1/qr/targets` en pocos segundos, terminando en error 403.

---

## 1. Síntoma

En consola del navegador se observa:

- Decenas de llamadas `XHR GET https://provecchio.com/api/v1/qr/targets` en menos de 10 segundos.
- Finalmente el endpoint responde con `HTTP/2 403`.
- El modal QR Generator queda con el mensaje: `Catálogo detectado: — Sin descripción` o vacío.

---

## 2. Causa raíz

En `QrGeneratorModal.tsx`, el `useEffect` que carga los targets tenía como dependencia a `initialData`:

```ts
useEffect(() => {
  // ...
  loadSocialCatalogs();
}, [open, initialType, initialData]);
```

`initialData` es un objeto que la página padre actualiza en cada render. Eso disparaba el efecto en bucle, generando una llamada a `/api/v1/qr/targets` por cada cambio de referencia, hasta saturar el endpoint y recibir 403.

---

## 3. Solución aplicada

- Se removió `initialData` de las dependencias del `useEffect`.
- Se agregó un flag `loadingTargets` para evitar llamadas duplicadas concurrentes.
- Ahora el endpoint se llama una sola vez cuando se abre el modal.

### Archivos modificados

- `frontend/src/components/admin/QrGeneratorModal.tsx`

---

## 4. Notas adicionales

- El campo `socialCatalogId` ya no se envía al backend. El QR generator usa el catálogo social detectado por defecto.
- El selector de catálogo quedó como elemento informativo; no se requiere slug adicional cuando hay instalación activa de `social-catalog`.
- El endpoint `/api/v1/qr/generate` soporta correctamente `type: 'catalog'` y `type: 'biolink'`.

---

## 5. Referencias

- Ver también [#46](46-qr-generator-ux-gaps.md) — QR Generator UX Gaps.
- Ver también [#45](45-qr-master-key-fk-violation.md) — QR Generate 500 con Master Key.
