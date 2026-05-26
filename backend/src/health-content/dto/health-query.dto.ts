import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class HealthQueryDto {
  @IsOptional()
  @IsString()
  disease?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;
}
