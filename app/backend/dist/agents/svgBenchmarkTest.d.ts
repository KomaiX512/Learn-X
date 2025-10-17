/**
 * SVG BENCHMARK TESTING FRAMEWORK
 *
 * Tests if our system can generate SVG as detailed as the benchmark
 * Includes retry strategies and stress testing
 */
/**
 * STRESS TEST: Generate detailed SVG for ANY topic
 * With automatic retry on failure
 */
export declare function stressTestWithRetry(topic: string, description: string, apiKey: string, maxRetries?: number): Promise<{
    success: boolean;
    operations: any[];
    attempts: number;
    quality: number;
}>;
/**
 * UNIT TEST SUITE - Test individual components
 */
export declare const UnitTests: {
    /**
     * Test path generation quality
     */
    testPathGeneration(apiKey: string): Promise<boolean>;
    /**
     * Test label generation quality
     */
    testLabelGeneration(apiKey: string): Promise<boolean>;
    /**
     * Test complexity under stress
     */
    testComplexityStress(apiKey: string): Promise<boolean>;
};
/**
 * RUN COMPLETE TEST SUITE
 */
export declare function runCompleteBenchmarkTest(apiKey: string): Promise<void>;
declare const _default: {
    stressTestWithRetry: typeof stressTestWithRetry;
    UnitTests: {
        /**
         * Test path generation quality
         */
        testPathGeneration(apiKey: string): Promise<boolean>;
        /**
         * Test label generation quality
         */
        testLabelGeneration(apiKey: string): Promise<boolean>;
        /**
         * Test complexity under stress
         */
        testComplexityStress(apiKey: string): Promise<boolean>;
    };
    runCompleteBenchmarkTest: typeof runCompleteBenchmarkTest;
};
export default _default;
//# sourceMappingURL=svgBenchmarkTest.d.ts.map