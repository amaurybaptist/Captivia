import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string;

  @IsOptional()
  @IsIn(['push', 'email', 'both'])
  deliveryChannel?: 'push' | 'email' | 'both';

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  snooze?: number;

  @IsOptional()
  @IsObject()
  types?: any;

  @IsOptional()
  @IsObject()
  typeSchedules?: Record<string, any>;

  @IsOptional()
  @IsObject()
  schedule?: { start: string; end: string };
}
