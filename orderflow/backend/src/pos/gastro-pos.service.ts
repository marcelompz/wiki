import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface CreateFloorDto {
  name: string;
  sequence?: number;
  configId?: string;
}

export interface CreateTableDto {
  floorId: string;
  tableNumber: string;
  seats?: number;
  positionX?: number;
  positionY?: number;
  shape?: 'SQUARE' | 'ROUND';
}

@Injectable()
export class GastroPosService {
  private readonly logger = new Logger(GastroPosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear nuevo salón/sector (RestaurantFloor)
   */
  async createFloor(tenantId: string, dto: CreateFloorDto, dbClient?: any) {
    const prisma = dbClient || this.prisma;
    return prisma.restaurantFloor.create({
      data: {
        tenantId,
        name: dto.name,
        sequence: dto.sequence || 0,
        configId: dto.configId,
      },
    });
  }

  /**
   * Listar todos los salones con sus mesas asociadas para la terminal activa
   */
  async findFloorsByConfig(tenantId: string, configId?: string, dbClient?: any) {
    const prisma = dbClient || this.prisma;
    return prisma.restaurantFloor.findMany({
      where: {
        tenantId,
        active: true,
        ...(configId ? { OR: [{ configId }, { configId: null }] } : {}),
      },
      include: {
        tables: {
          where: { active: true },
          orderBy: { tableNumber: 'asc' },
        },
      },
      orderBy: { sequence: 'asc' },
    });
  }

  /**
   * Crear nueva mesa (RestaurantTable)
   */
  async createTable(tenantId: string, dto: CreateTableDto, dbClient?: any) {
    const prisma = dbClient || this.prisma;

    const floor = await prisma.restaurantFloor.findFirst({
      where: { id: dto.floorId, tenantId },
    });

    if (!floor) {
      throw new NotFoundException('Salón/Sector no encontrado.');
    }

    return prisma.restaurantTable.create({
      data: {
        tenantId,
        floorId: dto.floorId,
        tableNumber: dto.tableNumber,
        seats: dto.seats || 4,
        positionX: dto.positionX || 0,
        positionY: dto.positionY || 0,
        shape: dto.shape || 'SQUARE',
      },
    });
  }

  /**
   * Asignar o transferir una comanda/orden a una mesa de salón
   */
  async assignOrderToTable(tenantId: string, orderId: string, tableId: string, waiterId?: string, dbClient?: any) {
    const prisma = dbClient || this.prisma;

    const table = await prisma.restaurantTable.findFirst({
      where: { id: tableId, tenantId },
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada.');
    }

    return prisma.order.update({
      where: { id: orderId },
      data: {
        tableId,
        waiterId,
      },
    });
  }
}
