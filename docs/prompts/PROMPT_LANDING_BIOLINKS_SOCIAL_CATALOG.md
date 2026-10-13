# Prompt: Landing page — punta de lanza BioLinks + Social Catalog

## Contexto de producto
OmniFlow (OrderFlow) lanza una **punta de lanza comercial**:

- **Free:** BioLinks (link-in-bio) con restricciones.
- **Upsell natural:** Social Catalog (catálogo + pedidos) y, como siguiente módulo, **Bookings** (turnos).
- Más adelante: POS, KDS, loyalty, etc. (no son el mensaje principal de esta landing).

Esta landing alimenta la **prueba Fase 0** (no hace falta tráfico de RRSS todavía):

1. Persona: dueño de café / tienda, **no técnico**  
2. Dispositivo: **móvil**  
3. Flujo: Landing → “Crear mi bio gratis” → Signup → wizard bio → (opcional) producto + WA → pedido de prueba  

La página debe estar **completa y desplegable en producción** para correr esas pruebas internas/betas, aunque aún no se publique en redes.

---

## Objetivo de la landing
1. Explicar en &lt; 10 segundos: *un link para Instagram que puede mostrar catálogo y recibir pedidos*.  
2. CTA principal único y claro: **Crear mi bio gratis**.  
3. Sugerir sin agobiar: además de BioLinks tenés **Social Catalog** y **Bookings**.  
4. Mostrar precios de **referencia** (editables / “próximamente” si aún no hay cobro automático), sin bloquear el signup free.  
5. Ser impecable en **móvil** (viewport ~360–430px).  
6. Llevar a signup/onboarding real del producto (no fake form).

---

## Audiencia y tono
- **Quién:** dueño de café, tienda, estética, local gastronómico chico en LATAM.  
- **Qué le duele:** un solo link en Instagram; pedidos desordenados por WhatsApp; no quiere “un sistema de empresa”.  
- **Tono:** simple, cercano, en español (LATAM). Cero jerga SaaS (“sinergia”, “omnicanal enterprise”).  
- **Promesa:** “En minutos tenés tu link. Cuando quieras, sumás catálogo y pedidos.”

---

## Estructura de la página (secciones obligatorias)

### 1. Header (sticky en móvil)
- Logo / nombre del producto comercial (definir: ej. nombre de la punta de lanza o OmniFlow Bio).  
- Link secundario: “Iniciar sesión” (si ya existe auth).  
- CTA compacto: **Crear mi bio gratis**.

### 2. Hero (above the fold, móvil first)
- Titular fuerte (elegir 1 y poder A/B después), ejemplos:
  - “Tu link de Instagram que también toma pedidos”
  - “De la bio al pedido, sin complicarte”
- Subtítulo: una línea — link gratis; catálogo y turnos cuando los necesites.  
- CTA primario: **Crear mi bio gratis** → ruta real de signup (`/signup`, `/register`, `/onboarding`, la que use el producto).  
- CTA secundario (texto): “Ver ejemplo” → scroll a demo o abre bio demo en nueva pestaña.  
- Visual: mockup móvil de una bio (café/tienda) con botones y, si se ve, CTA “Ver catálogo”.  
- Microcopy bajo el botón: “Sin tarjeta · Listo en minutos · Podés usarlo solo como link”.

### 3. Problema → solución (3 bloques cortos)
Icono + título + 1 frase:
1. Un solo link en Instagram → **una página con todo lo importante**.  
2. Pedidos perdidos en el chat → **catálogo y pedido ordenado** (Social Catalog).  
3. Turnos a mano → **reservas cuando las actives** (Bookings).

### 4. “Qué incluye” — Free vs lo que podés sumar

**Plan Free — BioLinks (default)**
- 1 bio pública  
- Hasta N links (ej. 5–7; usar el número real del producto)  
- Personalización básica (nombre, foto, colores limitados)  
- Marca del producto visible (“Hecho con …”)  
- Analytics básicos de clicks (si existe)  
- **Sin** dominio propio  

**Podés sumar (upsell, no obligatorios al registrarte)**
- **Social Catalog:** productos, precios, fotos, carrito, pedido por WhatsApp y/o panel.  
- **Bookings:** turnos / agenda para el mismo negocio.  

Copy de puente:  
“Empezá gratis con tu bio. Cuando quieras recibir pedidos o reservas, activás el módulo sin cambiar de plataforma.”

### 5. Precios de referencia
Tabla o cards claras. **Precios aún de referencia** (placeholders editables en config o texto marcado como “referencia / puede actualizarse”).

| Plan | Precio referencia | Incluye (mensaje) |
|------|-------------------|-------------------|
| **Free** | $0 | BioLinks con límites |
| **Starter** | Desde USD X/mes * (o moneda local) | Bio + Social Catalog |
| **Business** | Desde USD Y/mes * | + Bookings y más límites |

\* Nota visible: “Precios de referencia. El plan Free está disponible ahora. Los planes de pago se habilitan al activar módulos.”

No exigir tarjeta para Free.  
Si el cobro aún es manual, el CTA de planes pagos puede ser “Quiero Starter” → WhatsApp comercial o waitlist, **sin romper** el CTA free.

### 6. Demo / prueba social
- Capturas o iframe/link a **tenant demo** real (café/tienda).  
- 2–3 bullets tipo: “Publicaste tu bio”, “Pegaste el link en Instagram”, “Recibiste un pedido de prueba”.  
- Opcional: quote placeholder de beta (“Nos ordenó los pedidos del IG”) — solo si es real o claramente ilustrativo.

### 7. Cómo funciona (3 pasos)
1. Creás tu cuenta y publicás la bio.  
2. Copiás el link a Instagram.  
3. Cuando quieras, sumás catálogo o turnos.  

Alinear con el guion Fase 0: el usuario debe sentir que el paso 1 es alcanzable en el móvil sin ayuda.

### 8. FAQ corto (5–6 preguntas)
- ¿Es gratis para siempre la bio? → Free con límites; sí podés quedarte solo con eso.  
- ¿Necesito tarjeta? → No para Free.  
- ¿Sirve para WhatsApp? → Sí; el catálogo puede enviar / organizar pedidos por WA.  
- ¿Puedo usar solo el link sin vender online? → Sí.  
- ¿Qué es Bookings? → Turnos/reservas cuando lo actives.  
- ¿Está listo para producción? → Sí para crear bio y probar; módulos de pago según disponibilidad.

### 9. Footer
- Links: Términos, Privacidad (URLs reales o placeholders `/terminos`, `/privacidad`).  
- Contacto / WhatsApp soporte (número real de prueba).  
- Mención discreta OmniFlow / empresa si aplica.  
- CTA final repetido: **Crear mi bio gratis**.

---

## Requisitos UX / UI
- **Mobile-first**; desktop aceptable pero la prueba Fase 0 es móvil.  
- Un solo CTA primario por sección (color consistente).  
- Targets táctiles ≥ 44px.  
- Carga rápida: pocas imágenes, lazy load, no video autoplay pesado.  
- Contraste legible; dark/light según design system del producto o fondo claro limpio tipo consumidor.  
- No modales bloqueantes al entrar.  
- Español LATAM; vosotros/ustedes según el tono del resto del producto (preferir **vos** o **tú** de forma consistente con la app).

---

## Requisitos técnicos
- Ruta pública: ej. `/`, `/bio`, `/empezar` — la que se use en el test.  
- CTA free → **signup real** del sistema (misma auth que el admin/onboarding).  
- Query opcionales: `?ref=CODIGO` (referral futuro), `?utm_source=fase0`.  
- Responsive HTML/CSS o componentes del frontend actual (React/Vite/Ant o el stack del repo).  
- SEO básico: `title`, `meta description`, Open Graph mínimos (aunque no haya RRSS aún).  
- Analytics: al menos poder medir click en CTA principal (evento o GA/plausible si ya existe).  
- No depender de features no desplegadas: si Bookings no está vendible, mostrar como “Próximamente / en el mismo panel” sin botón de compra roto.

---

## Contenido que debe poder editarse fácil
- Nombre comercial del producto en la punta de lanza.  
- Número máximo de links free.  
- Precios referencia X / Y.  
- URL de bio demo.  
- WhatsApp de contacto.  
- Textos de precios “referencia”.

---

## Criterios de aceptación (prueba Fase 0)
- [ ] En móvil, el hero muestra titular + CTA **Crear mi bio gratis** sin scroll (o con mínimo scroll).  
- [ ] CTA lleva a signup funcional en el entorno de prueba/producción designado.  
- [ ] Se entiende Free vs Catalog vs Bookings en menos de 30 s de lectura.  
- [ ] Precios de referencia visibles y etiquetados como referencia.  
- [ ] Existe FAQ y footer con privacidad/términos (aunque sean páginas mínimas).  
- [ ] Link a ejemplo/demo funciona.  
- [ ] No hay errores de consola bloqueantes ni layout roto en ~390px.  
- [ ] Un usuario no técnico puede seguir: Landing → signup → (wizard existente) sin instrucciones extra de esta página.

---

## Fuera de alcance
- App nativa stores.  
- Checkout de suscripción Stripe/MP completo (puede ser CTA waitlist/WhatsApp).  
- Comparativa larga vs Linktree.  
- Blog, multi-idioma, dark mode forzado.  
- Explicar POS, KDS, FacturaSend, Super Admin.

---

## Entregable
1. Página landing implementada y desplegable.  
2. Textos finales en español (reemplazar lorem).  
3. CTA conectado a signup real.  
4. Lista de strings de precios/límites en un solo lugar (const o CMS simple).  
5. Nota de 5 líneas: URL de la landing + URL signup + URL bio demo usadas en Fase 0.

## Referencia de flujo de prueba (no implementar el wizard aquí)
Landing → Crear mi bio gratis → Signup → Completar wizard sin ayuda (medir tiempo) → Abrir bio en incógnito → Cargar 1 producto y WA si aplica → Pedido de prueba desde otro teléfono → Verificar recepción comercio → Anotar fricciones.
```