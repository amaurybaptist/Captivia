import { Module } from '@nestjs/common';
import { SpeciesController } from './species.controller';
import { SpeciesService } from './species.service';
import { SpeciesProfileService } from './species-profile.service';
import { WikipediaService } from '../external/wikipedia/wikipedia.service';
import { WikidataService } from '../external/wikidata/wikidata.service';
import { CacheModule } from '../cache/cache.module';
import { TransformerModule } from '../transformers/transformer.module';
import { FilterModule } from '../filters/filter.module';
import { ExternalModule } from '../external/external.module';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { GatewayModule } from '../gateway/gateway.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [CacheModule, TransformerModule, FilterModule, ExternalModule, GatewayModule, PrismaModule],
  controllers: [SpeciesController],
  providers: [SpeciesService, SpeciesProfileService, WikipediaService, WikidataService, RateLimitGuard],
  exports: [SpeciesService, SpeciesProfileService],
})
export class SpeciesModule {}
