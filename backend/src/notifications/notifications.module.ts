import { Module } from '@nestjs/common';
// import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { RoutinesModule } from '../routines/routines.module';

@Module({
  imports: [
    // Uncomment when @nestjs/schedule is installed:
    // ScheduleModule.forRoot(),
    RoutinesModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsSchedulerService],
  exports: [NotificationsService, NotificationsSchedulerService],
})
export class NotificationsModule {}
