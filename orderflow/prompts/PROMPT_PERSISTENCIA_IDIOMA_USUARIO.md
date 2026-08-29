# Prompt: Persistencia de Idioma de Usuario en `uiPreferences`

Eres un experto en NestJS + Prisma + React + Ant Design + i18next.
Aplica **únicamente** los cambios listados abajo. No refactorices nada extra, no cambies lógica de negocio no relacionada, no crees migraciones de Prisma (no hace falta: `uiPreferences` ya es `Json?` en el modelo `User`).

Contexto: `uiPreferences` ya persiste `{ theme, sidebarBehavior, denseTables }` vía `PATCH /api/v1/users/me/ui-preferences`. Vamos a agregar `preferredLanguage` como una clave más de ese mismo objeto, sin tocar el schema.

---

## 1. Backend — Mergear en vez de sobrescribir `uiPreferences`

**Archivo:** `backend/users/users.controller.ts`

**Estado actual:**
```ts
@Patch('me/ui-preferences')
async updateUiPreferences(@Body() preferences: any, @Req() req: Request) {
  const user = (req as any)['user'];
  if (!user) return { success: false };
  return this.usersService.update(user.id, { uiPreferences: preferences });
}
```

**Problema:** `usersService.update()` hace `prisma.user.update({ data })`, que sobrescribe el campo `Json` completo. Si el frontend manda solo `{ preferredLanguage: 'en' }`, se pierden `theme`, `sidebarBehavior` y `denseTables` que ya estaban guardados.

**Acción:** Reemplazar por:
```ts
@Patch('me/ui-preferences')
async updateUiPreferences(@Body() preferences: any, @Req() req: Request) {
  const user = (req as any)['user'];
  if (!user) return { success: false };

  const current = await this.usersService.findOne(user.id);
  const mergedPreferences = {
    ...((current as any)?.uiPreferences || {}),
    ...preferences,
  };

  return this.usersService.update(user.id, { uiPreferences: mergedPreferences });
}
```

No es necesario tocar `users.service.ts` (`findOne` y `update` ya existen y sirven tal cual) ni `backend/auth/auth.service.ts` (`login()` ya devuelve `user.uiPreferences` completo en el payload — verificalo en la línea donde arma el objeto `user: { id, email, name, isSuperAdmin, defaultTenantId, uiPreferences: (user as any).uiPreferences || null }`, no requiere cambios).

**Test a actualizar/agregar:** `backend/users/users.controller.spec.ts` — agregar un caso que verifique que al mandar `{ preferredLanguage: 'en' }` sobre un usuario que ya tenía `uiPreferences: { theme: 'dark' }`, el resultado persistido es `{ theme: 'dark', preferredLanguage: 'en' }` (no solo `{ preferredLanguage: 'en' }`).

---

## 2. Frontend — Montar `LanguageSelector` en el menú de usuario

**Archivo:** `frontend/components/tenant/UserProfileMenu.tsx`

**Estado actual:** el menú tiene un ítem `user-info` (no clickeable), `tenant-switch`, un divider y `logout`. `LanguageSelector` no está importado en ningún lugar del frontend.

**Acción:**
1. Importar el componente:
```ts
import { LanguageSelector } from '../LanguageSelector';
```
2. Agregar un ítem al array `menuItems`, antes del divider que precede a `logout`:
```ts
{
  key: 'language-selector',
  label: (
    <div style={{ padding: '4px 16px' }} onClick={(e) => e.stopPropagation()}>
      <LanguageSelector />
    </div>
  ),
},
{
  type: 'divider' as const,
},
```
`onClick={(e) => e.stopPropagation()}` evita que el `Dropdown` de Ant Design cierre el menú al interactuar con el `<Select>` interno.

---

## 3. Frontend — Conectar `LanguageSelector` al backend

**Archivo:** `frontend/components/LanguageSelector.tsx`

**Estado actual:**
```tsx
const handleLanguageChange = (lng: string) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('i18nextLng', lng);
};
```

**Acción:** agregar la llamada al endpoint ya existente, usando el cliente de API del proyecto (`frontend/services/api.ts` — usar el mismo cliente `axios`/fetch configurado ahí, con el `accessToken` que ya se adjunta a las requests autenticadas):
```tsx
import { api } from '../services/api'; // ajustar el import al export real de api.ts

const handleLanguageChange = async (lng: string) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('i18nextLng', lng);

  try {
    await api.patch('/api/v1/users/me/ui-preferences', { preferredLanguage: lng });
  } catch (err) {
    // No bloquear la UX si falla el guardado remoto; el cambio local ya aplicó.
    console.error('[LanguageSelector] No se pudo persistir el idioma en el backend:', err);
  }
};
```
Antes de escribir el import, revisar `frontend/services/api.ts` para usar el nombre de export real (puede ser `api`, `apiClient`, o una instancia default) y el método correcto (`.patch`, `.request`, etc.) según cómo esté configurado ahí.

---

## 4. Frontend — Sincronizar idioma al iniciar sesión

**Archivo:** localizar el punto donde el frontend procesa la respuesta de `POST /api/v1/auth/login` (probablemente en `frontend/services/api.ts` o en el hook/página de login que usa `useLogin` de Refine).

**Acción:** inmediatamente después de recibir y guardar `accessToken`/`refreshToken`, agregar:
```ts
import i18n from '../i18n'; // ajustar ruta real del archivo de configuración de i18next

const preferredLanguage = response.user?.uiPreferences?.preferredLanguage;
if (preferredLanguage && preferredLanguage !== i18n.language) {
  i18n.changeLanguage(preferredLanguage);
  localStorage.setItem('i18nextLng', preferredLanguage);
}
```

---

## 5. Documentación — Corregir rutas en el estándar de arquitectura

**Archivo:** `docs/architecture/i18n-and-localization-standard.md`

**Acción:** buscar y reemplazar toda referencia a:
- `frontend/src/i18n.ts` → `frontend/i18n.ts` (confirmar la ruta exacta real antes de guardar; el archivo no vino incluido en el export revisado, verificar en el repo local)
- `backend/src/customers/...` → `backend/customers/...`

No cambiar el resto del contenido del documento.

---

## 6. Checklist final antes de dar por cerrado el cambio

- [ ] `npm --prefix backend run test` pasa, incluyendo el nuevo caso de merge de `uiPreferences`.
- [ ] `npm --prefix frontend run build` compila sin errores de TypeScript.
- [ ] Prueba manual: cambiar `theme` (claro/oscuro) y luego el idioma desde `UserProfileMenu` → recargar página → ambos valores persisten.
- [ ] Prueba manual: cerrar sesión, iniciar sesión desde otro navegador → el idioma configurado se aplica automáticamente sin tocar el selector.
- [ ] Sincronizar `docs/architecture/i18n-and-localization-standard.md` corregido con `/opt/wiki/orderflow/` y hacer push (Regla 7 de `AGENTS.md`).
