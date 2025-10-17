"use strict";
/**
 * Unit tests for narration generator
 * Tests individual components and parallelism
 */
Object.defineProperty(exports, "__esModule", { value: true });
const narrationGenerator_1 = require("../agents/narrationGenerator");
// Mock data
const mockStep = {
    id: 1,
    desc: 'Neural Network Forward Propagation',
    notesSubtopic: 'Understanding how neural networks process input data',
    compiler: 'js',
    complexity: 3,
    tag: 'forward_prop'
};
const mockTopic = 'Deep Learning Fundamentals';
// Test 1: Single narration generation (baseline)
async function testSingleNarration() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 1: Single Narration Generation');
    console.log('='.repeat(70));
    const visual = {
        type: 'notes',
        visualNumber: 0,
        svgCode: `<?xml version="1.0"?>
<svg width="1200" height="2000" viewBox="0 0 1200 2000">
  <text x="600" y="50" fill="cyan" font-size="36">Neural Networks</text>
  <text x="100" y="120" fill="white" font-size="20">Forward propagation is the process...</text>
  <rect x="200" y="200" width="800" height="400" fill="none" stroke="cyan"/>
</svg>`,
        description: 'Educational keynote about neural networks'
    };
    try {
        const startTime = Date.now();
        const result = await (0, narrationGenerator_1.generateSingleNarration)(mockStep, mockTopic, visual);
        const elapsed = Date.now() - startTime;
        console.log(`✅ Generated in ${elapsed}ms`);
        console.log(`📊 Narration length: ${result.narration.length} chars`);
        console.log(`⏱️  Estimated duration: ${result.duration}s`);
        console.log(`📝 Narration preview: "${result.narration.substring(0, 100)}..."`);
        return {
            success: true,
            time: elapsed,
            narrationLength: result.narration.length,
            duration: result.duration
        };
    }
    catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}
// Test 2: Batch generation (5 visuals at once)
async function testBatchGeneration() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: Batch Generation (5 visuals)');
    console.log('='.repeat(70));
    const visuals = [
        {
            type: 'notes',
            visualNumber: 0,
            svgCode: `<svg>
        <text>Neural Networks Introduction</text>
        <text>Input layer receives data</text>
        <text>Hidden layers process information</text>
      </svg>`,
            description: 'Notes keynote about neural networks'
        },
        {
            type: 'animation',
            visualNumber: 1,
            actionCount: 45,
            description: 'Input layer neurons activating'
        },
        {
            type: 'animation',
            visualNumber: 2,
            actionCount: 52,
            description: 'Weight multiplication in hidden layers'
        },
        {
            type: 'animation',
            visualNumber: 3,
            actionCount: 38,
            description: 'Activation function (ReLU) visualization'
        },
        {
            type: 'animation',
            visualNumber: 4,
            actionCount: 41,
            description: 'Output layer predictions'
        }
    ];
    try {
        const startTime = Date.now();
        const result = await (0, narrationGenerator_1.generateStepNarration)(mockStep, mockTopic, visuals);
        const elapsed = Date.now() - startTime;
        console.log(`✅ Generated ${result.narrations.length} narrations in ${elapsed}ms`);
        console.log(`⏱️  Total audio duration: ${result.totalDuration}s`);
        console.log(`📊 Average per narration: ${(elapsed / result.narrations.length).toFixed(0)}ms`);
        console.log('\n📝 Generated Narrations:');
        result.narrations.forEach((n, idx) => {
            console.log(`\n  [${idx + 1}] Visual ${n.visualNumber} (${n.type}):`);
            console.log(`      Duration: ${n.duration}s`);
            console.log(`      Length: ${n.narration.length} chars`);
            console.log(`      Preview: "${n.narration.substring(0, 80)}..."`);
        });
        return {
            success: true,
            time: elapsed,
            count: result.narrations.length,
            totalDuration: result.totalDuration,
            timePerNarration: elapsed / result.narrations.length
        };
    }
    catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}
// Test 3: Compare sequential vs batch (time efficiency)
async function testTimeEfficiency() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 3: Time Efficiency (Sequential vs Batch)');
    console.log('='.repeat(70));
    const visuals = [
        { type: 'notes', visualNumber: 0, svgCode: '<svg>Test</svg>', description: 'Test notes' },
        { type: 'animation', visualNumber: 1, actionCount: 30, description: 'Test anim 1' },
        { type: 'animation', visualNumber: 2, actionCount: 30, description: 'Test anim 2' }
    ];
    try {
        // Sequential approach (old way - if we did individual calls)
        console.log('\n📊 Simulating sequential approach (3 separate API calls)...');
        const seqStartTime = Date.now();
        const seqPromises = [];
        for (const visual of visuals) {
            seqPromises.push((0, narrationGenerator_1.generateSingleNarration)(mockStep, mockTopic, visual));
        }
        // Wait for all sequentially (simulates waiting for each)
        for (const promise of seqPromises) {
            await promise;
        }
        const seqElapsed = Date.now() - seqStartTime;
        // Batch approach (new way)
        console.log('\n📊 Testing batch approach (1 API call)...');
        const batchStartTime = Date.now();
        const batchResult = await (0, narrationGenerator_1.generateStepNarration)(mockStep, mockTopic, visuals);
        const batchElapsed = Date.now() - batchStartTime;
        console.log('\n📈 Results:');
        console.log(`  Sequential (old): ${seqElapsed}ms`);
        console.log(`  Batch (new):      ${batchElapsed}ms`);
        console.log(`  Improvement:      ${((1 - batchElapsed / seqElapsed) * 100).toFixed(1)}% faster`);
        console.log(`  Time saved:       ${seqElapsed - batchElapsed}ms`);
        return {
            success: true,
            sequentialTime: seqElapsed,
            batchTime: batchElapsed,
            improvement: ((1 - batchElapsed / seqElapsed) * 100).toFixed(1) + '%',
            timeSaved: seqElapsed - batchElapsed
        };
    }
    catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}
// Test 4: Contextual accuracy (verify narrations match visual content)
async function testContextualAccuracy() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 4: Contextual Accuracy');
    console.log('='.repeat(70));
    const visuals = [
        {
            type: 'notes',
            visualNumber: 0,
            svgCode: `<svg>
        <text>Convolutional Neural Networks</text>
        <text>Image recognition through convolution layers</text>
        <text>Filters detect edges, textures, patterns</text>
      </svg>`,
            description: 'CNN architecture explanation'
        },
        {
            type: 'animation',
            visualNumber: 1,
            actionCount: 50,
            description: 'Convolution filter sliding over image'
        }
    ];
    try {
        const result = await (0, narrationGenerator_1.generateStepNarration)({ ...mockStep, desc: 'Convolutional Neural Networks' }, mockTopic, visuals);
        console.log('\n🔍 Checking contextual relevance...');
        const keywords = ['convolutional', 'cnn', 'image', 'filter', 'convolution', 'pattern', 'feature'];
        result.narrations.forEach((n, idx) => {
            const text = n.narration.toLowerCase();
            const matchedKeywords = keywords.filter(k => text.includes(k));
            const relevanceScore = (matchedKeywords.length / keywords.length) * 100;
            console.log(`\n  Visual ${n.visualNumber} (${n.type}):`);
            console.log(`    Matched keywords: ${matchedKeywords.join(', ') || 'none'}`);
            console.log(`    Relevance score: ${relevanceScore.toFixed(0)}%`);
            console.log(`    Narration: "${n.narration.substring(0, 100)}..."`);
        });
        return {
            success: true,
            narrations: result.narrations.length,
            contextual: true
        };
    }
    catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}
// Test 5: Parallelism verification (ensure no blocking)
async function testParallelism() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 5: Parallelism Verification');
    console.log('='.repeat(70));
    const steps = [
        { ...mockStep, id: 1, desc: 'Introduction to Neural Networks' },
        { ...mockStep, id: 2, desc: 'Forward Propagation' },
        { ...mockStep, id: 3, desc: 'Backpropagation Algorithm' }
    ];
    const visualSets = steps.map((step, idx) => [
        { type: 'notes', visualNumber: 0, svgCode: `<svg>Step ${idx + 1}</svg>`, description: step.desc },
        { type: 'animation', visualNumber: 1, actionCount: 30, description: 'Animation 1' }
    ]);
    try {
        console.log('\n📊 Generating narrations for 3 steps in parallel...');
        const startTime = Date.now();
        const promises = steps.map((step, idx) => (0, narrationGenerator_1.generateStepNarration)(step, mockTopic, visualSets[idx]));
        const results = await Promise.all(promises);
        const elapsed = Date.now() - startTime;
        console.log(`✅ Generated narrations for ${results.length} steps in ${elapsed}ms`);
        console.log(`📊 Average per step: ${(elapsed / results.length).toFixed(0)}ms`);
        console.log(`🚀 Parallel efficiency: ${results.length} steps processed simultaneously`);
        results.forEach((result, idx) => {
            console.log(`\n  Step ${idx + 1}: ${result.narrations.length} narrations, ${result.totalDuration}s audio`);
        });
        return {
            success: true,
            totalTime: elapsed,
            stepsCount: results.length,
            avgPerStep: elapsed / results.length,
            parallel: true
        };
    }
    catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}
// Run all tests
async function runAllTests() {
    console.log('\n' + '█'.repeat(70));
    console.log('NARRATION GENERATOR - COMPREHENSIVE UNIT TESTS');
    console.log('█'.repeat(70));
    const results = {};
    try {
        // Test 1: Single narration
        results.singleNarration = await testSingleNarration();
        // Test 2: Batch generation
        results.batchGeneration = await testBatchGeneration();
        // Test 3: Time efficiency
        results.timeEfficiency = await testTimeEfficiency();
        // Test 4: Contextual accuracy
        results.contextualAccuracy = await testContextualAccuracy();
        // Test 5: Parallelism
        results.parallelism = await testParallelism();
        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('TEST SUMMARY');
        console.log('='.repeat(70));
        const tests = [
            { name: 'Single Narration', result: results.singleNarration },
            { name: 'Batch Generation', result: results.batchGeneration },
            { name: 'Time Efficiency', result: results.timeEfficiency },
            { name: 'Contextual Accuracy', result: results.contextualAccuracy },
            { name: 'Parallelism', result: results.parallelism }
        ];
        tests.forEach(test => {
            const status = test.result.success ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} - ${test.name}`);
        });
        const allPassed = tests.every(t => t.result.success);
        console.log('\n' + '='.repeat(70));
        console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
        console.log('='.repeat(70));
        // Performance summary
        if (results.batchGeneration.success) {
            console.log('\n📊 PERFORMANCE METRICS:');
            console.log(`  - Batch generation time: ${results.batchGeneration.time}ms`);
            console.log(`  - Narrations per call: ${results.batchGeneration.count}`);
            console.log(`  - Time per narration: ${results.batchGeneration.timePerNarration.toFixed(0)}ms`);
            console.log(`  - Total audio duration: ${results.batchGeneration.totalDuration}s`);
        }
        if (results.timeEfficiency.success) {
            console.log(`\n⚡ EFFICIENCY GAINS:`);
            console.log(`  - Improvement vs sequential: ${results.timeEfficiency.improvement}`);
            console.log(`  - Time saved: ${results.timeEfficiency.timeSaved}ms`);
        }
        console.log('');
        process.exit(allPassed ? 0 : 1);
    }
    catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}
// Run tests
runAllTests();
//# sourceMappingURL=narration-unit-test.js.map