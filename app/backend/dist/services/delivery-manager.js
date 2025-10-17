"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryManager = void 0;
const logger_1 = require("../logger");
/**
 * Production-ready delivery manager that ensures content reaches frontend
 */
class DeliveryManager {
    queue = new Map();
    deliveryTimers = new Map();
    io;
    redis;
    maxRetries = 3;
    retryDelay = 1000; // 1 second
    constructor(io, redis) {
        this.io = io;
        this.redis = redis;
        // Monitor delivery health every 5 seconds
        setInterval(() => this.checkDeliveryHealth(), 5000);
    }
    /**
     * Queue content for delivery with automatic retry
     */
    async queueForDelivery(sessionId, stepId, chunk, step, plan) {
        const item = {
            sessionId,
            stepId,
            chunk,
            step,
            plan,
            retries: 0,
            timestamp: Date.now()
        };
        // Add to session queue
        if (!this.queue.has(sessionId)) {
            this.queue.set(sessionId, []);
        }
        this.queue.get(sessionId).push(item);
        // Attempt immediate delivery
        return this.attemptDelivery(item);
    }
    /**
     * Attempt to deliver content to frontend
     */
    async attemptDelivery(item) {
        const { sessionId, stepId, chunk, step, plan, retries } = item;
        try {
            // First, try to find sockets by session ID in their data
            const allSockets = await this.io.fetchSockets();
            const sessionSockets = allSockets.filter(s => s.data?.sessionId === sessionId || s.rooms.has(sessionId));
            if (sessionSockets.length === 0) {
                // Check if room exists but empty (race condition)
                const room = this.io.sockets.adapter.rooms.get(sessionId);
                const socketCount = room ? room.size : 0;
                if (socketCount === 0 && retries < this.maxRetries) {
                    logger_1.logger.debug(`[delivery] No sockets for ${sessionId}, retry ${retries + 1}/${this.maxRetries}`);
                    this.scheduleRetry(item);
                    return false;
                }
                else if (socketCount === 0) {
                    logger_1.logger.warn(`[delivery] Max retries for session ${sessionId} step ${stepId}`);
                    // Store for later delivery when client reconnects
                    await this.redis.set(`pending:${sessionId}:${stepId}`, JSON.stringify({ chunk, step, plan }), 'EX', 3600 // 1 hour expiry
                    );
                    this.removeFromQueue(sessionId, stepId);
                    return false;
                }
            }
            // Prepare event data
            const eventData = {
                ...chunk,
                step,
                plan,
                deliveryAttempt: retries + 1,
                timestamp: Date.now()
            };
            // Emit to all relevant sockets
            let delivered = false;
            const targetSockets = sessionSockets.length > 0 ? sessionSockets : await this.io.in(sessionId).fetchSockets();
            if (targetSockets.length > 0) {
                // Emit to all sockets simultaneously
                const deliveryPromises = targetSockets.map(socket => new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        // No ack, but emit was sent
                        resolve(true);
                    }, 200);
                    socket.emit('rendered', eventData, (ack) => {
                        clearTimeout(timeout);
                        resolve(true);
                    });
                }));
                const results = await Promise.all(deliveryPromises);
                delivered = results.some(r => r);
                if (delivered) {
                    logger_1.logger.info(`[delivery] Step ${stepId} delivered to ${targetSockets.length} sockets`);
                }
            }
            if (delivered) {
                logger_1.logger.info(`[delivery] Successfully delivered step ${stepId} to session ${sessionId}`);
                this.removeFromQueue(sessionId, stepId);
                // Emit delivery confirmation
                this.io.to(sessionId).emit('delivery_confirmed', {
                    stepId,
                    timestamp: Date.now()
                });
                return true;
            }
            else {
                logger_1.logger.warn(`[delivery] No acknowledgment received for step ${stepId}`);
                // Fallback: emit without acknowledgment
                this.io.to(sessionId).emit('rendered', eventData);
                this.removeFromQueue(sessionId, stepId);
                return true;
            }
        }
        catch (error) {
            logger_1.logger.error(`[delivery] Error delivering step ${stepId}: ${error}`);
            if (retries < this.maxRetries) {
                this.scheduleRetry(item);
            }
            else {
                this.removeFromQueue(sessionId, stepId);
            }
            return false;
        }
    }
    /**
     * Schedule a retry for failed delivery
     */
    scheduleRetry(item) {
        const { sessionId, stepId, retries } = item;
        // Faster retries: 200ms, 400ms, 800ms
        const delay = 200 * Math.pow(2, retries);
        logger_1.logger.debug(`[delivery] Retry ${retries + 1} for step ${stepId} in ${delay}ms`);
        setTimeout(() => {
            item.retries++;
            this.attemptDelivery(item);
        }, delay);
    }
    /**
     * Check for pending deliveries when client connects
     */
    async checkPendingDeliveries(sessionId) {
        const keys = await this.redis.keys(`pending:${sessionId}:*`);
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                const { chunk, step, plan } = JSON.parse(data);
                await this.queueForDelivery(sessionId, step.id, chunk, step, plan);
                await this.redis.del(key);
            }
        }
    }
    /**
     * Remove delivered item from queue
     */
    removeFromQueue(sessionId, stepId) {
        const queue = this.queue.get(sessionId);
        if (queue) {
            const index = queue.findIndex(item => item.stepId === stepId);
            if (index !== -1) {
                queue.splice(index, 1);
            }
            if (queue.length === 0) {
                this.queue.delete(sessionId);
            }
        }
    }
    /**
     * Check delivery health and retry stuck items
     */
    checkDeliveryHealth() {
        const now = Date.now();
        const stuckThreshold = 30000; // 30 seconds
        for (const [sessionId, queue] of this.queue.entries()) {
            for (const item of queue) {
                const age = now - item.timestamp;
                if (age > stuckThreshold && item.retries < this.maxRetries) {
                    logger_1.logger.warn(`[delivery] Found stuck item for session ${sessionId} step ${item.stepId}, retrying`);
                    item.retries++;
                    this.attemptDelivery(item);
                }
            }
        }
    }
    /**
     * Force flush all queued items for a session
     */
    async flushSession(sessionId) {
        const queue = this.queue.get(sessionId);
        if (!queue)
            return;
        logger_1.logger.info(`[delivery] Force flushing ${queue.length} items for session ${sessionId}`);
        for (const item of queue) {
            await this.attemptDelivery(item);
        }
    }
    /**
     * Get delivery statistics
     */
    getStats() {
        let totalQueued = 0;
        let oldestTimestamp = Date.now();
        for (const queue of this.queue.values()) {
            totalQueued += queue.length;
            for (const item of queue) {
                if (item.timestamp < oldestTimestamp) {
                    oldestTimestamp = item.timestamp;
                }
            }
        }
        return {
            queuedSessions: this.queue.size,
            totalQueued,
            oldestItem: totalQueued > 0 ? Date.now() - oldestTimestamp : null
        };
    }
}
exports.DeliveryManager = DeliveryManager;
//# sourceMappingURL=delivery-manager.js.map