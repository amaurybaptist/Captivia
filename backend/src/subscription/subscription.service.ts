import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SubscriptionPlan = 'monthly' | 'yearly';

export interface SubscriptionStatus {
  isPremium: boolean;
  plan?: SubscriptionPlan;
}

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string): Promise<SubscriptionStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      isPremium: user.isPremium,
      ...(user.isPremium && { plan: 'monthly' as SubscriptionPlan }), // default display; could store plan in DB later
    };
  }

  /** Mock upgrade: set user as premium. Replace with Stripe Checkout session in production. */
  async subscribe(userId: string, plan: SubscriptionPlan): Promise<SubscriptionStatus> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isPremium: true },
      select: { isPremium: true },
    });
    return {
      isPremium: user.isPremium,
      plan,
    };
  }
}
