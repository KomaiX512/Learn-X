import { Server as IOServer } from 'socket.io';
import Redis from 'ioredis';
import { SessionParams } from './types';
export declare function initOrchestrator(io: IOServer, redis: Redis): Promise<{
    enqueuePlan: (query: string, sessionId: string, difficulty?: "easy" | "medium" | "hard") => Promise<void>;
    setParams: (sessionId: string, params: SessionParams) => Promise<void>;
    getPerformanceReport: () => string;
    getCacheStats: () => Promise<{
        totalKeys: number;
        planCaches: number;
        chunkCaches: number;
        memoryUsage: string;
    }>;
    clearCache: () => Promise<void>;
}>;
//# sourceMappingURL=orchestrator.d.ts.map