# Plan Integral de Implementación: Adopción del Formato WebP en OmniFlow

**Proyecto:** OmniFlow (Ecosistema SaaS & POS Offline-first)  
**Objetivo:** Optimizar el rendimiento de carga, reducir el consumo de ancho de banda y minimizar la huella de almacenamiento local en clientes web y terminales POS mediante la transición y estandarización al formato WebP.  
**Fecha:** Agosto 2026  
**Versión:** 1.0  

---

## 1. Resumen Ejecutivo y Diagnóstico

OmniFlow gestiona catálogos dinámicos, activos estáticos de interfaz y sincronizaciones asíncronas con Odoo CE. El uso de formatos heredados (PNG/JPEG sin optimizar) impacta negativamente en:
1. **Sincronización inicial y almacenamiento local (Dexie.js / IndexedDB):** El POS Tauri requiere almacenar en caché cientos de productos con imágenes para operar offline. Archivos pesados saturan el almacenamiento y ralentizan la indexación.
2. **Consumo de red y latencia en tenants web:** Incremento de transferencia de datos (*egress bandwidth*) y tiempos de *Largest Contentful Paint* (LCP).
3. **Carga en el backend durante picos de sincronización:** Bloqueos en el event-loop si la manipulación de imágenes se realiza sincrónicamente.

**Objetivo de la migración:** Reducir entre un **60% y 75%** el peso transferido y almacenado de imágenes sin pérdida perceptible de calidad visual.

---

## 2. Arquitectura de la Solución

```
+-----------------------------------------------------------------------------------+
|                                 FUENTES DE IMÁGENES                               |
+-----------------------------------------------------------------------------------+
        |                                                            |
        v (Subida Directa)                                           v (Sync Asíncrona)
+------------------------+                                 +------------------------+
|  API Uploads (Multer)  |                                 |   Odoo Adapter (Sync)  |
+------------------------+                                 +------------------------+
        |                                                            |
        +----------------------------+-------------------------------+
                                     |
                                     v
                        +-------------------------+
                        |  BullMQ Queue (Redis)   |
                        +-------------------------+
                                     |
                                     v (Job Worker)
                        +-------------------------+
                        | ImageProcessingService  |
                        |      (Sharp Node)       |
                        | - Variant: Thumb (300px)|
                        | - Variant: Detail(1200) |
                        | - Output: WebP (Q:80/85)|
                        +-------------------------+
                                     |
                                     v
                        +-------------------------+
                        | Storage (S3 / Local FS) |
                        +-------------------------+
                                     |
                                     v
                        +-------------------------+
                        | Traefik v3 (Edge Cache) |
                        +-------------------------+
                                     |
             +-----------------------+-----------------------+
             |                                               |
             v                                               v
+-------------------------+                     +-------------------------+
|    Web Client (React)   |                     |     Tauri POS (Rust)    |
|   - Component <Picture> |                     | - Dexie.js (Cached Blob)|
|   - Native WebP Support |                     | - Offline Render Engine |
+-------------------------+                     +-------------------------+
```

---

## 3. Desglose de Fases de Implementación

### Fase 1: Pipeline Backend (NestJS, Sharp & BullMQ)

#### 1.1 Dependencias
```bash
npm install sharp @types/sharp @nestjs/bullmq bullmq
```

#### 1.2 Servicio de Procesamiento (`image-processing.service.ts`)
```typescript
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ImageVariants {
  thumbnail: Buffer;
  full: Buffer;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  async generateWebPVariants(inputBuffer: Buffer): Promise<ImageVariants> {
    try {
      const pipeline = sharp(inputBuffer).rotate(); // auto-orientación basada en EXIF

      const [thumbnail, full] = await Promise.all([
        pipeline
          .clone()
          .resize(300, 300, { fit: 'cover', position: 'center' })
          .webp({ quality: 80, effort: 4 })
          .toBuffer(),
        pipeline
          .clone()
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85, effort: 4 })
          .toBuffer(),
      ]);

      return { thumbnail, full };
    } catch (error) {
      this.logger.error(`Error procesando imagen a WebP: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

#### 1.3 Worker Asíncrono en BullMQ (`image-processor.worker.ts`)
```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ImageProcessingService } from './image-processing.service';
import { StorageService } from '../storage/storage.service';
import { ProductsService } from '../products/products.service';

@Processor('image-processing')
@Injectable()
export class ImageProcessorWorker extends WorkerHost {
  private readonly logger = new Logger(ImageProcessorWorker.name);

  constructor(
    private readonly imageService: ImageProcessingService,
    private readonly storageService: StorageService,
    private readonly productsService: ProductsService,
  ) {
    super();
  }

  async process(job: Job<{ productId: string; bufferBase64: string; mimeType: string }>): Promise<any> {
    const { productId, bufferBase64 } = job.data;
    const inputBuffer = Buffer.from(bufferBase64, 'base64');

    this.logger.log(`Iniciando optimización WebP para producto ${productId}`);

    const { thumbnail, full } = await this.imageService.generateWebPVariants(inputBuffer);

    const thumbKey = `products/${productId}/thumb.webp`;
    const fullKey = `products/${productId}/full.webp`;

    await Promise.all([
      this.storageService.put(thumbKey, thumbnail, 'image/webp'),
      this.storageService.put(fullKey, full, 'image/webp'),
    ]);

    await this.productsService.updateImageUrls(productId, {
      thumbUrl: thumbKey,
      fullUrl: fullKey,
      processedAt: new Date(),
    });

    this.logger.log(`Optimización WebP completada con éxito para producto ${productId}`);
  }
}
```

---

### Fase 2: Adaptador de Integración y Sincronización con Odoo CE

1. **Ingesta de Webhooks / Polling:** Al recibir `image_1920` o `image_128` en Base64 desde Odoo CE:
   * Calcular el checksum MD5 del payload.
   * Si difiere del almacenado en PostgreSQL, despachar job a BullMQ (`image-processing`).
2. **Compatibilidad con Odoo:**
   * Las lecturas de OmniFlow consumen directamente las URLs generadas en `.webp`.
   * Si una mutación se origina en OmniFlow y requiere sincronizarse hacia Odoo CE, exportar a JPEG/PNG solo si la versión de Odoo instalada no soporta ingestión binaria de WebP en `product.template`.

---

### Fase 3: Optimización en Frontend Web y Tauri POS (Offline-First)

#### 3.1 Activos Estáticos (Vite Build Pipeline)
Instalar `vite-plugin-image-optimizer`:
```bash
npm install -D vite-plugin-image-optimizer
```

Configuración en `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig({
  plugins: [
    ViteImageOptimizer({
      webp: {
        quality: 80,
      },
      png: {
        quality: 80,
      },
      jpeg: {
        quality: 80,
      },
    }),
  ],
});
```

#### 3.2 Persistencia Local en Dexie.js (POS Offline)
Actualización del esquema y servicio de sincronización para persistir WebP en IndexedDB:

```typescript
// db.ts (Dexie schema)
import Dexie, { Table } from 'dexie';

export interface LocalProduct {
  id: string;
  name: string;
  price: number;
  thumbBlob?: Blob; // Guardado en formato image/webp
  thumbUrl: string;
  updatedAt: number;
}

export class OmniFlowPOSDatabase extends Dexie {
  products!: Table<LocalProduct, string>;

  constructor() {
    super('OmniFlowPOS');
    this.version(2).stores({
      products: 'id, name, price, updatedAt',
    });
  }
}
```

Al descargar la imagen para el almacenamiento offline:
```typescript
async function cacheProductImage(product: LocalProduct): Promise<void> {
  const response = await fetch(product.thumbUrl);
  const blob = await response.blob(); // Recibido como image/webp (70% menor consumo de disco)
  await db.products.update(product.id, { thumbBlob: blob });
}
```

---

### Fase 4: Configuración de Infraestructura y Traefik v3

Configurar middleware de cabeceras dinámicas en Traefik v3 para servir contenido multimedia estático con compresión nativa y caché inmutable:

```yaml
# traefik-dynamic-config.yml
http:
  middlewares:
    media-cache-headers:
      headers:
        customResponseHeaders:
          Cache-Control: "public, max-age=31536000, immutable"
          X-Content-Type-Options: "nosniff"
    compress-media:
      compress:
        excludedContentTypes:
          - "image/webp" # WebP ya está óptimamente comprimido

  routers:
    media-router:
      rule: "Host(`media.omniflow.app`) && PathPrefix(`/products/`)"
      service: storage-service
      middlewares:
        - media-cache-headers
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
```

---

## 4. Script de Migración de Catálogo Existente

Para procesar imágenes previas ya almacenadas en la base de datos de producción:

```typescript
// scripts/migrate-legacy-images.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ProductsService } from '../src/products/products.service';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productsService = app.get(ProductsService);
  const imageQueue = app.get<Queue>(getQueueToken('image-processing'));

  console.log('Iniciando encolado de migración masiva a WebP...');
  const legacyProducts = await productsService.findAllWithLegacyImages();

  for (const product of legacyProducts) {
    await imageQueue.add('migrate-webp', {
      productId: product.id,
      bufferBase64: product.rawImageBase64,
      mimeType: product.mimeType,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    });
  }

  console.log(`Encolados ${legacyProducts.length} productos para conversión.`);
  await app.close();
}

bootstrap();
```

---

## 5. Matriz de Riesgos y Mitigación

| Riesgo Identificado | Probabilidad | Impacto | Estrategia de Mitigación |
| :--- | :--- | :--- | :--- |
| **Saturación de CPU durante migración masiva** | Media | Alto | Limitar concurrencia en BullMQ (`concurrency: 2` por worker instance) y ejecutar en horarios de baja demanda. |
| **Incompatibilidad en clientes heredados** | Muy baja | Bajo | WebP cuenta con >97% soporte. Tauri (WebView2 / WebKitGTK) y navegadores modernos lo soportan nativamente. |
| **Corrupción de metadatos EXIF / Orientación** | Baja | Medio | Usar `.rotate()` explícito en el pipeline de `sharp` para preservar la orientación real antes de redimensionar. |

---

## 6. Cronograma Estimado de Ejecución

| Hito | Tarea | Tiempo Estimado | Responsable |
| :--- | :--- | :--- | :--- |
| **H1** | Implementación de `ImageProcessingService` y Worker BullMQ | 1 día | Backend Lead |
| **H2** | Adaptador de sincronización con Odoo CE | 0.5 días | Backend / Integraciones |
| **H3** | Integración en Dexie.js y frontend POS Tauri | 1 día | Frontend / POS Lead |
| **H4** | Reglas de Traefik v3, CI/CD y despliegue a Staging | 0.5 días | DevOps / Infra |
| **H5** | Ejecución de script de migración masiva y validación | 0.5 días | QA / Tech Lead |
| **Total** | **Ciclo completo de implementación y entrega** | **3.5 días** | Equipo OmniFlow |
