// backend/src/modules/omnipulse/omnipulse-pilar3.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard'; // ajustar al guard real del proyecto
import { OmnipulsePilar3Service } from './omnipulse-pilar3.service';
import {
  CreateRealEventDto,
  CreateStrategicProbeDto,
  ManualScoreAdjustmentDto,
  RegisterObservedReactionDto,
  ReviewProbeDto,
  SetToxicChannelDto,
} from './dto/omnipulse-pilar3.dto';

@UseGuards(AuthGuard)
@Controller('api/v1/pulse')
export class OmnipulsePilar3Controller {
  constructor(private readonly service: OmnipulsePilar3Service) {}

  @Post('events')
  createRealEvent(@Req() req, @Body() dto: CreateRealEventDto) {
    return this.service.createRealEvent(req.user.tenantId, req.user.id, dto);
  }

  @Post('probes')
  createProbe(@Req() req, @Body() dto: CreateStrategicProbeDto) {
    return this.service.createStrategicProbe(req.user.tenantId, req.user.id, dto);
  }

  @Patch('probes/:id/review')
  reviewProbe(@Req() req, @Param('id') id: string, @Body() dto: ReviewProbeDto) {
    return this.service.reviewProbe(req.user.tenantId, req.user.id, req.user.role, id, dto);
  }

  @Patch('probes/:id/reaction')
  registerReaction(@Req() req, @Param('id') id: string, @Body() dto: RegisterObservedReactionDto) {
    return this.service.registerObservedReaction(req.user.tenantId, id, dto);
  }

  @Patch('sources/:id/score-adjustment')
  manualScoreAdjustment(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: ManualScoreAdjustmentDto,
  ) {
    return this.service.manualScoreAdjustment(
      req.user.tenantId,
      req.user.id,
      req.user.role,
      id,
      dto,
    );
  }

  @Patch('sources/:id/toxic-flag')
  setToxicChannel(@Req() req, @Param('id') id: string, @Body() dto: SetToxicChannelDto) {
    return this.service.setToxicChannel(req.user.tenantId, req.user.id, req.user.role, id, dto);
  }

  @Get('sources/:id/score-history')
  getScoreHistory(@Req() req, @Param('id') id: string) {
    return this.service.getScoreHistory(req.user.tenantId, id);
  }
}
