import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Wikipedia API Service for fetching species information from Wikipedia
 * Uses Wikipedia API to get article content, summaries, and related species
 */
@Injectable()
export class WikipediaService {
  private readonly logger = new Logger(WikipediaService.name);
  private readonly wikipediaApi: AxiosInstance;
  private readonly wikipediaBaseUrl = 'https://en.wikipedia.org/api/rest_v1';

  constructor() {
    this.wikipediaApi = axios.create({
      baseURL: this.wikipediaBaseUrl,
      timeout: 10000,
    });
  }

  /**
   * Search Wikipedia for a species by name
   * @param query Search query string
   * @returns Search results from Wikipedia
   */
  async searchSpecies(query: string) {
    try {
      const response = await this.wikipediaApi.get('/page/summary', {
        params: {
          titles: query,
          format: 'json',
        },
      });

      return this.transformSearchResult(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.error('Wikipedia search failed', error);
      throw error;
    }
  }

  /**
   * Get Wikipedia article content for a species
   * @param title Article title (e.g., "Panthera leo")
   * @returns Article content and metadata
   */
  async getArticle(title: string) {
    try {
      const response = await this.wikipediaApi.get('/page/summary', {
        params: {
          titles: title,
          format: 'json',
        },
      });

      if (!response.data) {
        return null;
      }

      return this.transformArticle(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.error('Wikipedia article fetch failed', error);
      throw error;
    }
  }

  /**
   * Get Wikipedia extract (short summary) for a species
   * @param title Article title
   * @returns Extract text
   */
  async getExtract(title: string) {
    try {
      const response = await this.wikipediaApi.get('/page/extracts', {
        params: {
          titles: title,
          format: 'json',
          exintro: true,
          explaintext: true,
          redirects: true,
        },
      });

      if (!response.data || !response.data.extract) {
        return null;
      }

      return {
        extract: response.data.extract,
        title: response.data.title,
        pageid: response.data.pageid,
        source: 'wikipedia',
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.error('Wikipedia extract fetch failed', error);
      throw error;
    }
  }

  /**
   * Get Wikipedia page with full content (including sections)
   * @param title Article title
   * @returns Full page content
   */
  async getPage(title: string) {
    try {
      const response = await this.wikipediaApi.get('/page/plain', {
        params: {
          titles: title,
          format: 'json',
          redirects: true,
        },
      });

      if (!response.data || !response.data['*']) {
        return null;
      }

      return {
        content: response.data['*'],
        title: response.data.title,
        pageid: response.data.pageid,
        source: 'wikipedia',
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.error('Wikipedia page fetch failed', error);
      throw error;
    }
  }

  /**
   * Get Wikipedia images for a species
   * @param title Article title
   * @returns List of images
   */
  async getImages(title: string) {
    try {
      const response = await this.wikipediaApi.get('/page/coordinates', {
        params: {
          titles: title,
          format: 'json',
        },
      });

      if (!response.data || !response.data.query?.pages) {
        return null;
      }

      const pages = response.data.query.pages;
      const pageId = Object.keys(pages)[0];

      return {
        pageId,
        coordinates: pages[pageId]?.coordinates || [],
        source: 'wikipedia',
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.error('Wikipedia images fetch failed', error);
      throw error;
    }
  }

  /**
   * Check Wikipedia API health
   * @returns Health status
   */
  async checkApiHealth() {
    try {
      const response = await this.wikipediaApi.get('/page/summary', {
        params: {
          titles: 'Panthera leo',
          format: 'json',
        },
        timeout: 5000,
      });
      return {
        status: 'healthy',
        responseTime: response.headers['request-duration'] || 'unknown',
      };
    } catch (error) {
      this.logger.error('Wikipedia API health check failed', error);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Transform Wikipedia search result
   */
  private transformSearchResult(data: any) {
    if (!data || data.error) {
      return null;
    }

    return {
      title: data.title,
      pageid: data.pageid,
      thumbnail: data.thumbnail?.source,
      extract: data.extract,
      source: 'wikipedia',
      timestamp: new Date(),
    };
  }

  /**
   * Transform Wikipedia article data
   */
  private transformArticle(data: any) {
    if (!data || data.error) {
      return null;
    }

    return {
      title: data.title,
      pageid: data.pageid,
      url: data.content_urls?.desktop?.page,
      thumbnail: data.thumbnail?.source,
      extract: data.extract,
      extractHtml: data.extract_html,
      originalimage: data.originalimage?.source,
      terms: data.terms || {},
      source: 'wikipedia',
      timestamp: new Date(),
    };
  }
}