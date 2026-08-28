# 🌐 Plan de Implementación: Persistencia de Idioma de Usuario (Corregido)

> **Código de Referencia:** `PLAN-I18N-CUST-2026` (v2 — corregido contra código real)
> **Estado:** 📝 Planificado
> **Fecha de Corrección:** 2026-08-21
> **Autor:** Revisión contra `orderflow_1_20_16_tar.gz`
> **Objetivo:** Persistir la preferencia de idioma del usuario en la base de datos usando el mecanismo ya existente (`uiPreferences`), y conectar el selector de idioma ya construido pero no montado en la UI.

---

## 📌 0. Correcciones respecto al plan original

El plan original (`PLAN-I18N-CUST-2026` v1) asumía un estado del repo que no coincide con el código real. Antes de ejecutar nada, se dejan registradas las correcciones:

| # | Plan original decía | Estado real verificado en el código | Corrección |
|---|---|---|---|
| 1 | Crear `docs/architecture/i18n-and-localization-standard.md` | **Ya existe** (71 líneas) | Revisar y corregir, no crear desde cero |
| 2 | Crear `docs/guides/CUSTOMERS_AND_DNIT_API.md` | **Ya existe** (139 líneas) | Marcar como completado en el checklist; fuera de alcance de este plan de idioma |
| 3 | Rutas `frontend/src/i18n.ts` y `backend/src/customers/...` | El repo **no tiene carpeta `src/`** en ninguno de los dos casos: es `backend/customers/customers.controller.ts` | Corregir rutas en la documentación de arquitectura ya creada |
| 4 | Agregar columna `preferredLanguage String @default("es")` al modelo `User` (migración Prisma nueva) | El modelo `User` ya tiene `uiPreferences Json?` con un endpoint funcional de persistencia (`PATCH /api/v1/users/me/ui-preferences`) que ya guarda `{ theme, sidebarBehavior, denseTables }` | **No crear columna nueva.** Usar `uiPreferences.preferredLanguage` — evita migración, reutiliza el patrón ya establecido |
| 5 | Exponer `PATCH /api/v1/users/profile` | Esa ruta **no existe**. Las rutas reales son `PATCH /api/v1/users/:id` y `PATCH /api/v1/users/me/ui-preferences` | Usar `PATCH /api/v1/users/me/ui-preferences` (ya implementada) |
| 6 | "Incluir `preferredLanguage` en la respuesta de `POST /api/v1/auth/login`" | `AuthService.login()` **ya devuelve** `user.uiPreferences` completo en el payload de login (`backend/auth/auth.service.ts`) | **Cero cambios en `auth.service.ts` necesarios** — al guardar el idioma dentro de `uiPreferences`, ya viaja en el login automáticamente |
| 7 | "Añadir un selector de idioma en el perfil de usuario" | `frontend/components/LanguageSelector.tsx` **ya existe y funciona** (cambia `i18n.language` + guarda en `localStorage`), pero **no está importado en ningún componente** — está huérfano | No crear un selector nuevo: montar el existente en `UserProfileMenu.tsx` y conectarlo al backend |
| 8 | (no contemplado) | `PATCH /api/v1/users/me/ui-preferences` hace **overwrite completo** del JSON (`usersService.update(id, { uiPreferences: preferences })`), no merge. Si el frontend manda solo `{ preferredLanguage }`, borraría `theme`, `sidebarBehavior`, `denseTables` guardados previamente | Agregar merge server-side en el controller antes de guardar |

Con estas correcciones, el trabajo real de backend se reduce a **un merge en un endpoint existente** (sin migración, sin nuevo endpoint, sin tocar `auth.service.ts`), y el de frontend a **montar y conectar un componente que ya existe**.

---

## 🎯 1. Objetivos del Plan (v2)

1. **Persistencia de idioma sin migración de schema:** usar `uiPreferences.preferredLanguage` (`'es' | 'en' | 'pt'`, default implícito `'es'` cuando el campo no existe).
2. **Merge seguro en `PATCH /api/v1/users/me/ui-preferences`:** evitar que actualizar el idioma borre otras preferencias de UI ya guardadas.
3. **Montar `LanguageSelector.tsx` en `UserProfileMenu.tsx`** (hoy no se renderiza en ningún lado) y conectarlo al endpoint de persistencia además de `localStorage`.
4. **Sincronizar idioma al iniciar sesión:** leer `response.user.uiPreferences?.preferredLanguage` tras `POST /api/v1/auth/login` e invocar `i18n.changeLanguage()` si difiere del idioma activo en el navegador.
5. **Corregir rutas de archivo** en `docs/architecture/i18n-and-localization-standard.md` (quitar `src/` inexistente).
6. **Sincronizar con Wiki de producción** según Regla 7 de `AGENTS.md` (`/opt/wiki/orderflow/`), en el mismo paso que se actualice cualquier `.md` de `docs/`.

Fuera de alcance de este plan (ya completado, no se toca): `docs/guides/CUSTOMERS_AND_DNIT_API.md`.

---

## 🚀 2. Fases de Ejecución

### 📍 Fase 1: Corrección de Documentación Existente
- [ ] Corregir en `docs/architecture/i18n-and-localization-standard.md` toda referencia a `frontend/src/i18n.ts` → `frontend/i18n.ts` (verificar la ruta exacta real del archivo de configuración antes de guardar, ya que no vino incluido en este export del repo).
- [ ] Corregir en el mismo documento cualquier referencia a `backend/src/customers/...` → `backend/customers/...`.
- [ ] Dar por completado en el checklist maestro `docs/guides/CUSTOMERS_AND_DNIT_API.md` (ya existe, no requiere trabajo de este plan).

### 📍 Fase 2: Backend — Merge de `uiPreferences` (sin migración)
- [ ] Modificar `UsersController.updateUiPreferences()` (`backend/users/users.controller.ts`) para leer las preferencias actuales del usuario y mergearlas con el body recibido antes de persistir (ver `PROMPT_PERSISTENCIA_IDIOMA_USUARIO.md`, sección 1).
- [ ] Verificar manualmente que `AuthService.login()` sigue devolviendo `uiPreferences` sin cambios (ya lo hace — no tocar `auth.service.ts`).

### 📍 Fase 3: Frontend — Montar y Conectar `LanguageSelector`
- [ ] Importar `LanguageSelector` en `UserProfileMenu.tsx` y agregarlo como ítem del menú de perfil (ver `PROMPT_PERSISTENCIA_IDIOMA_USUARIO.md`, sección 2).
- [ ] Modificar `handleLanguageChange` en `LanguageSelector.tsx` para, además de `i18n.changeLanguage()` y `localStorage`, disparar `PATCH /api/v1/users/me/ui-preferences` con `{ preferredLanguage: lng }`.
- [ ] En el flujo de login (donde se procesa la respuesta de `POST /api/v1/auth/login`), leer `response.user.uiPreferences?.preferredLanguage` y llamar `i18n.changeLanguage()` si difiere del idioma activo.

### 📍 Fase 4: Validación y Calidad (Harness Engineering)
- [ ] Ejecutar tests unitarios backend (`npm --prefix backend run test`), en particular los específicos de `users.controller.spec.ts`.
- [ ] Ejecutar build de frontend (`npm --prefix frontend run build`).
- [ ] Prueba manual: cambiar idioma en un dispositivo, cerrar sesión, iniciar sesión en otro navegador/dispositivo y confirmar que el idioma persiste.
- [ ] Prueba manual: cambiar `theme` (ya soportado) y luego `preferredLanguage`, confirmar que `theme` no se pierde tras el merge.

### 📍 Fase 5: Sincronización con Wiki
- [ ] Sincronizar `docs/architecture/i18n-and-localization-standard.md` corregido con `/opt/wiki/orderflow/` (Regla 7 de `AGENTS.md`) y hacer push al repo remoto de la wiki en el mismo paso.

---

## 📋 3. Criterios de Aprobación & Lista de Control

- [ ] `uiPreferences.preferredLanguage` persiste entre sesiones y dispositivos, sin columna nueva en Prisma.
- [ ] `PATCH /api/v1/users/me/ui-preferences` mergea en vez de sobrescribir.
- [ ] `LanguageSelector.tsx` visible y funcional en `UserProfileMenu.tsx`.
- [ ] Login sincroniza automáticamente el idioma del navegador con el guardado en backend.
- [ ] Documentación de arquitectura sin rutas `src/` inexistentes.
- [ ] Wiki de producción sincronizada.
