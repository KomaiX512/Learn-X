"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const logger_1 = require("../logger");
class CircuitBreaker {
    name;
    options;
    state = 'CLOSED';
    failures = 0;
    successes = 0;
    lastFailureTime = 0;
    resetTimer = null;
    constructor(name, options = {
        failureThreshold: 3,
        resetTimeout: 10000,
        monitoringPeriod: 60000
    }) {
        this.name = name;
        this.options = options;
    }
    async execute(fn) {
        if (this.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;
            if (timeSinceLastFailure < this.options.resetTimeout) {
                throw new Error(`Circuit breaker ${this.name} is OPEN`);
            }
            // Try half-open
            this.state = 'HALF_OPEN';
            logger_1.logger.debug(`[circuit-breaker] ${this.name} entering HALF_OPEN state`);
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failures = 0;
        this.successes++;
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            logger_1.logger.info(`[circuit-breaker] ${this.name} recovered, now CLOSED`);
        }
    }
    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.options.failureThreshold) {
            this.state = 'OPEN';
            logger_1.logger.warn(`[circuit-breaker] ${this.name} is now OPEN after ${this.failures} failures`);
            // Schedule reset
            if (this.resetTimer)
                clearTimeout(this.resetTimer);
            this.resetTimer = setTimeout(() => {
                this.state = 'HALF_OPEN';
                logger_1.logger.debug(`[circuit-breaker] ${this.name} attempting recovery`);
            }, this.options.resetTimeout);
        }
    }
    getState() {
        return this.state;
    }
    getStats() {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes
        };
    }
}
exports.CircuitBreaker = CircuitBreaker;
