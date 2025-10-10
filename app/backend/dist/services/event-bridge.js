"use strict";
/**
 * EVENT BRIDGE SERVICE
 *
 * Bridges events from BullMQ workers to Socket.IO clients
 * Uses Redis Pub/Sub for inter-process communication
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerEventPublisher = exports.EventBridge = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../logger");
class EventBridge {
    publisher;
    subscriber;
    io;
    isListening = false;
    constructor(io, redisUrl) {
        this.io = io;
        this.publisher = new ioredis_1.default(redisUrl);
        this.subscriber = new ioredis_1.default(redisUrl);
        logger_1.logger.info('[EventBridge] Initialized with Redis Pub/Sub');
    }
    /**
     * Start listening for events from workers
     */
    async startListening() {
        if (this.isListening)
            return;
        // Subscribe to the render events channel
        await this.subscriber.subscribe('render-events');
        this.isListening = true;
        // Handle incoming messages from workers
        this.subscriber.on('message', (channel, message) => {
            if (channel !== 'render-events')
                return;
            try {
                const event = JSON.parse(message);
                const { sessionId, eventName, eventData } = event;
                logger_1.logger.debug(`[EventBridge] Received ${eventName} for session ${sessionId}`);
                // Emit to the appropriate room
                this.io.to(sessionId).emit(eventName, eventData);
                // Log successful emission
                const roomSockets = this.io.sockets.adapter.rooms.get(sessionId);
                if (roomSockets && roomSockets.size > 0) {
                    logger_1.logger.info(`[EventBridge] ✅ Emitted ${eventName} to ${roomSockets.size} sockets in room ${sessionId}`);
                }
                else {
                    logger_1.logger.warn(`[EventBridge] ⚠️ No sockets in room ${sessionId} for ${eventName}`);
                }
            }
            catch (error) {
                logger_1.logger.error('[EventBridge] Failed to process message:', error);
            }
        });
        logger_1.logger.info('[EventBridge] ✅ Started listening for worker events');
    }
    /**
     * Publish an event from a worker (to be used in workers)
     */
    async publishEvent(sessionId, eventName, eventData) {
        const event = {
            sessionId,
            eventName,
            eventData,
            timestamp: Date.now()
        };
        await this.publisher.publish('render-events', JSON.stringify(event));
        logger_1.logger.debug(`[EventBridge] Published ${eventName} for session ${sessionId}`);
    }
    /**
     * Stop listening and cleanup
     */
    async cleanup() {
        if (this.subscriber) {
            await this.subscriber.unsubscribe('render-events');
            this.subscriber.disconnect();
        }
        if (this.publisher) {
            this.publisher.disconnect();
        }
        this.isListening = false;
        logger_1.logger.info('[EventBridge] Cleaned up');
    }
}
exports.EventBridge = EventBridge;
/**
 * Worker-side event publisher
 * Used by BullMQ workers to send events
 */
class WorkerEventPublisher {
    publisher;
    constructor(redisUrl) {
        this.publisher = new ioredis_1.default(redisUrl);
    }
    async emitToClient(sessionId, eventName, eventData) {
        const event = {
            sessionId,
            eventName,
            eventData,
            timestamp: Date.now()
        };
        await this.publisher.publish('render-events', JSON.stringify(event));
        logger_1.logger.info(`[WorkerPublisher] 📤 Published ${eventName} for session ${sessionId}`);
    }
    async cleanup() {
        if (this.publisher) {
            this.publisher.disconnect();
        }
    }
}
exports.WorkerEventPublisher = WorkerEventPublisher;
