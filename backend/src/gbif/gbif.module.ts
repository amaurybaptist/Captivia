import { Module } from '@nestjs/common';
import { GbifService } from './gbif.service';

@Module({
  providers: [GbifService],
  exports: [GbifService],
})
export class GbifModule {}
