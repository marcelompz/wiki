// backend/src/modules/omnipulse/dto/omnipulse-pilar3.dto.ts
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RealEventType } from '@prisma/client';

// ---------------------------------------------------------------------
// RealEvent: el único punto de entrada de "hechos" que una sonda puede usar.
// No existe ningún DTO que acepte un hecho arbitrario sin pasar por acá,
// y crear un RealEvent requiere referenciar (cuando aplica) el registro
// real del ERP — no es un campo de texto suelto.
// ---------------------------------------------------------------------
export class CreateRealEventDto {
  @IsEnum(RealEventType)
  type: RealEventType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  effectiveDate: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  sourceRecordId?: string; // ID del precio/promo real en el ERP, si existe
}

// ---------------------------------------------------------------------
// StrategicProbe: solo puede referenciar un RealEvent ya creado.
// `justification` es obligatoria: nadie puede lanzar una sonda sin
// explicar por qué, y eso queda auditado junto a la aprobación.
// ---------------------------------------------------------------------
export class CreateStrategicProbeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  realEventId: string; // Referencia obligatoria — nunca un string de "hecho" libre

  @IsString()
  @IsOptional()
  expectedReaction?: string;

  @IsString()
  @MinLength(20, {
    message: 'La justificación debe explicar el motivo de la sonda (mín. 20 caracteres)',
  })
  justification: string;

  @IsArray()
  @IsString({ each: true })
  recipientSourceIds: string[];
}

// ---------------------------------------------------------------------
// Aprobación/rechazo. Solo accesible para roles ADMIN o LEGAL_REVIEWER
// (se valida en el guard del controller, no acá).
// ---------------------------------------------------------------------
export class ReviewProbeDto {
  @IsBoolean()
  approve: boolean;

  @IsString()
  @IsOptional()
  rejectedReason?: string; // Obligatorio en la práctica si approve = false (validado en el service)
}

export class RegisterObservedReactionDto {
  @IsString()
  @IsNotEmpty()
  observedReaction: string;

  @IsString()
  @IsOptional()
  detectedLeakSourceId?: string;
}

// ---------------------------------------------------------------------
// Ajuste manual de reliabilityScore. Todo cambio pasa por acá y queda
// en ScoreAdjustmentLog — nunca se escribe reliabilityScore directo.
// ---------------------------------------------------------------------
export class ManualScoreAdjustmentDto {
  @IsString()
  newScore: string; // se valida rango 0-100 en el service (Decimal/Float)

  @IsString()
  @MinLength(15, {
    message: 'El motivo del ajuste manual debe ser explícito (mín. 15 caracteres)',
  })
  reason: string;
}

export class SetToxicChannelDto {
  @IsBoolean()
  isToxicChannel: boolean;

  @IsString()
  @MinLength(15, {
    message: 'Marcar/desmarcar una fuente como tóxica requiere justificación explícita',
  })
  reason: string;
}
