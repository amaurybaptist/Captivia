import { Module } from '@nestjs/common';
import {
  LegislationController,
  SpeciesPlusController,
} from './legislation.controller';
import { LegislationService } from './legislation.service';
import { SpeciesPlusService } from './services/speciesplus.service';

@Module({
  controllers: [LegislationController, SpeciesPlusController],
  providers: [LegislationService, SpeciesPlusService],
  exports: [LegislationService],
})
export class LegislationModule {}
