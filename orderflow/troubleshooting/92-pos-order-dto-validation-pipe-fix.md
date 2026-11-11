# Troubleshooting #92 — Excepción de Validación NestJS en Cobro de Cuenta POS ("property waiterId / totalAmount / discount_percent should not exist")

> **Área:** Backend / NestJS / ValidationPipe / POS  
> **Síntoma Principal:** Al intentar cobrar o procesar la venta en el punto de venta (POS) o comanda gastronómica, el backend responde con un error de validación HTTP 400 Bad Request detallando:  
> `property waiterId should not exist`, `property totalAmount should not exist`, `property paymentStatus should not exist`, `property paymentGateway should not exist`, `lines.0.property discount_percent should not exist`  
> **Estado:** ✅ Resuelto  
> **Fecha:** 2026-09-10  

---

## 🛑 Síntoma

Al hacer clic en **PAGAR / Confirmar Cobro** desde la terminal de venta POS (`/admin/pos` o cobro en mesa), la solicitud HTTP `POST /api/v1/orders` falla inmediatamente arrojando:

```text
BadRequestException: 
- property waiterId should not exist
- property totalAmount should not exist
- property paymentStatus should not exist
- property paymentGateway should not exist
- lines.0.property discount_percent should not exist
- lines.1.property discount_percent should not exist
```

---

## 🔍 Causa Raíz

El `ValidationPipe` global de NestJS está configurado con `whitelist: true` y `forbidNonWhitelisted: true`. Este mecanismo bloquea de manera estricta cualquier atributo recibido en el payload JSON del cuerpo HTTP que no esté explícitamente decorado con los decoradores de `class-validator` dentro de las clases Data Transfer Object (DTO).

Las clases `CreateOrderDto` y `CreateOrderLineDto` en `backend/src/orders/dto/create-order.dto.ts` carecían de los atributos enviados por el módulo POS y gastronómico (`waiterId`, `posConfigId`, `tableId`, `guestCount`, `totalAmount`, `paymentStatus`, `paymentGateway` y `discount_percent`).

---

## 🛠️ Solución Aplicada

1. **Declaración en `CreateOrderLineDto` (`backend/src/orders/dto/create-order.dto.ts`):**
   Se agregó la propiedad opcional `@IsOptional() @IsNumber() discount_percent?: number`.

2. **Declaración en `CreateOrderDto` (`backend/src/orders/dto/create-order.dto.ts`):**
   Se agregaron las propiedades opcionales:
   - `@IsOptional() @IsString() waiterId?: string`
   - `@IsOptional() @IsString() posConfigId?: string`
   - `@IsOptional() @IsString() tableId?: string`
   - `@IsOptional() @IsNumber() guestCount?: number`
   - `@IsOptional() @IsNumber() totalAmount?: number`
   - `@IsOptional() @IsString() paymentStatus?: string`
   - `@IsOptional() @IsString() paymentGateway?: string`

3. **Cálculo de Descuento por Línea en `OrdersService` (`backend/src/orders/orders.service.ts`):**
   Se implementó el cálculo dinámico del subtotal contemplando el porcentaje de descuento enviando en `discount_percent` e integrando el dato en los metadatos de la comanda.

4. **Verificación y Pruebas:**
   - Compilación exitosa de NestJS (`npm run build`).
   - Cobertura de pruebas unitarias al 100% aprobada en `orders.controller.spec.ts`.
   - Release publicado como **`v1.29.1`**.
