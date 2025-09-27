import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../logger';
import { Plan, RenderChunk } from '../types';

export class CacheManager {
  private redis: Redis;
  private readonly TTL_HOURS = 24; // Cache for 24 hours
  private readonly CACHE_VERSION = 'v2'; // Bump this to invalidate all caches
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  // Generate cache key based on query similarity
  private generateCacheKey(type: string, query: string, stepId?: number): string {
    // Normalize query for better cache hits
    const normalized = query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    const hash = crypto
      .createHash('sha256')
      .update(`${this.CACHE_VERSION}:${normalized}`)
      .digest('hex')
      .substring(0, 16);
    
    if (stepId !== undefined) {
      return `cache:${type}:${hash}:step:${stepId}`;
    }
    return `cache:${type}:${hash}`;
  }
  
  // Cache plan for a query
  async cachePlan(query: string, plan: Plan): Promise<void> {
    const key = this.generateCacheKey('plan', query);
    try {
      await this.redis.set(
        key,
        JSON.stringify(plan),
        'EX',
        this.TTL_HOURS * 3600
      );
      logger.debug(`[cache] Cached plan for query: "${query.substring(0, 50)}..."`);
    } catch (error) {
      logger.error(`[cache] Failed to cache plan: ${error}`);
    }
  }
  
  // Retrieve cached plan
  async getCachedPlan(query: string): Promise<Plan | null> {
    const key = this.generateCacheKey('plan', query);
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        logger.debug(`[cache] HIT - Found cached plan for query: "${query.substring(0, 50)}..."`);
        return JSON.parse(cached) as Plan;
      }
      logger.debug(`[cache] MISS - No cached plan for query: "${query.substring(0, 50)}..."`);
    } catch (error) {
      logger.error(`[cache] Error retrieving cached plan: ${error}`);
    }
    return null;
  }
  
  // Cache rendered chunk for a specific step
  async cacheChunk(query: string, stepId: number, chunk: RenderChunk): Promise<void> {
    const key = this.generateCacheKey('chunk', query, stepId);
    try {
      await this.redis.set(
        key,
        JSON.stringify(chunk),
        'EX',
        this.TTL_HOURS * 3600
      );
      logger.debug(`[cache] Cached chunk for query step ${stepId}`);
    } catch (error) {
      logger.error(`[cache] Failed to cache chunk: ${error}`);
    }
  }
  
  // Retrieve cached chunk
  async getCachedChunk(query: string, stepId: number): Promise<RenderChunk | null> {
    const key = this.generateCacheKey('chunk', query, stepId);
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        logger.debug(`[cache] HIT - Found cached chunk for step ${stepId}`);
        return JSON.parse(cached) as RenderChunk;
      }
      logger.debug(`[cache] MISS - No cached chunk for step ${stepId}`);
    } catch (error) {
      logger.error(`[cache] Error retrieving cached chunk: ${error}`);
    }
    return null;
  }
  
  // Get cache statistics
  async getStats(): Promise<{
    totalKeys: number;
    planCaches: number;
    chunkCaches: number;
    memoryUsage: string;
  }> {
    try {
      const keys = await this.redis.keys('cache:*');
      const planKeys = keys.filter(k => k.includes(':plan:'));
      const chunkKeys = keys.filter(k => k.includes(':chunk:'));
      
      const info = await this.redis.info('memory');
      const memMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory = memMatch ? memMatch[1] : 'unknown';
      
      return {
        totalKeys: keys.length,
        planCaches: planKeys.length,
        chunkCaches: chunkKeys.length,
        memoryUsage: memory
      };
    } catch (error) {
      logger.error(`[cache] Error getting stats: ${error}`);
      return {
        totalKeys: 0,
        planCaches: 0,
        chunkCaches: 0,
        memoryUsage: 'error'
      };
    }
  }
  
  // Clear all caches (for debugging)
  async clearAll(): Promise<void> {
    try {
      const keys = await this.redis.keys('cache:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug(`[cache] Cleared ${keys.length} cache entries`);
      }
    } catch (error) {
      logger.error(`[cache] Error clearing caches: ${error}`);
    }
  }
}
