import { Module } from '@nestjs/common';
import { RoutinesController, HistoryController } from './routines.controller';
import { RoutinesService } from './routines.service';

@Module({
  controllers: [RoutinesController, HistoryController],
  providers: [RoutinesService],
  exports: [RoutinesService],
})
export class RoutinesModule {}
