PASO 2: SERVICIO ADAPTADOR DE MENSAJERÍA (NestJS)

Crea la interfaz y adaptadores en backend/src/modules/social-catalog/adapters/:
TypeScript

export interface IMessagingAdapter {
  channel: MessagingChannel;
  generateCheckoutUrl(payload: OrderCheckoutPayload): string;
}

@Injectable()
export class MessagingAdapterResolver {
  private adapters = new Map<MessagingChannel, IMessagingAdapter>();

  constructor(
    private whatsappAdapter: WhatsAppAdapter,
    private telegramAdapter: TelegramAdapter,
    private instagramAdapter: InstagramAdapter,
    private messengerAdapter: MessengerAdapter,
  ) {
    this.registerAdapters();
  }

  private registerAdapters() {
    this.adapters.set(MessagingChannel.WHATSAPP, this.whatsappAdapter);
    this.adapters.set(MessagingChannel.TELEGRAM, this.telegramAdapter);
    this.adapters.set(MessagingChannel.INSTAGRAM, this.instagramAdapter);
    this.adapters.set(MessagingChannel.MESSENGER, this.messengerAdapter);
  }

  getAdapter(channel: MessagingChannel): IMessagingAdapter {
    const adapter = this.adapters.get(channel);
    if (!adapter) throw new BadRequestException(`Canal de mensajería no soportado: ${channel}`);
    return adapter;
  }
}

PASO 3: VISTA DE SELECCIÓN EN FRONTEND (React / Ant Design)

En el modal/drawer de Checkout del cliente final, despliega los botones del canal correspondiente:
TypeScript

<Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
  <Text bold>¿Por dónde deseas enviar tu pedido?</Text>
  {activeChannels.map((config) => (
    <Button
      key={config.channel}
      type="primary"
      block
      size="large"
      icon={getChannelIcon(config.channel)}
      style={{ backgroundColor: getChannelColor(config.channel), borderColor: getChannelColor(config.channel) }}
      onClick={() => handleSubmitOrderAndRedirect(config.channel)}
    >
      Enviar por {getChannelLabel(config.channel)}
    </Button>
  ))}
</Space>

PASO 4: ACTUALIZACIÓN DEL ROADMAP (ROADMAP.md)

Agrega el siguiente bloque dentro de la tabla de módulos de ROADMAP.md:
Markdown

| **Social Commerce Hub (Catálogo Omnicanal)** | ✅ Completo | ✅ Sí | ✅ Sí | Adaptadores dinámicos para checkout en WhatsApp, Instagram DM, Telegram y Messenger. Métricas de conversión por canal. |

Y añade la siguiente entrada en la sección de releases:
Markdown

### 🚀 Release v1.16.0 - Admin UI/UX Overhaul + Social Catalog
- [x] Refactorización del módulo `whatsapp-catalog` a `social-catalog`.
- [x] Implementación de `CatalogChannelConfig` en Prisma ORM.
- [x] Adaptadores de enlaces profundos para WhatsApp (`wa.me`), Telegram (`t.me`), Instagram (`ig.me`) y Messenger (`m.me`).
- [x] Dashboard de analítica en Refine con atribución de ventas por canal de mensajería.

🔒 REGLAS STRICTAS DE INGENIERÍA

    Compatibilidad Hacia Atrás: Si un tenant solo tiene configurado phoneNumber (WhatsApp legacy), el sistema debe actuar por defecto en modo mono-canal WhatsApp sin romper la UX actual.

    Multi-Tenancy Obligatorio: Toda consulta a CatalogChannelConfig debe filtrar obligatoriamente por el tenantId contextual o utilizar @TenantPrisma().

    No romper builds: Verificar paso a paso ejecutando npm run build en backend y frontend.
