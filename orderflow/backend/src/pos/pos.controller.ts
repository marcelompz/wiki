import { Controller, Get, Post, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiKeyGuard } from '../common/api-key.guard';
import { PosCoreService, CreatePosConfigDto, OpenPosSessionDto, ClosePosSessionDto } from './pos-core.service';
import { GastroPosService, CreateFloorDto, CreateTableDto } from './gastro-pos.service';

@Controller('api/v1/pos')
@UseGuards(ApiKeyGuard)
export class PosController {
  constructor(
    private readonly posCoreService: PosCoreService,
    private readonly gastroPosService: GastroPosService,
  ) {}

  // ============================================
  // TERMINALES & CAJAS (pos.config)
  // ============================================

  @Post('configs')
  async createConfig(@Req() req: any, @Body() dto: CreatePosConfigDto) {
    const tenantId = req.tenant.id;
    return this.posCoreService.createConfig(tenantId, dto, req.tenantPrisma);
  }

  @Get('configs')
  async findAllConfigs(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.posCoreService.findAllConfigs(tenantId, req.tenantPrisma);
  }

  // ============================================
  // SESIONES DE CAJA (pos.session)
  // ============================================

  @Post('sessions/open')
  async openSession(@Req() req: any, @Body() dto: OpenPosSessionDto) {
    const tenantId = req.tenant.id;
    const userId = req.user?.id || dto.userId;
    return this.posCoreService.openSession(tenantId, { ...dto, userId }, req.tenantPrisma);
  }

  @Post('sessions/close')
  async closeSession(@Req() req: any, @Body() dto: ClosePosSessionDto) {
    const tenantId = req.tenant.id;
    return this.posCoreService.closeSession(tenantId, dto, req.tenantPrisma);
  }

  // ============================================
  // OMNIGASTRO (pos_restaurant: Salones y Mesas)
  // ============================================

  @Post('floors')
  async createFloor(@Req() req: any, @Body() dto: CreateFloorDto) {
    const tenantId = req.tenant.id;
    return this.gastroPosService.createFloor(tenantId, dto, req.tenantPrisma);
  }

  @Get('floors')
  async findFloors(@Req() req: any, @Query('configId') configId?: string) {
    const tenantId = req.tenant.id;
    return this.gastroPosService.findFloorsByConfig(tenantId, configId, req.tenantPrisma);
  }

  @Post('tables')
  async createTable(@Req() req: any, @Body() dto: CreateTableDto) {
    const tenantId = req.tenant.id;
    return this.gastroPosService.createTable(tenantId, dto, req.tenantPrisma);
  }

  @Post('orders/:orderId/assign-table')
  async assignTable(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body('tableId') tableId: string,
    @Body('waiterId') waiterId?: string,
  ) {
    const tenantId = req.tenant.id;
    return this.gastroPosService.assignOrderToTable(tenantId, orderId, tableId, waiterId, req.tenantPrisma);
  }
}
