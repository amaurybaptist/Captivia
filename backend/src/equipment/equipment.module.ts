import { Module } from '@nestjs/common';
import { EquipmentController, AmazonController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { AmazonPAService } from './services/amazon-pa.service';

@Module({
  controllers: [EquipmentController, AmazonController],
  providers: [EquipmentService, AmazonPAService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
