import { Server as IOServer } from 'socket.io';
import { RenderChunk, PlanStep } from '../types';
import Redis from 'ioredis';
/**
 * Production-ready delivery manager that ensures content reaches frontend
 */
export declare class DeliveryManager {
    private queue;
    private deliveryTimers;
    private io;
    private redis;
    private maxRetries;
    private retryDelay;
    constructor(io: IOServer, redis: Redis);
    /**
     * Queue content for delivery with automatic retry
     */
    queueForDelivery(sessionId: string, stepId: number, chunk: RenderChunk, step: PlanStep, plan: {
        title: string;
        subtitle: string;
        toc: string[];
    }): Promise<boolean>;
    /**
     * Attempt to deliver content to frontend
     */
    private attemptDelivery;
    /**
     * Schedule a retry for failed delivery
     */
    private scheduleRetry;
    /**
     * Check for pending deliveries when client connects
     */
    checkPendingDeliveries(sessionId: string): Promise<void>;
    /**
     * Remove delivered item from queue
     */
    private removeFromQueue;
    /**
     * Check delivery health and retry stuck items
     */
    private checkDeliveryHealth;
    /**
     * Force flush all queued items for a session
     */
    flushSession(sessionId: string): Promise<void>;
    /**
     * Get delivery statistics
     */
    getStats(): {
        queuedSessions: number;
        totalQueued: number;
        oldestItem: number | null;
    };
}
//# sourceMappingURL=delivery-manager.d.ts.map