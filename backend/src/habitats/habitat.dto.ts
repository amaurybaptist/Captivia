import {
  IsDefined,
  IsInt,
  IsObject,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateHabitatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsDefined()
  @IsObject()
  snapshot!: Prisma.InputJsonObject;
}
export class UpdateHabitatDto extends CreateHabitatDto {
  @IsInt()
  @Min(1)
  @Max(2147483646)
  revision!: number;
}
