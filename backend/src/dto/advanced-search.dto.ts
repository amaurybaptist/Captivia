/**
 * DTOs pour la recherche avancée d'espèces
 * Source: plans/resource-improvement-plan.md
 */

import { ApiProperty } from '@nestjs/swagger';

export class AdvancedSearchDto {
  @ApiProperty({ required: true, description: 'Recherche textuelle' })
  query: string;

  @ApiProperty({ required: false, default: 50, description: 'Nombre maximum de résultats' })
  limit?: number;

  @ApiProperty({ required: false, default: 0, description: 'Offset pour la pagination' })
  offset?: number;

  @ApiProperty({ required: false, description: 'Filtre par rang' })
  rank?: string;

  @ApiProperty({ required: false, description: 'Filtre par royaume' })
  kingdom?: string;

  @ApiProperty({ required: false, description: 'Filtre par phylum' })
  phylum?: string;

  @ApiProperty({ required: false, description: 'Filtre par classe' })
  class?: string;

  @ApiProperty({ required: false, description: 'Filtre par ordre' })
  order?: string;

  @ApiProperty({ required: false, description: 'Filtre par famille' })
  family?: string;

  @ApiProperty({ required: false, description: 'Filtre par genre' })
  genus?: string;

  @ApiProperty({ required: false, description: 'Filtre par statut IUCN' })
  iucnStatus?: string;

  @ApiProperty({ required: false, description: 'Filtre par pays de distribution' })
  country?: string;

  @ApiProperty({ required: false, description: 'Filtre par langue' })
  language?: string;

  @ApiProperty({ required: false, description: 'Filtre par nombre minimum d\'occurrences' })
  minOccurrences?: number;

  @ApiProperty({ required: false, enum: ['relevance', 'popularity', 'occurrences'], description: 'Critère de tri' })
  sortBy?: 'relevance' | 'popularity' | 'occurrences';

  @ApiProperty({ required: false, enum: ['asc', 'desc'], description: 'Ordre du tri', default: 'desc' })
  sortOrder?: 'asc' | 'desc';
}

export class AdvancedSearchResults {
  @ApiProperty({ description: 'Résultats de recherche' })
  results: any[];

  @ApiProperty({ description: 'Nombre total de résultats' })
  total: number;

  @ApiProperty({ description: 'Critères de tri appliqués' })
  sortBy?: string;

  @ApiProperty({ description: 'Ordre du tri appliqué' })
  sortOrder?: string;

  @ApiProperty({ description: 'Source des données' })
  source: 'gbif' | 'cache';

  @ApiProperty({ description: 'Score de qualité moyen' })
  avgQualityScore?: number;
}

export class SearchSuggestionsDto {
  @ApiProperty({ required: true, description: 'Recherche partielle' })
  query: string;

  @ApiProperty({ required: false, default: 10, description: 'Nombre de suggestions' })
  limit?: number;

  @ApiProperty({ required: false, default: 'french', description: 'Langue des suggestions' })
  language?: string;
}

export class SearchSuggestions {
  @ApiProperty({ description: 'Suggestions' })
  suggestions: string[];

  @ApiProperty({ description: 'Nombre de suggestions' })
  count: number;
}

export class SpeciesFilterDto {
  @ApiProperty({ required: false, description: 'Recherche textuelle' })
  query?: string;

  @ApiProperty({ required: false, description: 'Filtre par rang' })
  rank?: string;

  @ApiProperty({ required: false, description: 'Filtre par royaume' })
  kingdom?: string;

  @ApiProperty({ required: false, description: 'Filtre par phylum' })
  phylum?: string;

  @ApiProperty({ required: false, description: 'Filtre par classe' })
  class?: string;

  @ApiProperty({ required: false, description: 'Filtre par ordre' })
  order?: string;

  @ApiProperty({ required: false, description: 'Filtre par famille' })
  family?: string;

  @ApiProperty({ required: false, description: 'Filtre par genre' })
  genus?: string;

  @ApiProperty({ required: false, description: 'Filtre par statut IUCN' })
  iucnStatus?: string;

  @ApiProperty({ required: false, description: 'Filtre par pays de distribution' })
  country?: string;

  @ApiProperty({ required: false, description: 'Filtre par langue' })
  language?: string;

  @ApiProperty({ required: false, description: 'Filtre par conservation' })
  conservation?: string;

  @ApiProperty({ required: false, description: 'Filtre par région' })
  region?: string;

  @ApiProperty({ required: false, description: 'Filtre par taxonomie' })
  taxonomic?: string;

  @ApiProperty({ required: false, description: 'Filtre par présence de médias' })
  hasMedia?: boolean;

  @ApiProperty({ required: false, description: 'Filtre par présence d\'IUCN' })
  hasIucn?: boolean;
}