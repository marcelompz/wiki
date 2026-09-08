# PROMPT – OmniFlow · Módulo Documentos: Workspace propio con Collabora (WOPI, edición real)

**Gobernanza:** Extiende FEAT-067 · Fase 4.5 (Visor Collabora, solo lectura). Este módulo es transversal a OmniFlow, no exclusivo de OmniBI — se numera aparte para no forzarlo dentro de la numeración de fases de BI.
**Nombre sugerido de feature:** FEAT-XXX — Documentos & Workspace (definir número real al crear el ticket)
**Etapa:** 1 de 2. Esta etapa es **gestión propia** (sin Nextcloud). La Etapa 2 (evaluación/integración de Nextcloud) queda fuera de alcance y se diseña aparte cuando corresponda.
**Dependencias:** FEAT-067 Fase 4.5 (WOPI host, `WopiFileToken`, discovery de Collabora, chequeo de disponibilidad) — dura. No depende de ninguna otra fase de OmniBI.
**Prioridad:** Media
**Stack:** NestJS · Prisma · PostgreSQL · Protocolo WOPI (con locking) · JWT · Collabora Online (CODE) · React/Refine · Multi-tenant

---

## 1. Rol y Contexto

Eres un ingeniero senior de backend especializado en gestión documental, protocolo WOPI y arquitecturas multi-tenant con control de acceso granular.
Tu tarea es implementar el **Módulo Documentos**: un espacio de trabajo propio dentro de OmniFlow donde cada tenant/usuario puede crear, organizar, compartir y editar documentos de oficina (inicialmente `.xlsx`/`.docx`/`.pptx`/`.odt`/`.ods`), usando Collabora como motor de edición vía WOPI.

**Diferencia clave con Fase 4.5:** Fase 4.5 regeneraba un XLSX transitorio a partir de un reporte de BI — no había archivo persistente ni edición real. Este módulo sí persiste archivos, sí implementa `PutFile`, y agrega un modelo de permisos por usuario. Collabora **sigue sin tener usuarios ni carpetas propias** — todo el concepto de "espacio de trabajo" vive en el modelo de datos de OmniFlow; Collabora solo renderiza y edita el archivo que vos le servís.

Debes respetar estrictamente:
- El aislamiento multi-tenant ya establecido (todo documento y toda carpeta pertenecen a un `tenantId`, sin excepción).
- El patrón WOPI y el `JwtService` ya usados en Fase 4.5 — se extiende, no se reemplaza.
- Diseñar la capa de storage y de permisos **detrás de una interfaz**, de forma que la Etapa 2 (Nextcloud) pueda eventualmente sustituir la implementación de storage sin reescribir el resto del módulo.

---

## 2. Objetivo de la Etapa 1

1. Modelar `Document`, `DocumentFolder` y `DocumentPermission` en Prisma, con aislamiento por `tenantId`.
2. Aprovisionar automáticamente una **carpeta raíz por tenant** (el "espacio de trabajo") en el momento en que ya se crea/activa el tenant en OmniFlow — sin ningún paso manual ni llamada a un sistema externo.
3. Extender el WOPI host de Fase 4.5 para soportar `PutFile` real (persistencia) y **locking** (obligatorio en WOPI para edición concurrente segura).
4. Implementar un modelo de permisos simple: `OWNER`, `EDIT`, `VIEW`, a nivel de documento y de carpeta (heredable).
5. Exponer endpoints CRUD de documentos/carpetas y de gestión de permisos, consumidos por una UI tipo explorador de archivos en Refine.

---

## 3. Alcance Detallado

### 3.1 Modelo de datos (Prisma)

```prisma
model DocumentFolder {
  id        String   @id @default(uuid())
  tenantId  String
  parentId  String?
  name      String
  isRoot    Boolean  @default(false)   // true solo para la carpeta raíz auto-provisionada del tenant
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  parent    DocumentFolder?  @relation("FolderTree", fields: [parentId], references: [id])
  children  DocumentFolder[] @relation("FolderTree")
  documents Document[]
  permissions DocumentPermission[] @relation("FolderPermissions")

  @@index([tenantId, parentId])
}

model Document {
  id            String   @id @default(uuid())
  tenantId      String
  folderId      String?
  name          String
  mimeType      String
  storageKey    String   // referencia opaca al backend de storage (ver 3.2)
  sizeBytes     Int
  ownerId       String
  lastEditedBy  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  folder        DocumentFolder? @relation(fields: [folderId], references: [id])
  permissions   DocumentPermission[] @relation("DocumentPermissions")

  @@index([tenantId, folderId])
}

enum PermissionLevel {
  VIEW
  EDIT
  OWNER
}

model DocumentPermission {
  id         String           @id @default(uuid())
  tenantId   String
  userId     String
  level      PermissionLevel
  documentId String?
  folderId   String?
  grantedBy  String
  grantedAt  DateTime @default(now())

  document   Document?        @relation("DocumentPermissions", fields: [documentId], references: [id])
  folder     DocumentFolder?  @relation("FolderPermissions", fields: [folderId], references: [id])

  @@index([tenantId, userId])
  @@index([documentId])
  @@index([folderId])
}
```

> **Regla de resolución de permisos:** un permiso a nivel de `Document` siempre gana sobre uno heredado de `DocumentFolder`. Si un documento no tiene permiso explícito para el usuario, se resuelve subiendo por la cadena de carpetas (`parentId`) hasta encontrar uno, o hasta la raíz (donde el `OWNER` del tenant —definir si es un rol de admin de OmniFlow o el `createdBy` de la raíz— tiene `OWNER` implícito).

### 3.2 Abstracción de storage (obligatoria, pensando en la Etapa 2)

Definir una interfaz, no acoplar el código a un backend de storage concreto:

```typescript
interface DocumentStorageAdapter {
  write(tenantId: string, storageKey: string, buffer: Buffer): Promise<void>;
  read(tenantId: string, storageKey: string): Promise<Buffer>;
  delete(tenantId: string, storageKey: string): Promise<void>;
}
```

- Implementación inicial: filesystem local (`/var/omniflow-documents/{tenantId}/{storageKey}`) o S3-compatible (si OmniFlow ya usa uno en otro módulo — reutilizarlo). Definir cuál según lo que ya exista en el proyecto; documentar la decisión.
- **Por qué la interfaz importa para la Etapa 2:** si en el futuro se decide delegar el storage a Nextcloud, el adaptador cambia de implementación (llamando a la API de Nextcloud en vez de al filesystem/S3) sin tocar el modelo de datos, los endpoints ni la lógica de permisos de OmniFlow.

### 3.3 Aprovisionamiento automático del workspace

Al crear/activar un tenant (hook en el servicio de tenants existente de OmniFlow — no crear un mecanismo paralelo):

1. Crear una `DocumentFolder` con `isRoot: true` para ese `tenantId`.
2. No se crea nada en Collabora — no hay nada que crear ahí. El "espacio de trabajo" es exclusivamente esta carpeta raíz en la base de datos de OmniFlow.
3. Opcional: al crear un usuario dentro del tenant, no requiere aprovisionamiento propio — sus permisos se resuelven dinámicamente (sección 3.1) contra la carpeta raíz u otras que le compartan.

### 3.4 WOPI host extendido — `PutFile` y locking

**`PutFile` (nuevo en este módulo):**

```
POST /wopi/files/{fileId}/contents
```

1. Validar el lock activo (ver abajo) — WOPI exige que Collabora incluya el header `X-WOPI-Lock` con el valor que la app le dio previamente al bloquear el archivo; si no coincide con el lock guardado, responder `409 Conflict`.
2. Validar permiso `EDIT` u `OWNER` del usuario del token sobre el documento (no alcanza con `VIEW`).
3. Escribir el nuevo contenido vía `DocumentStorageAdapter.write(...)`.
4. Actualizar `sizeBytes`, `updatedAt`, `lastEditedBy` en el registro `Document`.

**Locking (obligatorio para edición — no aplicaba en Fase 4.5 por ser solo lectura):**

```
POST /wopi/files/{fileId} con header X-WOPI-Override: LOCK      → Lock
POST /wopi/files/{fileId} con header X-WOPI-Override: UNLOCK    → Unlock
POST /wopi/files/{fileId} con header X-WOPI-Override: REFRESH_LOCK → RefreshLock
```

- Guardar el lock activo (valor opaco que manda Collabora + expiración) en Redis, clave `wopi:lock:{documentId}`, TTL acorde al que exige la especificación WOPI (~30 min, se refresca mientras el documento sigue abierto).
- Mientras existe un lock activo de otro usuario, cualquier intento de `PutFile` o de tomar un lock nuevo debe responder `409 Conflict` con el lock actual en `X-WOPI-Lock` (así lo exige el protocolo).
- Esto es lo que evita que dos usuarios pisen la edición del otro — es la pieza que Fase 4.5 no necesitaba por ser read-only y que acá es obligatoria.

**`CheckFileInfo` actualizado:**

- `UserCanWrite` ahora se calcula de verdad, resolviendo el permiso del usuario (sección 3.1) — ya no es `false` fijo como en Fase 4.5.
- Si el usuario solo tiene `VIEW`, se comporta igual que Fase 4.5 (solo lectura, sin locking).

### 3.5 Endpoints de gestión (fuera del protocolo WOPI, consumidos por el frontend)

```
POST   /documents/folders                     → crear carpeta
GET    /documents/folders/:id                  → listar contenido (subcarpetas + documentos)
POST   /documents                              → subir/crear documento (nombre, carpeta destino, archivo inicial opcional o plantilla vacía)
DELETE /documents/:id                          → eliminar (soft-delete recomendado)
POST   /documents/:id/permissions               → otorgar/editar permiso a un usuario
DELETE /documents/:id/permissions/:userId       → revocar permiso
POST   /documents/:id/viewer-session             → igual patrón que Fase 4.5, pero sobre un documento persistente real
```

Todos filtrados por `tenantId` del usuario autenticado, y todos verificando el permiso correspondiente antes de actuar (ej. borrar requiere `OWNER`, compartir requiere `OWNER`, editar contenido requiere `EDIT` u `OWNER`).

### 3.6 Frontend — explorador de archivos

Vista tipo árbol de carpetas + listado (similar a un gestor de archivos simple), reutilizando el patrón de modal/iframe de Fase 4.5 para abrir un documento (ahora con `UserCanWrite` real según el permiso).

- Acción "Compartir" sobre un documento/carpeta → modal simple para buscar usuario del tenant y asignar `VIEW`/`EDIT`.
- Indicador visual de bloqueado-por-otro-usuario si el `GET /documents/folders/:id` devuelve que el documento tiene lock activo (se puede exponer `lockedBy` en la respuesta consultando Redis).

---

## 4. Restricciones Técnicas Inviolables

1. **Aislamiento multi-tenant estricto** en `Document`, `DocumentFolder` y `DocumentPermission` — ninguna consulta sin filtro `tenantId`.
2. **Locking WOPI obligatorio** para cualquier documento con `UserCanWrite: true` — no aceptar `PutFile` sin lock válido.
3. **Storage detrás de la interfaz `DocumentStorageAdapter`** — ningún servicio de negocio llama directo al filesystem/S3.
4. **No crear cuentas ni "espacios" dentro de Collabora** — Collabora sigue siendo stateless; todo el modelo de usuarios/permisos vive en OmniFlow.
5. **No implementar todavía** integración con Nextcloud (Etapa 2), versionado histórico de documentos, ni compartir por link público — quedan fuera de esta etapa.
6. Reutilizar el `WopiFileToken`/`JwtService` ya definidos en Fase 4.5; no crear un segundo mecanismo de tokens.

---

## 5. Entregables Esperados

1. Migraciones Prisma de `Document`, `DocumentFolder`, `DocumentPermission`.
2. `DocumentStorageAdapter` con implementación inicial (filesystem o S3, según lo que decida el equipo).
3. Hook de aprovisionamiento de carpeta raíz al crear/activar un tenant.
4. WOPI host extendido: `PutFile`, `Lock`/`Unlock`/`RefreshLock`, `CheckFileInfo` con permisos reales.
5. Endpoints CRUD de carpetas/documentos/permisos (sección 3.5).
6. Frontend: explorador de archivos + modal de compartir + reutilización del visor de Fase 4.5 con edición habilitada.
7. Tests:
   - Un usuario con `VIEW` no puede editar (`PutFile` devuelve 403 o `UserCanWrite: false` impide siquiera intentarlo desde el cliente).
   - Dos intentos de `PutFile` sin lock válido de por medio → el segundo recibe `409`.
   - Permisos heredados de carpeta funcionan correctamente cuando el documento no tiene uno explícito.
   - Un usuario de un tenant no puede ver ni acceder a documentos/carpetas de otro tenant, ni siquiera conociendo un `documentId` válido de otro tenant.
   - La carpeta raíz se crea automáticamente al aprovisionar un tenant nuevo.
8. Documentación del modelo de permisos y de cómo se resuelve la herencia.

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] Un tenant nuevo tiene su carpeta raíz sin intervención manual.
- [ ] Un usuario con permiso `EDIT` puede editar un documento en Collabora y los cambios persisten.
- [ ] Un usuario con permiso `VIEW` solo puede visualizar, igual que en Fase 4.5.
- [ ] Dos usuarios no pueden pisarse la edición del mismo documento (locking funcionando).
- [ ] Los permisos se pueden otorgar/revocar por documento y por carpeta, con herencia correcta.
- [ ] Aislamiento multi-tenant verificado con tests explícitos.
- [ ] El storage está detrás de la interfaz `DocumentStorageAdapter` — ningún otro módulo accede al filesystem/S3 directamente.
- [ ] `npm run build` (backend y frontend) pasa.
- [ ] Tests pasan.
- [ ] Fase 4.5 (visor de reportes BI) sigue funcionando sin cambios — este módulo la extiende, no la reemplaza.

---

## 7. Fuera de Alcance (explícito — Etapa 1)

- Integración con Nextcloud (Etapa 2 — se diseña aparte cuando se decida encarar).
- Versionado histórico de documentos (guardar revisiones anteriores).
- Compartir por link público o con usuarios fuera del tenant.
- Papelera de reciclaje / recuperación de eliminados más allá de un soft-delete simple.
- Búsqueda de contenido dentro de los documentos (full-text search).
- Sincronización de escritorio/móvil (eso es justamente lo que Nextcloud resolvería en la Etapa 2).

---

## 8. Orden de Trabajo Recomendado

1. Definir dónde vive el storage (filesystem local vs. S3 ya usado en otro módulo de OmniFlow) y escribir `DocumentStorageAdapter`.
2. Migraciones Prisma de los tres modelos nuevos.
3. Hook de aprovisionamiento de carpeta raíz por tenant.
4. Extender el WOPI host de Fase 4.5: `PutFile` + locking (`Lock`/`Unlock`/`RefreshLock`) + `CheckFileInfo` con permisos reales.
5. Endpoints CRUD de carpetas/documentos/permisos.
6. Lógica de resolución de permisos con herencia.
7. Frontend: explorador de archivos + compartir + visor con edición.
8. Tests de aislamiento, permisos y locking.
9. Documentar.

---

## 9. Referencias

- Prompt Fase 4.5: `PROMPT_BI_FASE_4_5_COLLABORA_VIEWER.md` (WOPI host base, `WopiFileToken`, discovery, chequeo de disponibilidad — todo se reutiliza acá)
- Despliegue de Collabora: `/srv/collabora/README.md`
- Especificación de locking WOPI: sección "Locks" de la spec WOPI de Microsoft (mismo protocolo que implementa Collabora)

---

## 10. Instrucción final

Implementa únicamente la Etapa 1 (gestión propia, sin Nextcloud) descrita en este prompt.
Prioriza el aislamiento multi-tenant, el locking correcto para evitar pérdida de ediciones concurrentes, y mantener el storage detrás de una interfaz que no comprometa una futura migración a Nextcloud.
Al terminar, reporta: 1) modelo de datos final, 2) cómo se resuelve la herencia de permisos, 3) resultado de los tests de locking y aislamiento multi-tenant, 4) decisión tomada sobre el backend de storage.
