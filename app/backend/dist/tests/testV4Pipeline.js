"use strict";
/**
 * V4 PIPELINE UNIT TESTS
 *
 * Tests the complete workflow:
 * 1. SubPlanner creates detailed concepts
 * 2. FocusedGenerator creates operations
 * 3. Cross-verify descriptions match generated code
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllTests = runAllTests;
exports.testSubPlanner = testSubPlanner;
exports.testFocusedGenerator = testFocusedGenerator;
exports.testCompleteV4Pipeline = testCompleteV4Pipeline;
exports.stressTest = stressTest;
const subPlanner_1 = require("../agents/subPlanner");
const focusedVisualGenerator_1 = require("../agents/focusedVisualGenerator");
const codegenV4_1 = require("../agents/codegenV4");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const API_KEY = process.env.GEMINI_API_KEY;
// Test topics covering different domains
const TEST_CASES = [
    {
        topic: 'DNA replication',
        step: {
            id: 1,
            tag: 'hook',
            desc: 'DNA is the blueprint of life, storing genetic information in a double helix structure',
            compiler: 'js'
        }
    },
    {
        topic: 'Neural networks and backpropagation',
        step: {
            id: 1,
            tag: 'intuition',
            desc: 'A neural network learns by adjusting weights through backpropagation',
            compiler: 'js'
        }
    },
    {
        topic: 'Photosynthesis',
        step: {
            id: 1,
            tag: 'formalism',
            desc: 'Plants convert light energy into chemical energy through photosynthesis',
            compiler: 'js'
        }
    },
    {
        topic: 'Quantum mechanics',
        step: {
            id: 1,
            tag: 'exploration',
            desc: 'Quantum mechanics describes the behavior of matter at atomic scales',
            compiler: 'js'
        }
    }
];
/**
 * TEST 1: SubPlanner generates detailed concepts
 */
async function testSubPlanner() {
    console.log('\n'.repeat(3));
    console.log('═'.repeat(100));
    console.log('TEST 1: SUBPLANNER - Detailed Visual Concepts');
    console.log('═'.repeat(100));
    for (const testCase of TEST_CASES) {
        console.log(`\n${'─'.repeat(100)}`);
        console.log(`Testing: "${testCase.topic}"`);
        console.log(`Step: ${testCase.step.tag} - ${testCase.step.desc}`);
        console.log(`${'─'.repeat(100)}\n`);
        try {
            const concepts = await (0, subPlanner_1.createVisualPlan)(testCase.step, testCase.topic, API_KEY);
            console.log(`✅ SUCCESS: Generated ${concepts.length} concepts\n`);
            // Verify each concept has required fields
            concepts.forEach((concept, i) => {
                console.log(`\n📌 CONCEPT ${i + 1}:`);
                console.log(`   Title: ${concept.title}`);
                console.log(`   Type: ${concept.structureType}`);
                console.log(`   Description length: ${concept.description.length} chars`);
                console.log(`   Description: ${concept.description}`);
                // Check description quality
                const hasCoordinates = /x[=:]|y[=:]|0\.\d/.test(concept.description);
                const hasColors = /#[0-9a-fA-F]{6}|blue|red|green|orange|purple/.test(concept.description);
                const hasStructure = /create|draw|show|illustrate|display/i.test(concept.description);
                const hasDetails = concept.description.length > 100;
                console.log(`   ✓ Has coordinates: ${hasCoordinates}`);
                console.log(`   ✓ Has colors: ${hasColors}`);
                console.log(`   ✓ Has structure words: ${hasStructure}`);
                console.log(`   ✓ Has sufficient detail: ${hasDetails} (${concept.description.length} chars)`);
                if (!hasDetails) {
                    console.log(`   ⚠️  WARNING: Description too short! Should be 3-4 lines with specifics`);
                }
            });
            console.log(`\n${'═'.repeat(100)}`);
        }
        catch (error) {
            console.error(`❌ FAILED:`, error);
        }
        // Delay between tests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}
/**
 * TEST 2: FocusedGenerator creates operations from concepts
 */
async function testFocusedGenerator() {
    console.log('\n'.repeat(3));
    console.log('═'.repeat(100));
    console.log('TEST 2: FOCUSED GENERATOR - Operations from Detailed Descriptions');
    console.log('═'.repeat(100));
    const testCase = TEST_CASES[0]; // DNA replication
    console.log(`\n${'─'.repeat(100)}`);
    console.log(`Testing: "${testCase.topic}"`);
    console.log(`${'─'.repeat(100)}\n`);
    try {
        // First get concepts
        const concepts = await (0, subPlanner_1.createVisualPlan)(testCase.step, testCase.topic, API_KEY);
        console.log(`✅ Got ${concepts.length} concepts\n`);
        // Test generating operations for first concept
        const concept = concepts[0];
        console.log(`📌 Testing concept: "${concept.title}"`);
        console.log(`   Description: ${concept.description}\n`);
        const operations = await (0, focusedVisualGenerator_1.generateVisualFromConcept)(concept, testCase.topic, API_KEY, 0);
        console.log(`✅ SUCCESS: Generated ${operations.length} operations\n`);
        // Analyze operations
        const opTypes = {};
        operations.forEach(op => {
            opTypes[op.op] = (opTypes[op.op] || 0) + 1;
        });
        console.log(`📊 Operation Types:`);
        Object.entries(opTypes).forEach(([op, count]) => {
            console.log(`   ${op}: ${count}`);
        });
        // Check for generic shapes
        const genericOps = ['drawCircle', 'drawRect', 'drawLine'];
        const advancedOps = ['customPath', 'drawMolecule', 'drawCellStructure', 'drawNeuralNetwork', 'drawMolecularStructure'];
        const genericCount = genericOps.reduce((sum, op) => sum + (opTypes[op] || 0), 0);
        const advancedCount = advancedOps.reduce((sum, op) => sum + (opTypes[op] || 0), 0);
        console.log(`\n🔍 QUALITY CHECK:`);
        console.log(`   Generic shapes (circle, rect, line): ${genericCount}`);
        console.log(`   Advanced operations: ${advancedCount}`);
        if (genericCount > advancedCount && operations.length > 5) {
            console.log(`   ⚠️  WARNING: Too many generic shapes! This might indicate poor generation.`);
        }
        else {
            console.log(`   ✅ Good! More advanced operations than generic shapes.`);
        }
        // Sample first 3 operations
        console.log(`\n📄 Sample Operations (first 3):`);
        operations.slice(0, 3).forEach((op, i) => {
            console.log(`   ${i + 1}. ${JSON.stringify(op, null, 2)}`);
        });
        console.log(`\n${'═'.repeat(100)}`);
    }
    catch (error) {
        console.error(`❌ FAILED:`, error);
    }
}
/**
 * TEST 3: Complete V4 pipeline end-to-end
 */
async function testCompleteV4Pipeline() {
    console.log('\n'.repeat(3));
    console.log('═'.repeat(100));
    console.log('TEST 3: COMPLETE V4 PIPELINE - End-to-End');
    console.log('═'.repeat(100));
    for (const testCase of TEST_CASES) {
        console.log(`\n${'─'.repeat(100)}`);
        console.log(`Testing: "${testCase.topic}"`);
        console.log(`Step: ${testCase.step.tag} - ${testCase.step.desc}`);
        console.log(`${'─'.repeat(100)}\n`);
        const startTime = Date.now();
        try {
            const result = await (0, codegenV4_1.codegenV4)(testCase.step, testCase.topic, API_KEY);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`\n✅ SUCCESS: Generated in ${duration}s`);
            console.log(`   Total operations: ${result.actions.length}`);
            // Analyze operations
            const opTypes = {};
            result.actions.forEach(op => {
                opTypes[op.op] = (opTypes[op.op] || 0) + 1;
            });
            console.log(`\n📊 Operation Distribution:`);
            Object.entries(opTypes)
                .sort((a, b) => b[1] - a[1])
                .forEach(([op, count]) => {
                console.log(`   ${op}: ${count}`);
            });
            // Quality metrics
            const genericCount = (opTypes['drawCircle'] || 0) + (opTypes['drawRect'] || 0);
            const advancedCount = (opTypes['customPath'] || 0) + (opTypes['drawMolecule'] || 0) +
                (opTypes['drawCellStructure'] || 0) + (opTypes['drawNeuralNetwork'] || 0);
            console.log(`\n📈 QUALITY METRICS:`);
            console.log(`   Total operations: ${result.actions.length}`);
            console.log(`   Generic shapes: ${genericCount} (${((genericCount / result.actions.length) * 100).toFixed(1)}%)`);
            console.log(`   Advanced ops: ${advancedCount} (${((advancedCount / result.actions.length) * 100).toFixed(1)}%)`);
            console.log(`   Generation time: ${duration}s`);
            // Quality verdict
            if (result.actions.length >= 50) {
                console.log(`   🏆 HIGH QUALITY (50+ operations)`);
            }
            else if (result.actions.length >= 40) {
                console.log(`   ✅ GOOD QUALITY (40-49 operations)`);
            }
            else if (result.actions.length >= 30) {
                console.log(`   ⚠️  ACCEPTABLE (30-39 operations)`);
            }
            else {
                console.log(`   ❌ LOW QUALITY (<30 operations)`);
            }
            if (genericCount > result.actions.length * 0.5) {
                console.log(`   ⚠️  WARNING: Over 50% generic shapes - might be too simplistic`);
            }
            console.log(`\n${'═'.repeat(100)}`);
        }
        catch (error) {
            console.error(`❌ FAILED:`, error);
        }
        // Delay between tests
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}
/**
 * TEST 4: Stress test - multiple rapid generations
 */
async function stressTest() {
    console.log('\n'.repeat(3));
    console.log('═'.repeat(100));
    console.log('TEST 4: STRESS TEST - Multiple Rapid Generations');
    console.log('═'.repeat(100));
    const iterations = 3;
    const results = [];
    for (let i = 0; i < iterations; i++) {
        console.log(`\n${'─'.repeat(100)}`);
        console.log(`Iteration ${i + 1}/${iterations}`);
        console.log(`${'─'.repeat(100)}\n`);
        const testCase = TEST_CASES[i % TEST_CASES.length];
        const startTime = Date.now();
        try {
            const result = await (0, codegenV4_1.codegenV4)(testCase.step, testCase.topic, API_KEY);
            const duration = (Date.now() - startTime) / 1000;
            results.push({
                iteration: i + 1,
                topic: testCase.topic,
                success: true,
                operations: result.actions.length,
                duration
            });
            console.log(`✅ Iteration ${i + 1}: ${result.actions.length} ops in ${duration.toFixed(2)}s`);
        }
        catch (error) {
            results.push({
                iteration: i + 1,
                topic: testCase.topic,
                success: false,
                error: error.message
            });
            console.error(`❌ Iteration ${i + 1} FAILED:`, error.message);
        }
        // Delay between iterations
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    // Summary
    console.log(`\n${'═'.repeat(100)}`);
    console.log(`STRESS TEST SUMMARY`);
    console.log(`${'═'.repeat(100)}\n`);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    console.log(`Total iterations: ${iterations}`);
    console.log(`Successful: ${successful.length} (${((successful.length / iterations) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed.length} (${((failed.length / iterations) * 100).toFixed(1)}%)`);
    if (successful.length > 0) {
        const avgOps = successful.reduce((sum, r) => sum + r.operations, 0) / successful.length;
        const avgTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        console.log(`\nAverage operations: ${avgOps.toFixed(1)}`);
        console.log(`Average time: ${avgTime.toFixed(2)}s`);
    }
    console.log(`\n${'═'.repeat(100)}`);
}
/**
 * RUN ALL TESTS
 */
async function runAllTests() {
    console.log('\n'.repeat(2));
    console.log('🚀 STARTING V4 PIPELINE UNIT TESTS');
    console.log('═'.repeat(100));
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`API Key: ${API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log('═'.repeat(100));
    if (!API_KEY) {
        console.error('❌ GEMINI_API_KEY not found in environment!');
        process.exit(1);
    }
    try {
        // Run tests sequentially
        await testSubPlanner();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await testFocusedGenerator();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await testCompleteV4Pipeline();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await stressTest();
        console.log('\n'.repeat(2));
        console.log('═'.repeat(100));
        console.log('✅ ALL TESTS COMPLETED');
        console.log('═'.repeat(100));
    }
    catch (error) {
        console.error('\n❌ TEST SUITE FAILED:', error);
        process.exit(1);
    }
}
// Run tests if called directly
if (require.main === module) {
    runAllTests().catch(console.error);
}
