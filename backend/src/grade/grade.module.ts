import { Module } from '@nestjs/common';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RoutinesModule } from '../routines/routines.module';

@Module({
  imports: [PrismaModule, RoutinesModule],
  controllers: [GradeController],
  providers: [GradeService],
  exports: [GradeService],
})
export class GradeModule {}
