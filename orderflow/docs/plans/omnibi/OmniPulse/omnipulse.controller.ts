// backend/src/modules/omnipulse/omnipulse.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard'; // ajustar al guard real del proyecto
import { RolesGuard } from '../../common/guards/roles.guard'; // ajustar: exige ADMIN o INTEL_OPERATOR
import { OmnipulseService } from './omnipulse.service';
import { CreateIntelSourceDto, CreateMarketInsightDto, VerifyInsightDto } from './dto/omnipulse.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('api/v1/pulse')
export class OmnipulseController {
  constructor(private readonly service: OmnipulseService) {}

  @Post('sources')
  createSource(@Req() req, @Body() dto: CreateIntelSourceDto) {
    return this.service.createSource(req.user.tenantId, dto);
  }

  @Get('sources')
  listSources(@Req() req) {
    return this.service.listSources(req.user.tenantId);
  }

  @Post('insights')
  recordInsight(@Req() req, @Body() dto: CreateMarketInsightDto) {
    return this.service.recordInsight(req.user.tenantId, dto);
  }

  @Get('insights')
  listInsights(@Req() req, @Query('category') category?: string, @Query('status') status?: string) {
    return this.service.listInsights(req.user.tenantId, category, status);
  }

  @Patch('insights/:id/verify')
  verifyInsight(@Req() req, @Param('id') id: string, @Body() dto: VerifyInsightDto) {
    return this.service.verifyInsight(req.user.tenantId, id, dto, req.user.id);
  }

  @Post('insights/:id/correlate')
  correlateWithSales(@Req() req, @Param('id') id: string) {
    return this.service.correlateWithSales(req.user.tenantId, id);
  }

  @Get('radar')
  getRadar(@Req() req) {
    return this.service.getRadarSummary(req.user.tenantId);
  }
}
