import { Module } from '@nestjs/common';
import { GradeModule } from '../grade/grade.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { RoutinesModule } from '../routines/routines.module';

@Module({
  imports: [GradeModule, RoutinesModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsSchedulerService],
  exports: [NotificationsService, NotificationsSchedulerService],
})
export class NotificationsModule {}
