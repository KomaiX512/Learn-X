"use strict";
/**
 * Test script for narration generator
 * Validates single API call generates all narrations for a step
 */
Object.defineProperty(exports, "__esModule", { value: true });
const narrationGenerator_1 = require("../agents/narrationGenerator");
async function testNarrationGeneration() {
    console.log('\n' + '='.repeat(70));
    console.log('NARRATION GENERATOR TEST');
    console.log('='.repeat(70));
    // Mock step
    const step = {
        id: 1,
        desc: 'Understanding Neural Networks and Backpropagation',
        compiler: 'js',
        complexity: 3,
        tag: 'neural_networks'
    };
    const topic = 'Deep Learning Fundamentals';
    // Mock visuals (1 notes + 4 animations)
    const visuals = [
        {
            type: 'notes',
            visualNumber: 0,
            svgCode: '<svg>...</svg>', // Truncated for brevity
            description: 'Educational keynote about neural networks'
        },
        {
            type: 'animation',
            visualNumber: 1,
            actionCount: 45,
            description: 'Animated neural network layers'
        },
        {
            type: 'animation',
            visualNumber: 2,
            actionCount: 52,
            description: 'Forward propagation visualization'
        },
        {
            type: 'animation',
            visualNumber: 3,
            actionCount: 38,
            description: 'Backpropagation algorithm'
        },
        {
            type: 'animation',
            visualNumber: 4,
            actionCount: 41,
            description: 'Gradient descent optimization'
        }
    ];
    try {
        console.log(`\n📝 Test Input:`);
        console.log(`  - Topic: ${topic}`);
        console.log(`  - Step: ${step.desc}`);
        console.log(`  - Visuals: ${visuals.length} (1 notes + 4 animations)`);
        const startTime = Date.now();
        // Generate narrations in ONE API call
        const result = await (0, narrationGenerator_1.generateStepNarration)(step, topic, visuals);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✅ Narrations generated in ${elapsed}s`);
        console.log(`\n📊 Results:`);
        console.log(`  - Step ID: ${result.stepId}`);
        console.log(`  - Topic: ${result.topic}`);
        console.log(`  - Subtopic: ${result.subtopic}`);
        console.log(`  - Narrations count: ${result.narrations.length}`);
        console.log(`  - Total duration: ${result.totalDuration}s`);
        console.log(`\n🎤 Generated Narrations:\n`);
        result.narrations.forEach((n, idx) => {
            console.log(`Visual ${n.visualNumber} (${n.type}):`);
            console.log(`  Duration: ${n.duration}s`);
            console.log(`  Narration: "${n.narration}"`);
            console.log('');
        });
        // Validation
        console.log(`\n✅ VALIDATION:`);
        const checks = [
            { name: 'Got all narrations', pass: result.narrations.length === visuals.length },
            { name: 'All narrations have text', pass: result.narrations.every(n => n.narration.length > 0) },
            { name: 'All narrations have duration', pass: result.narrations.every(n => n.duration > 0) },
            { name: 'Total duration > 0', pass: result.totalDuration > 0 },
            { name: 'API call time < 10s', pass: parseFloat(elapsed) < 10 }
        ];
        checks.forEach(check => {
            console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
        });
        const allPassed = checks.every(c => c.pass);
        console.log('\n' + '='.repeat(70));
        console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
        console.log('='.repeat(70) + '\n');
        process.exit(allPassed ? 0 : 1);
    }
    catch (error) {
        console.error(`\n❌ Test failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}
// Run test
testNarrationGeneration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=narration-test.js.map