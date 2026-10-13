# Prompt: App móvil Cliente (OrderFlow / OmniFlow)

## Contexto
OrderFlow es un SaaS multi-tenant omnicanal. Esta app es la **experiencia del usuario final / cliente** del negocio (no del staff ni del superadmin de plataforma).

Dependencia previa recomendada:
- Feature flags por módulo (`ModuleInstallation` + `GET /api/v1/modules/enabled?audience=client`).
- Endpoints del módulo ya depurados y estables (catálogo, bookings, biolinks, loyalty, pedidos).

Stack sugerido: **Expo (React Native)** + TypeScript, misma API REST/WebSocket del backend OrderFlow. Alternativa aceptable: PWA orientada a cliente si se documenta el trade-off.

---

## Objetivo
Entregar una app cliente:
- Ligera (solo lo que el tenant tiene activo).
- Guiada por **módulos habilitados** + sesión del usuario.
- UX mobile-first: acciones claras (pedir, reservar, ver puntos, abrir bio).
- Sin features de admin, POS, KDS, Super Admin ni Deploy Manager.

---

## Audiencia y permisos
- Usuario final autenticado (cliente) o, si el tenant lo permite, flujos guest limitados (solo catálogo/checkout según config).
- Tras login (o resolución de tenant por subdominio/deep link):
  1. Resolver `tenantId` / branding.
  2. `GET /api/v1/modules/enabled?audience=client`.
  3. Armar navegación **solo** con módulos `active: true`.
- RBAC de cliente: si no hay permiso o el módulo está off → no mostrar ítem; deep link → pantalla “No disponible en este negocio”.

---

## Módulos que puede incluir (si el flag está on)

| moduleId | Pantallas / flujos mínimos |
|----------|----------------------------|
| `core` | Home, perfil, mis pedidos, detalle de pedido |
| `catalog` | Listado productos, detalle, carrito, checkout |
| `bookings` | Servicios, disponibilidad, reservar, mis turnos |
| `biolinks` | Vista bio del negocio + CTAs (puede ser WebView o nativo) |
| `loyalty` | Tarjeta, puntos, tier, historial de movimientos |
| `giveaways` | Listado de sorteos activos, registro, estado |
| `whatsapp_catalog` | Atajo a catálogo WhatsApp / deep link si aplica |

Todo lo demás (POS, KDS, facturasend, integrations, billing, analytics admin) **fuera de alcance**.

---

## Alcance funcional

### Auth y tenant
- Login (email/telefono según API existente), logout, refresh token.
- Deep links / universal links: `https://{subdomain}.{ROOT_DOMAIN}/...` y custom scheme si Expo.
- Branding: logo, colores primarios desde tenant (white-label básico).
- No hardcodear un solo dominio; usar config/`ROOT_DOMAIN` equivalente en mobile.

### Navegación
- Bottom tabs dinámicos según módulos activos (máx. 4–5 visibles; el resto en “Más”).
- Stack por sección.
- Empty states cuando un módulo no está instalado.

### Core / pedidos
- Listar pedidos del cliente, detalle, estados legibles.
- Pull-to-refresh; manejo offline básico (cola solo si el backend/PWA ya lo soporta; no reinventar sync completo).

### Catálogo (si `catalog`)
- Grid/lista, categorías, detalle, carrito local, checkout alineado a API pública/autenticada existente.
- Respetar moneda del tenant y guest checkout si `allowGuestCheckout`.

### Bookings (si `bookings`)
- Flujo: servicio → fecha → slot → confirmación.
- Mis reservas y cancelación si el API lo permite.

### Loyalty / Giveaways / BioLinks
- UI simple, consumiendo endpoints ya existentes.
- BioLinks: preferir datos API; WebView solo si no hay modelo nativo suficiente.

### No funcional
- Push notifications: preparar registro de device token si existe endpoint (`PushToken`); la lógica de envío es backend.
- i18n: al menos ES; EN/PT si el proyecto ya usa i18n.
- Analytics mínimo: no bloqueante.
- Cumplir políticas de store (privacidad, permisos de cámara solo si un flujo lo requiere).

---

## Arquitectura técnica
- Cliente HTTP único (axios/fetch) con interceptor JWT / API key de cliente según el modelo actual.
- Store global (Zustand o equivalente) para: sesión, tenant, `enabledModules`, carrito.
- Feature helper: `isModuleEnabled('bookings')`.
- Code splitting por pantallas de módulo (lazy) para no inflar el bundle inicial.
- Entornos: staging / production vía env Expo (`app.config`).
- No empaquetar Ant Design / Refine; UI nativa o librería mobile (ej. React Native Paper / NativeWind — elegir una y documentarla).

---

## Criterios de aceptación
- [ ] Con tenant solo `core` + `catalog`, la app no muestra Turnos ni BioLinks.
- [ ] Activar `bookings` en backend hace aparecer el tab/flujo sin redeploy de “lógica muerta” innecesaria (al menos el menú es dinámico).
- [ ] Login y listado de pedidos funcionan contra API real de staging.
- [ ] Branding básico (logo/color) por tenant.
- [ ] Deep link a módulo inactivo → mensaje claro, no pantalla en blanco.
- [ ] Tamaño orientativo razonable (objetivo &lt; ~50 MB instalada sin assets pesados de más).
- [ ] Sin rutas ni menús de admin/staff.

---

## Fuera de alcance
- App staff/admin.
- Menú drawer del admin web.
- Implementación del backend de feature flags (solo consumir el contrato).
- Impresión ESC/POS, KDS, Super Admin, Deploy Manager.
- Publicación final en App Store / Play (dejar checklist, no bloqueante del MVP).

---

## Entregables
1. Proyecto Expo (estructura de carpetas, navegación, auth, store de módulos).
2. Pantallas MVP por módulo soportado (aunque sea UI + integración API mínima).
3. README: env vars, cómo apuntar a staging, cómo se resuelve el tenant.
4. Lista de endpoints usados por pantalla.
5. Notas de lo dejado para v2 (push avanzado, offline completo, etc.).

## Estilo UX
- Mobile-first, targets táctiles ≥ 44px, contraste adecuado.
- Loading y error states explícitos.
- Textos en español (Paraguay/Latam) salvo i18n.
```