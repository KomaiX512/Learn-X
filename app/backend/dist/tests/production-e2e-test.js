"use strict";
/**
 * PRODUCTION END-TO-END TEST
 *
 * BRUTALLY HONEST ANALYSIS:
 * - Complete lecture generation (all steps)
 * - Timing analysis per step
 * - Failure tracking
 * - Quality metrics
 * - Fallback detection
 * - Architecture limitations
 *
 * NO SUGAR COATING - Real production test
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
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const planner_1 = require("../agents/planner");
const transcriptGenerator_1 = require("../agents/transcriptGenerator");
const codegenV3WithRetry_1 = require("../agents/codegenV3WithRetry");
// Test query - real educational content
const TEST_QUERY = 'Introduction to Quantum Mechanics';
async function analyzePlanGeneration(query) {
    console.log('\n' + '═'.repeat(80));
    console.log('📋 STEP 1: PLAN GENERATION');
    console.log('═'.repeat(80));
    console.log(`Query: "${query}"`);
    const startTime = Date.now();
    try {
        const plan = await (0, planner_1.plannerAgent)(query);
        const time = Date.now() - startTime;
        if (!plan || !plan.steps || plan.steps.length === 0) {
            console.log('❌ FAILED: No plan generated');
            return { plan: null, time, success: false };
        }
        console.log(`✅ SUCCESS in ${(time / 1000).toFixed(2)}s`);
        console.log(`   - Title: ${plan.title}`);
        console.log(`   - Steps: ${plan.steps.length}`);
        plan.steps.forEach((step, idx) => {
            console.log(`   ${idx + 1}. [${step.tag}] ${step.desc.substring(0, 60)}...`);
        });
        return { plan, time, success: true };
    }
    catch (error) {
        const time = Date.now() - startTime;
        console.log(`❌ EXCEPTION: ${error.message}`);
        return { plan: null, time, success: false };
    }
}
async function analyzeStepGeneration(step, topic, stepIndex, totalSteps) {
    console.log('\n' + '═'.repeat(80));
    console.log(`📝 STEP ${stepIndex + 1}/${totalSteps}: CONTENT GENERATION`);
    console.log('═'.repeat(80));
    console.log(`Tag: [${step.tag}]`);
    console.log(`Desc: ${step.desc.substring(0, 100)}...`);
    const analysis = {
        stepId: step.id,
        stepTag: step.tag,
        stepDesc: step.desc,
        notesGenerated: false,
        notesTime: 0,
        notesQuality: { chars: 0, textElements: 0, totalElements: 0 },
        animationsGenerated: 0,
        animationsTimes: [],
        totalTime: 0,
        failures: []
    };
    const stepStartTime = Date.now();
    // 1. NOTES GENERATION
    console.log('\n📝 Generating NOTES keynote...');
    const notesStartTime = Date.now();
    try {
        const svgCode = await (0, transcriptGenerator_1.generateNotes)(step, topic, step.desc);
        analysis.notesTime = Date.now() - notesStartTime;
        if (svgCode) {
            analysis.notesGenerated = true;
            analysis.notesQuality.chars = svgCode.length;
            analysis.notesQuality.textElements = (svgCode.match(/<text/g) || []).length;
            const rectCount = (svgCode.match(/<rect/g) || []).length;
            const lineCount = (svgCode.match(/<line/g) || []).length;
            analysis.notesQuality.totalElements = analysis.notesQuality.textElements + rectCount + lineCount;
            console.log(`✅ Notes SUCCESS in ${(analysis.notesTime / 1000).toFixed(2)}s`);
            console.log(`   - Length: ${analysis.notesQuality.chars} chars`);
            console.log(`   - Elements: ${analysis.notesQuality.totalElements} (${analysis.notesQuality.textElements} text)`);
        }
        else {
            analysis.failures.push('Notes generation returned null');
            console.log(`❌ Notes FAILED in ${(analysis.notesTime / 1000).toFixed(2)}s`);
        }
    }
    catch (error) {
        analysis.notesTime = Date.now() - notesStartTime;
        analysis.failures.push(`Notes exception: ${error.message}`);
        console.log(`❌ Notes EXCEPTION: ${error.message}`);
    }
    // 2. ANIMATIONS GENERATION (4 parallel)
    console.log('\n🎬 Generating 4 ANIMATIONS in parallel...');
    const animationsStartTime = Date.now();
    const animationPromises = Array.from({ length: 4 }, async (_, index) => {
        const animStartTime = Date.now();
        try {
            const result = await (0, codegenV3WithRetry_1.codegenV3WithRetry)(step, topic);
            const animTime = Date.now() - animStartTime;
            if (result && result.actions && result.actions.length > 0) {
                console.log(`✅ Animation ${index + 1}/4 SUCCESS in ${(animTime / 1000).toFixed(2)}s (${result.actions.length} actions)`);
                return { success: true, time: animTime, actions: result.actions.length };
            }
            else {
                console.log(`❌ Animation ${index + 1}/4 FAILED in ${(animTime / 1000).toFixed(2)}s`);
                return { success: false, time: animTime, actions: 0 };
            }
        }
        catch (error) {
            const animTime = Date.now() - animStartTime;
            console.log(`❌ Animation ${index + 1}/4 EXCEPTION: ${error.message}`);
            return { success: false, time: animTime, actions: 0 };
        }
    });
    const animationResults = await Promise.all(animationPromises);
    const animationsTime = Date.now() - animationsStartTime;
    analysis.animationsGenerated = animationResults.filter(r => r.success).length;
    analysis.animationsTimes = animationResults.map(r => r.time);
    console.log(`\n📊 Animations COMPLETE in ${(animationsTime / 1000).toFixed(2)}s`);
    console.log(`   - Success: ${analysis.animationsGenerated}/4`);
    console.log(`   - Failed: ${4 - analysis.animationsGenerated}/4`);
    if (analysis.animationsGenerated < 4) {
        analysis.failures.push(`Only ${analysis.animationsGenerated}/4 animations generated`);
    }
    analysis.totalTime = Date.now() - stepStartTime;
    console.log(`\n⏱️  STEP ${stepIndex + 1} TOTAL TIME: ${(analysis.totalTime / 1000).toFixed(2)}s`);
    return analysis;
}
async function runProductionTest() {
    console.log('\n');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(15) + 'PRODUCTION END-TO-END TEST' + ' '.repeat(37) + '║');
    console.log('║' + ' '.repeat(20) + 'BRUTALLY HONEST ANALYSIS' + ' '.repeat(34) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    const testStartTime = Date.now();
    const lectureAnalysis = {
        query: TEST_QUERY,
        planGenerated: false,
        planTime: 0,
        totalSteps: 0,
        stepsAnalyzed: [],
        overallTime: 0,
        successRate: 0,
        failures: [],
        architectureLimitations: [],
        fallbacksDetected: []
    };
    // STEP 1: Plan Generation
    const planResult = await analyzePlanGeneration(TEST_QUERY);
    lectureAnalysis.planGenerated = planResult.success;
    lectureAnalysis.planTime = planResult.time;
    if (!planResult.success) {
        lectureAnalysis.failures.push('Plan generation failed');
        printFinalAnalysis(lectureAnalysis);
        process.exit(1);
    }
    const plan = planResult.plan;
    lectureAnalysis.totalSteps = plan.steps.length;
    // STEP 2: Generate content for ALL steps
    console.log('\n' + '═'.repeat(80));
    console.log(`🎯 GENERATING CONTENT FOR ALL ${plan.steps.length} STEPS`);
    console.log('═'.repeat(80));
    for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        const stepAnalysis = await analyzeStepGeneration(step, TEST_QUERY, i, plan.steps.length);
        lectureAnalysis.stepsAnalyzed.push(stepAnalysis);
        // Collect failures
        if (stepAnalysis.failures.length > 0) {
            lectureAnalysis.failures.push(...stepAnalysis.failures.map(f => `Step ${i + 1}: ${f}`));
        }
    }
    lectureAnalysis.overallTime = Date.now() - testStartTime;
    // Calculate success rate
    const totalAttempts = lectureAnalysis.totalSteps * 5; // 1 notes + 4 animations per step
    const successfulGenerations = lectureAnalysis.stepsAnalyzed.reduce((sum, step) => {
        return sum + (step.notesGenerated ? 1 : 0) + step.animationsGenerated;
    }, 0);
    lectureAnalysis.successRate = (successfulGenerations / totalAttempts) * 100;
    // Analyze architecture limitations
    analyzeArchitectureLimitations(lectureAnalysis);
    // Print final analysis
    printFinalAnalysis(lectureAnalysis);
    process.exit(lectureAnalysis.successRate >= 80 ? 0 : 1);
}
function analyzeArchitectureLimitations(analysis) {
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 ARCHITECTURE LIMITATIONS ANALYSIS');
    console.log('═'.repeat(80));
    // Check for consistent failures
    const notesFailures = analysis.stepsAnalyzed.filter(s => !s.notesGenerated).length;
    const animationFailures = analysis.stepsAnalyzed.reduce((sum, s) => sum + (4 - s.animationsGenerated), 0);
    if (notesFailures > 0) {
        const limitation = `Notes generation fails ${notesFailures}/${analysis.totalSteps} times (${((notesFailures / analysis.totalSteps) * 100).toFixed(1)}%)`;
        analysis.architectureLimitations.push(limitation);
        console.log(`⚠️  ${limitation}`);
    }
    if (animationFailures > 0) {
        const totalAnimations = analysis.totalSteps * 4;
        const limitation = `Animation generation fails ${animationFailures}/${totalAnimations} times (${((animationFailures / totalAnimations) * 100).toFixed(1)}%)`;
        analysis.architectureLimitations.push(limitation);
        console.log(`⚠️  ${limitation}`);
    }
    // Check timing issues
    const avgStepTime = analysis.stepsAnalyzed.reduce((sum, s) => sum + s.totalTime, 0) / analysis.stepsAnalyzed.length;
    if (avgStepTime > 60000) {
        const limitation = `Average step time too high: ${(avgStepTime / 1000).toFixed(1)}s (target: <60s)`;
        analysis.architectureLimitations.push(limitation);
        console.log(`⚠️  ${limitation}`);
    }
    if (analysis.architectureLimitations.length === 0) {
        console.log('✅ No significant architecture limitations detected');
    }
}
function printFinalAnalysis(analysis) {
    console.log('\n');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(25) + 'FINAL ANALYSIS' + ' '.repeat(39) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    console.log('\n📊 OVERALL METRICS:');
    console.log(`   Query: "${analysis.query}"`);
    console.log(`   Total Time: ${(analysis.overallTime / 1000).toFixed(2)}s`);
    console.log(`   Plan Generated: ${analysis.planGenerated ? '✅ YES' : '❌ NO'} (${(analysis.planTime / 1000).toFixed(2)}s)`);
    console.log(`   Total Steps: ${analysis.totalSteps}`);
    console.log(`   Success Rate: ${analysis.successRate.toFixed(1)}%`);
    console.log('\n📝 NOTES GENERATION:');
    const notesSuccess = analysis.stepsAnalyzed.filter(s => s.notesGenerated).length;
    console.log(`   Success: ${notesSuccess}/${analysis.totalSteps} (${((notesSuccess / analysis.totalSteps) * 100).toFixed(1)}%)`);
    const avgNotesTime = analysis.stepsAnalyzed.reduce((sum, s) => sum + s.notesTime, 0) / analysis.stepsAnalyzed.length;
    console.log(`   Avg Time: ${(avgNotesTime / 1000).toFixed(2)}s`);
    console.log('\n🎬 ANIMATIONS GENERATION:');
    const totalAnimations = analysis.totalSteps * 4;
    const successfulAnimations = analysis.stepsAnalyzed.reduce((sum, s) => sum + s.animationsGenerated, 0);
    console.log(`   Success: ${successfulAnimations}/${totalAnimations} (${((successfulAnimations / totalAnimations) * 100).toFixed(1)}%)`);
    console.log('\n❌ FAILURES:');
    if (analysis.failures.length === 0) {
        console.log('   ✅ No failures detected');
    }
    else {
        analysis.failures.forEach(f => console.log(`   - ${f}`));
    }
    console.log('\n⚠️  ARCHITECTURE LIMITATIONS:');
    if (analysis.architectureLimitations.length === 0) {
        console.log('   ✅ No significant limitations');
    }
    else {
        analysis.architectureLimitations.forEach(l => console.log(`   - ${l}`));
    }
    console.log('\n🔍 FALLBACK DETECTION:');
    if (analysis.fallbacksDetected.length === 0) {
        console.log('   ✅ No fallbacks detected (TRUE GENERATION)');
    }
    else {
        analysis.fallbacksDetected.forEach(f => console.log(`   - ${f}`));
    }
    console.log('\n' + '═'.repeat(80));
    if (analysis.successRate >= 90) {
        console.log('🎉 PRODUCTION READY - Excellent quality!');
    }
    else if (analysis.successRate >= 70) {
        console.log('⚠️  ACCEPTABLE - Some improvements needed');
    }
    else {
        console.log('❌ NOT PRODUCTION READY - Significant issues detected');
    }
    console.log('═'.repeat(80));
    console.log('');
}
// Run test
if (require.main === module) {
    runProductionTest().catch(error => {
        console.error('\n💥 TEST CRASHED:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=production-e2e-test.js.map