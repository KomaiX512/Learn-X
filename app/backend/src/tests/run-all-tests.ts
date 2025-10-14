/**
 * RUN ALL TESTS
 * Executes all unit tests, integration tests, and E2E tests in sequence
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { testPlanner } from './unit-planner.test';
import { testNotesGenerator } from './unit-notes.test';
import { testPipeline } from './integration-pipeline.test';
import { testE2E } from './e2e-full-system.test';

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
    results.unitPlanner = await testPlanner();
    
    if (!results.unitPlanner) {
      console.log('\n❌ CRITICAL: Planner unit test failed. Stopping tests.');
      printSummary(results);
      process.exit(1);
    }
    
    // Unit Test 2: Notes Generator
    console.log('\n\n' + '█'.repeat(70));
    console.log('█ TEST 2/4: UNIT TEST - NOTES GENERATOR');
    console.log('█'.repeat(70));
    results.unitNotes = await testNotesGenerator();
    
    if (!results.unitNotes) {
      console.log('\n❌ CRITICAL: Notes generator unit test failed. Stopping tests.');
      printSummary(results);
      process.exit(1);
    }
    
    // Integration Test: Pipeline
    console.log('\n\n' + '█'.repeat(70));
    console.log('█ TEST 3/4: INTEGRATION TEST - PIPELINE');
    console.log('█'.repeat(70));
    results.integration = await testPipeline();
    
    if (!results.integration) {
      console.log('\n❌ CRITICAL: Integration test failed. Stopping tests.');
      printSummary(results);
      process.exit(1);
    }
    
    // End-to-End Test: Full System
    console.log('\n\n' + '█'.repeat(70));
    console.log('█ TEST 4/4: END-TO-END TEST - FULL SYSTEM');
    console.log('█'.repeat(70));
    results.e2e = await testE2E();
    
    // Final Summary
    printSummary(results);
    
    if (Object.values(results).every(r => r === true)) {
      console.log('\n🎉🎉🎉 ALL TESTS PASSED! SYSTEM PRODUCTION READY! 🎉🎉🎉\n');
      process.exit(0);
    } else {
      console.log('\n❌ SOME TESTS FAILED - REVIEW RESULTS ABOVE\n');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('\n💥 TEST SUITE CRASHED:', error.message);
    console.error(error.stack);
    printSummary(results);
    process.exit(1);
  }
}

function printSummary(results: any) {
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
