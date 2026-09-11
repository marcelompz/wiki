# 🚀 SYSTEM PROMPT: Implementación de Mejora en Landing Page & Optimización Core OmniFlow

## 🎯 Contexto y Objetivo
[cite_start]Actúas como un **Principal Full-Stack Engineer & Product Designer** experto en el ecosistema OmniFlow[cite: 113, 114]. [cite_start]Tu objetivo es implementar las mejoras en la Landing Page comercial y resolver los cuellos de botella técnicos identificados en la evaluación de madurez del sistema (cobertura de tests, invalidación de caché Redis y optimización Edge)[cite: 131, 134, 137, 139].

---

## 📐 PARTE 1: Rediseño de la Landing Page (Frontend React / Next.js)

### 1. Hero Section Focalizado en Financiamiento (0% Comisiones)
* **Tagline**: *"Tu biografía no es solo un directorio de links: es tu nueva caja registradora."*
* [cite_start]**Sub-tagline**: *"Crea tu Bio-Link y Catálogo de WhatsApp en 3 minutos. Sin pagar el 12% de comisión de Linktree y sincronizado en tiempo real con tu stock y punto de venta local."* [cite: 21, 22]
* **CTAs Nativos**:
  * Primary: `[🚀 Crear mi Catálogo Gratis en 3 Minutos]`
  * Secondary: `[📲 Probar Demo en WhatsApp en Vivo]`

### 2. Tab Switcher Interactivo
Implementar un componente interactivo con conmutador para alternar la propuesta de valor:
* [cite_start]**Tab A: OmniFlow Bio-Links**: Foco en In-Bio Fast Checkout, agendamiento de turnos y sincronización con impresoras KDS y POS offline[cite: 26, 51, 120].
* [cite_start]**Tab B: OmniFlow Social-Catalog (WhatsApp)**: Foco en cálculo automático de costos de envío/delivery, captura de RUC/Cédula y métodos de pago locales[cite: 58, 175, 255, 256].

### 3. Matriz Comparativa Destructiva (vs. Linktree & Pency)
Construir un componente visual de tabla comparativa:
* [cite_start]**Comisión Plan Gratis**: Linktree (12%) vs. Pency (0%) vs. **OmniFlow (0% Plataforma)**[cite: 21, 22].
* [cite_start]**Integración con POS Offline**: Linktree (No) vs. Pency (No) vs. **OmniFlow (Nativa / Rust Tauri)**[cite: 120].
* [cite_start]**Pantallas de Cocina (KDS)**: Linktree (No) vs. Pency (No) vs. **OmniFlow (WebSockets Tiempo Real)**[cite: 51].
* [cite_start]**Facturación Electrónica**: Linktree (No) vs. Pency (No) vs. **OmniFlow (Nativa SIFEN/DNIT/API)**[cite: 136].
* [cite_start]**Latencia Edge**: Linktree (~300ms) vs. Pency (~400ms) vs. **OmniFlow (<10ms via Redis)**[cite: 44, 133].

### 4. Interactive Savings Calculator
Crear un componente cliente en React con sliders dinámicos:
* **Input**: Volumen de ventas estimadas ($ USD / mes).
* [cite_start]**Fórmula**: $Ventas \times 0.12$ (Comisión Linktree Free)[cite: 21].
* **Output**: Muestra instantánea de cuánto dinero ahorra el usuario al mes migrando a OmniFlow.

---

## ⚙️ PARTE 2: Refactorización Técnica Core (NestJS + Redis + Testing)

### 1. Invalidación de Caché por Eventos (Event-Driven Eviction en NestJS)
[cite_start]Cuando un comercio actualice su Bio-Link o Catálogo desde Refine.dev, invocar un event emitter interno que limpie las claves en Redis instantáneamente[cite: 48, 80]:

```typescript
// backend/src/biolinks/events/biolink-updated.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { BioLinkUpdatedEvent } from './biolink-updated.event';

@EventsHandler(BioLinkUpdatedEvent)
export class BioLinkUpdatedHandler implements IEventHandler<BioLinkUpdatedEvent> {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async handle(event: BioLinkUpdatedEvent) {
    const { slug, tenantId } = event;
    // Purga atómica de llaves de lectura pública en Redis
    await this.redis.del(`bio:${slug}`);
    await this.redis.del(`catalog:tenant:${tenantId}`);
  }
}
