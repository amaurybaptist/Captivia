import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';

/** Same consume result shape for Redis and Memory limiters */
interface RateLimitResult {
  consumedPoints: number;
  remainingPoints: number;
  msBeforeNext: number;
}

/**
 * Rate limiter using Redis for distributed rate limiting (only when REDIS_ENABLED=true)
 */
class RedisRateLimiter {
  private limiter: RateLimiterRedis;

  constructor() {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    });

    this.limiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rate-limit',
      points: 100,
      duration: 60,
    });
  }

  async consume(ip: string, points = 1): Promise<RateLimitResult> {
    return this.limiter.consume(ip, points);
  }
}

/**
 * In-memory rate limiter (used when REDIS_ENABLED is not true)
 */
class MemoryRateLimiter {
  private limiter: RateLimiterMemory;

  constructor() {
    this.limiter = new RateLimiterMemory({
      keyPrefix: 'rate-limit',
      points: 100,
      duration: 60,
    });
  }

  async consume(ip: string, points = 1): Promise<RateLimitResult> {
    return this.limiter.consume(ip, points);
  }
}

/**
 * Custom rate limiting guard with IP-based tracking.
 * Uses Redis when REDIS_ENABLED=true, otherwise in-memory (no Redis connection).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly rateLimiter: RedisRateLimiter | MemoryRateLimiter =
    process.env.REDIS_ENABLED === 'true' ? new RedisRateLimiter() : new MemoryRateLimiter();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      const ip = this.getClientIp(request);

      // Consume rate limit tokens
      const result = await this.rateLimiter.consume(ip);

      // Add rate limit headers
      response.setHeader('X-RateLimit-Limit', '100');
      response.setHeader('X-RateLimit-Remaining', result.remainingPoints.toString());
      response.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + result.msBeforeNext) / 1000));

      return true;
    } catch (error) {
      this.logger.warn(`Rate limit exceeded for IP: ${error}`);
      throw error;
    }
  }

  /**
   * Get client IP from request
   */
  private getClientIp(request: Request): string {
    // Check for forwarded headers
    const forwarded = request.headers['x-forwarded-for'] as string | string[] | undefined;
    if (forwarded) {
      const ipArray = Array.isArray(forwarded) ? forwarded : [forwarded];
      return ipArray[0].trim();
    }

    // Check for proxy headers
    const realIp = request.headers['x-real-ip'] as string | string[] | undefined;
    if (realIp) {
      const ip = Array.isArray(realIp) ? realIp[0] : realIp;
      return ip;
    }

    // Fallback to direct IP
    return request.socket?.remoteAddress || request.connection?.remoteAddress || 'unknown';
  }
}
