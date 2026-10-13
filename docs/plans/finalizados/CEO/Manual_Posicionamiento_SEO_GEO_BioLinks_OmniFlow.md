# Manual de Posicionamiento SEO + GEO  
## BioLinks OmniFlow / OmniBio

**Versión:** 1.0  
**Fecha:** Septiembre 2026  
**Alcance:** provecchio.com + todos los BioLinks generados automáticamente por el wizard

---

## 1. Objetivo estratégico

1. Posicionar **provecchio.com** de forma visible en Google y en buscadores de IA (Perplexity, ChatGPT Search, Google AI Overviews, Gemini, etc.).
2. Hacer que **cualquier BioLink** creado con el wizard de OmniFlow nazca optimizado para indexación y citación automática.

La visibilidad deja de ser un “extra” y se convierte en una **feature de producto** diferencial.

---

## 2. Principios fundamentales

- SSR (Server-Side Rendering) o HTML con contenido principal visible sin JavaScript.
- Schema.org correcto (LocalBusiness / Restaurant) en todas las páginas.
- Contenido único y estructurado.
- Velocidad y Core Web Vitals excelentes.
- Consistencia de entidad (nombre, dirección, teléfono, redes).
- 0 % comisión de plataforma se mantiene como ventaja competitiva.

---

## 3. Requisitos técnicos de cada BioLink

| Elemento                    | Requisito                                                                 | Prioridad |
|----------------------------|---------------------------------------------------------------------------|---------|
| HTML SSR / contenido inicial | Nombre, descripción, links y datos principales en el HTML source         | Crítica |
| Schema JSON-LD             | LocalBusiness o subtipo específico (ver Manual Schema)                   | Crítica |
| Title + Meta Description   | Únicos, orientados a marca + categoría + ubicación + CTA                 | Alta    |
| Canonical                  | Self-referential                                                          | Alta    |
| Robots                     | `index, follow` por defecto                                               | Alta    |
| Core Web Vitals            | INP < 100 ms, LCP rápido, página liviana                                  | Alta    |
| Sitemap                    | Inclusión automática de todos los BioLinks activos                        | Alta    |
| IndexNow                   | Envío automático a Bing (y Google cuando esté disponible)                 | Media   |
| Uptime                     | 99.9 %+ (sin errores 502)                                                 | Crítica |

---

## 4. Optimización específica para IA (GEO / AEO)

Para que Perplexity, ChatGPT y Google AI Overviews citen el BioLink:

- Texto introductorio claro y factual en las primeras líneas.
- Datos estructurados (Schema) completos.
- Menciones consistentes del nombre del negocio + ubicación + categoría.
- Contenido original (no genérico).
- Señales de confianza: redes sociales en `sameAs`, teléfono, dirección real.
- Actualización frecuente de horarios y datos.

**No recomendado (hacks poco efectivos):**
- Crear archivos `llms.txt` innecesarios.
- Chunking artificial de contenido.
- Keyword stuffing.

---

## 5. Flujo del Wizard (visión de producto)

1. El usuario completa los datos del negocio.
2. El sistema genera automáticamente:
   - Title y meta description optimizados
   - Schema LocalBusiness / Restaurant
   - Texto introductorio legible por humanos e IA
   - Lista de links con nombres descriptivos
3. Al publicar:
   - Se inyecta el schema
   - Se solicita indexación (sitemap + IndexNow)
   - Se muestra indicador de “Optimizado para Google y buscadores de IA”
4. Al editar datos relevantes → se regenera el schema.

---

## 6. Caso flagship: Provecchio.com

Acciones prioritarias:

1. Resolver cualquier problema de uptime (errores 502).
2. Implementar Schema completo (Restaurant).
3. Enriquecer la página con descripción única, horarios, ubicación y FAQs.
4. Solicitar indexación y monitorear en Google Search Console.
5. Usar Provecchio como ejemplo público de “BioLink visible en Google y Perplexity”.

---

## 7. Medición y KPIs

**Indicadores principales:**
- Impresiones y clics orgánicos (Google Search Console)
- % de BioLinks indexados vs. total creados
- Apariciones / citas en Perplexity y Google AI Overviews
- Posicionamiento de keywords de marca + “BioLink sin comisión”
- Tráfico orgánico a BioLinks de clientes

**OKRs orientativos (primeros 6 meses):**
- 100 % de los nuevos BioLinks con Schema válido y SSR
- Provecchio.com indexado y con tráfico de marca estable
- ≥ 30 % de BioLinks activos indexados en Google
- Primeras citas detectables en Perplexity

---

## 8. Checklist de implementación

### Técnico
- [ ] SSR o pre-render garantizado
- [ ] Schema LocalBusiness / Restaurant automático
- [ ] Title + Meta únicos
- [ ] Canonical correcto
- [ ] Sitemap dinámico
- [ ] IndexNow configurado
- [ ] Monitor de uptime activo

### Producto
- [ ] Wizard captura todos los datos necesarios
- [ ] Indicador visual de “Optimizado para Google y IA”
- [ ] Regeneración automática de schema al editar
- [ ] Plantillas por vertical (Gastronomía primero)

### Contenido y autoridad
- [ ] Provecchio enriquecido
- [ ] Contenido de soporte en el dominio principal de OmniFlow
- [ ] Consistencia NAP en todos los canales

---

## 9. Principios de decisión

1. La visibilidad es una feature de producto, no un servicio extra.
2. Todo BioLink debe nacer listo para Google y para IA.
3. Provecchio es el laboratorio: lo que funciona allí se escala.
4. Priorizar fundamentos (SSR + Schema + uptime + contenido real) por encima de hacks.
5. Medir citas en IA además de rankings tradicionales.

---

**Documento listo para el equipo de Producto, Growth y Desarrollo de OmniFlow.**  
Última actualización: Septiembre 2026