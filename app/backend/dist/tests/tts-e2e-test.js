"use strict";
/**
 * TTS End-to-End Integration Test
 * Tests complete flow: Visual Generation → Narration → TTS → Emission → Synchronization
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
const transcriptGenerator_1 = require("../agents/transcriptGenerator");
const codegenV3WithRetry_1 = require("../agents/codegenV3WithRetry");
const fs = __importStar(require("fs"));
const ENABLE_NOTES_GENERATION = true;
const VISUALS_PER_STEP = 4;
/**
 * Simulate the complete orchestrator generateStepVisuals flow
 */
async function simulateGenerateStepVisuals(step, topic, sessionId) {
    console.log('\n' + '='.repeat(70));
    console.log(`SIMULATING STEP ${step.id} GENERATION (Complete Flow)`);
    console.log('='.repeat(70));
    const overallStart = Date.now();
    // Phase 1: Generate visuals in parallel
    console.log('\n📊 PHASE 1: Visual Generation (Parallel)');
    console.log('─'.repeat(70));
    const visualStartTime = Date.now();
    const allPromises = [];
    let notesSvgCode = null;
    let notesAction = null;
    // Generate notes
    if (ENABLE_NOTES_GENERATION) {
        console.log('[1/5] Generating notes keynote...');
        const notesPromise = (async () => {
            try {
                const svgCode = await (0, transcriptGenerator_1.generateNotes)(step, topic, step.desc);
                if (!svgCode) {
                    console.error('❌ Notes generation failed');
                    return null;
                }
                notesSvgCode = svgCode;
                console.log(`✅ [1/5] Notes generated (${svgCode.length} chars)`);
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
    // Generate animations
    const animationMetadata = [];
    for (let i = 0; i < VISUALS_PER_STEP; i++) {
        const visualNumber = i + 1;
        console.log(`[${visualNumber + 1}/5] Generating animation ${visualNumber}...`);
        const animPromise = (async () => {
            try {
                const result = await (0, codegenV3WithRetry_1.codegenV3WithRetry)(step, topic);
                if (!result || !result.actions || result.actions.length === 0) {
                    console.warn(`⚠️  Animation ${visualNumber} returned no actions`);
                    return null;
                }
                animationMetadata.push({
                    index: i,
                    actionCount: result.actions.length
                });
                console.log(`✅ [${visualNumber + 1}/5] Animation ${visualNumber} generated (${result.actions.length} actions)`);
                return {
                    ...result.actions[0],
                    visualGroup: `step-${step.id}-animation-${visualNumber}`,
                    isNotesKeynote: false,
                    priority: 2 + visualNumber
                };
            }
            catch (error) {
                console.error(`❌ Animation ${visualNumber} error: ${error.message}`);
                return null;
            }
        })();
        allPromises.push(animPromise);
    }
    // Wait for all visuals
    const allResults = await Promise.all(allPromises);
    const visualElapsed = Date.now() - visualStartTime;
    notesAction = ENABLE_NOTES_GENERATION ? allResults[0] : null;
    const animationResults = ENABLE_NOTES_GENERATION ? allResults.slice(1) : allResults;
    const successfulAnimations = animationResults.filter(v => v !== null);
    console.log(`\n✅ PHASE 1 COMPLETE in ${visualElapsed}ms:`);
    console.log(`   - Notes: ${notesAction ? 'YES' : 'NO'}`);
    console.log(`   - Animations: ${successfulAnimations.length}/${VISUALS_PER_STEP}`);
    console.log(`   - Total visuals: ${(notesAction ? 1 : 0) + successfulAnimations.length}`);
    // Phase 2: Generate narrations + audio
    console.log('\n📊 PHASE 2: Narration + Audio Generation (Batch)');
    console.log('─'.repeat(70));
    let stepNarration = undefined;
    try {
        const narrationStart = Date.now();
        // Prepare visual inputs
        const visualInputs = [];
        if (notesAction && notesSvgCode) {
            visualInputs.push({
                type: 'notes',
                visualNumber: 0,
                svgCode: notesSvgCode,
                description: step.desc
            });
            console.log('✓ Added notes visual to narration input');
        }
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
        console.log(`\n🎤 Generating ${visualInputs.length} narrations + audio...`);
        if (visualInputs.length > 0) {
            stepNarration = await (0, audio_narration_service_1.generateStepNarrationWithAudio)(step, topic, visualInputs, sessionId);
            const narrationElapsed = Date.now() - narrationStart;
            const hasAudioStr = stepNarration.hasAudio ? 'with audio' : 'text-only';
            const audioSizeMB = (stepNarration.totalAudioSize / 1024 / 1024).toFixed(2);
            console.log(`\n✅ PHASE 2 COMPLETE in ${narrationElapsed}ms:`);
            console.log(`   - Narrations: ${stepNarration.narrations.length}`);
            console.log(`   - Has audio: ${stepNarration.hasAudio}`);
            console.log(`   - Total audio duration: ${stepNarration.totalDuration}s`);
            console.log(`   - Total audio size: ${audioSizeMB}MB`);
            // Verify each narration has audio
            console.log('\n📊 Narration Details:');
            stepNarration.narrations.forEach((n, idx) => {
                const hasAudio = n.audioBase64 && n.audioBase64.length > 0;
                const audioSizeKB = n.audioSize ? (n.audioSize / 1024).toFixed(2) : '0';
                console.log(`   [${idx + 1}] Visual ${n.visualNumber} (${n.type}): ${n.duration}s, ${audioSizeKB}KB, ${hasAudio ? '✅ Has audio' : '❌ No audio'}`);
            });
        }
    }
    catch (error) {
        console.error(`\n❌ PHASE 2 FAILED: ${error.message}`);
        console.error(error.stack);
    }
    const overallElapsed = Date.now() - overallStart;
    console.log('\n' + '='.repeat(70));
    console.log(`🏁 STEP ${step.id} COMPLETE in ${overallElapsed}ms`);
    console.log(`   - Visual generation: ${visualElapsed}ms`);
    console.log(`   - Narration + audio: ${overallElapsed - visualElapsed}ms`);
    console.log('='.repeat(70));
    // Build final data structure (as would be emitted to frontend)
    const allActions = [];
    if (notesAction)
        allActions.push(notesAction);
    allActions.push(...successfulAnimations);
    const eventData = {
        type: 'actions',
        stepId: step.id,
        actions: allActions,
        narration: stepNarration,
        ttsConfig: {
            enabled: (0, audio_narration_service_1.isAudioNarrationAvailable)(),
            interVisualDelay: (0, audio_narration_service_1.getInterVisualDelay)(),
            waitForNarration: true,
            waitForAnimation: true
        },
        meta: {
            hasNotes: notesAction !== null,
            animationCount: successfulAnimations.length,
            totalVisuals: allActions.length,
            hasNarration: stepNarration !== undefined,
            narrationCount: stepNarration?.narrations?.length || 0,
            totalAudioDuration: stepNarration?.totalDuration || 0
        }
    };
    return {
        success: allActions.length > 0 && stepNarration !== undefined,
        eventData,
        timings: {
            visual: visualElapsed,
            narration: overallElapsed - visualElapsed,
            total: overallElapsed
        }
    };
}
/**
 * Validate the emitted data structure
 */
function validateEventData(eventData) {
    const errors = [];
    console.log('\n📊 Validating Event Data Structure...');
    // Check basic structure
    if (!eventData.type)
        errors.push('Missing type field');
    if (!eventData.stepId)
        errors.push('Missing stepId field');
    if (!eventData.actions || !Array.isArray(eventData.actions)) {
        errors.push('Missing or invalid actions array');
    }
    // Check narration structure
    if (!eventData.narration) {
        errors.push('Missing narration object');
    }
    else {
        const narration = eventData.narration;
        if (!Array.isArray(narration.narrations)) {
            errors.push('narration.narrations is not an array');
        }
        else {
            console.log(`✓ Found ${narration.narrations.length} narrations`);
            // Check each narration
            narration.narrations.forEach((n, idx) => {
                if (typeof n.visualNumber !== 'number') {
                    errors.push(`Narration ${idx}: missing visualNumber`);
                }
                if (!n.type) {
                    errors.push(`Narration ${idx}: missing type`);
                }
                if (!n.narration || n.narration.length === 0) {
                    errors.push(`Narration ${idx}: missing or empty narration text`);
                }
                if (typeof n.duration !== 'number') {
                    errors.push(`Narration ${idx}: missing duration`);
                }
                // Check audio data
                if (narration.hasAudio) {
                    if (!n.audioBase64 || n.audioBase64.length === 0) {
                        errors.push(`Narration ${idx}: hasAudio=true but no audioBase64`);
                    }
                    else {
                        console.log(`  ✓ Visual ${n.visualNumber}: Has audio (${(n.audioSize / 1024).toFixed(2)}KB)`);
                    }
                }
            });
        }
        if (typeof narration.totalDuration !== 'number') {
            errors.push('narration.totalDuration is not a number');
        }
        if (typeof narration.hasAudio !== 'boolean') {
            errors.push('narration.hasAudio is not a boolean');
        }
    }
    // Check TTS config
    if (!eventData.ttsConfig) {
        errors.push('Missing ttsConfig object');
    }
    else {
        const config = eventData.ttsConfig;
        if (typeof config.enabled !== 'boolean') {
            errors.push('ttsConfig.enabled is not a boolean');
        }
        if (typeof config.interVisualDelay !== 'number') {
            errors.push('ttsConfig.interVisualDelay is not a number');
        }
        if (typeof config.waitForNarration !== 'boolean') {
            errors.push('ttsConfig.waitForNarration is not a boolean');
        }
        if (typeof config.waitForAnimation !== 'boolean') {
            errors.push('ttsConfig.waitForAnimation is not a boolean');
        }
        console.log('✓ TTS config valid');
        console.log(`  - Enabled: ${config.enabled}`);
        console.log(`  - Inter-visual delay: ${config.interVisualDelay}ms`);
        console.log(`  - Wait for narration: ${config.waitForNarration}`);
        console.log(`  - Wait for animation: ${config.waitForAnimation}`);
    }
    // Check metadata
    if (!eventData.meta) {
        errors.push('Missing meta object');
    }
    else {
        console.log('✓ Metadata valid');
        console.log(`  - Total visuals: ${eventData.meta.totalVisuals}`);
        console.log(`  - Narration count: ${eventData.meta.narrationCount}`);
        console.log(`  - Total audio duration: ${eventData.meta.totalAudioDuration}s`);
    }
    if (errors.length === 0) {
        console.log('\n✅ Event data structure is valid');
    }
    else {
        console.log('\n❌ Event data validation failed:');
        errors.forEach(err => console.log(`   - ${err}`));
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Test audio files were created
 */
function validateAudioFiles(sessionId, narrations) {
    console.log('\n📊 Validating Audio Files...');
    const audioDir = `${process.cwd()}/audio-output`;
    let allFilesExist = true;
    narrations.forEach((n) => {
        const filename = `step-1-visual-${n.visualNumber}-${sessionId}.mp3`;
        const filepath = `${audioDir}/${filename}`;
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            console.log(`✓ Visual ${n.visualNumber}: ${filename} (${(stats.size / 1024).toFixed(2)}KB)`);
        }
        else {
            console.log(`❌ Visual ${n.visualNumber}: ${filename} NOT FOUND`);
            allFilesExist = false;
        }
    });
    return allFilesExist;
}
/**
 * Main test
 */
async function runE2ETest() {
    console.log('\n' + '█'.repeat(70));
    console.log('TTS END-TO-END INTEGRATION TEST');
    console.log('Complete Flow: Visuals → Narration → TTS → Emission');
    console.log('█'.repeat(70));
    const step = {
        id: 1,
        desc: 'Understanding Convolutional Neural Networks for Image Recognition',
        notesSubtopic: 'CNN Architecture: Convolution, Pooling, and Feature Maps',
        compiler: 'js',
        complexity: 4,
        tag: 'cnn_architecture'
    };
    const topic = 'Computer Vision';
    const sessionId = `e2e-test-${Date.now()}`;
    try {
        // Run complete flow
        const result = await simulateGenerateStepVisuals(step, topic, sessionId);
        if (!result.success) {
            console.error('\n❌ E2E test failed: Generation unsuccessful');
            process.exit(1);
        }
        // Validate event data
        const validation = validateEventData(result.eventData);
        if (!validation.valid) {
            console.error('\n❌ E2E test failed: Invalid event data structure');
            process.exit(1);
        }
        // Validate audio files
        const filesExist = validateAudioFiles(sessionId, result.eventData.narration.narrations);
        if (!filesExist) {
            console.error('\n❌ E2E test failed: Some audio files missing');
            process.exit(1);
        }
        // Summary
        console.log('\n' + '═'.repeat(70));
        console.log('E2E TEST RESULTS');
        console.log('═'.repeat(70));
        console.log('✅ Visual generation: WORKING');
        console.log('✅ Narration generation: WORKING');
        console.log('✅ TTS audio synthesis: WORKING');
        console.log('✅ Audio file creation: WORKING');
        console.log('✅ Event data structure: VALID');
        console.log('✅ TTS configuration: VALID');
        console.log('\n📊 Performance:');
        console.log(`   - Visual generation: ${result.timings.visual}ms`);
        console.log(`   - Narration + TTS: ${result.timings.narration}ms`);
        console.log(`   - Total: ${result.timings.total}ms`);
        console.log('\n📊 Output:');
        console.log(`   - Total visuals: ${result.eventData.meta.totalVisuals}`);
        console.log(`   - Total narrations: ${result.eventData.meta.narrationCount}`);
        console.log(`   - Total audio duration: ${result.eventData.meta.totalAudioDuration}s`);
        console.log(`   - Has audio: ${result.eventData.narration.hasAudio}`);
        console.log('\n✅ E2E INTEGRATION: FULLY WORKING');
        console.log('✅ Ready for frontend integration');
        console.log('✅ No bugs detected');
        console.log('═'.repeat(70));
        console.log('');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ E2E test failed with error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}
// Run test
runE2ETest();
//# sourceMappingURL=tts-e2e-test.js.map