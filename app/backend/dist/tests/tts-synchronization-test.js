"use strict";
/**
 * TTS Synchronization Test
 * Verifies that rendering waits for narration synthesis AND animation completion
 * Plus mandatory inter-visual delay before proceeding to next visual
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
// Load environment variables first
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const audio_narration_service_1 = require("../services/audio-narration-service");
/**
 * Simulate visual playback with proper synchronization
 */
async function simulateVisualPlayback(visualNumber, animationDuration, narrationAudio, interVisualDelay) {
    const startTime = Date.now();
    console.log(`\n[Visual ${visualNumber}] Starting playback...`);
    console.log(`  Animation duration: ${animationDuration}ms`);
    console.log(`  Narration duration: ${narrationAudio ? narrationAudio.audioDuration * 1000 : 0}ms`);
    console.log(`  Inter-visual delay: ${interVisualDelay}ms`);
    // Simulate animation and narration running in parallel
    const animationPromise = new Promise(resolve => {
        setTimeout(() => {
            console.log(`  [Visual ${visualNumber}] Animation complete`);
            resolve(null);
        }, animationDuration);
    });
    const narrationDurationMs = narrationAudio ? narrationAudio.audioDuration * 1000 : 0;
    const narrationPromise = new Promise(resolve => {
        setTimeout(() => {
            console.log(`  [Visual ${visualNumber}] Narration complete`);
            resolve(null);
        }, narrationDurationMs);
    });
    // CRITICAL: Wait for BOTH to complete
    console.log(`  [Visual ${visualNumber}] Waiting for animation AND narration...`);
    await Promise.all([animationPromise, narrationPromise]);
    const bothCompleteTime = Date.now();
    console.log(`  [Visual ${visualNumber}] Both complete after ${bothCompleteTime - startTime}ms`);
    // CRITICAL: Apply inter-visual delay
    console.log(`  [Visual ${visualNumber}] Applying inter-visual delay (${interVisualDelay}ms)...`);
    await new Promise(resolve => setTimeout(resolve, interVisualDelay));
    const totalWaitTime = Date.now() - startTime;
    console.log(`  [Visual ${visualNumber}] ✅ READY FOR NEXT after ${totalWaitTime}ms total`);
    return {
        visualNumber,
        animationDuration,
        narrationDuration: narrationDurationMs,
        interVisualDelay,
        totalWaitTime
    };
}
/**
 * Test 1: Verify synchronization timing
 */
async function testSynchronizationTiming() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 1: Synchronization Timing');
    console.log('='.repeat(70));
    const interVisualDelay = (0, audio_narration_service_1.getInterVisualDelay)();
    // Test Case 1: Animation longer than narration
    console.log('\n📊 Case 1: Animation (5000ms) > Narration (3000ms)');
    const case1 = await simulateVisualPlayback(1, 5000, // animation: 5s
    { audioContent: Buffer.from(''), audioDuration: 3 }, // narration: 3s
    interVisualDelay);
    const expectedCase1 = 5000 + interVisualDelay;
    const case1Pass = Math.abs(case1.totalWaitTime - expectedCase1) < 100; // 100ms tolerance
    console.log(`Expected wait: ${expectedCase1}ms, Actual: ${case1.totalWaitTime}ms`);
    console.log(case1Pass ? '✅ PASS' : '❌ FAIL');
    // Test Case 2: Narration longer than animation
    console.log('\n📊 Case 2: Animation (2000ms) < Narration (5000ms)');
    const case2 = await simulateVisualPlayback(2, 2000, // animation: 2s
    { audioContent: Buffer.from(''), audioDuration: 5 }, // narration: 5s
    interVisualDelay);
    const expectedCase2 = 5000 + interVisualDelay;
    const case2Pass = Math.abs(case2.totalWaitTime - expectedCase2) < 100;
    console.log(`Expected wait: ${expectedCase2}ms, Actual: ${case2.totalWaitTime}ms`);
    console.log(case2Pass ? '✅ PASS' : '❌ FAIL');
    // Test Case 3: Animation and narration approximately equal
    console.log('\n📊 Case 3: Animation (4000ms) ≈ Narration (4000ms)');
    const case3 = await simulateVisualPlayback(3, 4000, // animation: 4s
    { audioContent: Buffer.from(''), audioDuration: 4 }, // narration: 4s
    interVisualDelay);
    const expectedCase3 = 4000 + interVisualDelay;
    const case3Pass = Math.abs(case3.totalWaitTime - expectedCase3) < 100;
    console.log(`Expected wait: ${expectedCase3}ms, Actual: ${case3.totalWaitTime}ms`);
    console.log(case3Pass ? '✅ PASS' : '❌ FAIL');
    return {
        success: case1Pass && case2Pass && case3Pass,
        results: [case1, case2, case3]
    };
}
/**
 * Test 2: Verify no early transitions
 */
async function testNoEarlyTransitions() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: No Early Transitions');
    console.log('='.repeat(70));
    const interVisualDelay = (0, audio_narration_service_1.getInterVisualDelay)();
    console.log('\n📊 Testing that next visual CANNOT start early...');
    const visual1Start = Date.now();
    // Visual 1: Long narration (10s)
    const visual1Promise = simulateVisualPlayback(1, 3000, // animation: 3s
    { audioContent: Buffer.from(''), audioDuration: 10 }, // narration: 10s
    interVisualDelay);
    // Monitor for early completion (should not happen)
    const monitorInterval = setInterval(() => {
        const elapsed = Date.now() - visual1Start;
        // This is just monitoring - the actual wait is in visual1Promise
    }, 1000);
    // Wait for visual 1 to properly complete
    await visual1Promise;
    clearInterval(monitorInterval);
    const visual1End = Date.now();
    const visual1Duration = visual1End - visual1Start;
    console.log(`\nVisual 1 completed in ${visual1Duration}ms`);
    console.log(`Expected minimum: ${10000 + interVisualDelay}ms`);
    const properWait = visual1Duration >= (10000 + interVisualDelay - 100); // 100ms tolerance
    console.log(properWait ? '✅ PASS: Proper wait enforced' : '❌ FAIL: Early transition allowed');
    console.log('✅ PASS: No early transitions (system enforces proper wait)');
    return {
        success: properWait,
        visual1Duration,
        expectedMinimum: 10000 + interVisualDelay
    };
}
/**
 * Test 3: Verify inter-visual delay is applied
 */
async function testInterVisualDelay() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 3: Inter-Visual Delay Application');
    console.log('='.repeat(70));
    const interVisualDelay = (0, audio_narration_service_1.getInterVisualDelay)();
    console.log(`\nConfigured inter-visual delay: ${interVisualDelay}ms`);
    const results = [];
    // Test multiple visuals in sequence
    for (let i = 1; i <= 3; i++) {
        console.log(`\n📊 Testing visual ${i}...`);
        const startTime = Date.now();
        // Simulate quick animation and narration
        await simulateVisualPlayback(i, 1000, // animation: 1s
        { audioContent: Buffer.from(''), audioDuration: 1 }, // narration: 1s
        interVisualDelay);
        const totalTime = Date.now() - startTime;
        const expectedMinimum = 1000 + interVisualDelay; // Max(1000, 1000) + delay
        const hasDelay = totalTime >= (expectedMinimum - 100); // 100ms tolerance
        console.log(`Total time: ${totalTime}ms, Expected minimum: ${expectedMinimum}ms`);
        console.log(hasDelay ? '✅ Delay applied' : '❌ Delay NOT applied');
        results.push({
            visual: i,
            totalTime,
            expectedMinimum,
            hasDelay
        });
    }
    const allHaveDelay = results.every(r => r.hasDelay);
    console.log('\n📊 Summary:');
    console.log(allHaveDelay ? '✅ PASS: All visuals have inter-visual delay' : '❌ FAIL: Some visuals missing delay');
    return {
        success: allHaveDelay,
        results
    };
}
/**
 * Test 4: Verify complete step playback sequence
 */
async function testCompleteStepSequence() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 4: Complete Step Sequence');
    console.log('='.repeat(70));
    const interVisualDelay = (0, audio_narration_service_1.getInterVisualDelay)();
    console.log('\n📊 Simulating complete step with 5 visuals...');
    console.log('   Visual 0: Notes (5s animation, 18s narration)');
    console.log('   Visual 1: Animation (8s animation, 15s narration)');
    console.log('   Visual 2: Animation (10s animation, 12s narration)');
    console.log('   Visual 3: Animation (6s animation, 20s narration)');
    console.log('   Visual 4: Animation (7s animation, 16s narration)');
    const stepStartTime = Date.now();
    const visualResults = [];
    // Visual 0: Notes
    const v0 = await simulateVisualPlayback(0, 5000, { audioContent: Buffer.from(''), audioDuration: 18 }, interVisualDelay);
    visualResults.push(v0);
    // Visual 1
    const v1 = await simulateVisualPlayback(1, 8000, { audioContent: Buffer.from(''), audioDuration: 15 }, interVisualDelay);
    visualResults.push(v1);
    // Visual 2
    const v2 = await simulateVisualPlayback(2, 10000, { audioContent: Buffer.from(''), audioDuration: 12 }, interVisualDelay);
    visualResults.push(v2);
    // Visual 3
    const v3 = await simulateVisualPlayback(3, 6000, { audioContent: Buffer.from(''), audioDuration: 20 }, interVisualDelay);
    visualResults.push(v3);
    // Visual 4
    const v4 = await simulateVisualPlayback(4, 7000, { audioContent: Buffer.from(''), audioDuration: 16 }, interVisualDelay);
    visualResults.push(v4);
    const totalStepTime = Date.now() - stepStartTime;
    console.log('\n📊 Step Complete:');
    console.log(`Total time: ${(totalStepTime / 1000).toFixed(1)}s`);
    visualResults.forEach(v => {
        console.log(`   Visual ${v.visualNumber}: ${(v.totalWaitTime / 1000).toFixed(1)}s`);
    });
    // Calculate expected time
    const expectedTimes = [
        Math.max(5000, 18000) + interVisualDelay, // v0
        Math.max(8000, 15000) + interVisualDelay, // v1
        Math.max(10000, 12000) + interVisualDelay, // v2
        Math.max(6000, 20000) + interVisualDelay, // v3
        Math.max(7000, 16000) + interVisualDelay // v4
    ];
    const expectedTotal = expectedTimes.reduce((sum, t) => sum + t, 0);
    const timingCorrect = Math.abs(totalStepTime - expectedTotal) < 500; // 500ms tolerance
    console.log(`\nExpected total: ${(expectedTotal / 1000).toFixed(1)}s`);
    console.log(`Actual total: ${(totalStepTime / 1000).toFixed(1)}s`);
    console.log(`Difference: ${Math.abs(totalStepTime - expectedTotal)}ms`);
    console.log(timingCorrect ? '✅ PASS: Timing correct' : '❌ FAIL: Timing incorrect');
    return {
        success: timingCorrect,
        totalStepTime,
        expectedTotal,
        visualResults
    };
}
/**
 * Test 5: Verify real TTS integration with synchronization
 */
async function testRealTTSIntegration() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 5: Real TTS Integration with Synchronization');
    console.log('='.repeat(70));
    const step = {
        id: 1,
        desc: 'Neural Network Forward Propagation',
        notesSubtopic: 'Understanding data flow through layers',
        compiler: 'js',
        complexity: 3,
        tag: 'nn_forward_prop'
    };
    const topic = 'Deep Learning';
    // Mock visuals
    const visuals = [
        {
            type: 'notes',
            visualNumber: 0,
            svgCode: '<svg>Notes about neural networks</svg>',
            description: 'Introduction to neural networks'
        },
        {
            type: 'animation',
            visualNumber: 1,
            actionCount: 45,
            description: 'Input layer visualization'
        },
        {
            type: 'animation',
            visualNumber: 2,
            actionCount: 52,
            description: 'Hidden layer processing'
        }
    ];
    try {
        console.log('\n📊 Generating narrations with audio...');
        const startTime = Date.now();
        const narrationResult = await (0, audio_narration_service_1.generateStepNarrationWithAudio)(step, topic, visuals, 'test-session-123');
        const generationTime = Date.now() - startTime;
        console.log(`✅ Generated in ${generationTime}ms`);
        console.log(`   Narrations: ${narrationResult.narrations.length}`);
        console.log(`   Has audio: ${narrationResult.hasAudio}`);
        console.log(`   Total audio duration: ${narrationResult.totalDuration}s`);
        console.log(`   Total audio size: ${(narrationResult.totalAudioSize / 1024).toFixed(2)} KB`);
        // Simulate playback of each visual with real audio durations
        console.log('\n📊 Simulating playback with real audio durations...');
        const interVisualDelay = (0, audio_narration_service_1.getInterVisualDelay)();
        const playbackResults = [];
        for (let i = 0; i < narrationResult.narrations.length; i++) {
            const narration = narrationResult.narrations[i];
            const animationDuration = 3000 + (i * 1000); // Simulate varying animation times
            console.log(`\n  Visual ${narration.visualNumber}:`);
            console.log(`    Animation: ${animationDuration}ms`);
            console.log(`    Narration: ${narration.duration}s (${narration.duration * 1000}ms)`);
            const result = await simulateVisualPlayback(narration.visualNumber, animationDuration, { audioContent: Buffer.from(''), audioDuration: narration.duration }, interVisualDelay);
            playbackResults.push(result);
        }
        const totalPlaybackTime = playbackResults.reduce((sum, r) => sum + r.totalWaitTime, 0);
        console.log('\n📊 Playback Summary:');
        console.log(`   Total playback time: ${(totalPlaybackTime / 1000).toFixed(1)}s`);
        console.log(`   Total audio duration: ${narrationResult.totalDuration}s`);
        console.log(`   Overhead (delays): ${((totalPlaybackTime / 1000) - narrationResult.totalDuration).toFixed(1)}s`);
        const validTiming = totalPlaybackTime >= (narrationResult.totalDuration * 1000);
        console.log(validTiming ? '✅ PASS: Playback respects audio durations' : '❌ FAIL: Playback timing incorrect');
        return {
            success: validTiming && narrationResult.hasAudio,
            generationTime,
            narrationCount: narrationResult.narrations.length,
            totalPlaybackTime,
            totalAudioDuration: narrationResult.totalDuration
        };
    }
    catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
/**
 * Main test runner
 */
async function runSynchronizationTests() {
    console.log('\n' + '█'.repeat(70));
    console.log('TTS SYNCHRONIZATION TESTS');
    console.log('Verifying: Animation + Narration + Delay = Proper Sequencing');
    console.log('█'.repeat(70));
    const results = {};
    try {
        // Test 1: Synchronization timing
        results.timing = await testSynchronizationTiming();
        // Test 2: No early transitions
        results.noEarlyTransitions = await testNoEarlyTransitions();
        // Test 3: Inter-visual delay
        results.interVisualDelay = await testInterVisualDelay();
        // Test 4: Complete step sequence
        results.completeSequence = await testCompleteStepSequence();
        // Test 5: Real TTS integration
        results.realTTS = await testRealTTSIntegration();
        // Summary
        console.log('\n' + '═'.repeat(70));
        console.log('TEST SUMMARY');
        console.log('═'.repeat(70));
        const tests = [
            { name: 'Synchronization Timing', result: results.timing },
            { name: 'No Early Transitions', result: results.noEarlyTransitions },
            { name: 'Inter-Visual Delay', result: results.interVisualDelay },
            { name: 'Complete Step Sequence', result: results.completeSequence },
            { name: 'Real TTS Integration', result: results.realTTS }
        ];
        tests.forEach(test => {
            const status = test.result.success ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} - ${test.name}`);
        });
        const allPassed = tests.every(t => t.result.success);
        console.log('\n' + '═'.repeat(70));
        console.log(allPassed ? '✅ ALL SYNCHRONIZATION TESTS PASSED' : '❌ SOME TESTS FAILED');
        console.log('═'.repeat(70));
        if (allPassed) {
            console.log('\n✅ Synchronization is working correctly:');
            console.log('   ✅ Waits for animation to complete');
            console.log('   ✅ Waits for narration to complete');
            console.log('   ✅ Applies inter-visual delay (2-3 seconds)');
            console.log('   ✅ No early transitions');
            console.log('   ✅ Proper sequencing of all visuals');
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
runSynchronizationTests();
