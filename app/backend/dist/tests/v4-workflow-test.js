"use strict";
/**
 * COMPREHENSIVE V4 WORKFLOW UNIT TEST
 *
 * Tests complete workflow:
 * 1. SubPlanner creates detailed descriptions
 * 2. FocusedGenerator creates operations from descriptions
 * 3. Validates no generic shapes
 * 4. Cross-verifies descriptions match operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCompleteWorkflow = testCompleteWorkflow;
exports.stressTest = stressTest;
const subPlanner_1 = require("../agents/subPlanner");
const focusedVisualGenerator_1 = require("../agents/focusedVisualGenerator");
// Test data
const TEST_TOPICS = [
    'Explain DNA replication',
    'Explain neural networks and backpropagation',
    'Explain photosynthesis',
    'Explain quantum entanglement'
];
const TEST_STEP = {
    id: 1,
    tag: 'hook',
    desc: 'Introduce the main concept and grab attention',
    compiler: 'js',
    complexity: 3
};
/**
 * STEP 1: Test SubPlanner
 */
async function testSubPlanner(topic) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 1: TESTING SUB-PLANNER');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Topic: "${topic}"`);
    const startTime = Date.now();
    const concepts = await (0, subPlanner_1.createVisualPlan)(TEST_STEP, topic, process.env.GEMINI_API_KEY);
    const time = Date.now() - startTime;
    console.log(`\n✅ Generated ${concepts.length} visual concepts in ${time}ms\n`);
    concepts.forEach((concept, i) => {
        console.log(`\n┌─ CONCEPT ${i + 1}: ${concept.title}`);
        console.log(`├─ Type: ${concept.structureType}`);
        console.log(`├─ Description Length: ${concept.description.length} chars`);
        console.log(`├─ Description:`);
        console.log(`│  ${concept.description}`);
        if (concept.animations && concept.animations.length > 0) {
            console.log(`├─ Animations: ${concept.animations.join(', ')}`);
        }
        console.log(`└─────────────────────────────────────────────────────────\n`);
    });
    return { concepts, time };
}
/**
 * STEP 2: Test FocusedGenerator for ONE concept
 */
async function testFocusedGenerator(concept, topic) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`STEP 2: TESTING FOCUSED GENERATOR`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Concept: "${concept.title}"`);
    const startTime = Date.now();
    const operations = await (0, focusedVisualGenerator_1.generateVisualFromConcept)(concept, topic, process.env.GEMINI_API_KEY, 0);
    const time = Date.now() - startTime;
    console.log(`\n✅ Generated ${operations.length} operations in ${time}ms\n`);
    // Show first 5 operations in detail
    console.log('First 5 Operations:');
    operations.slice(0, 5).forEach((op, i) => {
        console.log(`\n${i + 1}. Operation: ${op.op}`);
        console.log(`   Details:`, JSON.stringify(op, null, 2));
    });
    if (operations.length > 5) {
        console.log(`\n... and ${operations.length - 5} more operations`);
    }
    return { operations, time };
}
/**
 * STEP 3: Validate no generic shapes
 */
function validateNoGenericShapes(operations, description) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 3: VALIDATING NO GENERIC SHAPES');
    console.log('═══════════════════════════════════════════════════════════');
    // Count operation types
    const opCounts = {};
    operations.forEach(op => {
        opCounts[op.op] = (opCounts[op.op] || 0) + 1;
    });
    console.log('\nOperation Type Distribution:');
    Object.entries(opCounts).forEach(([op, count]) => {
        console.log(`  ${op}: ${count}`);
    });
    // Check for generic shapes without context
    const genericOps = ['drawCircle', 'drawRect', 'drawLine'];
    const specificOps = operations
        .filter(op => !genericOps.includes(op.op))
        .map(op => op.op);
    const uniqueSpecific = [...new Set(specificOps)];
    // A shape is "generic" if it's just a circle/rect/line without proper labels nearby
    const genericCount = operations.filter(op => {
        if (genericOps.includes(op.op)) {
            // Check if it has proper context (fill color, proper text label nearby)
            const hasContext = op.text || op.fill || op.stroke;
            return !hasContext;
        }
        return false;
    }).length;
    console.log(`\n📊 Specific Operations: ${uniqueSpecific.join(', ')}`);
    console.log(`📊 Generic Shapes: ${genericCount}/${operations.length}`);
    console.log(`📊 Generic %: ${((genericCount / operations.length) * 100).toFixed(1)}%`);
    const hasGeneric = genericCount > 0;
    if (hasGeneric) {
        console.log('\n⚠️  WARNING: Found generic shapes without context!');
    }
    else {
        console.log('\n✅ NO GENERIC SHAPES - All operations are contextual!');
    }
    return {
        hasGeneric,
        genericCount,
        specificOps: uniqueSpecific
    };
}
/**
 * STEP 4: Cross-verify description matches operations
 */
function crossVerifyDescription(concept, operations) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 4: CROSS-VERIFYING DESCRIPTION vs OPERATIONS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\nDescription: "${concept.description}"`);
    // Extract key terms from description
    const description = concept.description.toLowerCase();
    const keyTerms = extractKeyTerms(description);
    console.log(`\nKey Terms from Description: ${keyTerms.join(', ')}`);
    // Check if operations mention these terms
    const operationText = operations
        .filter(op => op.text || op.label)
        .map(op => (op.text || op.label || '').toLowerCase())
        .join(' ');
    console.log(`\nTerms Found in Operations:`);
    const foundTerms = [];
    const missingTerms = [];
    keyTerms.forEach(term => {
        const found = operationText.includes(term) ||
            operations.some(op => JSON.stringify(op).toLowerCase().includes(term));
        if (found) {
            foundTerms.push(term);
            console.log(`  ✅ "${term}"`);
        }
        else {
            missingTerms.push(term);
            console.log(`  ❌ "${term}" - MISSING!`);
        }
    });
    const matchRate = (foundTerms.length / keyTerms.length) * 100;
    console.log(`\n📊 Match Rate: ${matchRate.toFixed(1)}% (${foundTerms.length}/${keyTerms.length})`);
    const passes = matchRate >= 60; // At least 60% match
    if (passes) {
        console.log('✅ DESCRIPTION MATCHES OPERATIONS');
    }
    else {
        console.log('❌ DESCRIPTION DOES NOT MATCH OPERATIONS');
    }
    return passes;
}
/**
 * Helper: Extract key scientific/contextual terms
 */
function extractKeyTerms(text) {
    // Remove common words
    const commonWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'from', 'show', 'create', 'draw', 'add', 'label', 'color',
        'x', 'y', 'between', 'as', 'use', 'include', 'spanning'
    ]);
    // Extract words
    const words = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !commonWords.has(w));
    // Get unique terms
    return [...new Set(words)];
}
/**
 * COMPLETE WORKFLOW TEST
 */
async function testCompleteWorkflow(topic) {
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  COMPLETE V4 WORKFLOW TEST: ${topic.padEnd(35)}║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    const totalStartTime = Date.now();
    // Step 1: SubPlanner
    const { concepts, time: planTime } = await testSubPlanner(topic);
    // Step 2: FocusedGenerator (test first concept in detail)
    const { operations: firstOps, time: genTime } = await testFocusedGenerator(concepts[0], topic);
    // Step 3: Validate
    const validation = validateNoGenericShapes(firstOps, concepts[0].description);
    // Step 4: Cross-verify
    const matches = crossVerifyDescription(concepts[0], firstOps);
    // Generate all visuals
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('GENERATING ALL VISUALS');
    console.log('═══════════════════════════════════════════════════════════');
    const allOps = await (0, focusedVisualGenerator_1.generateAllVisuals)(concepts, topic, process.env.GEMINI_API_KEY);
    const totalTime = Date.now() - totalStartTime;
    console.log(`\n✅ COMPLETE! Generated ${allOps.length} total operations`);
    console.log(`   Planning: ${planTime}ms`);
    console.log(`   Generation: ${genTime}ms`);
    console.log(`   Total: ${totalTime}ms`);
    return {
        topic,
        concepts,
        operations: allOps,
        validation: {
            conceptCount: concepts.length,
            operationCount: allOps.length,
            avgOpsPerConcept: allOps.length / concepts.length,
            hasGenericShapes: validation.hasGeneric,
            genericShapeCount: validation.genericCount,
            specificOperations: validation.specificOps,
            descriptionMatches: [matches]
        },
        timing: {
            planningTime: planTime,
            generationTime: genTime,
            totalTime
        }
    };
}
/**
 * STRESS TEST - Run multiple times
 */
async function stressTest(iterations = 3) {
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  V4 STRESS TEST - ${iterations} ITERATIONS                           ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    const results = [];
    for (let i = 0; i < iterations; i++) {
        const topic = TEST_TOPICS[i % TEST_TOPICS.length];
        console.log(`\n\n🔄 Iteration ${i + 1}/${iterations}`);
        try {
            const result = await testCompleteWorkflow(topic);
            results.push(result);
            // Wait 2 seconds between iterations to avoid API overload
            if (i < iterations - 1) {
                console.log('\n⏳ Waiting 2 seconds before next iteration...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        catch (error) {
            console.error(`\n❌ Iteration ${i + 1} failed:`, error);
        }
    }
    // Summary
    printSummary(results);
}
/**
 * Print final summary
 */
function printSummary(results) {
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  FINAL SUMMARY                                            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`Total Tests: ${results.length}`);
    console.log(`Topics Tested: ${[...new Set(results.map(r => r.topic))].join(', ')}\n`);
    console.log('📊 METRICS:');
    console.log('─────────────────────────────────────────────────────────────');
    const avgConcepts = results.reduce((sum, r) => sum + r.validation.conceptCount, 0) / results.length;
    const avgOps = results.reduce((sum, r) => sum + r.validation.operationCount, 0) / results.length;
    const avgTime = results.reduce((sum, r) => sum + r.timing.totalTime, 0) / results.length;
    const genericCount = results.filter(r => r.validation.hasGenericShapes).length;
    const matchCount = results.filter(r => r.validation.descriptionMatches[0]).length;
    console.log(`Average Concepts per Step: ${avgConcepts.toFixed(1)}`);
    console.log(`Average Operations per Step: ${avgOps.toFixed(1)}`);
    console.log(`Average Time per Step: ${avgTime.toFixed(0)}ms`);
    console.log(`Tests with Generic Shapes: ${genericCount}/${results.length} (${((genericCount / results.length) * 100).toFixed(1)}%)`);
    console.log(`Description Match Rate: ${matchCount}/${results.length} (${((matchCount / results.length) * 100).toFixed(1)}%)`);
    console.log('\n✅ QUALITY ASSESSMENT:');
    console.log('─────────────────────────────────────────────────────────────');
    if (genericCount === 0 && matchCount === results.length && avgOps >= 40) {
        console.log('🏆 EXCELLENT - Production Ready!');
        console.log('   ✓ No generic shapes');
        console.log('   ✓ All descriptions match operations');
        console.log('   ✓ High operation count');
    }
    else if (genericCount <= 1 && matchCount >= results.length * 0.8 && avgOps >= 30) {
        console.log('✅ GOOD - Minor improvements needed');
        console.log(`   ${genericCount === 0 ? '✓' : '⚠'} Generic shapes: ${genericCount}`);
        console.log(`   ${matchCount === results.length ? '✓' : '⚠'} Description matches: ${matchCount}/${results.length}`);
        console.log(`   ${avgOps >= 40 ? '✓' : '⚠'} Operation count: ${avgOps.toFixed(0)}`);
    }
    else {
        console.log('⚠️  NEEDS IMPROVEMENT');
        console.log(`   ${genericCount === 0 ? '✓' : '❌'} Generic shapes: ${genericCount}`);
        console.log(`   ${matchCount === results.length ? '✓' : '❌'} Description matches: ${matchCount}/${results.length}`);
        console.log(`   ${avgOps >= 30 ? '✓' : '❌'} Operation count: ${avgOps.toFixed(0)}`);
    }
    console.log('\n═══════════════════════════════════════════════════════════\n');
}
// Run tests
async function main() {
    try {
        // Single workflow test
        console.log('Starting V4 Workflow Tests...\n');
        // Run stress test
        await stressTest(3);
    }
    catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}
// Execute if run directly
if (require.main === module) {
    main();
}
