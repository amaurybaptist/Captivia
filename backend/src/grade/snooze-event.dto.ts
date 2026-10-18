import { IsInt, IsOptional, Max, Min } from 'class-validator';
export class SnoozeEventDto {
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  minutes?: number;
}
