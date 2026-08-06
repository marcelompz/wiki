# 🛠️ Troubleshooting #26: Volcado de Memoria (JavaScript Heap Out of Memory) al Ejecutar Pruebas Jest

**Fecha:** 2026-08-06  
**Módulo / Área:** Backend / Pruebas Unitarias & Integración (Jest)  
**Severidad:** Alta (Bloquea la ejecución de tests y la barrera `./scripts/init.sh`)  
**Estado:** ✅ **RESUELTO**

---

## 1. Síntoma / Problema

Al ejecutar la suite completa de pruebas del backend mediante `npm run test` (o al ser invocada automáticamente dentro de `./scripts/init.sh`), el proceso Node.js falla súbitamente lanzando un error de volcado de memoria de JavaScript (Out of Memory):

```text
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
 1: 0xb89260 node::Abort() [...]
 2: 0xa9c351 node::FatalError(...) [...]
 3: 0xd75622 v8::Utils::ReportOOMFailure(...) [...]
 4: 0xd759c7 v8::internal::V8::FatalProcessOutOfMemory(...) [...]
 5: 0xf52b35 [...]
```

---

## 2. Análisis Técnico y Causa Raíz

Jest por defecto intenta ejecutar los archivos de pruebas en paralelo utilizando múltiples workers (`workerThreads` o `child_process`). Durante las pruebas en aplicaciones NestJS con Prisma y TypeScript (`ts-jest`), cada suite de test instancia su propio contexto del módulo NestJS (`Test.createTestingModule(...)`), cargando compilaciones dinámicas de la aplicación, metadatos de TypeScript (`reflect-metadata`), clientes de Prisma y dependencias mockeadas en el Heap de V8.

Las causas principales del volcado de memoria fueron:

1. **Fuga de memoria por aislamiento de trabajadores (Workers Leak):** Jest genera y mantiene en memoria contextos V8 independientes por cada archivo de prueba sin liberar eficientemente la memoria garbage collector (GC) entre archivos.
2. **Límite predeterminado de Memoria del Heap de Node.js:** En Node 18/20+, el límite predeterminado del heap suele ser de 2GB o 4GB dependiendo del entorno, insuficiente cuando Jest paraleliza decenas de suites pesadas de NestJS.
3. **Múltiples instancias de PrismaClient en Pruebas:** Instanciar repetidamente el módulo de NestJS sin llamar adecuadamente a `app.close()` o sin reutilizar/limpiar servicios en `afterAll` acumula buffers y sockets abiertos.

---

## 3. Solución Aplicada

Se implementó un conjunto de optimizaciones en la configuración de la ejecución de Jest y scripts del proyecto:

### A. Incremento del Límite de Memoria V8 (`--max-workers` y `NODE_OPTIONS`)
Se ajustó la invocación de Jest asignando más memoria del Heap mediante `NODE_OPTIONS="--max-old-space-size=4096"` (o 8192 segun el entorno) y restringiendo el número máximo de trabajadores concurrentes para evitar la saturación de RAM en paralelo:

```json
// backend/package.json
"scripts": {
  "test": "NODE_OPTIONS=--max-old-space-size=4096 jest --logHeapUsage --maxWorkers=50%",
  "test:ci": "NODE_OPTIONS=--max-old-space-size=4096 jest --runInBand"
}
```

### B. Uso de `--runInBand` en entornos de recursos limitados / CI
Para la ejecución en entornos de CI o en la barrera automatizada `./scripts/init.sh`, se forzó la ejecución secuencial (`--runInBand` o `-w 2`), eliminando la sobrecarga por paralelización de workers:

```bash
# En scripts de CI / init.sh
npx jest --runInBand --logHeapUsage
```

### C. Limpieza defensiva de módulos de prueba NestJS
En las suites de tests unitarios e integración se aseguró el cierre limpio del módulo de NestJS:

```typescript
afterAll(async () => {
  if (moduleRef) {
    await moduleRef.close();
  }
});
```

---

## 4. Prevención y Buenas Prácticas

- **En tests de NestJS:** Cierra siempre la aplicación o `TestingModule` en la cláusula `afterAll` para liberar los event emitters, conexiones DB y subscripciones.
- **Monitoreo de memoria en Jest:** Ejecuta `npm run test -- --logHeapUsage` ocasionalmente para identificar qué archivo de prueba retiene cantidades anómalas de Heap después de su ejecución.
- **Ejecución local en hardware modesto:** Utilizar `npm run test -- --maxWorkers=2` o `--runInBand` para reducir drásticamente el consumo de RAM.
