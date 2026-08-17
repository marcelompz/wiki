import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ProductRankingQueryDto } from './dto/product-ranking-query.dto';
import { ApiKeyGuard } from '../common/api-key.guard';

@Controller('v1/analytics')
@UseGuards(ApiKeyGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('product-ranking-matrix')
  async getProductRankingMatrix(
    @Req() req: any,
    @Query() query: ProductRankingQueryDto,
  ) {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    return this.analyticsService.getProductRankingMatrix(tenantId, query);
  }

  @Get('executive-summary')
  async getExecutiveSummary(
    @Req() req: any,
    @Query('currentYear') currentYear?: number,
    @Query('previousYear') previousYear?: number,
  ) {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    return this.analyticsService.getExecutiveSummary(
      tenantId,
      currentYear ? Number(currentYear) : 2026,
      previousYear ? Number(previousYear) : 2025,
    );
  }
}
