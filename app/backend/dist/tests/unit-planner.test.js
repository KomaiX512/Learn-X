"use strict";
/**
 * UNIT TEST: PLANNER
 * Validates planner generates BOTH descriptions correctly
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
exports.testPlanner = testPlanner;
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const planner_1 = require("../agents/planner");
async function testPlanner() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║           UNIT TEST: PLANNER (Dual Descriptions)            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    const testTopics = [
        'Introduction to Quantum Mechanics',
        'Neural Networks Fundamentals',
        'Operational Amplifiers'
    ];
    let passed = 0;
    let failed = 0;
    for (const topic of testTopics) {
        console.log(`\nTesting: "${topic}"`);
        console.log('─'.repeat(70));
        try {
            const plan = await (0, planner_1.plannerAgent)(topic);
            // Validate structure
            if (!plan.title || !plan.subtitle || !plan.steps || plan.steps.length !== 3) {
                console.log(`❌ FAILED: Invalid plan structure`);
                failed++;
                continue;
            }
            // Validate BOTH descriptions exist for each step
            let allStepsValid = true;
            for (let i = 0; i < plan.steps.length; i++) {
                const step = plan.steps[i];
                const hasDesc = step.desc && step.desc.length > 20;
                const hasNotesSubtopic = step.notesSubtopic && step.notesSubtopic.length > 3;
                console.log(`\nStep ${i + 1}:`);
                console.log(`  ✓ Visual Desc: ${hasDesc ? '✅' : '❌'} (${step.desc?.length || 0} chars)`);
                console.log(`    "${step.desc?.substring(0, 60)}..."`);
                console.log(`  ✓ Notes Subtopic: ${hasNotesSubtopic ? '✅' : '❌'} (${step.notesSubtopic?.length || 0} chars)`);
                console.log(`    "${step.notesSubtopic || 'MISSING'}"`);
                if (!hasDesc || !hasNotesSubtopic) {
                    allStepsValid = false;
                }
            }
            if (allStepsValid) {
                console.log(`\n✅ PASSED: All steps have BOTH descriptions`);
                passed++;
            }
            else {
                console.log(`\n❌ FAILED: Some steps missing descriptions`);
                failed++;
            }
        }
        catch (error) {
            console.log(`❌ EXCEPTION: ${error.message}`);
            failed++;
        }
    }
    console.log('\n' + '═'.repeat(70));
    console.log('PLANNER UNIT TEST RESULTS');
    console.log('═'.repeat(70));
    console.log(`Passed: ${passed}/${testTopics.length}`);
    console.log(`Failed: ${failed}/${testTopics.length}`);
    console.log('═'.repeat(70));
    return failed === 0;
}
if (require.main === module) {
    testPlanner().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('\n💥 TEST CRASHED:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=unit-planner.test.js.map