"use strict";
/**
 * INTEGRATION TEST: PLANNER → NOTES PIPELINE
 * Validates the complete flow from planner to notes generation
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
exports.testPipeline = testPipeline;
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const planner_1 = require("../agents/planner");
const transcriptGenerator_1 = require("../agents/transcriptGenerator");
async function testPipeline() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║      INTEGRATION TEST: PLANNER → NOTES PIPELINE             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    const topic = 'Introduction to Machine Learning';
    console.log(`Topic: "${topic}"`);
    console.log('═'.repeat(70));
    // STAGE 1: Planner
    console.log('\n📋 STAGE 1: Planner Generation');
    console.log('─'.repeat(70));
    const planStart = Date.now();
    const plan = await (0, planner_1.plannerAgent)(topic);
    const planDuration = ((Date.now() - planStart) / 1000).toFixed(2);
    console.log(`✅ Plan generated in ${planDuration}s`);
    console.log(`   Title: "${plan.title}"`);
    console.log(`   Steps: ${plan.steps.length}`);
    // Validate planner output
    let plannerValid = true;
    for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        const hasDesc = step.desc && step.desc.length > 20;
        const hasNotesSubtopic = step.notesSubtopic && step.notesSubtopic.length > 3;
        console.log(`\n   Step ${i + 1}:`);
        console.log(`     Visual: "${step.desc.substring(0, 50)}..." ${hasDesc ? '✅' : '❌'}`);
        console.log(`     Notes:  "${step.notesSubtopic}" ${hasNotesSubtopic ? '✅' : '❌'}`);
        if (!hasDesc || !hasNotesSubtopic) {
            plannerValid = false;
        }
    }
    if (!plannerValid) {
        console.log('\n❌ PIPELINE BROKEN: Planner not generating both descriptions');
        process.exit(1);
    }
    // STAGE 2: Notes Generation for ALL steps
    console.log('\n\n📝 STAGE 2: Notes Generation (All Steps)');
    console.log('─'.repeat(70));
    const notesResults = [];
    for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        console.log(`\n   Generating notes for Step ${i + 1}...`);
        const notesStart = Date.now();
        const notes = await (0, transcriptGenerator_1.generateNotes)(step, topic, step.desc);
        const notesDuration = ((Date.now() - notesStart) / 1000).toFixed(2);
        if (!notes || notes.length < 2000) {
            console.log(`   ❌ FAILED: ${notes ? `${notes.length} chars` : 'null'}`);
            notesResults.push({ success: false, duration: notesDuration });
        }
        else {
            const textElements = (notes.match(/<text/g) || []).length;
            console.log(`   ✅ SUCCESS in ${notesDuration}s`);
            console.log(`      Length: ${notes.length} chars`);
            console.log(`      Text elements: ${textElements}`);
            notesResults.push({ success: true, duration: notesDuration, length: notes.length, textElements });
        }
    }
    // STAGE 3: Validation
    console.log('\n\n✅ STAGE 3: Pipeline Validation');
    console.log('─'.repeat(70));
    const successCount = notesResults.filter(r => r.success).length;
    const avgDuration = notesResults.reduce((sum, r) => sum + parseFloat(r.duration), 0) / notesResults.length;
    console.log(`   Planner: ✅ Generated ${plan.steps.length} steps with dual descriptions`);
    console.log(`   Notes: ${successCount}/${plan.steps.length} successful`);
    console.log(`   Avg time per step: ${avgDuration.toFixed(2)}s`);
    console.log(`   Total pipeline time: ${((Date.now() - planStart) / 1000).toFixed(2)}s`);
    if (successCount === plan.steps.length) {
        console.log('\n🎉 PIPELINE WORKING PERFECTLY!');
        console.log('   ✅ Planner generates dual descriptions');
        console.log('   ✅ Notes generator uses AI subtopic');
        console.log('   ✅ All steps generate successfully');
        console.log('   ✅ No pipeline breaks detected');
        return true;
    }
    else {
        console.log('\n❌ PIPELINE HAS ISSUES:');
        console.log(`   ${plan.steps.length - successCount} steps failed to generate notes`);
        return false;
    }
}
if (require.main === module) {
    testPipeline().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('\n💥 TEST CRASHED:', error);
        process.exit(1);
    });
}
