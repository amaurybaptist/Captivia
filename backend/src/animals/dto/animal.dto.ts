import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsDateString,
  IsIn,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAnimalDto {
  @IsInt()
  @Type(() => Number)
  speciesId: number;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'unknown'])
  sex?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAnimalDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  speciesId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'unknown'])
  sex?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
