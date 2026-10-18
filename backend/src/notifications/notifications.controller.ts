import {
  Controller,
  HttpCode,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PushSubscriptionDto,
  UnsubscribePushDto,
} from './dto/push-subscription.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';

@ApiTags('notifications')
@Controller('users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notification-capabilities')
  getCapabilities() {
    return this.notificationsService.getCapabilities();
  }

  @Post('push-subscriptions')
  @ApiOperation({
    summary: 'Subscribe to push notifications',
    description: 'Register a push notification subscription',
  })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async subscribe(
    @Request() req: { user: { id: string } },
    @Body() dto: PushSubscriptionDto,
  ) {
    return this.notificationsService.subscribeToPush(req.user.id, dto);
  }

  @Delete('push-subscriptions')
  @ApiOperation({
    summary: 'Unsubscribe from push notifications',
    description: 'Remove a push notification subscription',
  })
  @ApiResponse({ status: 200, description: 'Subscription removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unsubscribe(
    @Request() req: { user: { id: string } },
    @Body() dto: UnsubscribePushDto,
  ) {
    return this.notificationsService.unsubscribeFromPush(
      req.user.id,
      dto.endpoint,
    );
  }

  @Get('push-subscriptions')
  @ApiOperation({
    summary: 'Get push subscriptions',
    description: 'Get all push notification subscriptions for current user',
  })
  @ApiResponse({ status: 200, description: 'Subscriptions list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubscriptions(@Request() req: { user: { id: string } }) {
    const subscriptions = await this.notificationsService.getUserSubscriptions(
      req.user.id,
    );
    return subscriptions.map(({ id, endpoint }) => ({ id, endpoint }));
  }

  @Get('notification-preferences')
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Get notification preferences for current user',
  })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPreferences(@Request() req: { user: { id: string } }) {
    return this.notificationsService.getNotificationPreferences(req.user.id);
  }

  @Patch('notification-preferences')
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Update notification preferences for current user',
  })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePreferences(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updateNotificationPreferences(
      req.user.id,
      dto,
    );
  }

  @Post('test-notification')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Send test notification',
    description: 'Send a test reminder using the current delivery channels',
  })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendTestNotification(@Request() req: { user: { id: string } }) {
    return this.notificationsService.sendTestNotification(req.user.id);
  }
}
