import { EventEmitter } from 'events';
interface PerformanceMetrics {
    planGenerationTime: number[];
    stepGenerationTime: number[];
    totalRequestTime: number[];
    successRate: number;
    failureRate: number;
    cacheHitRate: number;
    averagePlanTime: number;
    averageStepTime: number;
    averageTotalTime: number;
    requestsPerMinute: number;
    activeRequests: number;
    totalRequests: number;
    totalFailures: number;
    totalCacheHits: number;
    totalCacheMisses: number;
    lastUpdated: Date;
}
interface RequestTracker {
    sessionId: string;
    startTime: number;
    planStartTime?: number;
    planEndTime?: number;
    stepStartTimes: Map<number, number>;
    stepEndTimes: Map<number, number>;
    completed: boolean;
    failed: boolean;
    error?: string;
}
export declare class PerformanceMonitor extends EventEmitter {
    private metrics;
    private activeRequests;
    private requestHistory;
    private readonly MAX_HISTORY;
    private readonly METRICS_INTERVAL;
    private metricsTimer?;
    constructor();
    private initializeMetrics;
    private startMetricsTimer;
    startRequest(sessionId: string): void;
    startPlanGeneration(sessionId: string): void;
    endPlanGeneration(sessionId: string, success?: boolean): void;
    startStepGeneration(sessionId: string, stepId: number): void;
    endStepGeneration(sessionId: string, stepId: number, success?: boolean): void;
    recordCacheHit(): void;
    recordCacheMiss(): void;
    private updateCacheHitRate;
    completeRequest(sessionId: string, success?: boolean): void;
    private updateMetrics;
    getMetrics(): PerformanceMetrics;
    getRequestHistory(): RequestTracker[];
    getActiveRequests(): RequestTracker[];
    generateReport(): string;
    destroy(): void;
}
export {};
//# sourceMappingURL=performance-monitor.d.ts.map