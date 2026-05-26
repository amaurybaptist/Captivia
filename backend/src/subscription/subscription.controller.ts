import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService, SubscriptionPlan } from './subscription.service';
import { SubscribeDto } from './dto/subscribe.dto';

@ApiTags('subscription')
@Controller('users/me/subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: 'Get current subscription status' })
  getStatus(@Req() req: { user: { id: string } }) {
    return this.subscriptionService.getStatus(req.user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Subscribe (monthly or yearly). Mock: activates premium. Use Stripe in production.',
  })
  subscribe(@Req() req: { user: { id: string } }, @Body() dto: SubscribeDto) {
    return this.subscriptionService.subscribe(req.user.id, dto.plan as SubscriptionPlan);
  }
}
