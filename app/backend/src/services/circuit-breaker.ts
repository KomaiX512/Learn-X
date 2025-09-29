import { logger } from '../logger';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private resetTimer: NodeJS.Timeout | null = null;
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 3,
      resetTimeout: 10000,
      monitoringPeriod: 60000
    }
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.options.resetTimeout) {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
      // Try half-open
      this.state = 'HALF_OPEN';
      logger.debug(`[circuit-breaker] ${this.name} entering HALF_OPEN state`);
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.successes++;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info(`[circuit-breaker] ${this.name} recovered, now CLOSED`);
    }
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`[circuit-breaker] ${this.name} is now OPEN after ${this.failures} failures`);
      
      // Schedule reset
      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.resetTimer = setTimeout(() => {
        this.state = 'HALF_OPEN';
        logger.debug(`[circuit-breaker] ${this.name} attempting recovery`);
      }, this.options.resetTimeout);
    }
  }
  
  getState(): string {
    return this.state;
  }
  
  getStats(): { state: string; failures: number; successes: number } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes
    };
  }
}
