// backend/src/modules/omnipulse/dto/omnipulse.dto.ts
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { IntelCategory, VerificationStatus } from '@prisma/client';

// --- Pilar 1: Fuentes ---
export class CreateIntelSourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsOptional()
  contactId?: string;
}

// --- Pilar 2: Insights ---
export class CreateMarketInsightDto {
  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @IsEnum(IntelCategory)
  category: IntelCategory;

  @IsString()
  @IsOptional()
  entityMentioned?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  rawText: string;

  @IsNumber()
  @IsOptional()
  claimedPrice?: number;
}

export class VerifyInsightDto {
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @IsString()
  @IsOptional()
  verificationNote?: string;
}
