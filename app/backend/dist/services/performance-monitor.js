"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
const events_1 = require("events");
const logger_1 = require("../logger");
class PerformanceMonitor extends events_1.EventEmitter {
    metrics;
    activeRequests;
    requestHistory;
    MAX_HISTORY = 100;
    METRICS_INTERVAL = 60000; // Update metrics every minute
    metricsTimer;
    constructor() {
        super();
        this.metrics = this.initializeMetrics();
        this.activeRequests = new Map();
        this.requestHistory = [];
        this.startMetricsTimer();
    }
    initializeMetrics() {
        return {
            planGenerationTime: [],
            stepGenerationTime: [],
            totalRequestTime: [],
            successRate: 100,
            failureRate: 0,
            cacheHitRate: 0,
            averagePlanTime: 0,
            averageStepTime: 0,
            averageTotalTime: 0,
            requestsPerMinute: 0,
            activeRequests: 0,
            totalRequests: 0,
            totalFailures: 0,
            totalCacheHits: 0,
            totalCacheMisses: 0,
            lastUpdated: new Date()
        };
    }
    startMetricsTimer() {
        this.metricsTimer = setInterval(() => {
            this.updateMetrics();
            this.emit('metrics-updated', this.getMetrics());
        }, this.METRICS_INTERVAL);
    }
    // Track new request
    startRequest(sessionId) {
        const tracker = {
            sessionId,
            startTime: Date.now(),
            stepStartTimes: new Map(),
            stepEndTimes: new Map(),
            completed: false,
            failed: false
        };
        this.activeRequests.set(sessionId, tracker);
        this.metrics.activeRequests = this.activeRequests.size;
        this.metrics.totalRequests++;
        logger_1.logger.debug(`[monitor] Started tracking request ${sessionId}`);
    }
    // Track plan generation
    startPlanGeneration(sessionId) {
        const tracker = this.activeRequests.get(sessionId);
        if (tracker) {
            tracker.planStartTime = Date.now();
        }
    }
    endPlanGeneration(sessionId, success = true) {
        const tracker = this.activeRequests.get(sessionId);
        if (tracker && tracker.planStartTime) {
            tracker.planEndTime = Date.now();
            const duration = tracker.planEndTime - tracker.planStartTime;
            this.metrics.planGenerationTime.push(duration);
            // Keep only last 100 measurements
            if (this.metrics.planGenerationTime.length > this.MAX_HISTORY) {
                this.metrics.planGenerationTime.shift();
            }
            logger_1.logger.debug(`[monitor] Plan generation for ${sessionId} took ${duration}ms`);
        }
    }
    // Track step generation
    startStepGeneration(sessionId, stepId) {
        const tracker = this.activeRequests.get(sessionId);
        if (tracker) {
            tracker.stepStartTimes.set(stepId, Date.now());
        }
    }
    endStepGeneration(sessionId, stepId, success = true) {
        const tracker = this.activeRequests.get(sessionId);
        if (tracker) {
            const startTime = tracker.stepStartTimes.get(stepId);
            if (startTime) {
                const endTime = Date.now();
                tracker.stepEndTimes.set(stepId, endTime);
                const duration = endTime - startTime;
                this.metrics.stepGenerationTime.push(duration);
                // Keep only last 100 measurements
                if (this.metrics.stepGenerationTime.length > this.MAX_HISTORY) {
                    this.metrics.stepGenerationTime.shift();
                }
                logger_1.logger.debug(`[monitor] Step ${stepId} generation for ${sessionId} took ${duration}ms`);
            }
        }
    }
    // Track cache hits/misses
    recordCacheHit() {
        this.metrics.totalCacheHits++;
        this.updateCacheHitRate();
    }
    recordCacheMiss() {
        this.metrics.totalCacheMisses++;
        this.updateCacheHitRate();
    }
    updateCacheHitRate() {
        const total = this.metrics.totalCacheHits + this.metrics.totalCacheMisses;
        if (total > 0) {
            this.metrics.cacheHitRate = (this.metrics.totalCacheHits / total) * 100;
        }
    }
    // Complete request tracking
    completeRequest(sessionId, success = true) {
        const tracker = this.activeRequests.get(sessionId);
        if (tracker) {
            tracker.completed = true;
            tracker.failed = !success;
            const totalTime = Date.now() - tracker.startTime;
            this.metrics.totalRequestTime.push(totalTime);
            if (this.metrics.totalRequestTime.length > this.MAX_HISTORY) {
                this.metrics.totalRequestTime.shift();
            }
            if (!success) {
                this.metrics.totalFailures++;
            }
            // Move to history
            this.requestHistory.push(tracker);
            if (this.requestHistory.length > this.MAX_HISTORY) {
                this.requestHistory.shift();
            }
            this.activeRequests.delete(sessionId);
            this.metrics.activeRequests = this.activeRequests.size;
            logger_1.logger.debug(`[monitor] Completed request ${sessionId} in ${totalTime}ms (success: ${success})`);
            this.updateMetrics();
        }
    }
    // Update aggregated metrics
    updateMetrics() {
        // Calculate averages
        if (this.metrics.planGenerationTime.length > 0) {
            const sum = this.metrics.planGenerationTime.reduce((a, b) => a + b, 0);
            this.metrics.averagePlanTime = Math.round(sum / this.metrics.planGenerationTime.length);
        }
        if (this.metrics.stepGenerationTime.length > 0) {
            const sum = this.metrics.stepGenerationTime.reduce((a, b) => a + b, 0);
            this.metrics.averageStepTime = Math.round(sum / this.metrics.stepGenerationTime.length);
        }
        if (this.metrics.totalRequestTime.length > 0) {
            const sum = this.metrics.totalRequestTime.reduce((a, b) => a + b, 0);
            this.metrics.averageTotalTime = Math.round(sum / this.metrics.totalRequestTime.length);
        }
        // Calculate success/failure rates
        if (this.metrics.totalRequests > 0) {
            this.metrics.successRate = ((this.metrics.totalRequests - this.metrics.totalFailures) / this.metrics.totalRequests) * 100;
            this.metrics.failureRate = (this.metrics.totalFailures / this.metrics.totalRequests) * 100;
        }
        // Calculate requests per minute (based on recent history)
        const recentRequests = this.requestHistory.filter(r => Date.now() - r.startTime < 60000);
        this.metrics.requestsPerMinute = recentRequests.length;
        this.metrics.lastUpdated = new Date();
    }
    // Get current metrics
    getMetrics() {
        return { ...this.metrics };
    }
    // Get detailed request history
    getRequestHistory() {
        return [...this.requestHistory];
    }
    // Get active requests
    getActiveRequests() {
        return Array.from(this.activeRequests.values());
    }
    // Generate performance report
    generateReport() {
        const m = this.metrics;
        return `
🎯 PERFORMANCE REPORT
====================
📊 Request Metrics:
  • Total Requests: ${m.totalRequests}
  • Active Requests: ${m.activeRequests}
  • Success Rate: ${m.successRate.toFixed(1)}%
  • Failure Rate: ${m.failureRate.toFixed(1)}%
  • Requests/minute: ${m.requestsPerMinute}

⏱️ Timing Metrics:
  • Avg Plan Generation: ${m.averagePlanTime}ms
  • Avg Step Generation: ${m.averageStepTime}ms
  • Avg Total Time: ${m.averageTotalTime}ms

💾 Cache Metrics:
  • Cache Hit Rate: ${m.cacheHitRate.toFixed(1)}%
  • Total Cache Hits: ${m.totalCacheHits}
  • Total Cache Misses: ${m.totalCacheMisses}

📅 Last Updated: ${m.lastUpdated.toISOString()}
    `;
    }
    // Cleanup
    destroy() {
        if (this.metricsTimer) {
            clearInterval(this.metricsTimer);
        }
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
