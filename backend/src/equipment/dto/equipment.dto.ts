import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EquipmentQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  speciesId?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  size?: string;
}

export class CreateEquipmentDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  speciesId?: number;

  @IsString()
  category: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsArray()
  @IsString({ each: true })
  searchTerms: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;
}

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchTerms?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;
}

export class AmazonSearchDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;
}
