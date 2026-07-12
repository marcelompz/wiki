# 🧠 Axon Ecosystem - Documentación Técnica

> **Plataforma de planificación estratégica corporativa, colaboración en tiempo real y arquitectura Local-First**

**Estado:** 🔄 En desarrollo  
**Versión:** 2.1.0 (MVP)  
**Última actualización:** 2026-07-06  
**Autor:** marcelompz  
**Email:** marcelo@pesallaccia.com

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Componentes](#componentes)
4. [Base de Datos](#base-de-datos)
5. [Local-First & Sync](#local-first--sync)
6. [AI Integration](#ai-integration)
7. [GDPR & Compliance](#gdpr--compliance)
8. [Deployment](#deployment)

---

## Visión General

**Axon** es una plataforma SaaS B2B enterprise que combina:

1. **Planificación Estratégica:** Balanced Scorecard (BSC), OKRs, Matriz FODA
2. **Colaboración en Tiempo Real:** Editor tipo Notion con sincronización multidispositivo
3. **Arquitectura Local-First:** Funciona offline, sincroniza cuando hay conexión
4. **AI-Powered:** Dictado por voz, análisis de documentos, sugerencias estratégicas

**Casos de Uso:**
- 🏢 **Corporaciones:** Gestión de estrategia corporativa
- 📊 **Consultoras:** Arquitectura de procesos para clientes
- 🎯 **Equipos:** Colaboración en documentos estratégicos
- 📱 **Mobile-first:** Edición desde cualquier dispositivo

---

## Arquitectura

### Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Workspace  │  │   Editor    │  │   Mobile    │     │
│  │  Next.js    │  │  React+Vite │  │ React Native│     │
│  │  (3005)     │  │  (5173)     │  │   (8090)    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │ PouchDB        │ PouchDB        │ PouchDB    │
└─────────┼────────────────┼────────────────┼────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                 Sync Server (CouchDB)                    │
│         - Bidirectional replication                      │
│         - Conflict resolution                            │
│         - Real-time updates                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Services                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Prisma DB  │  │  BullMQ     │  │  AI Engine  │     │
│  │  PostgreSQL │  │  Redis      │  │  (Ollama)   │     │
│  │  + pgvector │  │  Jobs       │  │  Embeddings │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Monorepo Structure

**Administrado con:** Turborepo + pnpm workspaces

```
/opt/axon-ecosystem/
├── apps/
│   ├── workspace/          # Next.js Dashboard (3005)
│   ├── editor/             # React + Vite Editor (5173)
│   └── sync-mobile/        # React Native + Expo (8090)
├── packages/
│   ├── database/           # Prisma ORM + PostgreSQL
│   ├── shared/             # BullMQ Queues + Utils
│   └── ui/                 # Shared UI Components
├── couchdb/                # CouchDB cluster config
└── docker/                 # Docker Compose configs
```

---

## Componentes

### 1. Workspace Dashboard (Next.js)

**Puerto:** `3005`  
**Path:** `apps/workspace/`

**Características:**
- ✅ Gestión de Balanced Scorecards
- ✅ OKRs tracking
- ✅ Matriz FODA
- ✅ Filosofía corporativa (Misión, Visión, Valores)
- ✅ Auditoría y logs
- ✅ Consentimientos GDPR

**Tecnologías:**
- Next.js 14 (App Router)
- Server Actions
- Prisma Client
- Tailwind CSS

### 2. Editor Colaborativo (React + Vite)

**Puerto:** `5173`  
**Path:** `apps/editor/`

**Características:**
- ✅ Editor tipo Notion basado en bloques
- ✅ Menú de comandos (`/` para insertar bloques)
- ✅ Drag-and-drop de bloques
- ✅ Soporte offline (PouchDB local)
- ✅ Sync automático cuando hay conexión

**Tipos de Bloques:**
- Párrafos
- Encabezados (H1, H2, H3)
- Listas (bullets, números)
- Checkboxes/Tareas
- Imágenes
- Tablas
- Código

### 3. Mobile App (React Native + Expo)

**Puerto:** `8090`  
**Path:** `apps/sync-mobile/`

**Características:**
- ✅ Editor colaborativo mobile
- ✅ Dictado por voz (AI-powered)
- ✅ Escaneo de imágenes (cámara)
- ✅ Recordatorios en calendario nativo
- ✅ Sync en tiempo real con CouchDB
- ✅ Offline-first

**Tecnologías:**
- React Native 0.81
- Expo SDK 54
- PouchDB React Native
- Voice-to-text API

---

## Base de Datos

### PostgreSQL Schema (Prisma)

**Path:** `packages/database/prisma/schema.prisma`

#### Áreas Funcionales

| Área | Modelos | Propósito |
|------|---------|-----------|
| **Identidad & Acceso** | `usuarios`, `sesiones`, `participantes` | Autenticación, roles, control de acceso |
| **Estructura Orgánica** | `empresas`, `departamentos`, `filosofia_corporativa` | Modelado de estructura empresarial |
| **FODA / SWOT** | `matriz_foda` | Análisis estratégico |
| **Balanced Scorecard** | `bsc_perspectivas`, `bsc_objetivos_estrategicos` | Control estratégico |
| **OKRs** | `okrs`, `key_results` | Objetivos y resultados clave |
| **Documentos** | `documentos`, `bloques_documento`, `versiones_documento` | Editor colaborativo |
| **AI & NLP** | `ai_embeddings`, `ai_prompts`, `ai_logs` | Vector embeddings, prompts |
| **Auditoría** | `auditoria_logs`, `gdpr_consentimientos` | Compliance y tracking |

#### Modelo de Datos Principal

```prisma
// Usuario corporativo
model Usuario {
  id              String    @id @default(uuid())
  email           String    @unique
  nombre          String
  rol             Rol       @default(USUARIO)
  empresaId       String
  empresa         Empresa   @relation(fields: [empresaId], references: [id])
  sesiones        Sesion[]
  documentos      Documento[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// Documento colaborativo
model Documento {
  id              String    @id @default(uuid())
  titulo          String
  contenido       Json      // Bloques del editor
  usuarioId       String
  usuario         Usuario   @relation(fields: [usuarioId], references: [id])
  versiones       Version[]
  couchdbId       String    @unique // ID para sync con CouchDB
  lastSyncedAt    DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// BSC Objetivo Estratégico
model BSCObjetivo {
  id              String    @id @default(uuid())
  perspectivaId   String
  perspectiva     BSCPerspectiva @relation(fields: [perspectivaId], references: [id])
  descripcion     String
  indicadores     KPI[]
  okrs            OKR[]
  createdAt       DateTime  @default(now())
}
```

### CouchDB Sync Cluster

**Propósito:** Sincronización bidireccional con clientes PouchDB (Web + Mobile)

**Configuración:**
```yaml
# docker-compose.yml
services:
  couchdb:
    image: couchdb:3.3
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=secure-password
    volumes:
      - couchdb_data:/opt/couchdb/data
    ports:
      - "5984:5984"
```

**Replication Pattern:**
```javascript
// Frontend (PouchDB)
const db = new PouchDB('http://localhost:5984/axon_docs');

// Replicate to/from CouchDB
db.replicate.to('http://couchdb:5984/axon_docs', {
  live: true,      // Continuous replication
  retry: true,     // Retry on failure
  batch_size: 100  // Batch size
});
```

---

## Local-First & Sync

### Arquitectura Local-First

**Principios:**
1. **Offline-first:** La app funciona sin conexión
2. **Sync automático:** Sincroniza cuando hay conexión
3. **Conflict resolution:** Resuelve conflictos automáticamente
4. **Optimistic UI:** La UI responde inmediatamente

### Sync Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Mobile    │         │   Editor    │         │  CouchDB    │
│  PouchDB    │◄───────►│  PouchDB    │◄───────►│   Server    │
│  (Local)    │  Sync   │  (Local)    │  Sync   │  (Remote)   │
└─────────────┘         └─────────────┘         └─────────────┘
```

### Conflict Resolution

**Estrategia:** Last-Write-Wins (LWW) con timestamp

```javascript
// PouchDB conflict handler
db.put(doc).catch(err => {
  if (err.status === 409) {
    // Conflict: merge changes
    return db.get(doc._id).then(conflictingDoc => {
      // Merge logic: prefer newer timestamp
      const merged = mergeDocuments(doc, conflictingDoc);
      return db.put(merged);
    });
  }
});
```

---

## AI Integration

### Ollama + pgvector

**Propósito:** Embeddings para búsqueda semántica y análisis de documentos

**Stack:**
- **Ollama:** LLM local (Llama 3, Mistral, etc.)
- **pgvector:** PostgreSQL extension para vectores
- **BullMQ:** Cola de jobs para procesamiento asíncrono

### AI Features

#### 1. Dictado por Voz

```typescript
// Mobile app
const startVoiceDictation = async () => {
  const result = await VoiceToText.transcribe({
    language: 'es-ES',
    model: 'whisper-large'
  });
  
  // Insert transcribed text as block
  insertBlock({ type: 'paragraph', content: result.text });
};
```

#### 2. Análisis de Documentos

```python
# Backend AI service
from langchain import Ollama
from langchain.embeddings import HuggingFaceEmbeddings

ollama = Ollama(model="llama3")
embeddings = HuggingFaceEmbeddings()

def analyze_document(content: str) -> dict:
    """Extract insights from corporate document."""
    prompt = f"""
    Analyze this corporate document and extract:
    1. Key objectives
    2. Strategic priorities
    3. Action items
    
    Document: {content}
    """
    response = ollama.invoke(prompt)
    return parse_response(response)
```

#### 3. Sugerencias Estratégicas

```python
# BSC objective suggestions
def suggest_objectives(foda_matrix: dict) -> list:
    """Generate strategic objectives from SWOT analysis."""
    prompt = f"""
    Given this SWOT matrix:
    Strengths: {foda_matrix['strengths']}
    Weaknesses: {foda_matrix['weaknesses']}
    Opportunities: {foda_matrix['opportunities']}
    Threats: {foda_matrix['threats']}
    
    Suggest 5 strategic objectives for the Balanced Scorecard.
    """
    return ollama.invoke(prompt)
```

---

## GDPR & Compliance

### Consentimientos

**Modelo:** `gdpr_consentimientos`

```prisma
model GDPRConsentimiento {
  id              String    @id @default(uuid())
  usuarioId       String
  usuario         Usuario   @relation(fields: [usuarioId], references: [id])
  tipo            String    // "data_processing", "analytics", "ai_features"
  consentido      Boolean
  version         String    // Version del consentimiento
  ip              String
  userAgent       String
  createdAt       DateTime  @default(now())
}
```

### Right to be Forgotten

**Implementación:** CASCADE DELETE

```prisma
// Prisma schema
model Usuario {
  documentos      Documento[]  @relation(onDelete: Cascade)
  sesiones        Sesion[]     @relation(onDelete: Cascade)
  consentimientos GDPRConsentimiento[] @relation(onDelete: Cascade)
}
```

**Endpoint:**
```typescript
// DELETE /api/user/:id
async function deleteUser(userId: string) {
  // Delete all user data (cascade)
  await prisma.usuario.delete({
    where: { id: userId }
  });
  
  // Delete from CouchDB
  await couchdb.destroy({ id: `user_${userId}` });
  
  return { status: 'deleted' };
}
```

### Auditoría

**Modelo:** `auditoria_logs`

```prisma
model AuditoriaLog {
  id              String    @id @default(uuid())
  usuarioId       String
  accion          String    // "CREATE", "UPDATE", "DELETE"
  entidad         String    // "documento", "bsc_objetivo", etc.
  entidadId       String
  datosAnteriores Json?
  datosNuevos     Json?
  ip              String
  userAgent       String
  createdAt       DateTime  @default(now())
}
```

---

## Deployment

### Docker Compose (Development)

**Path:** `docker-compose.yml`

```yaml
services:
  # PostgreSQL + pgvector
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: axon
      POSTGRES_PASSWORD: secure-password
      POSTGRES_DB: axon
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis for BullMQ
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  # CouchDB for sync
  couchdb:
    image: couchdb:3.3
    environment:
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: secure-password
    volumes:
      - couchdb_data:/opt/couchdb/data

  # Ollama (AI)
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"

  # Workspace (Next.js)
  workspace:
    build:
      context: .
      dockerfile: apps/workspace/Dockerfile
    ports:
      - "3005:3000"
    depends_on:
      - postgres
      - redis

  # Editor (Vite)
  editor:
    build:
      context: .
      dockerfile: apps/editor/Dockerfile
    ports:
      - "5173:5173"
    depends_on:
      - couchdb

  # Sync Server (CouchDB replication)
  sync-server:
    build:
      context: .
      dockerfile: apps/sync-server/Dockerfile
    ports:
      - "8090:8090"
    depends_on:
      - couchdb
      - postgres

volumes:
  postgres_data:
  redis_data:
  couchdb_data:
  ollama_data:
```

### Production Deployment

**Server:** Hetzner Cloud (shared with other SaaS)  
**Domain:** `axon.pesallaccia.com` (pending)  
**Staging:** `staging.axon.pesallaccia.com` (pending)

**Steps:**
1. Clone repository
2. Copy `.env.production` from template
3. Run `docker compose -f docker-compose.prod.yml up -d`
4. Configure nginx reverse proxy
5. Generate SSL certificate (Let's Encrypt)

---

## 📞 Soporte y Contacto

**Author:** marcelompz  
**Email:** marcelo@pesallaccia.com  
**GitHub:** https://github.com/marcelompz/axon-ecosystem  
**Wiki:** https://marcelompz.github.io/wiki/axon/

---

## 🔄 Changelog

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-07-06 | Documentación inicial creada | marcelompz |
| 2026-07-06 | Agregados patrones de sync Local-First | marcelompz |
| 2026-07-06 | Agregada integración AI (Ollama) | marcelompz |

---

**Próxima revisión:** 2026-10-06 (Quarterly)
