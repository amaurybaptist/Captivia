import { Module } from '@nestjs/common';
import { HabitatsController } from './habitats.controller';
import { HabitatsService } from './habitats.service';
@Module({ controllers: [HabitatsController], providers: [HabitatsService] })
export class HabitatsModule {}
