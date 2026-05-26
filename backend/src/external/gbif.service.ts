import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { RetryHandler, DEFAULT_RETRY_CONFIG } from './retry-config';

@Injectable()
export class GbifService {
  private readonly logger = new Logger(GbifService.name);
  private readonly gbifApi: AxiosInstance;
  private readonly gbifBaseUrl = 'https://api.gbif.org/v1';
  private readonly userAgents = [
    'Captivia/1.0 (https://captivia.com)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  ];
  private readonly retryHandler: RetryHandler;

  constructor() {
    this.gbifApi = axios.create({
      baseURL: this.gbifBaseUrl,
      headers: {
        'User-Agent': this.userAgents.join(', '),
      },
      timeout: 10000,
    });
    this.retryHandler = new RetryHandler(DEFAULT_RETRY_CONFIG);
  }

  private async fetchWithRetry<T>(request: () => Promise<T>): Promise<T> {
    return this.retryHandler.execute(request, (attempt, error) => {
      this.logger.warn(
        `GBIF API error (attempt ${attempt}/${DEFAULT_RETRY_CONFIG.maxRetries}): ${error.message}`,
      );
    });
  }

  async searchSpecies(query: string, limit: number = 20, offset: number = 0) {
    return this.fetchWithRetry(() =>
      this.gbifApi.get('/species/search', {
        params: {
          q: query,
          limit,
          offset,
          rank: 'SPECIES',
          highertaxonRank: 'SPECIES',
        },
      }),
    ).then((response) => response.data);
  }

  async getSpecies(key: string) {
    return this.fetchWithRetry(() =>
      this.gbifApi.get(`/species/${key}`),
    ).then((response) => response.data);
  }

  async getVernacularNames(key: string) {
    return this.fetchWithRetry(() =>
      this.gbifApi.get(`/species/${key}/vernacularNames`),
    ).then((response) => response.data.results || []);
  }

  async getIucn(key: string) {
    return this.fetchWithRetry(() =>
      this.gbifApi.get(`/species/${key}/iucn`),
    ).then((response) => response.data);
  }

  async getDistributions(key: string) {
    return this.fetchWithRetry(() =>
      this.gbifApi.get(`/species/${key}/distributions`),
    ).then((response) => response.data.results || []);
  }

  async getMedia(key: string) {
    return this.fetchWithRetry(() =>
      this.gbifApi.get(`/species/${key}/media`),
    ).then((response) => response.data.results || []);
  }

  async getMetrics(key: string) {
    return this.fetchWithRetry(() =>
      this.gbifApi.get(`/species/${key}/metrics`),
    ).then((response) => response.data);
  }

  async countOccurrences(key: string) {
    return this.fetchWithRetry(() =>
      this.gbifApi.get('/occurrence/search', {
        params: {
          speciesKey: key,
          limit: 1,
        },
      }),
    ).then((response) => {
      return {
        count: parseInt(response.data.count),
        limit: response.data.limit,
        offset: response.data.offset,
      };
    });
  }

  async checkApiHealth() {
    try {
      const response = await this.gbifApi.get('/occurrence/search', {
        params: {
          limit: 1,
        },
        timeout: 5000,
      });
      return {
        status: 'healthy',
        responseTime: response.headers['request-duration'] || 'unknown',
      };
    } catch (error) {
      this.logger.error('GBIF API health check failed', error);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}
