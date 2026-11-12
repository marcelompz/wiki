# 221 — Prefill de `storeName` no aplica en `/login?mode=register` (antd Form reutilizado)

## Síntoma

El claim de URL de la landing navega a
`/login?mode=register&storeName=<slug>`, la URL es correcta y el registro funciona,
pero el input **Nombre de tu Comercio / Tienda** aparece vacío y la validación exige
completarlo a mano.

Reproducido en producción (1.46.3) y en local con `vite dev`:

```
GET /login?mode=register&storeName=mi-marca-test
# input#storeName.value === ""
```

## Diagnóstico

El campo **sí** estaba registrado en el formulario y **sí** recibía lo que el usuario
tipeaba, pero el `form` devuelto por `Form.useForm()` no era la misma instancia que el
contexto de `rc-field-form` que alimenta el input:

| Instancia | Campos registrados | Recibe lo tipeado | `setFieldsValue` |
| :--- | :---: | :---: | :--- |
| `form` de `Form.useForm()` (A) | ❌ `[]` | ❌ | escribe en una instancia desconectada |
| instancia del contexto (B) | ✅ `storeName`, `email`, `password` | ✅ | ✅ |

Por eso el `useEffect` de prefill escribía en A mientras el input estaba atado a B.

## Causa raíz

Dos comportamientos combinados:

1. **`rc-field-form` (2.7.1) inicializa la instancia una sola vez.** `useForm(form)`
   guarda el valor en un `useRef`:

   ```js
   function useForm(form) {
     var formRef = React.useRef();
     if (!formRef.current) {
       formRef.current = form || new FormStore(...).getForm();
     }
     return [formRef.current];
   }
   ```

2. **Los tres `<Form>` del ternario (`register` / `jwt` / `apikey`) ocupan la misma
   posición en el árbol.** Al cambiar `mode`, React reutiliza la misma fibra en vez de
   remontar. Como `mode` arranca en `"jwt"`, el `<Form>` se monta **sin** `form` y crea
   su propia instancia. Cuando pasa a `"register"`, el prop `form` cambia, pero la
   instancia interna ya creada se conserva.

En antd 5.29.3, `Form.useForm()` devuelve un wrapper de esa instancia; el `<Form>`
vuelve a llamar a `useForm(form)` y termina con dos objetos distintos. El `useEffect`
de prefill nunca alcanza al store conectado al input.

## Solución aplicada (1.46.4)

En `frontend/src/pages/login.tsx`:

1. `key` por modo en los tres `<Form>` (`"register"`, `"jwt"`, `"apikey"`) para forzar
   el remount y que el Form de registro se monte **con** `form={form}`.
2. Prefill declarativo con `initialValues={{ storeName: initialStoreName }}` en el
   `<Form>` de registro, tomando `?storeName=` con fallback a `?slug=`.
3. Eliminado el `useEffect` que llamaba a `form.setFieldsValue(...)`.

```tsx
const initialStoreName =
  searchParams.get("storeName") || searchParams.get("slug") || "";

<Form
  key="register"
  form={form}
  layout="vertical"
  initialValues={{ storeName: initialStoreName }}
  onFinish={handleRegisterTenant}
>
```

## Verificación

- `npx tsc --noEmit -p tsconfig.json` → OK.
- `vite dev` + navegador:
  - `/login?mode=register&storeName=mi-marca-test` → input con `mi-marca-test`.
  - `/login?mode=register&slug=mi-marca-slug` → input con `mi-marca-slug`.
  - Toggle registro → login → registro conserva el prefill.
  - `getFieldsValue()` de la instancia conectada devuelve `{ storeName: "..." }`.
  - Tipear en el input actualiza esa misma instancia.
  - Sin query param → vacío; `/login` → formulario JWT normal.
- Test de regresión en `frontend/src/pages/public-login.test.tsx`
  (`?storeName=` y `?slug=`). No ejecutable en el entorno actual por el mismatch
  preexistente `vitest@4.1.12` + `vite@5.4.21`
  (`ERR_PACKAGE_PATH_NOT_EXPORTED: './module-runner'`).

### Validación en staging (homeserver, 2026-11-12)

Deploy de 1.46.4 en el staging LAN (`https://orderflow.local`) y verificación:

| Chequeo | Resultado |
| :--- | :--- |
| `GET /api/v1/health` | `{"version":"1.46.4","status":"ok"}` (database y odoo_adapter `ok`) |
| `GET /login?mode=register&storeName=mi-marca-test` | HTTP 200 |
| Bundle desplegado (`/assets/index-x9R2hmEh.js`) | contiene `get("storeName")||get("slug")` y `initialValues:{storeName:a}` |
| Prueba visual en navegador de la LAN | ✅ El input **Nombre de tu Comercio / Tienda** llega precargado con el valor del claim |

> La verificación automatizada de la UI no fue posible desde el workstation: el
> certificado autofirmado de `orderflow.local` provoca `ERR_CERT_AUTHORITY_INVALID`
> y la herramienta de navegador no permite omitir la validación TLS. La prueba
> visual se hizo manualmente aceptando el certificado.

## Regla para futuros formularios

Cuando varios `<Form>` se renderizan condicionalmente en la misma posición del árbol y
solo algunos reciben `form={form}`, agregar `key` distinta por variante. No confiar en
`setFieldsValue` desde un efecto para inicializar campos de un Form que se monta
después del cambio de estado.
