### Contexto y Objetivo
En el módulo **OmniBio** de OmniFlow, actualmente los botones de enlaces muestran un ícono genérico de red (globo terráqueo) tanto en la *Vista Previa en Vivo (Mobile First)* como en la página pública del Biolink. 

Necesitamos implementar la asignación dinámica e inteligente de íconos de Redes Sociales (RR. SS.) y canales de mensajería para cada enlace/botón configurado.

---

### Requerimientos Funcionales

1. **Detección Automática por URL / Tipo:**
   - Crear una función helper `detectSocialPlatform(url: string, title?: string)` que identifique la plataforma a partir del dominio o esquema:
     - **WhatsApp:** `wa.me`, `api.whatsapp.com`, `whatsapp://` o palabras clave como "WhatsApp".
     - **Instagram:** `instagram.com`, `ig.me`, `instagr.am` o "Instagram" / "IG".
     - **TikTok:** `tiktok.com`, `vt.tiktok.com` o "TikTok".
     - **Facebook:** `facebook.com`, `fb.me`, `fb.com` o "Facebook".
     - **X / Twitter:** `x.com`, `twitter.com`.
     - **YouTube:** `youtube.com`, `youtu.be`.
     - **Telegram:** `t.me`, `telegram.me`.
     - **LinkedIn:** `linkedin.com`.
     - **Pedidos / Tienda / Catálogo:** Detección de enlaces internos a OmniFlow / OrderFlow o palabras clave de checkout.
     - **Fallback genérico:** Ícono de enlace/web (`Globe` o `ExternalLink`) si no coincide con ninguna red conocida.

2. **Soporte de Selector Manual en el Editor:**
   - En el listado de edición de enlaces de OmniBio, permitir al usuario:
     - Dejar el ícono en modo automático (detectado por URL).
     - Forzar/elegir manualmente un ícono de una lista de RR. SS. predefinidas.

3. **Renderizado en Vista Previa y Página Pública:**
   - Renderizar el ícono correspondiente en:
     - El componente de vista previa móvil (`OmniBioPreview`).
     - La página pública final (`/bio/[slug]`).
   - El ícono debe alinearse correctamente a la izquierda o junto al texto del botón, respetando el `Color de Texto`, `Color de Fondo`, contraste y `Estilo de Botones` configurados.

---

### Especificaciones Técnicas

- **Librería de Íconos:** Utilizar la librería existente del proyecto (e.g. `lucide-react` / `react-icons/si` / SVGs personalizados para marcas como TikTok, Instagram, WhatsApp, etc.).
- **Componente Reutilizable:** Crear `<SocialIcon platform={platform} className="..." />` o integrar la resolución en el componente `<BioButton />`.
- **TypeScript:** Definir los tipos para `SocialPlatformType` (`'whatsapp' | 'instagram' | 'tiktok' | 'facebook' | 'x' | 'youtube' | 'telegram' | 'linkedin' | 'catalog' | 'generic'`).
- **Rendimiento y Accesibilidad:**
  - Incluir `aria-hidden="true"` en los íconos decorativos.
  - Asegurar que no afecte el tiempo de carga del Biolink público (optimización mobile).