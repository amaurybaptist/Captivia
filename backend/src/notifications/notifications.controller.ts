import {
  Controller,
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

@ApiTags('notifications')
@Controller('users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('push-subscriptions')
  @ApiOperation({
    summary: 'Subscribe to push notifications',
    description: 'Register a push notification subscription',
  })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async subscribe(
    @Request() req,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.notificationsService.subscribeToPush(req.user.id, body);
  }

  @Delete('push-subscriptions')
  @ApiOperation({
    summary: 'Unsubscribe from push notifications',
    description: 'Remove a push notification subscription',
  })
  @ApiResponse({ status: 200, description: 'Subscription removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unsubscribe(@Request() req, @Body() body: { endpoint: string }) {
    return this.notificationsService.unsubscribeFromPush(
      req.user.id,
      body.endpoint,
    );
  }

  @Get('push-subscriptions')
  @ApiOperation({
    summary: 'Get push subscriptions',
    description: 'Get all push notification subscriptions for current user',
  })
  @ApiResponse({ status: 200, description: 'Subscriptions list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubscriptions(@Request() req) {
    return this.notificationsService.getUserSubscriptions(req.user.id);
  }

  @Get('notification-preferences')
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Get notification preferences for current user',
  })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPreferences(@Request() req) {
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
    @Request() req,
    @Body()
    body: {
      types?: any;
      typeSchedules?: Record<string, { time: string; recurrence: string; date?: string }>;
      schedule?: any;
      snooze?: number;
      deliveryChannel?: 'push' | 'email' | 'both';
    },
  ) {
    return this.notificationsService.updateNotificationPreferences(
      req.user.id,
      body,
    );
  }

  @Post('test-notification')
  @ApiOperation({
    summary: 'Send test notification',
    description: 'Send a test push notification to current user',
  })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendTestNotification(@Request() req) {
    return this.notificationsService.sendNotification(req.user.id, {
      title: 'Test Captivia',
      body: 'Ceci est une notification de test',
      icon: '/icon.png',
    });
  }
}
