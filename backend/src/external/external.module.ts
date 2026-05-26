import { Module } from '@nestjs/common';
import { WikipediaModule } from './wikipedia/wikipedia.module';
import { WikidataModule } from './wikidata/wikidata.module';
import { GbifService } from './gbif.service';

@Module({
  imports: [WikipediaModule, WikidataModule],
  providers: [GbifService],
  exports: [WikipediaModule, WikidataModule, GbifService],
})
export class ExternalModule {}