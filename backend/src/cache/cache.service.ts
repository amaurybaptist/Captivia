import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getCacheTTL, getDefaultCacheTTL } from './cache.config';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly defaultTtl: number;

  constructor(private configService: ConfigService) {
    // Use default TTL from config
    this.defaultTtl = getDefaultCacheTTL() * 1000;
  }

  get(key: string): unknown {
    const item = this.cache.get(key);
    if (!item) {
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    }

    const age = Date.now() - item.timestamp;
    const ttl = getCacheTTL(key) * 1000;
    if (age > ttl) {
      this.logger.debug(`Cache expired for key: ${key} (TTL: ${ttl / 1000}s)`);
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(
      `Cache hit for key: ${key} (age: ${Math.round(age / 1000)}s, TTL: ${ttl / 1000}s)`,
    );
    return item.data;
  }

  set(key: string, data: unknown, customTtl?: number): void {
    const ttl = customTtl || getCacheTTL(key) * 1000;
    this.cache.set(key, { data, timestamp: Date.now() });
    this.logger.debug(`Cache set for key: ${key} (TTL: ${ttl / 1000}s)`);
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const age = Date.now() - item.timestamp;
    const ttl = getCacheTTL(key) * 1000;
    if (age > ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug(`Cache cleared (${size} items removed)`);
  }

  clearKey(key: string): void {
    if (this.cache.delete(key)) {
      this.logger.debug(`Cache key cleared: ${key}`);
    }
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCacheStats(): { size: number; ttl: number; defaultTtl: number; ttlConfig: Record<string, number> } {
    return {
      size: this.cache.size,
      ttl: this.defaultTtl / 1000,
      defaultTtl: this.defaultTtl / 1000,
      ttlConfig: {
        species: getCacheTTL('species:12345'),
        media: getCacheTTL('media:12345'),
        distributions: getCacheTTL('distributions:12345'),
        vernacular: getCacheTTL('vernacular:12345'),
        metrics: getCacheTTL('metrics:12345'),
        search: getCacheTTL('search:test'),
        occurrences: getCacheTTL('occurrences:12345'),
      },
    };
  }
}
