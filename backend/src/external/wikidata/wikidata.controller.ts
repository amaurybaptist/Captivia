import {
  Controller,
  Get,
  Param,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { WikidataService } from './wikidata.service';
import { GetWikidataDto, ConservationStatusDto } from '../../dto/species.dto';

@UseGuards(RateLimitGuard)
@ApiTags('wikidata')
@Controller('wikidata')
export class WikidataController {
  constructor(private readonly wikidataService: WikidataService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search Wikidata for a species' })
  @ApiParam({ name: 'q', description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async search(@Param() params: { q: string }) {
    try {
      return await this.wikidataService.searchSpecies(params.q);
    } catch (error) {
      throw new InternalServerErrorException('Failed to search Wikidata');
    }
  }

  @Get('entity')
  @ApiOperation({ summary: 'Get Wikidata entity by QID' })
  @ApiParam({ name: 'qid', description: 'Wikidata QID' })
  @ApiResponse({ status: 200, description: 'Entity data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getEntity(@Param() params: { qid: string }) {
    try {
      return await this.wikidataService.getEntity(params.qid);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch Wikidata entity');
    }
  }

  @Get('species')
  @ApiOperation({ summary: 'Get species info by scientific name' })
  @ApiParam({ name: 'scientificName', description: 'Scientific name' })
  @ApiResponse({ status: 200, description: 'Species data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getSpecies(@Param() params: { scientificName: string }) {
    try {
      return await this.wikidataService.getSpeciesByScientificName(
        params.scientificName,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch species data');
    }
  }

  @Get('conservation')
  @ApiOperation({ summary: 'Get conservation status for a species' })
  @ApiParam({ name: 'qid', description: 'Wikidata QID' })
  @ApiResponse({ status: 200, description: 'Conservation status' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getConservationStatus(@Param() conservationDto: ConservationStatusDto) {
    try {
      return await this.wikidataService.getConservationStatus(
        conservationDto.qid,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch conservation status',
      );
    }
  }

  @Get('classification')
  @ApiOperation({ summary: 'Get classification data for a species' })
  @ApiParam({ name: 'qid', description: 'Wikidata QID' })
  @ApiResponse({ status: 200, description: 'Classification data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getClassification(@Param() params: { qid: string }) {
    try {
      return await this.wikidataService.getClassification(params.qid);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch classification');
    }
  }

  @Get('descriptions')
  @ApiOperation({ summary: 'Get descriptions for a species' })
  @ApiParam({ name: 'qid', description: 'Wikidata QID' })
  @ApiResponse({ status: 200, description: 'Description data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getDescriptions(@Param() params: { qid: string }) {
    try {
      return await this.wikidataService.getDescriptions(params.qid);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch descriptions');
    }
  }

  @Get('images')
  @ApiOperation({ summary: 'Get images for a species' })
  @ApiParam({ name: 'qid', description: 'Wikidata QID' })
  @ApiResponse({ status: 200, description: 'Image data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getImages(@Param() params: { qid: string }) {
    try {
      return await this.wikidataService.getImages(params.qid);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch images');
    }
  }

  @Get('related')
  @ApiOperation({ summary: 'Get related species for a species' })
  @ApiParam({ name: 'qid', description: 'Wikidata QID' })
  @ApiResponse({ status: 200, description: 'Related species' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getRelatedSpecies(@Param() params: { qid: string }) {
    try {
      return await this.wikidataService.getRelatedSpecies(params.qid);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch related species');
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check Wikidata API health' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async checkHealth() {
    return await this.wikidataService.checkApiHealth();
  }
}