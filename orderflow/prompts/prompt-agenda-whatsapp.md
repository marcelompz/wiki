Este es el prompt maestro de ingeniería de software listo para producción. Está diseñado con un nivel de especificación técnica tan estricto que tus agentes de IA (como Cursor, Claude Engineer o Copilot) o tu equipo de desarrollo podrán generar el código base completo de la extensión sin ambigüedades, respetando la arquitectura API-First, Multi-Tenant y Event-Driven consolidada en el repositorio principal de OrderFlow.
Prompt Maestro de Desarrollo: Módulo Conversacional de WhatsApp para OrderFlow
🤖 Rol y Contexto del Sistema
Actúa como un Arquitecto de Software Full-Stack y Desarrollador Principal Senior experto en el ecosistema TypeScript, NestJS, Prisma ORM, Redis (BullMQ) y arquitecturas distribuidas multi-tenant.
Vas a implementar la extensión OrderFlow WhatsApp Automation dentro del monorepo actual de NestJS. El sistema debe operar de forma agnóstica y desacoplada. Toda la lógica de negocio debe correr dentro de la infraestructura existente de NestJS + Redis, descartando el uso de un stack secundario en Python/FastAPI para evitar la fragmentación de código, duplicación de tipos (Typescript vs Pydantic) e ineficiencias de comunicación entre servidores.
🏗️ 1. Arquitectura de Datos (Prisma Schema)
Extiende el archivo schema.prisma actual para dar soporte multi-tenant nativo al flujo de WhatsApp Cloud API, guardando el estado de las conversaciones y la configuración de plantillas por cada Tenant.
enum WhatsappSessionState {
  IDLE
  AWAITING_MENU_SELECTION
  AWAITING_RESCHEDULE_DATE
  AWAITING_RESCHEDULE_TIME
  TALKING_TO_AGENT
}

model WhatsappConfig {
  id              String   @id @default(uuid()) @db.Uuid
  tenantId        String   @unique @map("tenant_id") @db.Uuid
  phoneNumberId   String   @unique @map("phone_number_id") // Meta Cloud API Phone ID
  wabaId          String   @map("waba_id")                 // WhatsApp Business Account ID
  accessToken     String   @map("access_token")            // Permanent System User Token
  verifyToken     String   @map("verify_token")            // Webhook Verification Token
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([phoneNumberId])
  @@map("whatsapp_configs")
}

model WhatsappSession {
  id              String               @id @default(uuid()) @db.Uuid
  tenantId        String               @map("tenant_id") @db.Uuid
  customerPhone   String               @map("customer_phone") // Formato internacional (E.164)
  currentState    WhatsappSessionState @default(IDLE) @map("current_state")
  contextPayload  Json?                @map("context_payload") // Para guardar paso actual (ej: serviceId seleccionado)
  updatedAt       DateTime             @updatedAt @map("updated_at")

  tenant          Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, customerPhone])
  @@index([customerPhone])
  @@map("whatsapp_sessions")
}


⚡ 2. Pasarela Inbound (Webhooks OMT)
El controlador del webhook debe procesar los mensajes entrantes enviados por los servidores de Meta a la velocidad de la luz.
Endpoint de Verificación (GET): /api/v1/whatsapp/webhook -> Debe validar el hub.verify_token contra el token configurado en la base de datos para el tenant correspondiente.
Endpoint de Recepción (POST): /api/v1/whatsapp/webhook
Latencia Crítica (<10ms): El controlador no debe procesar la lógica conversacional de forma síncrona. Al recibir el payload de Meta, debe realizar una firma de validación criptográfica rápida (X-Hub-Signature-256), extraer el número de teléfono del cliente y el phoneNumberId origen.
Encolamiento asíncrono: Inyecta de inmediato el payload crudo dentro de una cola de BullMQ basada en Redis (whatsapp-inbound-queue).
Respuesta inmediata: Retorna inmediatamente un HTTP Status 200 OK a Meta para evitar retries o bloqueos del webhook.
🧠 3. Motor Conversacional y Máquina de Estados (Worker Layer)
Desarrollar el procesador de la cola (WhatsappInboundWorker) utilizando BullMQ. Al procesar un trabajo (job), el sistema debe realizar el siguiente algoritmo de resolución:
A. Resolución del Contexto Tenant y Cliente
Buscar la correspondencia de phoneNumberId en WhatsappConfig para inyectar el tenantId correcto en el contexto de la ejecución.
Validar la existencia del cliente utilizando su número de teléfono internacional en la tabla Customer.
Si el cliente no existe, disparar un sub-flujo interactivo solicitando su Documento de Identidad (Cédula o RUC) y Nombre Completo para registrarlo en caliente dentro de la base de datos local de OrderFlow antes de procesar cualquier cita o pedido.
B. Máquina de Estados Conversacional
Implementar la lógica para leer y transicionar el estado de WhatsappSession según las respuestas interactivas recibidas (botones, listas de opciones o texto de Meta Cloud API):
// Transiciones lógicas del ciclo de vida conversacional
switch (session.currentState) {
  case WhatsappSessionState.IDLE:
    // Al recibir un "Hola", enviar Menú Interactivo Principal de Meta (List Messages o Reply Buttons)
    // Opciones: 1. Reservar, 2. Cambiar Cita, 3. Cancelar, 4. Hablar con asesor
    break;

  case WhatsappSessionState.AWAITING_MENU_SELECTION:
    // Si elige 1 (Reservar): Mutar a flujo de selección de servicio.
    // Si responde a un Recordatorio de Cita Activa (Enviado automáticamente 24hs antes por un CronJob):
    //   Opción ✅ 1 (Confirmar) -> Actualizar Order a 'confirmed'.
    //   Opción ❌ 2 (Cancelar)  -> Actualizar Order a 'cancelled'.
    //   Opción 📅 3 (Reagendar) -> Mutar estado a AWAITING_RESCHEDULE_DATE.
    break;

  case WhatsappSessionState.AWAITING_RESCHEDULE_DATE:
    // El bot consume internamente el BookingAvailabilityService de OrderFlow.
    // Muestra los días disponibles usando formato de botones interactivos de Meta Cloud API.
    break;

  case WhatsappSessionState.AWAITING_RESCHEDULE_TIME:
    // Presenta las franjas horarias libres calculadas bajo el principio de DOBLE RESTRICCIÓN en tiempo real:
    // Cruzando disponibilidad del Profesional (hr.employee) AND el Espacio Físico (Workspace/Cabina).
    break;
}


🔌 4. Integración de Salida Desacoplada (Event-Driven Synchronization)
Bajo la filosofía rígida de OrderFlow, el core conversacional no debe acoplarse con dependencias directas de Odoo ni de APIs de terceros.
Mutación del Core Local: Cuando el cliente confirma o cancela un turno interactuando por WhatsApp, el servicio debe actualizar el estado de la entidad Order / AppointmentAssignment en la base de datos PostgreSQL local.
Disparo de Eventos del Sistema: Tras la actualización local, el servicio debe emitir un evento interno asíncrono utilizando el EventEmitter2 de NestJS (ej: order.status.changed).
Consumo de Adaptadores de Salida (Event Listeners):
WebSocket Gateway: Notifica de forma inmediata y con cero lag al Punto de Venta Desktop (Tauri) y al monitor de cabina/cocina (KDS) para mover el semáforo de criticidad visual en los locales físicos.
Odoo Output Adapter: Intercepta el evento de cambio de estado y ejecuta un llamado asíncrono vía JSON-RPC/REST hacia Odoo v19. Sincroniza en caliente el modelo de contactos (res.partner), bloquea o libera la agenda institucional del ERP (calendar.event) y prepara el presupuesto o sesión suspendida en el Punto de Venta contable de Odoo (sale.order).
FacturaSend Adapter (Si aplica): En caso de finalizar el servicio y procesarse el cobro, el adaptador paraguayo toma los datos fiscales (tax_id) y calcula los impuestos diferenciados (IVA 10% / 5%) para inyectar la factura legal aprobada por SIFEN al cliente.
💻 5. Estructura de Código Sugerida (NestJS Module Blueprint)
Genera la implementación limpia de los archivos estructurantes del módulo:
A. Controlador de Entrada del Webhook
import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus, Headers, Req } from '@nestjs/common';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('v1/whatsapp')
export class WhatsappWebhookController {
  constructor(private readonly whatsappService: WhatsappWebhookService) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.whatsappService.validateSubscription(mode, token, challenge);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleInboundPayload(
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    // Validar firma de Meta de forma asíncrona y empujar a BullMQ inmediatamente
    await this.whatsappService.enqueueInboundMessage(payload, signature);
    return { success: true };
  }
}


B. Interfaz del Payload de la Cola (BullMQ Context)
export interface IWhatsappInboundJob {
  tenantId: string;
  customerPhone: string;
  messageType: 'text' | 'interactive' | 'button_reply';
  payload: {
    textId?: string;
    body?: string;
    selectionId?: string; // ID de botón o menú interactivo seleccionado
  };
  rawMetaPayload: any;
}


Proceda a generar todo el código de infraestructura, servicios del webhook, lógica de validación de firma criptográfica SHA256 de Meta, y el worker conversacional de BullMQ que maneje estas transiciones de estado de forma atómica y multi-tenant.
