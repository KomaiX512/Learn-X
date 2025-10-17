import Redis from 'ioredis';
import { Plan, RenderChunk } from '../types';
export declare class CacheManager {
    private redis;
    private readonly TTL_HOURS;
    private readonly CACHE_VERSION;
    constructor(redis: Redis);
    private generateCacheKey;
    cachePlan(query: string, plan: Plan): Promise<void>;
    getCachedPlan(query: string): Promise<Plan | null>;
    cacheChunk(query: string, stepId: number, chunk: RenderChunk): Promise<void>;
    getCachedChunk(query: string, stepId: number): Promise<RenderChunk | null>;
    getStats(): Promise<{
        totalKeys: number;
        planCaches: number;
        chunkCaches: number;
        memoryUsage: string;
    }>;
    clearAll(): Promise<void>;
}
//# sourceMappingURL=cache-manager.d.ts.map