// backend/src/modules/omnipulse/omnipulse.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OmnipulsePilar3Service } from './omnipulse-pilar3.service';
import { CreateIntelSourceDto, CreateMarketInsightDto, VerifyInsightDto } from './dto/omnipulse.dto';

// Parámetros del algoritmo de reputación — ajustar según calibración real.
const SCORE_DELTA = {
  CORROBORATED_TRUE: 8,
  PARTIALLY_TRUE: 2,
  CORROBORATED_FALSE: -15,
  DEBUNKED: -25,
  UNVERIFIED: 0,
};
const TOXIC_THRESHOLD = 30;

@Injectable()
export class OmnipulseService {
  constructor(
    private readonly prisma: PrismaService,
    // Reutilizamos adjustReliabilityScore del Pilar 3 para que TODO cambio
    // de score (automático o manual) pase por el mismo log de auditoría.
    private readonly pilar3: OmnipulsePilar3Service,
  ) {}

  // -----------------------------------------------------------------
  // Pilar 1: Fuentes
  // -----------------------------------------------------------------
  async createSource(tenantId: string, dto: CreateIntelSourceDto) {
    return this.prisma.intelSource.create({
      data: { tenantId, name: dto.name, role: dto.role, contactId: dto.contactId },
    });
  }

  async listSources(tenantId: string) {
    return this.prisma.intelSource.findMany({
      where: { tenantId },
      orderBy: { reliabilityScore: 'desc' },
    });
  }

  // -----------------------------------------------------------------
  // Pilar 2: Insights
  // -----------------------------------------------------------------
  async recordInsight(tenantId: string, dto: CreateMarketInsightDto) {
    const source = await this.prisma.intelSource.findFirst({
      where: { id: dto.sourceId, tenantId },
    });
    if (!source) throw new BadRequestException('Fuente no encontrada.');

    const [insight] = await this.prisma.$transaction([
      this.prisma.marketInsight.create({
        data: {
          tenantId,
          sourceId: dto.sourceId,
          category: dto.category,
          entityMentioned: dto.entityMentioned,
          productId: dto.productId,
          rawText: dto.rawText,
          claimedPrice: dto.claimedPrice,
        },
      }),
      this.prisma.intelSource.update({
        where: { id: dto.sourceId },
        data: { totalReports: { increment: 1 } },
      }),
    ]);

    return insight;
  }

  async listInsights(tenantId: string, category?: string, status?: string) {
    return this.prisma.marketInsight.findMany({
      where: {
        tenantId,
        ...(category ? { category: category as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: { source: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /// Verifica un insight y recalcula el score de la fuente. El cambio de
  /// score siempre pasa por adjustReliabilityScore (Pilar 3) para quedar
  /// auditado en ScoreAdjustmentLog, sea automático o no.
  async verifyInsight(tenantId: string, insightId: string, dto: VerifyInsightDto, verifiedBy: string) {
    const insight = await this.prisma.marketInsight.findFirst({
      where: { id: insightId, tenantId },
      include: { source: true },
    });
    if (!insight) throw new BadRequestException('Insight no encontrado.');

    const updatedInsight = await this.prisma.marketInsight.update({
      where: { id: insightId },
      data: { status: dto.status, verificationNote: dto.verificationNote },
    });

    const delta = SCORE_DELTA[dto.status] ?? 0;
    const source = insight.source;
    const newScore = Math.max(0, Math.min(100, source.reliabilityScore + delta));

    await this.pilar3.adjustReliabilityScore(
      tenantId,
      source.id,
      newScore,
      `Insight ${insightId} verificado como ${dto.status}`,
      'SYSTEM',
      /* isManualOverride */ false,
      insightId,
    );

    await this.prisma.intelSource.update({
      where: { id: source.id },
      data: {
        verifiedTrue: { increment: dto.status === 'CORROBORATED_TRUE' ? 1 : 0 },
        verifiedFalse: {
          increment: dto.status === 'CORROBORATED_FALSE' || dto.status === 'DEBUNKED' ? 1 : 0,
        },
      },
    });

    if (newScore < TOXIC_THRESHOLD) {
      await this.pilar3.setToxicChannel(tenantId, verifiedBy, 'SYSTEM', source.id, {
        isToxicChannel: true,
        reason: `Score cayó a ${newScore.toFixed(1)} tras verificación de insight ${insightId}`,
      } as any);
    }

    return updatedInsight;
  }

  // -----------------------------------------------------------------
  // Pilar 2: Correlación con datos duros de ventas (Odoo/OmniFlow ERP)
  // -----------------------------------------------------------------
  async correlateWithSales(tenantId: string, insightId: string) {
    const insight = await this.prisma.marketInsight.findFirst({
      where: { id: insightId, tenantId },
    });
    if (!insight) throw new BadRequestException('Insight no encontrado.');
    if (!insight.productId) {
      throw new BadRequestException('El insight no tiene un producto vinculado para correlacionar.');
    }

    const windowStart = new Date(insight.createdAt);
    windowStart.setDate(windowStart.getDate() - 30);
    const windowEnd = new Date(insight.createdAt);
    windowEnd.setDate(windowEnd.getDate() + 30);

    // NOTA: ajustar nombres de modelo/campos al schema real del ERP (SaleOrder/OrderLine).
    const [before, after] = await Promise.all([
      this.prisma.orderLine.aggregate({
        where: {
          tenantId,
          productId: insight.productId,
          order: { createdAt: { gte: windowStart, lt: insight.createdAt } },
        },
        _sum: { quantity: true, total: true },
      }),
      this.prisma.orderLine.aggregate({
        where: {
          tenantId,
          productId: insight.productId,
          order: { createdAt: { gte: insight.createdAt, lte: windowEnd } },
        },
        _sum: { quantity: true, total: true },
      }),
    ]);

    const qtyBefore = before._sum.quantity ?? 0;
    const qtyAfter = after._sum.quantity ?? 0;
    const salesImpactCorrel = qtyBefore === 0 ? 0 : ((qtyAfter - qtyBefore) / qtyBefore) * 100;

    return this.prisma.marketInsight.update({
      where: { id: insightId },
      data: { salesImpactCorrel },
    });
  }

  // -----------------------------------------------------------------
  // Resumen ejecutivo para el dashboard (Radar)
  // -----------------------------------------------------------------
  async getRadarSummary(tenantId: string) {
    const [avgScore, toxicCount, activeInsights, unverifiedCount] = await Promise.all([
      this.prisma.intelSource.aggregate({
        where: { tenantId },
        _avg: { reliabilityScore: true },
      }),
      this.prisma.intelSource.count({ where: { tenantId, isToxicChannel: true } }),
      this.prisma.marketInsight.count({ where: { tenantId } }),
      this.prisma.marketInsight.count({ where: { tenantId, status: 'UNVERIFIED' } }),
    ]);

    return {
      avgReliabilityScore: avgScore._avg.reliabilityScore ?? 0,
      toxicSourcesCount: toxicCount,
      totalInsights: activeInsights,
      unverifiedInsights: unverifiedCount,
    };
  }
}
