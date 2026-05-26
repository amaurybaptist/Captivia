import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PubmedService } from './services/pubmed.service';

@Injectable()
export class HealthContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubmedService: PubmedService,
  ) {}

  async getSpeciesHealth(
    speciesId: number,
    disease?: string,
    locale = 'fr',
  ) {
    // Try to get editorial content from database
    const editorialContent = await this.prisma.speciesHealthContent.findUnique(
      {
        where: {
          speciesId_locale: {
            speciesId,
            locale,
          },
        },
      },
    );

    // Get PubMed articles (we'll need the scientific name)
    // For now, we'll use a placeholder approach
    // In a real implementation, you'd fetch the species name from GBIF
    let pubmedArticles = [];
    
    // TODO: Fetch species scientific name from GBIF/species service
    // const species = await this.gbifService.getSpecies(speciesId);
    // pubmedArticles = await this.pubmedService.searchBySpeciesAndDisease(
    //   species.scientificName,
    //   disease
    // );

    return {
      speciesId,
      locale,
      editorial: editorialContent ? {
        diseases: editorialContent.diseases,
        sources: editorialContent.sources,
        updatedAt: editorialContent.updatedAt,
      } : null,
      pubmed: pubmedArticles,
      disclaimer: 'Cette information ne remplace pas un avis vétérinaire. Consultez toujours un professionnel en cas de doute.',
    };
  }

  async createOrUpdateHealthContent(
    speciesId: number,
    locale: string,
    diseases: any,
    sources: any,
  ) {
    return this.prisma.speciesHealthContent.upsert({
      where: {
        speciesId_locale: {
          speciesId,
          locale,
        },
      },
      create: {
        speciesId,
        locale,
        diseases,
        sources,
      },
      update: {
        diseases,
        sources,
      },
    });
  }

  async searchPubMed(query: string, maxResults = 10): Promise<unknown[]> {
    return this.pubmedService.searchArticles(query, maxResults);
  }
}
