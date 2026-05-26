import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class GbifService {
  private readonly logger = new Logger(GbifService.name);
  private readonly gbifApi: AxiosInstance;
  private readonly gbifBaseUrl = 'https://api.gbif.org/v1';
  private readonly userAgents = [
    'Captivia/1.0 (https://captivia.com)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  ];

  constructor() {
    this.gbifApi = axios.create({
      baseURL: this.gbifBaseUrl,
      headers: {
        'User-Agent': this.userAgents.join(', '),
      },
      timeout: 10000,
    });
  }

  private async fetchWithBackoff<T>(
    request: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await request();
      } catch (error) {
        lastError = error;

        // If rate limited (429), use exponential backoff
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          this.logger.warn(`Rate limited. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // For other errors, don't retry or retry once
        if (attempt < maxRetries) {
          const delay = baseDelay * attempt;
          this.logger.warn(
            `Attempt ${attempt} failed. Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Re-throw the original error instead of wrapping it
    throw lastError;
  }

  async searchSpecies(query: string, limit: number = 20, offset: number = 0) {
    return this.fetchWithBackoff(() =>
      this.gbifApi.get(`/species/search`, {
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
    return this.fetchWithBackoff(() =>
      this.gbifApi.get(`/species/${key}`),
    ).then((response) => response.data);
  }

  async getVernacularNames(key: string) {
    return this.fetchWithBackoff(() =>
      this.gbifApi.get(`/species/${key}/vernacularNames`),
    ).then((response) => response.data.results || []);
  }

  async getIucn(key: string) {
    return this.fetchWithBackoff(() =>
      this.gbifApi.get(`/species/${key}/iucn`),
    ).then((response) => response.data);
  }

  async getDistributions(key: string) {
    return this.fetchWithBackoff(() =>
      this.gbifApi.get(`/species/${key}/distributions`),
    ).then((response) => response.data.results || []);
  }

  async getMedia(key: string) {
    return this.fetchWithBackoff(() =>
      this.gbifApi.get(`/species/${key}/media`),
    ).then((response) => response.data.results || []);
  }

  async getMetrics(key: string) {
    return this.fetchWithBackoff(() =>
      this.gbifApi.get(`/species/${key}/metrics`),
    ).then((response) => response.data);
  }

  async countOccurrences(key: string) {
    return this.fetchWithBackoff(() =>
      this.gbifApi.get(`/occurrence/search`, {
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
