export interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
}
export declare class CircuitBreaker {
    private name;
    private options;
    private state;
    private failures;
    private successes;
    private lastFailureTime;
    private resetTimer;
    constructor(name: string, options?: CircuitBreakerOptions);
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    getState(): string;
    getStats(): {
        state: string;
        failures: number;
        successes: number;
    };
}
//# sourceMappingURL=circuit-breaker.d.ts.map