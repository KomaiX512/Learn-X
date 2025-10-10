"use strict";
/**
 * SVG BENCHMARK TESTING FRAMEWORK
 *
 * Tests if our system can generate SVG as detailed as the benchmark
 * Includes retry strategies and stress testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitTests = void 0;
exports.stressTestWithRetry = stressTestWithRetry;
exports.runCompleteBenchmarkTest = runCompleteBenchmarkTest;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
/**
 * BENCHMARK STANDARD - Based on Human Heart SVG
 * This is the MINIMUM acceptable quality
 */
const BENCHMARK_COMPLEXITY = {
    minPaths: 10, // Heart has ~10 complex paths
    minPathCommands: 8, // Each path should have 8+ commands
    minLabels: 8, // Heart has 12+ labels
    minCurves: 5, // Uses Q and C curves extensively
    minGroups: 5, // Organized in logical groups
    totalOperations: 40, // Minimum for detailed visual
    requiredElements: [
        'complex curves (C, Q commands)',
        'labeled components',
        'color differentiation',
        'hierarchical structure',
        'scientific accuracy'
    ]
};
/**
 * STRESS TEST: Generate detailed SVG for ANY topic
 * With automatic retry on failure
 */
async function stressTestWithRetry(topic, description, apiKey, maxRetries = 5) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    let bestResult = { operations: [], quality: 0 };
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logger_1.logger.info(`[STRESS-TEST] Attempt ${attempt}/${maxRetries} for: ${topic}`);
        try {
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: {
                    temperature: 0.85 + (attempt * 0.02), // Increase creativity each retry
                    maxOutputTokens: 25000, // Maximum for complex SVG
                    topK: 60,
                    topP: 0.95
                },
                systemInstruction: `You are an SVG master creating publication-quality scientific diagrams.
Generate ONLY a JSON array of operations that create detailed, anatomically/scientifically accurate visuals.
Your output must match the complexity of medical textbook illustrations.`
            });
            const prompt = createBenchmarkPrompt(topic, description, attempt);
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            // Parse and validate
            const operations = parseOperations(text);
            const quality = assessQuality(operations);
            logger_1.logger.info(`[STRESS-TEST] Attempt ${attempt} - Quality: ${quality}/100`);
            if (quality > bestResult.quality) {
                bestResult = { operations, quality };
            }
            // Success if quality meets benchmark
            if (quality >= 75) {
                logger_1.logger.info(`[STRESS-TEST] ✅ SUCCESS on attempt ${attempt}! Quality: ${quality}`);
                return { success: true, operations, attempts: attempt, quality };
            }
            // Otherwise retry with adjusted parameters
            logger_1.logger.warn(`[STRESS-TEST] Quality ${quality} below threshold, retrying...`);
        }
        catch (error) {
            logger_1.logger.error(`[STRESS-TEST] Attempt ${attempt} error:`, error.message);
            // Retry strategy based on error type
            if (error.message?.includes('429') || error.message?.includes('quota')) {
                logger_1.logger.info(`[STRESS-TEST] Rate limit hit, waiting ${attempt * 2} seconds...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            }
        }
    }
    // Return best result even if not perfect
    logger_1.logger.warn(`[STRESS-TEST] Max retries reached. Best quality: ${bestResult.quality}`);
    return {
        success: bestResult.quality >= 60,
        operations: bestResult.operations,
        attempts: maxRetries,
        quality: bestResult.quality
    };
}
/**
 * CREATE BENCHMARK-QUALITY PROMPT
 * Forces generation of SVG matching the heart example's complexity
 */
function createBenchmarkPrompt(topic, description, attempt) {
    // Adjust prompt based on attempt number for better results
    const emphasisLevel = attempt > 2 ? 'EXTREME' : 'HIGH';
    return `Generate ${emphasisLevel} DETAIL visualization for: "${topic}"
Description: "${description}"

📏 BENCHMARK STANDARD (Based on Medical Textbook Quality):

Your output must match this complexity level:
<svg width="600" height="700">
  <!-- Example: Human Heart with multiple chambers and vessels -->
  <g id="right-atrium">
    <path d="M300,200 Q380,100 450,150 L450,250 Q380,300 300,200 Z"/>
    <text x="400" y="200">Right Atrium</text>
  </g>
  <g id="left-ventricle">
    <path d="M300,200 L300,450 Q220,500 150,450 L150,250 Q220,300 300,200 Z"/>
    <text x="200" y="400">Left Ventricle</text>
  </g>
  <path d="M280,100 C270,50 300,20 350,30 C400,40 420,80 400,150 L380,150 C390,90 380,60 350,50 C320,40 290,70 300,100 Z"/>
  <!-- Multiple complex paths with curves, labels, proper structure -->
</svg>

🎯 REQUIREMENTS (MANDATORY):

1. PATH COMPLEXITY:
   - Each structure must use 8+ path commands
   - Use Bezier curves (C) for smooth organic shapes
   - Use Quadratic curves (Q) for mathematical precision
   - Combine multiple subpaths (M...Z M...Z) in single operations

2. SCIENTIFIC ACCURACY:
   - Anatomically/structurally correct proportions
   - Proper spatial relationships
   - Accurate terminology in labels
   - Realistic color coding (arteries=red, veins=blue, etc.)

3. HIERARCHICAL ORGANIZATION:
   - Group related elements
   - Layer from background to foreground
   - Clear visual hierarchy with strokeWidth variation
   - Use opacity for depth (0.3 for back, 1.0 for front)

4. RICH LABELING:
   - Every major structure must be labeled
   - Use proper scientific nomenclature
   - Include measurements/values where relevant
   - Add descriptive annotations

5. VISUAL ELEMENTS DISTRIBUTION:
   - 40% complex paths (customPath with 10+ commands each)
   - 25% labels and annotations (drawLabel)
   - 15% connecting lines/arrows (drawVector)
   - 10% highlights/emphasis (particles, glow)
   - 10% organizational elements (groups, layers)

🔧 OUTPUT FORMAT:
[
  {
    "op": "customPath",
    "path": "M300,200 Q380,100 450,150 L450,250 Q380,300 300,200 Z M300,200 L300,450 Q380,500 450,450 L450,250",
    "stroke": "#cc0000",
    "strokeWidth": 2,
    "fill": "rgba(255,200,200,0.3)"
  },
  {
    "op": "drawLabel",
    "text": "Right Atrium",
    "x": 0.65,
    "y": 0.3,
    "fontSize": 16,
    "color": "#333333"
  },
  ...minimum 40 operations...
]

${attempt > 3 ? `
⚠️ CRITICAL: Previous attempts were too simple. This time:
- Make paths MORE complex (15+ commands)
- Add MORE labels (every substructure)
- Include MORE detail layers
- Show internal structures, not just outlines
` : ''}

Generate EXACTLY like the benchmark example. Output ONLY the JSON array.`;
}
/**
 * PARSE OPERATIONS with error recovery
 */
function parseOperations(text) {
    try {
        // Standard JSON parse
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    }
    catch {
        // Fallback: Extract operation objects
        const matches = Array.from(text.matchAll(/\{[^{}]*"op"[^{}]*\}/g));
        const operations = matches.map(m => {
            try {
                return JSON.parse(m[0].replace(/,\s*}/g, '}'));
            }
            catch {
                return null;
            }
        }).filter(op => op !== null);
        if (operations.length > 0) {
            logger_1.logger.info(`[PARSE] Recovered ${operations.length} operations via fallback`);
            return operations;
        }
        return [];
    }
}
/**
 * ASSESS QUALITY against benchmark standard
 */
function assessQuality(operations) {
    if (!operations || operations.length === 0)
        return 0;
    let score = 0;
    const metrics = {
        totalOps: operations.length,
        complexPaths: 0,
        totalPathComplexity: 0,
        labels: 0,
        curves: 0,
        vectors: 0,
        colors: new Set(),
        avgPathComplexity: 0
    };
    // Analyze each operation
    operations.forEach((op) => {
        if (op.op === 'customPath' && op.path) {
            metrics.complexPaths++;
            // Count path commands
            const commands = op.path.match(/[MLCQAHVS]/gi) || [];
            const complexity = commands.length;
            metrics.totalPathComplexity += complexity;
            // Count curves
            const curves = op.path.match(/[CQ]/gi) || [];
            metrics.curves += curves.length;
            // Scoring
            if (complexity >= 15)
                score += 15; // Excellent complexity
            else if (complexity >= 10)
                score += 10; // Good complexity
            else if (complexity >= 5)
                score += 5; // Acceptable
            // Bonus for curves
            if (curves.length >= 3)
                score += 5;
        }
        if (op.op === 'drawLabel' && op.text) {
            metrics.labels++;
            if (op.text.length > 10)
                score += 2; // Detailed label
        }
        if (op.op === 'drawVector') {
            metrics.vectors++;
            score += 1;
        }
        if (op.stroke || op.fill || op.color) {
            metrics.colors.add(op.stroke || op.fill || op.color);
        }
    });
    // Calculate average complexity
    metrics.avgPathComplexity = metrics.complexPaths > 0
        ? metrics.totalPathComplexity / metrics.complexPaths
        : 0;
    // Overall scoring
    if (metrics.totalOps >= 40)
        score += 10;
    if (metrics.complexPaths >= 10)
        score += 15;
    if (metrics.labels >= 8)
        score += 10;
    if (metrics.avgPathComplexity >= 10)
        score += 15;
    if (metrics.colors.size >= 5)
        score += 5; // Color variety
    // Penalties
    if (metrics.totalOps < 20)
        score -= 20;
    if (metrics.avgPathComplexity < 5)
        score -= 10;
    if (metrics.labels < 5)
        score -= 10;
    // Log metrics for debugging
    logger_1.logger.debug(`[QUALITY] Metrics:`, metrics);
    return Math.max(0, Math.min(100, score));
}
/**
 * UNIT TEST SUITE - Test individual components
 */
exports.UnitTests = {
    /**
     * Test path generation quality
     */
    async testPathGeneration(apiKey) {
        const result = await stressTestWithRetry('Cell Mitochondria', 'Create detailed mitochondria with cristae, matrix, and double membrane', apiKey, 3);
        const passed = result.quality >= 70 &&
            result.operations.some((op) => op.op === 'customPath' &&
                op.path &&
                op.path.length > 100);
        logger_1.logger.info(`[UNIT-TEST] Path Generation: ${passed ? '✅ PASS' : '❌ FAIL'} (Quality: ${result.quality})`);
        return passed;
    },
    /**
     * Test label generation quality
     */
    async testLabelGeneration(apiKey) {
        const result = await stressTestWithRetry('DNA Structure', 'Show DNA double helix with base pairs labeled', apiKey, 3);
        const labels = result.operations.filter((op) => op.op === 'drawLabel');
        const passed = labels.length >= 8 &&
            labels.every((op) => op.text && op.text.length > 0);
        logger_1.logger.info(`[UNIT-TEST] Label Generation: ${passed ? '✅ PASS' : '❌ FAIL'} (${labels.length} labels)`);
        return passed;
    },
    /**
     * Test complexity under stress
     */
    async testComplexityStress(apiKey) {
        const topics = [
            { topic: 'Neural Network', desc: 'Multi-layer perceptron with connections' },
            { topic: 'Chemical Reaction', desc: 'Photosynthesis light reactions in detail' },
            { topic: 'Physics Circuit', desc: 'Op-amp integrator circuit with components' }
        ];
        let totalQuality = 0;
        for (const { topic, desc } of topics) {
            const result = await stressTestWithRetry(topic, desc, apiKey, 2);
            totalQuality += result.quality;
        }
        const avgQuality = totalQuality / topics.length;
        const passed = avgQuality >= 65;
        logger_1.logger.info(`[UNIT-TEST] Complexity Stress: ${passed ? '✅ PASS' : '❌ FAIL'} (Avg Quality: ${avgQuality.toFixed(1)})`);
        return passed;
    }
};
/**
 * RUN COMPLETE TEST SUITE
 */
async function runCompleteBenchmarkTest(apiKey) {
    console.log('\n════════════════════════════════════════════════════');
    console.log('🔬 BENCHMARK QUALITY TEST SUITE');
    console.log('Target: Match Human Heart SVG complexity');
    console.log('════════════════════════════════════════════════════\n');
    const tests = [
        { name: 'Path Generation', fn: exports.UnitTests.testPathGeneration },
        { name: 'Label Generation', fn: exports.UnitTests.testLabelGeneration },
        { name: 'Complexity Stress', fn: exports.UnitTests.testComplexityStress }
    ];
    let passed = 0;
    let failed = 0;
    for (const test of tests) {
        console.log(`Running: ${test.name}...`);
        try {
            const result = await test.fn(apiKey);
            if (result)
                passed++;
            else
                failed++;
        }
        catch (error) {
            console.error(`Test failed with error: ${error.message}`);
            failed++;
        }
    }
    console.log('\n════════════════════════════════════════════════════');
    console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
    console.log(passed === tests.length ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
    console.log('════════════════════════════════════════════════════\n');
}
exports.default = { stressTestWithRetry, UnitTests: exports.UnitTests, runCompleteBenchmarkTest };
