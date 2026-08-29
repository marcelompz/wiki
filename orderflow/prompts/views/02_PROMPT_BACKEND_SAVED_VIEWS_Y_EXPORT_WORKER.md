# **Prompt 02: Backend — Vistas Guardadas (SavedViews) y Worker de Exportación Asíncrona (BullMQ \+ Streaming)**

**Código:** PROMPT-VIEW-02  
**Módulo:** Backend / SavedViews & DataExport  
**Ecosistema:** OmniFlow (NestJS, Prisma ORM, Redis, BullMQ, ExcelJS, PostgreSQL)  
**Propósito:** Implementar la persistencia de Vistas Guardadas (Presets/Segmentos) y el motor de exportación masiva en streaming para procesar decenas de miles de registros sin provocar timeouts ni fugas de memoria.

---

## **🤖 Rol y Contexto de Ingeniería**

Actúa como **Senior Data Engineer & Performance Specialist** de OmniFlow. Vas a implementar dos submódulos críticos para el backend:

1. `backend/src/saved-views/`: Gestión y persistencia de combinaciones de filtros, orden y columnas guardadas por usuario/tenant.  
2. `backend/src/data-export/`: Worker de exportación asíncrona con BullMQ y streaming directo a XLSX/CSV.

---

## **📋 Tareas de Implementación**

### ***1\. Módulo de Vistas Guardadas (`SavedViewsModule`)***

#### **1.1. Migración Prisma**

Verificar la presencia del modelo `SavedView` en `backend/prisma/schema.prisma`:

enum ViewVisibility {

  PRIVATE

  PUBLIC

}

model SavedView {

  id          String         @id @default(uuid()) @db.Uuid

  tenantId    String         @map("tenant\_id") @db.Uuid

  userId      String         @map("user\_id") @db.Uuid

  resource    String         @db.VarChar(50)

  name        String         @db.VarChar(100)

  icon        String?        @db.VarChar(50)

  isDefault   Boolean        @default(false) @map("is\_default")

  visibility  ViewVisibility @default(PRIVATE)

  config      Json

  createdAt   DateTime       @default(now()) @map("created\_at")

  updatedAt   DateTime       @updatedAt @map("updated\_at")

  tenant      Tenant         @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)

  @@unique(\[tenantId, userId, resource, name\])

  @@index(\[tenantId, resource\])

  @@map("saved\_views")

}

#### **1.2. Servicio `SavedViewsService`**

Implementar las operaciones:

- `create(tenantId, userId, createDto)`: Crea la vista. Si `isDefault` es `true`, desmarca cualquier otra vista default previa del usuario para ese recurso.  
- `findAll(tenantId, userId, resource)`: Retorna las vistas privadas del usuario y las vistas públicas del tenant.  
- `update(tenantId, userId, id, updateDto)`: Actualiza configuración o nombre (con verificación de permisos de autoría).  
- `remove(tenantId, userId, id)`: Elimina la vista guardada.  
- `setDefault(tenantId, userId, id)`: Marca como predeterminada.

---

### ***2\. Módulo de Exportación Masiva Asíncrona (`DataExportModule`)***

#### **2.1. Arquitectura de Streaming con Memoria Constante**

Para evitar caídas por `OutOfMemory` (OOM) en catálogos de \>100.000 registros, el exportador NO debe cargar todos los registros en memoria mediante un array masivo. Debe consumir la base de datos por cursores o lotes de 1.000 registros e ir escribiendo directamente en el stream de archivo.

#### **2.2. Procesador BullMQ (`export-resource.processor.ts`)**

import { Processor, Process } from '@nestjs/bull';

import { Job } from 'bull';

import \* as ExcelJS from 'exceljs';

import \* as fs from 'fs';

import \* as path from 'path';

@Processor('data-export-queue')

export class ExportResourceProcessor {

  constructor(

    private readonly prisma: PrismaService,

    private readonly queryBuilder: DynamicQueryBuilder,

    private readonly storageService: StorageService,

    private readonly notificationGateway: NotificationGateway,

  ) {}

  @Process('export-job')

  async handleExport(job: Job\<ExportJobPayload\>) {

    const { tenantId, userId, resource, selection, exportConfig } \= job.data;

    const tempFilePath \= path.join('/tmp', \`export\_${job.id}.${exportConfig.format}\`);

    try {

      job.progress(5);

      const where \= this.queryBuilder.buildPrismaWhere(tenantId, selection);

      const totalCount \= await this.getModel(resource).count({ where });

      if (exportConfig.format \=== 'xlsx') {

        await this.generateXlsxStream(resource, where, exportConfig.columns, tempFilePath, totalCount, job);

      } else {

        await this.generateCsvStream(resource, where, exportConfig.columns, tempFilePath, totalCount, job);

      }

      job.progress(90);

      // Subir archivo a almacenamiento (S3 / Storage local) y generar URL prefirmada

      const downloadUrl \= await this.storageService.uploadAndGetSignedUrl(

        tempFilePath,

        \`exports/${tenantId}/${resource}\_${Date.now()}.${exportConfig.format}\`,

        60 \* 60 \* 24 // 24 horas de validez

      );

      // Notificar al usuario vía WebSockets

      this.notificationGateway.sendToUser(userId, 'export:completed', {

        jobId: job.id,

        resource,

        downloadUrl,

        totalRecords: totalCount,

      });

      job.progress(100);

      return { downloadUrl, totalRecords: totalCount };

    } finally {

      if (fs.existsSync(tempFilePath)) {

        fs.unlinkSync(tempFilePath);

      }

    }

  }

  private async generateXlsxStream(

    resource: string,

    where: any,

    columns: string\[\],

    outputPath: string,

    totalCount: number,

    job: Job

  ) {

    const workbook \= new ExcelJS.stream.xlsx.WorkbookWriter({

      filename: outputPath,

      useStyles: true,

    });

    const worksheet \= workbook.addWorksheet('Export');

    // Headers

    worksheet.columns \= columns.map(col \=\> ({ header: col.toUpperCase(), key: col, width: 20 }));

    const batchSize \= 1000;

    let processed \= 0;

    let cursor: string | undefined \= undefined;

    while (processed \< totalCount) {

      const records \= await this.getModel(resource).findMany({

        where,

        take: batchSize,

        skip: cursor ? 1 : 0,

        cursor: cursor ? { id: cursor } : undefined,

        orderBy: { id: 'asc' },

      });

      if (\!records.length) break;

      for (const record of records) {

        const rowData \= {};

        for (const col of columns) {

          rowData\[col\] \= this.resolveNestedValue(record, col);

        }

        worksheet.addRow(rowData).commit();

      }

      processed \+= records.length;

      cursor \= records\[records.length \- 1\].id;

      job.progress(Math.floor(10 \+ (processed / totalCount) \* 75));

    }

    worksheet.commit();

    await workbook.commit();

  }

}

---

### ***3\. Controlador de Exportación Inteligente***

En el controlador del recurso (`POST /api/v1/{resource}/export`):

- Si el conteo total es `<= 500` registros: Generar y responder síncronamente con `StreamableFile`.  
- Si el conteo es `> 500` registros: Encolar en BullMQ y responder `202 Accepted` con el `job_id`.

---

## **🎯 Criterios de Aceptación**

1. Exportación fluida de 50.000 filas en menos de 10 segundos sin superar 150MB de uso de RAM.  
2. Descarga de archivos XLSX formateados con tipografía limpia y encabezados en negrita.  
3. Notificación instantánea vía WebSocket al completarse la exportación.

