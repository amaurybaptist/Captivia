import {
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchSpeciesDto {
  @IsNotEmpty()
  @IsString()
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  kingdom?: string;

  @IsOptional()
  @IsString()
  phylum?: string;

  @IsOptional()
  @IsString()
  class?: string;

  @IsOptional()
  @IsString()
  order?: string;

  @IsOptional()
  @IsString()
  family?: string;

  @IsOptional()
  @IsString()
  genus?: string;

  @IsOptional()
  @IsString()
  rank?: string;

  @IsOptional()
  @IsString()
  iucnStatus?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: ('gbif' | 'wikipedia' | 'wikidata')[];
}

export class GetSpeciesDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class GetSpeciesWithSourcesDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: ('gbif' | 'wikipedia' | 'wikidata')[];
}

export class ConservationStatusDto {
  @IsNotEmpty()
  @IsString()
  qid: string;

  @IsOptional()
  @IsEnum(['iucn', 'cites', 'berne', 'cms'])
  statusType?: string;
}

export class GetVernacularNamesDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class GetWikipediaDto {
  @IsNotEmpty()
  @IsString()
  title: string;
}

export class GetWikidataDto {
  @IsNotEmpty()
  @IsString()
  qid: string;
}
