import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { RoutinesService } from '../routines/routines.service';

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly routinesService: RoutinesService,
  ) {}

  // Uncomment when @nestjs/schedule is installed:
  // @Cron(CronExpression.EVERY_HOUR)
  async checkRoutinesAndSendNotifications() {
    this.logger.log('Checking routines for notifications...');

    try {
      // Get all users
      const users = await this.prisma.user.findMany({
        select: { id: true },
      });

      for (const user of users) {
        await this.processUserRoutines(user.id);
      }

      this.logger.log('Routine notifications check completed');
    } catch (error) {
      this.logger.error('Error in routine notifications:', error);
    }
  }

  private async processUserRoutines(userId: string) {
    // Get all active routines for user
    const routines = await this.routinesService.getActiveRoutines(userId);

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    for (const routine of routines) {
      const shouldNotify = await this.shouldSendNotification(
        routine,
        currentHour,
        currentDay,
      );

      if (shouldNotify) {
        const canNotify = await this.notificationsService.checkIfShouldNotify(
          userId,
          routine.type,
        );

        if (canNotify) {
          await this.sendRoutineNotification(userId, routine);
        }
      }
    }
  }

  private async shouldSendNotification(
    routine: any,
    currentHour: number,
    currentDay: number,
  ): Promise<boolean> {
    const schedule = routine.schedule;

    // Check frequency
    switch (routine.frequency) {
      case 'daily':
        // Check if hour matches
        if (schedule.hour && schedule.hour === currentHour) {
          return true;
        }
        break;

      case 'weekly':
        // Check if day and hour match
        if (
          schedule.day &&
          schedule.day === currentDay &&
          schedule.hour === currentHour
        ) {
          return true;
        }
        break;

      case 'monthly':
        // Check if date and hour match
        const currentDate = new Date().getDate();
        if (
          schedule.date &&
          schedule.date === currentDate &&
          schedule.hour === currentHour
        ) {
          return true;
        }
        break;

      case 'custom':
        // Custom logic based on schedule
        if (schedule.hours && schedule.hours.includes(currentHour)) {
          return true;
        }
        break;
    }

    return false;
  }

  private async sendRoutineNotification(userId: string, routine: any) {
    const typeLabels: Record<string, string> = {
      nourrissage: 'Nourrissage',
      entretien: 'Entretien',
      uvb: 'Contrôle UVB',
      controle: 'Contrôle santé',
    };

    const payload = {
      title: `Rappel: ${typeLabels[routine.type] || routine.type}`,
      body: `Il est temps de ${typeLabels[routine.type]?.toLowerCase()} pour ${routine.animal.name}`,
      icon: '/icon.png',
      data: {
        animalId: routine.animal.id,
        routineId: routine.id,
        type: routine.type,
      },
    };

    await this.notificationsService.sendNotification(userId, payload);

    this.logger.log(
      `Sent ${routine.type} notification for animal ${routine.animal.name}`,
    );
  }

  // Manual trigger for testing
  async triggerNotificationCheck() {
    await this.checkRoutinesAndSendNotifications();
    return { success: true, message: 'Notification check triggered' };
  }
}
