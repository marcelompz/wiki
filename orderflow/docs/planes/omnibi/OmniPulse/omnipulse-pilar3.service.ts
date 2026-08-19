// backend/src/modules/omnipulse/omnipulse-pilar3.service.ts
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRealEventDto,
  CreateStrategicProbeDto,
  ManualScoreAdjustmentDto,
  RegisterObservedReactionDto,
  ReviewProbeDto,
  SetToxicChannelDto,
} from './dto/omnipulse-pilar3.dto'; // ya estaba en dto/, sin cambios

// Roles habilitados para aprobar/rechazar sondas o forzar un ajuste manual de score.
// Ajustar según el enum de roles real del proyecto.
const APPROVAL_ROLES = ['ADMIN', 'LEGAL_REVIEWER'];

@Injectable()
export class OmnipulsePilar3Service {
  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------
  // RealEvent: única puerta de entrada de "hechos" utilizables en sondas.
  // -----------------------------------------------------------------
  async createRealEvent(tenantId: string, userId: string, dto: CreateRealEventDto) {
    return this.prisma.realEvent.create({
      data: {
        tenantId,
        createdBy: userId,
        type: dto.type,
        description: dto.description,
        effectiveDate: new Date(dto.effectiveDate),
        productId: dto.productId,
        sourceRecordId: dto.sourceRecordId,
      },
    });
  }

  // -----------------------------------------------------------------
  // Crear sonda: siempre queda en PENDING, nunca ACTIVE directamente.
  // -----------------------------------------------------------------
  async createStrategicProbe(tenantId: string, userId: string, dto: CreateStrategicProbeDto) {
    const realEvent = await this.prisma.realEvent.findFirst({
      where: { id: dto.realEventId, tenantId },
    });

    if (!realEvent) {
      throw new BadRequestException(
        'La sonda debe referenciar un RealEvent real y existente para este tenant.',
      );
    }

    // Heurística simple de riesgo: recipientes numerosos o evento muy sensible
    // (ej. cambio de precio) suben una alerta, pero NO bloquean la creación —
    // solo obligan a que la revisión humana la vea marcada.
    const riskFlag =
      dto.recipientSourceIds.length > 5 || realEvent.type === 'PRICE_CHANGE';

    return this.prisma.strategicProbe.create({
      data: {
        tenantId,
        title: dto.title,
        realEventId: dto.realEventId,
        expectedReaction: dto.expectedReaction,
        justification: dto.justification,
        createdBy: userId,
        riskFlag,
        riskFlagReason: riskFlag
          ? 'Evento sensible o alto número de destinatarios — requiere revisión atenta'
          : null,
        recipients: {
          create: dto.recipientSourceIds.map((sourceId) => ({ sourceId })),
        },
      },
      include: { recipients: true, realEvent: true },
    });
  }

  // -----------------------------------------------------------------
  // Aprobar/rechazar. Único camino para que una sonda pase a ACTIVE.
  // -----------------------------------------------------------------
  async reviewProbe(
    tenantId: string,
    reviewerId: string,
    reviewerRole: string,
    probeId: string,
    dto: ReviewProbeDto,
  ) {
    if (!APPROVAL_ROLES.includes(reviewerRole)) {
      throw new ForbiddenException('Solo ADMIN o LEGAL_REVIEWER pueden revisar sondas.');
    }

    if (!dto.approve && !dto.rejectedReason) {
      throw new BadRequestException('Rechazar una sonda requiere indicar el motivo.');
    }

    const probe = await this.prisma.strategicProbe.findFirst({
      where: { id: probeId, tenantId },
    });
    if (!probe) throw new BadRequestException('Sonda no encontrada.');

    return this.prisma.strategicProbe.update({
      where: { id: probeId },
      data: {
        approvalStatus: dto.approve ? 'APPROVED' : 'REJECTED',
        approvedBy: reviewerId,
        approvedAt: new Date(),
        rejectedReason: dto.approve ? null : dto.rejectedReason,
        status: dto.approve ? 'ACTIVE' : probe.status,
      },
    });
  }

  async registerObservedReaction(tenantId: string, probeId: string, dto: RegisterObservedReactionDto) {
    const probe = await this.prisma.strategicProbe.findFirst({
      where: { id: probeId, tenantId },
    });
    if (!probe) throw new BadRequestException('Sonda no encontrada.');
    if (probe.approvalStatus !== 'APPROVED') {
      throw new BadRequestException('No se puede registrar reacción de una sonda no aprobada.');
    }

    return this.prisma.strategicProbe.update({
      where: { id: probeId },
      data: {
        observedReaction: dto.observedReaction,
        detectedLeakSourceId: dto.detectedLeakSourceId,
        status: 'CONCLUDED',
      },
    });
  }

  // -----------------------------------------------------------------
  // Todo cambio de reliabilityScore pasa por acá — sea automático
  // (desde verifyInsight, Pilar 1) o manual — y queda auditado.
  // -----------------------------------------------------------------
  async adjustReliabilityScore(
    tenantId: string,
    sourceId: string,
    newScore: number,
    reason: string,
    adjustedBy: string,
    isManualOverride = false,
    relatedInsightId?: string,
  ) {
    if (newScore < 0 || newScore > 100) {
      throw new BadRequestException('El score debe estar entre 0 y 100.');
    }

    const source = await this.prisma.intelSource.findFirst({
      where: { id: sourceId, tenantId },
    });
    if (!source) throw new BadRequestException('Fuente no encontrada.');

    const [updated] = await this.prisma.$transaction([
      this.prisma.intelSource.update({
        where: { id: sourceId },
        data: { reliabilityScore: newScore },
      }),
      this.prisma.scoreAdjustmentLog.create({
        data: {
          tenantId,
          sourceId,
          previousScore: source.reliabilityScore,
          newScore,
          reason,
          relatedInsightId,
          isManualOverride,
          adjustedBy,
        },
      }),
    ]);

    return updated;
  }

  async manualScoreAdjustment(
    tenantId: string,
    reviewerId: string,
    reviewerRole: string,
    sourceId: string,
    dto: ManualScoreAdjustmentDto,
  ) {
    if (!APPROVAL_ROLES.includes(reviewerRole)) {
      throw new ForbiddenException('Solo ADMIN o LEGAL_REVIEWER pueden ajustar el score manualmente.');
    }

    const newScore = Number(dto.newScore);
    return this.adjustReliabilityScore(
      tenantId,
      sourceId,
      newScore,
      dto.reason,
      reviewerId,
      /* isManualOverride */ true,
    );
  }

  async setToxicChannel(
    tenantId: string,
    reviewerId: string,
    reviewerRole: string,
    sourceId: string,
    dto: SetToxicChannelDto,
  ) {
    if (!APPROVAL_ROLES.includes(reviewerRole)) {
      throw new ForbiddenException('Solo ADMIN o LEGAL_REVIEWER pueden marcar una fuente como tóxica.');
    }

    return this.prisma.intelSource.update({
      where: { id: sourceId },
      data: {
        isToxicChannel: dto.isToxicChannel,
        toxicFlagReason: dto.reason,
        toxicFlagSetBy: reviewerId,
      },
    });
  }

  async getScoreHistory(tenantId: string, sourceId: string) {
    return this.prisma.scoreAdjustmentLog.findMany({
      where: { tenantId, sourceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
