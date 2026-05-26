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
import { WikipediaService } from './wikipedia.service';
import { GetWikipediaDto } from '../../dto/species.dto';

@UseGuards(RateLimitGuard)
@ApiTags('wikipedia')
@Controller('wikipedia')
export class WikipediaController {
  constructor(private readonly wikipediaService: WikipediaService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search Wikipedia for a species' })
  @ApiParam({ name: 'q', description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async search(@Param() params: { q: string }) {
    try {
      return await this.wikipediaService.searchSpecies(params.q);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to search Wikipedia');
    }
  }

  @Get('article')
  @ApiOperation({ summary: 'Get Wikipedia article for a species' })
  @ApiParam({ name: 'title', description: 'Article title' })
  @ApiResponse({ status: 200, description: 'Article data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getArticle(@Param() params: { title: string }) {
    try {
      return await this.wikipediaService.getArticle(params.title);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch Wikipedia article');
    }
  }

  @Get('extract')
  @ApiOperation({ summary: 'Get Wikipedia extract for a species' })
  @ApiParam({ name: 'title', description: 'Article title' })
  @ApiResponse({ status: 200, description: 'Extract text' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getExtract(@Param() params: { title: string }) {
    try {
      return await this.wikipediaService.getExtract(params.title);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch Wikipedia extract');
    }
  }

  @Get('page')
  @ApiOperation({ summary: 'Get full Wikipedia page for a species' })
  @ApiParam({ name: 'title', description: 'Article title' })
  @ApiResponse({ status: 200, description: 'Full page content' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getPage(@Param() params: { title: string }) {
    try {
      return await this.wikipediaService.getPage(params.title);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch Wikipedia page');
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check Wikipedia API health' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async checkHealth() {
    return await this.wikipediaService.checkApiHealth();
  }
}