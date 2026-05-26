import { IsIn } from 'class-validator';

export class SubscribeDto {
  @IsIn(['monthly', 'yearly'])
  plan: 'monthly' | 'yearly';
}
