import { Module } from '@nestjs/common';
import { FoodController } from './food.controller';
import { OpenPetFoodFactsService } from './services/openpetfoodfacts.service';

@Module({
  controllers: [FoodController],
  providers: [OpenPetFoodFactsService],
  exports: [OpenPetFoodFactsService],
})
export class FoodModule {}
