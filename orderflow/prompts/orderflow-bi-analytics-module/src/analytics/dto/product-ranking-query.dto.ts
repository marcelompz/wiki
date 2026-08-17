import { IsOptional, IsInt, IsArray, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SortByField {
  REVENUE = 'revenue',
  QUANTITY = 'quantity',
}

export class ProductRankingQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map((v) => parseInt(v, 10));
    if (typeof value === 'string') return value.split(',').map((v) => parseInt(v.trim(), 10));
    return [value];
  })
  @IsArray()
  @IsInt({ each: true })
  years?: number[] = [2025, 2026];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number = 12;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(SortByField)
  sortBy?: SortByField = SortByField.REVENUE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 500;
}
