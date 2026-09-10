import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface CreatePosConfigDto {
  name: string;
  code: string;
  isRestaurant?: boolean;
  allowTableSelection?: boolean;
  autoOpenTableScreen?: boolean;
  currency?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  allowDiscounts?: boolean;
  cashControl?: boolean;
}

export interface OpenPosSessionDto {
  configId: string;
  userId: string;
  cashOpeningBalance: number;
  notes?: string;
}

export interface ClosePosSessionDto {
  sessionId: string;
  cashRealBalance: number;
  notes?: string;
}

@Injectable()
export class PosCoreService {
  private readonly logger = new Logger(PosCoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear nueva configuración de Terminal POS
   */
  async createConfig(tenantId: string, dto: CreatePosConfigDto, dbClient?: any) {
    const prisma = dbClient || this.prisma;

    const existing = await prisma.posConfig.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Ya existe una caja registrada con el código "${dto.code}".`);
    }

    return prisma.posConfig.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        isRestaurant: dto.isRestaurant ?? false,
        allowTableSelection: dto.allowTableSelection ?? false,
        autoOpenTableScreen: dto.autoOpenTableScreen ?? false,
        currency: dto.currency || 'PYG',
        receiptHeader: dto.receiptHeader,
        receiptFooter: dto.receiptFooter,
        allowDiscounts: dto.allowDiscounts ?? true,
        cashControl: dto.cashControl ?? true,
      },
    });
  }

  /**
   * Listar todas las terminales registradas para el tenant
   */
  async findAllConfigs(tenantId: string, dbClient?: any) {
    const prisma = dbClient || this.prisma;
    return prisma.posConfig.findMany({
      where: { tenantId, active: true },
      include: {
        floors: {
          include: { tables: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Apertura de Sesión de Caja (pos.session)
   */
  async openSession(tenantId: string, dto: OpenPosSessionDto, dbClient?: any) {
    const prisma = dbClient || this.prisma;

    const config = await prisma.posConfig.findFirst({
      where: { id: dto.configId, tenantId },
    });

    if (!config) {
      throw new NotFoundException('Configuración de caja no encontrada.');
    }

    // Verificar si ya existe una sesión abierta para esta caja
    const activeSession = await prisma.posSession.findFirst({
      where: { tenantId, configId: dto.configId, state: 'OPENED' },
    });

    if (activeSession) {
      throw new BadRequestException(`La caja "${config.name}" ya posee una sesión abierta (ID: ${activeSession.name}).`);
    }

    const count = await prisma.posSession.count({ where: { tenantId } });
    const sessionName = `POS/${new Date().getFullYear()}/${String(count + 1).padStart(4, '0')}`;

    return prisma.posSession.create({
      data: {
        tenantId,
        configId: dto.configId,
        name: sessionName,
        userId: dto.userId,
        state: 'OPENED',
        cashOpeningBalance: dto.cashOpeningBalance,
        notes: dto.notes,
      },
    });
  }

  /**
   * Cierre de Sesión de Caja (Arqueo Z / Arqueo X)
   */
  async closeSession(tenantId: string, dto: ClosePosSessionDto, dbClient?: any) {
    const prisma = dbClient || this.prisma;

    const session = await prisma.posSession.findFirst({
      where: { id: dto.sessionId, tenantId },
    });

    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }

    if (session.state === 'CLOSED') {
      throw new BadRequestException('La sesión de caja ya se encuentra cerrada.');
    }

    // Calcular las ventas realizadas durante la sesión
    const orders = await prisma.order.findMany({
      where: { tenantId, posSessionId: session.id, status: 'CONFIRMED' },
      select: { totalAmount: true },
    });

    const totalSales = orders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);
    const expectedBalance = Number(session.cashOpeningBalance) + totalSales;
    const closingDelta = dto.cashRealBalance - expectedBalance;

    return prisma.posSession.update({
      where: { id: session.id },
      data: {
        state: 'CLOSED',
        stopAt: new Date(),
        cashRealBalance: dto.cashRealBalance,
        cashClosingDelta: closingDelta,
        notes: dto.notes ? `${session.notes || ''}\n${dto.notes}` : session.notes,
      },
    });
  }
}
