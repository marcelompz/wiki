# Changelog — QMSS (ISO 9001 Quality Management Suite)

Todos los cambios notables en este proyecto se documentan en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.10.0] - 2026-09-22

### Agregado
- **Exportación a PDF desde el editor BPMN** (`handleExportPdf` en `BpmnEditor.tsx`).
- **Historial de cambios de diagramas BPMN** con registro de `bpmnVersionHistory` y detección de modificaciones por contenido/hash.
- **Soporte de drag & drop** para archivos `.bpmn`/`.xml` en el editor BPMN.
- **Indicadores de cambio** en el modal de documento cuando el diagrama fue editado o regenerado.

### Corregido
- Ajustes menores en sincronización Local-First de `bpmnXml` y manejo de errores en importación.

---

## [1.9.0] - 2026-09-22

### Agregado
- **Generador IA de Diagramas BPMN 2.0 (ISO 9001 §7.5)**:
  - Nuevo módulo de generación automática de flujogramas a partir del texto de procedimientos e instructivos.
  - Componente `BpmnEditor.tsx` (wrapper React de `bpmn-js`) con edición visual, arrastrar nodos y guardado.
  - Servicio `bpmnGenerator.ts` con inferencia IA multi-proveedor (Gemini / OpenAI / Ollama), validación de esquema BPMN, conversión a XML y layout determinista (`bpmn-auto-layout`).
  - Tipos BPMN dedicados en `src/types/bpmn.ts` (lanes, nodos, aristas, aprobaciones).
  - Botón "Generar Flujograma con IA" integrado en `DocumentDetailModal.tsx` para borradores y versiones vigentes.
  - Sellado criptográfico SHA-256 de diagramas y registro de aprobación con PIN (QUALITY_MANAGER / SUPER_ADMIN).
  - Campo opcional `bpmnXml` en `DocumentVersion` y métodos de persistencia Local-First en `QmsStorage`.
  - Sistema de configuración `QmsSettingsService` para parámetros de IA configurables desde el panel admin.
  - Panel `SettingsPanel.tsx` para seleccionar proveedor de IA y configurar API keys / modelos / base URLs.
  - Abstracción multi-proveedor `src/services/ai/*` con implementaciones para Gemini, OpenAI-compatible y Ollama local.
  - Code-splitting en Vite para `bpmn-js`, `bpmn-auto-layout` y `@google/genai`, reduciendo el bundle principal de ~1.58MB a ~985KB.
  - Toolbar en `BpmnEditor.tsx` con zoom, ajuste de vista, importación y guardado de diagramas BPMN.
  - Importación de archivos BPMN/XML existentes desde el modal de flujograma.
  - Validación estricta de XML BPMN 2.0 post-generación (`validateBpmnXml`).
  - Validación de configuración de proveedor en factory (`createAiProvider`).
  - Exportación de diagramas BPMN a SVG y PNG desde el editor.
  - Sincronización Local-First de `bpmnXml` mediante `QmsLocalFirstService` / CouchDB.
  - Pruebas unitarias básicas con Jest para validadores BPMN, factory de IA y settings.

### Corregido
- **Typo en nombre de archivo de plan**: renombrado a `plan_de_integracion_bpmn_ia.md`.
- **API key de Gemini**: ya no se exige variable de entorno exclusiva; se configura desde el panel del sistema.

---

## [1.8.1] - 2026-09-15

### Agregado
- **Soporte Formal para el Rol `STAKEHOLDER` (ISO 9001 §4.2 Parte Interesada)**:
  - Adición del rol explícito `STAKEHOLDER` en `types/qms.ts` para clientes, proveedores, auditores externos y partes interesadas.
  - Integración del rol con distintivo visual cian (`bg-cyan-100 text-cyan-800`) en el panel de usuarios `UserManager.tsx` y opciones de filtrado.

---

## [1.8.0] - 2026-09-15

### Agregado
- **Panel de Gestión de Usuarios (CRUD Admin General)**:
  - Creación del componente `UserManager.tsx` en la sub-pestaña `Gestión de Usuarios` del Panel Calidad (Admin).
  - Funcionalidad completa de Alta, Edición, Búsqueda, Filtrado por Rol y Eliminación de usuarios con validación de formularios y modal de confirmación.
  - Gestión y visualización de la clave PIN de 4 dígitos para Kiosco de Planta y autenticación OrderFlow SSO.
  - Sincronización asincrónica de mutaciones de usuario hacia PouchDB / CouchDB (`qmsLocalFirst`).

---

## [1.7.1] - 2026-09-15

### Corregido
- **Falta de Desestructuración de `onLogout` en Header**:
  - Corrección de la firma del componente `Header.tsx` añadiendo `onLogout` al objeto de propiedades desestructuradas, solucionando el `Uncaught ReferenceError: onLogout is not defined` en consola.
  - Corrección de tipos TypeScript (`INTERNAL_AUDITOR` en `storage.ts` y firma de `signOutGoogle` en `GoogleDriveModal.tsx`).

---

## [1.7.0] - 2026-09-15

### Agregado
- **Archivo de Control de Versionado (`VERSION`)**:
  - Incorporación del archivo `VERSION` en la raíz del proyecto alineado con SemVer (`1.7.0`).
  - Actualización del nombre del paquete a `"qmssuite"` y sincronización de versión en `package.json`.
  - Enrutamiento y directivas estandarizadas en `AGENTS.md` obligando el mantenimiento del archivo `VERSION` en releases de agentes.
- **Migración de Usuarios Oficiales desde OrderFlow (SSH/PostgreSQL)**:
  - Sustitución de usuarios demo hardcodeados por la lista oficial de cuentas consultadas directamente desde la base de datos PostgreSQL de OrderFlow en `dimoraserverlocal`.

---

## [1.6.0] - 2026-09-15

### Agregado
- **Arquitectura Local-First PouchDB / CouchDB (Modelo Axon Ecosystem)**:
  - Implementación del servicio unificado de almacenamiento `qmsLocalFirst.ts` basado en PouchDB (IndexedDB local en navegador) con réplica bidireccional continua hacia la instancia `qms-couchdb` en puerto `5985`.
  - Persistencia distribuida sin pérdida de datos en contingencias de red para la Lista Maestra Documental ISO 9001:2015 (§7.5) y ejecuciones de inspección en el Kiosco de Planta.
  - Indicador visual de estado de sincronización Local-First en tiempo real incorporado al `Header.tsx` principal.
- **Desacoplamiento Completo de Firebase & Adopción de GIS Nativo**:
  - Eliminación total del paquete `firebase` y desmantelamiento de `firebaseAuth.ts` y `firebase-applet-config.json`.
  - Implementación del cliente ligero `googleAuthNative.ts` basado en Google Identity Services (`https://accounts.google.com/gsi/client`) para la conexión OAuth con Google Drive sin librerías de terceros.
- **Estandarización Traefik v3 & Prohibición Estricta de Nginx**:
  - Eliminación completa de Nginx y archivo `nginx.conf`.
  - Migración del `Dockerfile` a servidor estático ultraligero de Node (`serve`) escuchando en el puerto `3000`.
  - Creación de la política obligatoria para agentes de IA `AGENTS.md` prohibiendo taxativamente Nginx y estableciendo Traefik v3 como el único Edge Router del ecosistema.

---

## [1.5.0] - 2026-09-13

### Agregado
- **Identidad Corporativa Oficial QMSS**:
  - Incorporación de imagotipo vectorial oficial `logo_qmss.svg` y versiones rasterizadas de alta fidelidad `logo_qmss.png`.
  - Creación del isotipo circular `icon_qmss.svg` y `icon_qmss.png` con anillo industrial y checkmark de control de calidad.
  - Implementación de `favicon.ico` y `favicon.svg` multiplataforma vinculados en `<head>` de `index.html`.
  - Directorio oficial de activos de marca `/public/brand/` y `/public/assets/branding/`.
- **Estructura Integral de Documentación (`/docs/`)**:
  - Manuales de Usuario detallados para Lista Maestra (§7.5), Kiosco PWA Offline, Inspector Móvil Expo, Terminal Fija Tauri Rust, Recetario & Mermas y Respaldos en Google Drive.
  - Guías especializadas de resolución de problemas (`/docs/troubleshooting/`): comunicación serial RS-232, buffers térmicos ZPL, sincronización PWA IndexedDB y permisos OAuth Google Drive.
- **Centro de Documentación y Soporte en la Aplicación**:
  - Navegador interactivo de manuales técnicos, guías de contingencia y matriz de funcionalidades dentro de la vista de documentación.

---

## [1.4.0] - 2026-09-12

### Agregado
- **Módulo de Respaldo Híbrido en la Nube con Google Drive**:
  - Integración de OAuth 2.0 con alcance de mínimo privilegio estricto (`https://www.googleapis.com/auth/drive.file`).
  - Gestión segura de tokens en memoria volátil sin persistencia insegura en almacenamiento local.
  - Generación en caliente de volcados comprimidos JSON y SQL (PostgreSQL pg_dump compatible).
  - Explorador y gestor de copias de seguridad remotas en Google Drive con hash SHA-256 de verificación.
- **Topología de Contenedores e Infraestructura**:
  - Archivo `docker-compose.yml` multi-servicio con Traefik v3 Edge Router, PostgreSQL 16 con WAL, MinIO S3 y Backup Runner.
  - Soporte de destinos de respaldo adicionales: AWS S3, NAS NFS institucional y SFTP externo.

---

## [1.3.0] - 2026-09-11

### Agregado
- **Motor de Recetario y Escalado de Mermas**:
  - Soporte para fórmulas maestras de manufactura de alimentos y procesos químicos.
  - Escalado dinámico en tiempo real según el rendimiento de lote deseado (*Batch Yield*).
  - Algoritmo de compensación técnica de merma porcentual para cálculo exacto de masa bruta a dosificar.
  - Definición y control de Puntos Críticos de Control (PCC / HACCP / ISO 22000) con límites de temperatura y tiempo.

---

## [1.2.0] - 2026-09-10

### Agregado
- **Ecosistema Multi-Terminal Desacoplado**:
  - **Kiosco de Planta (PWA)**: Interfaz táctil de alto contraste, tolerancias numéricas y cola offline-first respaldada con identificadores UUIDv7.
  - **Módulo Fast-Switch de Operador**: Teclado numérico táctil en pantalla con validación de PIN de 4 dígitos para cambio ágil de turno.
  - **Inspector Móvil (Expo React Native)**: Escáner de códigos QR de activos, geolocalización GPS satelital y captura de evidencia fotográfica.
  - **Terminal Fija de Estación (Tauri / Rust)**: Modo kiosco a pantalla completa, lectura continua de balanza industrial serie RS-232 (Mettler Toledo SICS) y emisión de etiquetas ZPL RAW a impresoras Zebra ZT411.

---

## [1.1.0] - 2026-09-09

### Agregado
- **Control Documental y Lista Maestra (ISO 9001:2015 §7.5)**:
  - Clasificación por categorías: Políticas, Procedimientos, Instructivos, Recetas y Formatos.
  - Ciclo de vida documental estricto: *Borrador* ➔ *En Revisión* ➔ *Vigente* ➔ *Obsoleto*.
  - Transición atómica irreversible: la aprobación de una nueva versión desactiva automáticamente la versión anterior.
  - Sellado criptográfico SHA-256 inmutable de contenido para no-repudio y auditoría.
- **Estructura Organizacional y Matriz RACI (§5.3)**:
  - Organigrama jerárquico interactivo con descriptores de cargo y competencias obligatorias.
  - Matriz RACI interactiva (Responsible, Accountable, Consulted, Informed) para gobernanza de calidad.
- **Diseñador Dinámico de Checklists de Inspección**:
  - Editor visual de plantillas con secciones, criticidades (*Crítico*, *Mayor*, *Menor*) y ponderaciones numéricas de 1 a 10.

---

## [1.0.0] - 2026-09-08

### Agregado
- **Lanzamiento Inicial**:
  - Arquitectura desacoplada React 18, TypeScript y Tailwind CSS.
  - Almacenamiento desacoplado reactivo en `storage.ts` con persistencia multi-tenant (`planta-01`).
  - Motor criptográfico Web Crypto API nativo para generación de hash SHA-256 y UUIDv7.
