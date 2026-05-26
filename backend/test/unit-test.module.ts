import { Test } from '@nestjs/testing';
import { CacheModule } from '../src/cache/cache.module';
import { GbifModule } from '../src/gbif/gbif.module';
import { SpeciesModule } from '../src/species/species.module';

export async function createTestModule() {
  const module = await Test.createTestingModule({
    imports: [CacheModule, GbifModule, SpeciesModule],
  }).compile();

  return module;
}