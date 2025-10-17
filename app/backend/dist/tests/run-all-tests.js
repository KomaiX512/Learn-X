"use strict";
/**
 * RUN ALL TESTS
 * Executes all unit tests, integration tests, and E2E tests in sequence
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
const unit_planner_test_1 = require("./unit-planner.test");
const unit_notes_test_1 = require("./unit-notes.test");
const integration_pipeline_test_1 = require("./integration-pipeline.test");
const e2e_full_system_test_1 = require("./e2e-full-system.test");
async function runAllTests() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                  COMPREHENSIVE TEST SUITE                    ║');
    console.log('║         Unit → Integration → End-to-End Testing              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    const results = {
        unitPlanner: false,
        unitNotes: false,
        integration: false,
        e2e: false
    };
    try {
        // Unit Test 1: Planner
        console.log('\n' + '█'.repeat(70));
        console.log('█ TEST 1/4: UNIT TEST - PLANNER');
        console.log('█'.repeat(70));
        results.unitPlanner = await (0, unit_planner_test_1.testPlanner)();
        if (!results.unitPlanner) {
            console.log('\n❌ CRITICAL: Planner unit test failed. Stopping tests.');
            printSummary(results);
            process.exit(1);
        }
        // Unit Test 2: Notes Generator
        console.log('\n\n' + '█'.repeat(70));
        console.log('█ TEST 2/4: UNIT TEST - NOTES GENERATOR');
        console.log('█'.repeat(70));
        results.unitNotes = await (0, unit_notes_test_1.testNotesGenerator)();
        if (!results.unitNotes) {
            console.log('\n❌ CRITICAL: Notes generator unit test failed. Stopping tests.');
            printSummary(results);
            process.exit(1);
        }
        // Integration Test: Pipeline
        console.log('\n\n' + '█'.repeat(70));
        console.log('█ TEST 3/4: INTEGRATION TEST - PIPELINE');
        console.log('█'.repeat(70));
        results.integration = await (0, integration_pipeline_test_1.testPipeline)();
        if (!results.integration) {
            console.log('\n❌ CRITICAL: Integration test failed. Stopping tests.');
            printSummary(results);
            process.exit(1);
        }
        // End-to-End Test: Full System
        console.log('\n\n' + '█'.repeat(70));
        console.log('█ TEST 4/4: END-TO-END TEST - FULL SYSTEM');
        console.log('█'.repeat(70));
        results.e2e = await (0, e2e_full_system_test_1.testE2E)();
        // Final Summary
        printSummary(results);
        if (Object.values(results).every(r => r === true)) {
            console.log('\n🎉🎉🎉 ALL TESTS PASSED! SYSTEM PRODUCTION READY! 🎉🎉🎉\n');
            process.exit(0);
        }
        else {
            console.log('\n❌ SOME TESTS FAILED - REVIEW RESULTS ABOVE\n');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('\n💥 TEST SUITE CRASHED:', error.message);
        console.error(error.stack);
        printSummary(results);
        process.exit(1);
    }
}
function printSummary(results) {
    console.log('\n\n' + '═'.repeat(70));
    console.log('COMPREHENSIVE TEST SUITE SUMMARY');
    console.log('═'.repeat(70));
    console.log(`1. Unit Test - Planner:        ${results.unitPlanner ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`2. Unit Test - Notes Generator: ${results.unitNotes ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`3. Integration Test - Pipeline: ${results.integration ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`4. End-to-End Test - Full System: ${results.e2e ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('═'.repeat(70));
    const passedCount = Object.values(results).filter(r => r === true).length;
    const totalCount = Object.keys(results).length;
    console.log(`Overall: ${passedCount}/${totalCount} tests passed`);
    console.log('═'.repeat(70));
}
if (require.main === module) {
    runAllTests();
}
//# sourceMappingURL=run-all-tests.js.map