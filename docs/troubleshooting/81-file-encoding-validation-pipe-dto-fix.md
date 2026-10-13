# Troubleshooting #81 — Excepción de Validación NestJS "property fileEncoding should not exist" en Importación Masiva

## 📋 Síntoma
Al intentar realizar una importación masiva de productos o previsualización enviando el selector de codificación `fileEncoding` o `encoding`, el backend respondía con:
`BadRequestException: property fileEncoding should not exist`

## 🔍 Causa Raíz
El `ValidationPipe` global de NestJS (configurado con `whitelist: true` / `forbidNonWhitelisted: true`) rechazaba los parámetros `fileEncoding` y `encoding` enviadas en el cuerpo de la solicitud HTTP porque no estaban declarados explícitamente con los decoradores `@IsOptional()` y `@IsString()` en las clases DTO de importación (`BulkUploadProductDto` y `ImportFileOptionsDto`).

## 🛠️ Solución Aplicada
1. Se agregaron las propiedades opcionales `@IsOptional() @IsString() fileEncoding?: string` y `@IsOptional() @IsString() encoding?: string` a `BulkUploadProductDto` y se creó `ImportFileOptionsDto` en `backend/src/products/dto/bulk-upload-product.dto.ts`.
2. Se actualizaron los controladores de `bulkUploadPreview`, `bulkUpload`, `validateImportFile` y `executeImportFile` en `products.controller.ts` para que utilicen los DTOs oficiales en lugar de extraer individualmente con `@Body('key')`.
3. Compilado y desplegado exitosamente en el release **`v1.20.57`**.
