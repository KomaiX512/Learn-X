"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../logger");
class CacheManager {
    redis;
    TTL_HOURS = 24; // Cache for 24 hours
    CACHE_VERSION = 'v2'; // Bump this to invalidate all caches
    constructor(redis) {
        this.redis = redis;
    }
    // Generate cache key based on query similarity
    generateCacheKey(type, query, stepId) {
        // Normalize query for better cache hits
        const normalized = query.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
        const hash = crypto_1.default
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
    async cachePlan(query, plan) {
        const key = this.generateCacheKey('plan', query);
        try {
            await this.redis.set(key, JSON.stringify(plan), 'EX', this.TTL_HOURS * 3600);
            logger_1.logger.debug(`[cache] Cached plan for query: "${query.substring(0, 50)}..."`);
        }
        catch (error) {
            logger_1.logger.error(`[cache] Failed to cache plan: ${error}`);
        }
    }
    // Retrieve cached plan
    async getCachedPlan(query) {
        const key = this.generateCacheKey('plan', query);
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                logger_1.logger.debug(`[cache] HIT - Found cached plan for query: "${query.substring(0, 50)}..."`);
                return JSON.parse(cached);
            }
            logger_1.logger.debug(`[cache] MISS - No cached plan for query: "${query.substring(0, 50)}..."`);
        }
        catch (error) {
            logger_1.logger.error(`[cache] Error retrieving cached plan: ${error}`);
        }
        return null;
    }
    // Cache rendered chunk for a specific step
    async cacheChunk(query, stepId, chunk) {
        const key = this.generateCacheKey('chunk', query, stepId);
        try {
            await this.redis.set(key, JSON.stringify(chunk), 'EX', this.TTL_HOURS * 3600);
            logger_1.logger.debug(`[cache] Cached chunk for query step ${stepId}`);
        }
        catch (error) {
            logger_1.logger.error(`[cache] Failed to cache chunk: ${error}`);
        }
    }
    // Retrieve cached chunk
    async getCachedChunk(query, stepId) {
        const key = this.generateCacheKey('chunk', query, stepId);
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                logger_1.logger.debug(`[cache] HIT - Found cached chunk for step ${stepId}`);
                return JSON.parse(cached);
            }
            logger_1.logger.debug(`[cache] MISS - No cached chunk for step ${stepId}`);
        }
        catch (error) {
            logger_1.logger.error(`[cache] Error retrieving cached chunk: ${error}`);
        }
        return null;
    }
    // Get cache statistics
    async getStats() {
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
        }
        catch (error) {
            logger_1.logger.error(`[cache] Error getting stats: ${error}`);
            return {
                totalKeys: 0,
                planCaches: 0,
                chunkCaches: 0,
                memoryUsage: 'error'
            };
        }
    }
    // Clear all caches (for debugging)
    async clearAll() {
        try {
            const keys = await this.redis.keys('cache:*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
                logger_1.logger.debug(`[cache] Cleared ${keys.length} cache entries`);
            }
        }
        catch (error) {
            logger_1.logger.error(`[cache] Error clearing caches: ${error}`);
        }
    }
}
exports.CacheManager = CacheManager;
