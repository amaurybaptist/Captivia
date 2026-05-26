import { Module } from '@nestjs/common';
import { AnimalsController } from './animals.controller';
import { AnimalsService } from './animals.service';
import { AnimalHealthController } from './animal-health.controller';
import { AnimalHealthService } from './animal-health.service';
import { PublicAnimalController } from './public-animal.controller';

@Module({
  controllers: [AnimalsController, AnimalHealthController, PublicAnimalController],
  providers: [AnimalsService, AnimalHealthService],
  exports: [AnimalsService],
})
export class AnimalsModule {}
