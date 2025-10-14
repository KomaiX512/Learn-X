"use strict";
/**
 * Integration test for narration system
 * Simulates full orchestrator flow: visuals → narrations → emit
 */
Object.defineProperty(exports, "__esModule", { value: true });
const narrationGenerator_1 = require("../agents/narrationGenerator");
const transcriptGenerator_1 = require("../agents/transcriptGenerator");
const codegenV3WithRetry_1 = require("../agents/codegenV3WithRetry");
// Test configuration
const ENABLE_NOTES_GENERATION = true;
const VISUALS_PER_STEP = 4;
/**
 * Simulate the generateStepVisuals function from orchestrator
 * This is what actually runs in production
 */
async function simulateStepVisualsGeneration(step, topic) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎯 SIMULATING STEP ${step.id} GENERATION`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Topic: ${topic}`);
    console.log(`Step: ${step.desc}`);
    console.log(`Target: ${ENABLE_NOTES_GENERATION ? '1 notes + ' : ''}${VISUALS_PER_STEP} animations`);
    const visualDescriptions = [];
    const allPromises = [];
    let notesPromise = null;
    let notesSvgCode = null;
    const generationStartTime = Date.now();
    // PHASE 1: Generate visuals in parallel
    console.log(`\n📊 PHASE 1: Visual Generation (Parallel)`);
    console.log(`${'─'.repeat(70)}`);
    // Notes generation
    if (ENABLE_NOTES_GENERATION) {
        console.log(`[1/5] Starting notes generation...`);
        const notesStart = Date.now();
        notesPromise = (async () => {
            try {
                const subtopic = step.desc;
                const svgCode = await (0, transcriptGenerator_1.generateNotes)(step, topic, subtopic);
                if (!svgCode) {
                    console.error(`❌ Notes generation failed`);
                    return null;
                }
                notesSvgCode = svgCode;
                const elapsed = Date.now() - notesStart;
                console.log(`✅ [1/5] Notes generated in ${elapsed}ms (${svgCode.length} chars)`);
                return {
                    op: 'customSVG',
                    svgCode,
                    visualGroup: `step-${step.id}-notes`,
                    isNotesKeynote: true,
                    priority: 1
                };
            }
            catch (error) {
                console.error(`❌ Notes error: ${error.message}`);
                return null;
            }
        })();
        allPromises.push(notesPromise);
    }
    // Animation generation (parallel)
    const animationMetadata = [];
    const animationPromises = Array.from({ length: VISUALS_PER_STEP }, async (_, index) => {
        const visualNumber = index + 1;
        const animStart = Date.now();
        console.log(`[${visualNumber + 1}/5] Starting animation ${visualNumber}...`);
        try {
            const result = await (0, codegenV3WithRetry_1.codegenV3WithRetry)(step, topic);
            if (!result || !result.actions || result.actions.length === 0) {
                console.warn(`⚠️  [${visualNumber + 1}/5] Animation ${visualNumber} returned no actions`);
                return null;
            }
            animationMetadata.push({
                index,
                actionCount: result.actions.length
            });
            const description = `Animation ${visualNumber}: ${step.desc.substring(0, 50)}`;
            visualDescriptions.push({ visualNumber, description });
            const elapsed = Date.now() - animStart;
            console.log(`✅ [${visualNumber + 1}/5] Animation ${visualNumber} generated in ${elapsed}ms (${result.actions.length} actions)`);
            const action = result.actions[0];
            return {
                ...action,
                visualGroup: `step-${step.id}-animation-${visualNumber}`,
                isNotesKeynote: false,
                priority: 2 + visualNumber
            };
        }
        catch (error) {
            console.error(`❌ [${visualNumber + 1}/5] Animation ${visualNumber} failed: ${error.message}`);
            return null;
        }
    });
    allPromises.push(...animationPromises);
    // Wait for all visual generations
    console.log(`\n⏳ Waiting for ${allPromises.length} parallel visual generations...`);
    const visualsStartTime = Date.now();
    const allResults = await Promise.all(allPromises);
    const visualsElapsed = Date.now() - visualsStartTime;
    // Separate notes from animations
    const notesAction = ENABLE_NOTES_GENERATION ? allResults[0] : null;
    const animationResults = ENABLE_NOTES_GENERATION ? allResults.slice(1) : allResults;
    const successfulAnimations = animationResults.filter(v => v !== null);
    console.log(`\n✅ PHASE 1 COMPLETE in ${visualsElapsed}ms:`);
    console.log(`   - Notes: ${notesAction ? 'YES' : 'NO'}`);
    console.log(`   - Animations: ${successfulAnimations.length}/${VISUALS_PER_STEP}`);
    console.log(`   - Total visuals: ${(notesAction ? 1 : 0) + successfulAnimations.length}`);
    // PHASE 2: Generate narrations for ALL visuals (single API call)
    console.log(`\n📊 PHASE 2: Narration Generation (Batch)`);
    console.log(`${'─'.repeat(70)}`);
    let stepNarration = undefined;
    try {
        const narrationStart = Date.now();
        // Prepare visual inputs
        const visualInputs = [];
        // Add notes visual
        if (notesAction && notesSvgCode) {
            visualInputs.push({
                type: 'notes',
                visualNumber: 0,
                svgCode: notesSvgCode,
                description: step.desc
            });
            console.log(`✓ Added notes visual to narration input`);
        }
        // Add animation visuals
        successfulAnimations.forEach((anim, idx) => {
            const metadata = animationMetadata.find(m => m.index === idx);
            visualInputs.push({
                type: 'animation',
                visualNumber: idx + 1,
                actionCount: metadata?.actionCount || 0,
                description: step.desc
            });
        });
        console.log(`✓ Added ${successfulAnimations.length} animation visuals to narration input`);
        console.log(`\n🎤 Generating ${visualInputs.length} narrations in ONE API call...`);
        if (visualInputs.length > 0) {
            stepNarration = await (0, narrationGenerator_1.generateStepNarration)(step, topic, visualInputs);
            const narrationElapsed = Date.now() - narrationStart;
            console.log(`\n✅ PHASE 2 COMPLETE in ${narrationElapsed}ms:`);
            console.log(`   - Narrations generated: ${stepNarration.narrations.length}`);
            console.log(`   - Total audio duration: ${stepNarration.totalDuration}s`);
            console.log(`   - API calls: 1 (batch)`);
            // Show narration details
            console.log(`\n📝 Generated Narrations:`);
            stepNarration.narrations.forEach((n, idx) => {
                console.log(`   [${idx + 1}] Visual ${n.visualNumber} (${n.type}): ${n.duration}s, ${n.narration.length} chars`);
            });
        }
    }
    catch (error) {
        console.error(`\n❌ PHASE 2 FAILED: ${error.message}`);
        console.error(`   Narration generation is non-critical, continuing...`);
    }
    const totalElapsed = Date.now() - generationStartTime;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🏁 STEP ${step.id} COMPLETE in ${totalElapsed}ms`);
    console.log(`   - Visual generation: ${visualsElapsed}ms`);
    console.log(`   - Narration generation: ${stepNarration ? (totalElapsed - visualsElapsed) : 0}ms`);
    console.log(`   - Total time: ${totalElapsed}ms`);
    console.log(`${'='.repeat(70)}\n`);
    return {
        notesAction,
        notesSvgCode,
        animationActions: successfulAnimations,
        animationMetadata,
        visualDescriptions,
        narration: stepNarration
    };
}
/**
 * Test 1: Single step generation with narrations
 */
async function testSingleStepGeneration() {
    console.log('\n' + '█'.repeat(70));
    console.log('TEST 1: Single Step Generation (Full Flow)');
    console.log('█'.repeat(70));
    const step = {
        id: 1,
        desc: 'Understanding Neural Network Architecture',
        notesSubtopic: 'Neural Networks: Layers, Neurons, and Connections',
        compiler: 'js',
        complexity: 3,
        tag: 'nn_architecture'
    };
    const topic = 'Deep Learning Fundamentals';
    try {
        const result = await simulateStepVisualsGeneration(step, topic);
        // Validations
        const checks = [
            {
                name: 'Notes generated',
                pass: result.notesAction !== null,
                value: result.notesAction ? 'YES' : 'NO'
            },
            {
                name: 'All animations generated',
                pass: result.animationActions.length === VISUALS_PER_STEP,
                value: `${result.animationActions.length}/${VISUALS_PER_STEP}`
            },
            {
                name: 'Narrations generated',
                pass: result.narration !== undefined,
                value: result.narration ? 'YES' : 'NO'
            },
            {
                name: 'Correct narration count',
                pass: result.narration?.narrations.length === (ENABLE_NOTES_GENERATION ? 5 : 4),
                value: `${result.narration?.narrations.length || 0}/${ENABLE_NOTES_GENERATION ? 5 : 4}`
            },
            {
                name: 'All narrations have text',
                pass: result.narration?.narrations.every(n => n.narration.length > 0) || false,
                value: result.narration ? 'YES' : 'NO'
            },
            {
                name: 'Total duration calculated',
                pass: (result.narration?.totalDuration || 0) > 0,
                value: `${result.narration?.totalDuration || 0}s`
            }
        ];
        console.log('\n✅ VALIDATION RESULTS:');
        checks.forEach(check => {
            const status = check.pass ? '✅' : '❌';
            console.log(`   ${status} ${check.name}: ${check.value}`);
        });
        const allPassed = checks.every(c => c.pass);
        return {
            success: allPassed,
            checks,
            result
        };
    }
    catch (error) {
        console.error(`\n❌ Test failed: ${error.message}`);
        console.error(error.stack);
        return { success: false, error: error.message };
    }
}
/**
 * Test 2: Multiple steps in parallel (stress test)
 */
async function testMultipleStepsParallel() {
    console.log('\n' + '█'.repeat(70));
    console.log('TEST 2: Multiple Steps in Parallel (Stress Test)');
    console.log('█'.repeat(70));
    const steps = [
        {
            id: 1,
            desc: 'Neural Network Basics',
            notesSubtopic: 'Introduction to Neural Networks',
            compiler: 'js',
            complexity: 2,
            tag: 'nn_basics'
        },
        {
            id: 2,
            desc: 'Forward Propagation',
            notesSubtopic: 'How Neural Networks Process Data',
            compiler: 'js',
            complexity: 3,
            tag: 'forward_prop'
        },
        {
            id: 3,
            desc: 'Backpropagation Algorithm',
            notesSubtopic: 'Training Neural Networks with Gradient Descent',
            compiler: 'js',
            complexity: 4,
            tag: 'backprop'
        }
    ];
    const topic = 'Deep Learning Course';
    try {
        console.log(`\n🚀 Generating ${steps.length} steps in parallel...`);
        const startTime = Date.now();
        const promises = steps.map(step => simulateStepVisualsGeneration(step, topic));
        const results = await Promise.all(promises);
        const totalElapsed = Date.now() - startTime;
        console.log('\n' + '═'.repeat(70));
        console.log('PARALLEL GENERATION SUMMARY');
        console.log('═'.repeat(70));
        console.log(`Total time: ${totalElapsed}ms`);
        console.log(`Steps processed: ${results.length}`);
        console.log(`Average per step: ${(totalElapsed / results.length).toFixed(0)}ms`);
        results.forEach((result, idx) => {
            console.log(`\n  Step ${idx + 1}:`);
            console.log(`    - Notes: ${result.notesAction ? 'YES' : 'NO'}`);
            console.log(`    - Animations: ${result.animationActions.length}`);
            console.log(`    - Narrations: ${result.narration?.narrations.length || 0}`);
            console.log(`    - Audio duration: ${result.narration?.totalDuration || 0}s`);
        });
        const allSuccessful = results.every(r => r.animationActions.length > 0 && r.narration !== undefined);
        console.log('\n' + (allSuccessful ? '✅ ALL STEPS SUCCESSFUL' : '❌ SOME STEPS FAILED'));
        return {
            success: allSuccessful,
            totalTime: totalElapsed,
            stepsCount: results.length,
            avgPerStep: totalElapsed / results.length,
            results
        };
    }
    catch (error) {
        console.error(`\n❌ Test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}
/**
 * Test 3: Verify narration-visual alignment
 */
async function testNarrationVisualAlignment() {
    console.log('\n' + '█'.repeat(70));
    console.log('TEST 3: Narration-Visual Alignment');
    console.log('█'.repeat(70));
    const step = {
        id: 1,
        desc: 'Convolutional Neural Networks for Image Recognition',
        notesSubtopic: 'CNN Architecture and Convolution Operations',
        compiler: 'js',
        complexity: 3,
        tag: 'cnn'
    };
    const topic = 'Computer Vision';
    try {
        const result = await simulateStepVisualsGeneration(step, topic);
        if (!result.narration) {
            throw new Error('Narrations not generated');
        }
        console.log('\n🔍 Verifying alignment between visuals and narrations...\n');
        // Check notes alignment
        if (result.notesAction) {
            const notesNarration = result.narration.narrations.find(n => n.visualNumber === 0);
            if (notesNarration) {
                console.log('✅ Notes Visual (0) → Narration found');
                console.log(`   Type: ${notesNarration.type}`);
                console.log(`   Duration: ${notesNarration.duration}s`);
                console.log(`   Preview: "${notesNarration.narration.substring(0, 80)}..."`);
            }
        }
        // Check animation alignment
        result.animationActions.forEach((anim, idx) => {
            const animNarration = result.narration.narrations.find(n => n.visualNumber === idx + 1);
            if (animNarration) {
                console.log(`✅ Animation ${idx + 1} → Narration found`);
                console.log(`   Type: ${animNarration.type}`);
                console.log(`   Duration: ${animNarration.duration}s`);
                console.log(`   Preview: "${animNarration.narration.substring(0, 80)}..."`);
            }
            else {
                console.log(`❌ Animation ${idx + 1} → No narration found!`);
            }
        });
        // Verify counts match
        const expectedNarrations = (result.notesAction ? 1 : 0) + result.animationActions.length;
        const actualNarrations = result.narration.narrations.length;
        console.log(`\n📊 Alignment Check:`);
        console.log(`   Expected narrations: ${expectedNarrations}`);
        console.log(`   Actual narrations: ${actualNarrations}`);
        console.log(`   Match: ${expectedNarrations === actualNarrations ? 'YES ✅' : 'NO ❌'}`);
        return {
            success: expectedNarrations === actualNarrations,
            expectedNarrations,
            actualNarrations
        };
    }
    catch (error) {
        console.error(`\n❌ Test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}
/**
 * Main test runner
 */
async function runIntegrationTests() {
    console.log('\n' + '█'.repeat(70));
    console.log('NARRATION SYSTEM - INTEGRATION TESTS');
    console.log('Full orchestrator flow simulation');
    console.log('█'.repeat(70));
    const testResults = {};
    try {
        // Test 1: Single step
        testResults.singleStep = await testSingleStepGeneration();
        // Test 2: Multiple steps parallel
        testResults.multipleSteps = await testMultipleStepsParallel();
        // Test 3: Alignment
        testResults.alignment = await testNarrationVisualAlignment();
        // Summary
        console.log('\n' + '═'.repeat(70));
        console.log('INTEGRATION TEST SUMMARY');
        console.log('═'.repeat(70));
        const tests = [
            { name: 'Single Step Generation', result: testResults.singleStep },
            { name: 'Multiple Steps Parallel', result: testResults.multipleSteps },
            { name: 'Narration-Visual Alignment', result: testResults.alignment }
        ];
        tests.forEach(test => {
            const status = test.result.success ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} - ${test.name}`);
        });
        const allPassed = tests.every(t => t.result.success);
        console.log('\n' + '═'.repeat(70));
        console.log(allPassed ? '✅ ALL INTEGRATION TESTS PASSED' : '❌ SOME TESTS FAILED');
        console.log('═'.repeat(70));
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
runIntegrationTests();
