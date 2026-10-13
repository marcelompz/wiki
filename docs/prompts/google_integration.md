# PROMPT DE ARQUITECTURA E IMPLEMENTACIÓN: INTEGRACIÓN DE GOOGLE EN ORDERFLOW

Actúa como Tech Lead y Desarrollador Full-Stack Senior especializado en NestJS, PostgreSQL, Redis/BullMQ, React (Refine.dev) y React Native (Expo). Debes implementar la integración integral del ecosistema de Google en el sistema OrderFlow siguiendo las pautas de arquitectura especificadas.

---

### OBJETIVOS DE IMPLEMENTACIÓN

#### 1. Autenticación con Google (Web + App Móvil)
- **Backend (NestJS):**
  - [cite_start]Crear el endpoint `POST /api/v1/auth/google`[cite: 198].
  - [cite_start]Verificar el token de Google (`id_token`) mediante la librería `google-auth-library`[cite: 198].
  - [cite_start]Consultar o registrar al usuario en PostgreSQL[cite: 199]. [cite_start]Si no existe, crearlo y sincronizarlo como contacto (`res.partner`) en Odoo[cite: 199].
  - [cite_start]Retornar el par de tokens JWT (Access Token y Refresh Token) propios de OrderFlow[cite: 200].
- **Web SPA (React / Refine.dev):**
  - [cite_start]Implementar Google One Tap / Identity Services (GIS) mediante SDK oficial[cite: 196, 197].
- **App Móvil (Expo / React Native):**
  - [cite_start]Integrar `@react-native-google-signin/google-signin` (o `expo-auth-session`) para autenticación nativa[cite: 201, 202].

#### 2. Sincronización Bidireccional de Calendario (OrderFlow Bookings ↔ Google Calendar)
- **OrderFlow ➔ Google Calendar:**
  - [cite_start]Al confirmarse un turno (bot de WhatsApp, App o Web), emitir un evento a la cola Redis impulsada por BullMQ[cite: 184].
  - [cite_start]Crear un worker que procese la tarea ejecutando `events.insert` mediante `googleapis`.
  - [cite_start]Si la cita requiere videollamada, incluir `conferenceDataVersion: 1` para generar el enlace automático de Google Meet[cite: 186].
  - [cite_start]Añadir el correo del cliente en `attendees` agregando la bandera `sendUpdates: 'all'`[cite: 187].
- **Google Calendar ➔ OrderFlow (Webhooks):**
  - [cite_start]Configurar suscripciones mediante `events.watch` hacia el endpoint de Webhooks de NestJS (`POST /api/v1/webhooks/google-calendar`)[cite: 188, 189].
  - [cite_start]Procesar las modificaciones o nuevos eventos personales del profesional para bloquear automáticamente su disponibilidad en el motor de agendamiento[cite: 189, 190].

#### 3. Autocompletado de Datos y Direcciones
- [cite_start]**Ubicación/Direcciones:** Implementar componentes de autocompletado con Google Places API (`<GooglePlacesAutocomplete />`) en la web (Refine) y app móvil (Expo) para autocompletar calles y capturar `latitude` y `longitude`[cite: 191, 192, 193].
- [cite_start]**Formularios Estándar:** Configurar atributos nativos de autocompletado en inputs HTML y campos de React/Expo (`autocomplete="name"`, `email`, `tel`, `street-address`)[cite: 194].

#### 4. Integraciones Adicionales
- [cite_start]Prever la arquitectura modular para conectar Google Cloud Speech-to-Text API en el webhook de WhatsApp Cloud API (transcripción de audios a texto) [cite: 209, 210] [cite_start]y Google Maps Distance Matrix API (cálculo de distancias y costos de delivery)[cite: 211, 212].

---

### REQUISITOS TÉCNICOS
- Código limpio, fuertemente tipado en TypeScript.
- Manejo centralizado de errores e inyección de variables de entorno (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_SERVICE_ACCOUNT_KEY`).
- Inserción de logs claros y manejo resiliente de reintentos en las colas de BullMQ.