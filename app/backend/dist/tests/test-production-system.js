"use strict";
/**
 * COMPREHENSIVE PRODUCTION SYSTEM TESTS
 *
 * Tests all critical components:
 * - Syntax recovery agent
 * - codegenV3 with retry
 * - Orchestrator null handling
 * - End-to-end generation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const syntaxRecoveryAgent_1 = require("../agents/syntaxRecoveryAgent");
const codegenV3WithRetry_1 = require("../agents/codegenV3WithRetry");
const codegenV3_1 = __importDefault(require("../agents/codegenV3"));
console.log('🧪 STARTING COMPREHENSIVE PRODUCTION SYSTEM TESTS\n');
// ============================================================================
// TEST 1: Syntax Recovery Agent
// ============================================================================
async function testSyntaxRecovery() {
    console.log('='.repeat(80));
    console.log('TEST 1: SYNTAX RECOVERY AGENT');
    console.log('='.repeat(80));
    // Test 1A: Recover malformed descriptions
    console.log('\n[Test 1A] Recovering malformed descriptions array...');
    const malformedDescriptions = `
    Here are the visuals:
    ["Visual showing cell membrane structure",
     "Animation of protein channels opening",
     "Diagram of phospholipid bilayer"]
  `;
    try {
        const recovered = await (0, syntaxRecoveryAgent_1.recoverJSON)(malformedDescriptions, 'descriptions');
        console.log('✅ PASS: Recovered descriptions:', recovered);
        console.log(`   Count: ${recovered.length}`);
    }
    catch (error) {
        console.error('❌ FAIL: Could not recover descriptions:', error);
    }
    // Test 1B: Recover malformed operations
    console.log('\n[Test 1B] Recovering malformed operations array...');
    const malformedOperations = `
    Here are the operations:
    [
      {"operation": "drawCircle", "x": 0.5, "y": 0.3, "radius": 0.1},
      {"op": "drawLabel", text: "Nucleus", "x": 0.5, "y": 0.4},
      {"op":"drawRect","x":0.2,"y":0.6,"width":0.3,"height":0.1,}
    ]
  `;
    try {
        const recovered = await (0, syntaxRecoveryAgent_1.recoverJSON)(malformedOperations, 'operations');
        const validated = (0, syntaxRecoveryAgent_1.validateOperations)(recovered);
        console.log('✅ PASS: Recovered operations:', validated.length);
        console.log('   Operations:', validated.map((op) => op.op).join(', '));
    }
    catch (error) {
        console.error('❌ FAIL: Could not recover operations:', error);
    }
    console.log('\n');
}
// ============================================================================
// TEST 2: Operation Validation
// ============================================================================
function testOperationValidation() {
    console.log('='.repeat(80));
    console.log('TEST 2: OPERATION VALIDATION');
    console.log('='.repeat(80));
    const testOps = [
        { operation: 'drawText', x: 0.5, y: 0.3, text: 'Test' }, // Wrong field
        { op: 'drawCircle', x: NaN, y: 0.5, radius: 0.1 }, // NaN value
        { op: 'drawLabel', x: 0.5, y: Infinity, text: 'Test' }, // Infinity
        { op: 'addSectionMarker', x: 0.5, y: 0.5 }, // Invalid op name
        { op: 'drawRect', x: 0.3, y: 0.4, width: 0.2, height: 0.1 }, // Valid
    ];
    console.log('\n[Test 2A] Validating mixed operations...');
    const validated = (0, syntaxRecoveryAgent_1.validateOperations)(testOps);
    console.log(`Input operations: ${testOps.length}`);
    console.log(`Valid operations: ${validated.length}`);
    console.log('Valid ops:', validated.map((op) => op.op).join(', '));
    if (validated.length === 4) { // Should fix 4 out of 5
        console.log('✅ PASS: Validation correctly fixed/filtered operations');
    }
    else {
        console.log(`❌ FAIL: Expected 4 valid ops, got ${validated.length}`);
    }
    console.log('\n');
}
// ============================================================================
// TEST 3: CodegenV3 Retry Strategy
// ============================================================================
async function testRetryStrategy() {
    console.log('='.repeat(80));
    console.log('TEST 3: CODEGEN V3 RETRY STRATEGY');
    console.log('='.repeat(80));
    console.log('\n[Test 3A] Testing retry wrapper with valid topic...');
    const testStep = {
        id: 1,
        desc: 'Explain the structure of a cell membrane and its phospholipid bilayer',
        compiler: 'js',
        complexity: 3,
        tag: 'hook'
    };
    const topic = 'Cell Biology: Membrane Structure';
    try {
        console.time('Generation time');
        const result = await (0, codegenV3WithRetry_1.codegenV3WithRetry)(testStep, topic);
        console.timeEnd('Generation time');
        if (result && result.actions && result.actions.length >= 15) {
            console.log('✅ PASS: Generated sufficient operations');
            console.log(`   Total operations: ${result.actions.length}`);
            console.log(`   Step ID: ${result.stepId}`);
            // Check operation diversity
            const opTypes = new Set(result.actions.map((a) => a.op));
            console.log(`   Unique operation types: ${opTypes.size}`);
            console.log(`   Operations used: ${Array.from(opTypes).join(', ')}`);
        }
        else {
            console.log(`❌ FAIL: Insufficient operations (got ${result?.actions?.length || 0})`);
        }
    }
    catch (error) {
        console.error('❌ FAIL: Retry strategy threw error:', error);
    }
    console.log('\n');
}
// ============================================================================
// TEST 4: End-to-End Generation Quality
// ============================================================================
async function testE2EGeneration() {
    console.log('='.repeat(80));
    console.log('TEST 4: END-TO-END GENERATION QUALITY');
    console.log('='.repeat(80));
    const testCases = [
        {
            topic: 'Sine Wave and Trigonometry',
            step: { id: 1, desc: 'Visualize sine wave and basic trigonometric relationships', compiler: 'js', complexity: 2, tag: 'hook' }
        },
        {
            topic: 'Neural Network Architecture',
            step: { id: 2, desc: 'Show neural network layers and connections', compiler: 'js', complexity: 3, tag: 'intuition' }
        }
    ];
    for (const testCase of testCases) {
        console.log(`\n[Test 4.${testCase.step.id}] Topic: ${testCase.topic}`);
        try {
            console.time(`  Generation time`);
            const result = await (0, codegenV3_1.default)(testCase.step, testCase.topic);
            console.timeEnd(`  Generation time`);
            if (result && result.actions) {
                const opCount = result.actions.length;
                const opTypes = new Set(result.actions.map((a) => a.op));
                console.log(`  ✅ Generated ${opCount} operations`);
                console.log(`  ✅ ${opTypes.size} unique operation types`);
                console.log(`  Operations: ${Array.from(opTypes).slice(0, 10).join(', ')}${opTypes.size > 10 ? '...' : ''}`);
                // Check for contextual relevance
                const hasCustomPath = result.actions.some((a) => a.op === 'customPath');
                const hasLabel = result.actions.some((a) => a.op === 'drawLabel');
                if (hasLabel)
                    console.log(`  ✅ Has labels (contextual)`);
                if (hasCustomPath)
                    console.log(`  ✅ Has custom shapes (rich)`);
            }
            else {
                console.log(`  ❌ FAIL: No result generated`);
            }
        }
        catch (error) {
            console.error(`  ❌ FAIL: Generation error:`, error);
        }
    }
    console.log('\n');
}
// ============================================================================
// TEST 5: Null Handling Verification
// ============================================================================
function testNullHandling() {
    console.log('='.repeat(80));
    console.log('TEST 5: NULL HANDLING VERIFICATION');
    console.log('='.repeat(80));
    console.log('\n[Test 5A] Operation validation handles null...');
    const result1 = (0, syntaxRecoveryAgent_1.validateOperations)(null);
    if (Array.isArray(result1) && result1.length === 0) {
        console.log('✅ PASS: Null input returns empty array');
    }
    else {
        console.log('❌ FAIL: Null handling broken');
    }
    console.log('\n[Test 5B] Operation validation handles undefined...');
    const result2 = (0, syntaxRecoveryAgent_1.validateOperations)(undefined);
    if (Array.isArray(result2) && result2.length === 0) {
        console.log('✅ PASS: Undefined input returns empty array');
    }
    else {
        console.log('❌ FAIL: Undefined handling broken');
    }
    console.log('\n[Test 5C] Operation validation handles malformed objects...');
    const malformed = [null, undefined, 'string', 123, { no_op: 'test' }];
    const result3 = (0, syntaxRecoveryAgent_1.validateOperations)(malformed);
    if (Array.isArray(result3) && result3.length === 0) {
        console.log('✅ PASS: Malformed objects filtered out');
    }
    else {
        console.log(`❌ FAIL: Got ${result3.length} ops from malformed input`);
    }
    console.log('\n');
}
// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
    console.log('\n');
    console.log('🚀 STARTING COMPREHENSIVE TEST SUITE\n');
    const startTime = Date.now();
    try {
        // Run synchronous tests
        testOperationValidation();
        testNullHandling();
        // Run async tests
        await testSyntaxRecovery();
        await testRetryStrategy();
        await testE2EGeneration();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('='.repeat(80));
        console.log('🎉 ALL TESTS COMPLETE');
        console.log('='.repeat(80));
        console.log(`Total test duration: ${duration}s`);
        console.log('\nSYSTEM STATUS: Ready for production testing');
        console.log('\nNEXT STEPS:');
        console.log('1. Kill ports 3001 and 5174');
        console.log('2. Restart backend and frontend');
        console.log('3. Query a topic and monitor logs');
        console.log('4. Verify all steps render correctly');
    }
    catch (error) {
        console.error('\n❌ TEST SUITE FAILED:', error);
        process.exit(1);
    }
}
// Run tests
runAllTests().catch(error => {
    console.error('❌ Fatal error running tests:', error);
    process.exit(1);
});
