import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';

describe('CacheService', () => {
  let service: CacheService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CACHE_TTL') return '3600';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return null for non-existent key', () => {
      const result = service.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should return data for existing key', () => {
      const testData = { key: 'value' };
      service.set('test-key', testData);
      const result = service.get('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for expired key', () => {
      const testData = { key: 'value' };
      service.set('test-key', testData);
      
      // Manually set timestamp to expire (older than 1 hour TTL = 3,600,000 ms)
      const cache = service as any;
      const oldTimestamp = Date.now() - 500000000; // 500,000 seconds old (TTL is 1 hour)
      cache.cache.set('test-key', { data: testData, timestamp: oldTimestamp });
      
      const result = service.get('test-key');
      expect(result).toBeNull();
    });

    it('should return null for expired key when checking has()', () => {
      const testData = { key: 'value' };
      service.set('test-key', testData);
      
      // Manually set timestamp to expire (older than 1 hour TTL = 3,600,000 ms)
      const cache = service as any;
      const oldTimestamp = Date.now() - 500000000; // 500,000 seconds old (TTL is 1 hour)
      cache.cache.set('test-key', { data: testData, timestamp: oldTimestamp });
      
      const result = service.has('test-key');
      expect(result).toBe(false);
    });
  });

  describe('set', () => {
    it('should store data with key', () => {
      const testData = { key: 'value' };
      service.set('test-key', testData);
      
      const result = service.get('test-key');
      expect(result).toEqual(testData);
    });

    it('should update existing key', () => {
      const testData1 = { key: 'value1' };
      const testData2 = { key: 'value2' };
      
      service.set('test-key', testData1);
      service.set('test-key', testData2);
      
      const result = service.get('test-key');
      expect(result).toEqual(testData2);
    });
  });

  describe('has', () => {
    it('should return false for non-existent key', () => {
      const result = service.has('nonexistent');
      expect(result).toBe(false);
    });

    it('should return true for existing key', () => {
      service.set('test-key', { key: 'value' });
      const result = service.has('test-key');
      expect(result).toBe(true);
    });

    it('should return false for expired key', () => {
      service.set('test-key', { key: 'value' });
      
      // Manually set timestamp to expire (older than 1 hour TTL = 3,600,000 ms)
      const cache = service as any;
      const oldTimestamp = Date.now() - 500000000; // 500,000 seconds old (TTL is 1 hour)
      cache.cache.set('test-key', { data: { key: 'value' }, timestamp: oldTimestamp });
      
      const result = service.has('test-key');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', () => {
      service.set('key1', { key: 'value1' });
      service.set('key2', { key: 'value2' });
      service.set('key3', { key: 'value3' });
      
      expect(service.getCacheSize()).toBe(3);
      
      service.clear();
      
      expect(service.getCacheSize()).toBe(0);
      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeNull();
      expect(service.get('key3')).toBeNull();
    });
  });

  describe('clearKey', () => {
    it('should clear specific key', () => {
      service.set('key1', { key: 'value1' });
      service.set('key2', { key: 'value2' });
      service.set('key3', { key: 'value3' });
      
      service.clearKey('key2');
      
      expect(service.getCacheSize()).toBe(2);
      expect(service.get('key1')).toEqual({ key: 'value1' });
      expect(service.get('key2')).toBeNull();
      expect(service.get('key3')).toEqual({ key: 'value3' });
    });

    it('should do nothing for non-existent key', () => {
      service.set('key1', { key: 'value1' });
      
      service.clearKey('nonexistent');
      
      expect(service.getCacheSize()).toBe(1);
      expect(service.get('key1')).toEqual({ key: 'value1' });
    });
  });

  describe('getCacheSize', () => {
    it('should return 0 for empty cache', () => {
      expect(service.getCacheSize()).toBe(0);
    });

    it('should return correct size', () => {
      service.set('key1', { key: 'value1' });
      service.set('key2', { key: 'value2' });
      service.set('key3', { key: 'value3' });
      
      expect(service.getCacheSize()).toBe(3);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('ttl');
      expect(stats).toHaveProperty('defaultTtl');
      expect(stats).toHaveProperty('ttlConfig');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.ttl).toBe('number');
      expect(typeof stats.defaultTtl).toBe('number');
      expect(typeof stats.ttlConfig).toBe('object');
    });
  });

  describe('TTL configuration', () => {
    it('should use default TTL when CACHE_TTL not set', () => {
      const configService = new ConfigService();
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'CACHE_TTL') return undefined;
          return null;
        }),
      };
      
      const testService = new CacheService(mockConfig as any);
      const stats = testService.getCacheStats();
      
      // Default TTL should be 86400 seconds (24 hours) from CACHE_CONFIG.species
      expect(stats.ttl).toBe(86400);
      expect(stats.defaultTtl).toBe(86400);
    });
  });
});