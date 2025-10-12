/**
 * MASTER TEST SUITE
 * Runs all tests in sequence: Stage → Integration → Full Step
 * Only proceeds if each level passes
 */

const { spawn } = require('child_process');
const path = require('path');

// ============================================================================
// Test Runner Utility
// ============================================================================
function runTest(testFile, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'█'.repeat(80)}`);
    console.log(`🚀 RUNNING: ${testName}`);
    console.log(`${'█'.repeat(80)}\n`);
    
    const testProcess = spawn('node', [testFile], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${testName} PASSED\n`);
        resolve(true);
      } else {
        console.log(`\n❌ ${testName} FAILED (exit code ${code})\n`);
        resolve(false);
      }
    });
    
    testProcess.on('error', (error) => {
      console.error(`\n❌ ${testName} ERROR:`, error.message, '\n');
      resolve(false);
    });
  });
}

// ============================================================================
// Main Test Suite
// ============================================================================
async function runAllTests() {
  console.log('\n' + '█'.repeat(80));
  console.log('🧪 MASTER TEST SUITE - COMPLETE SYSTEM VALIDATION');
  console.log('█'.repeat(80));
  console.log('\nTest Sequence:');
  console.log('  1️⃣  Stage Tests (Individual Components)');
  console.log('  2️⃣  Integration Tests (Combined Components)');
  console.log('  3️⃣  Full Step Test (Complete Production Flow)');
  console.log('\n' + '─'.repeat(80));
  
  const results = {
    stages: false,
    integration: false,
    fullStep: false
  };
  
  const startTime = Date.now();
  
  // ============================================================================
  // LEVEL 1: Stage Tests (Individual Components)
  // ============================================================================
  console.log('\n📍 LEVEL 1: STAGE TESTS');
  console.log('Testing individual components in isolation...\n');
  
  results.stages = await runTest(
    path.join(__dirname, 'test-unit-stages.js'),
    'Stage Tests (codegenV3, transcriptGenerator, retry logic)'
  );
  
  if (!results.stages) {
    console.log('\n' + '█'.repeat(80));
    console.log('❌ STAGE TESTS FAILED - STOPPING TEST SUITE');
    console.log('█'.repeat(80));
    console.log('\n⚠️  Fix individual components before proceeding to integration tests');
    return printFinalReport(results, Date.now() - startTime);
  }
  
  console.log('\n' + '─'.repeat(80));
  console.log('✅ LEVEL 1 COMPLETE - Proceeding to Integration Tests');
  console.log('─'.repeat(80));
  
  // Small delay between test levels
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // ============================================================================
  // LEVEL 2: Integration Tests (Combined Components)
  // ============================================================================
  console.log('\n📍 LEVEL 2: INTEGRATION TESTS');
  console.log('Testing multiple components working together...\n');
  
  results.integration = await runTest(
    path.join(__dirname, 'test-integration.js'),
    'Integration Tests (Multiple visuals + Transcript)'
  );
  
  if (!results.integration) {
    console.log('\n' + '█'.repeat(80));
    console.log('❌ INTEGRATION TESTS FAILED - STOPPING TEST SUITE');
    console.log('█'.repeat(80));
    console.log('\n⚠️  Fix component integration before proceeding to full step test');
    return printFinalReport(results, Date.now() - startTime);
  }
  
  console.log('\n' + '─'.repeat(80));
  console.log('✅ LEVEL 2 COMPLETE - Proceeding to Full Step Test');
  console.log('─'.repeat(80));
  
  // Small delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // ============================================================================
  // LEVEL 3: Full Step Test (Complete Production Flow)
  // ============================================================================
  console.log('\n📍 LEVEL 3: FULL STEP TEST');
  console.log('Testing complete production flow (generateStepVisuals)...\n');
  
  results.fullStep = await runTest(
    path.join(__dirname, 'test-full-step.js'),
    'Full Step Test (Production Flow)'
  );
  
  // ============================================================================
  // Final Report
  // ============================================================================
  const totalDuration = Date.now() - startTime;
  return printFinalReport(results, totalDuration);
}

// ============================================================================
// Final Report Generator
// ============================================================================
function printFinalReport(results, totalDuration) {
  console.log('\n\n' + '█'.repeat(80));
  console.log('📊 MASTER TEST SUITE - FINAL REPORT');
  console.log('█'.repeat(80));
  
  console.log('\n📋 TEST RESULTS:');
  console.log('─'.repeat(80));
  console.log(`  Level 1 - Stage Tests:        ${results.stages ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Level 2 - Integration Tests:  ${results.integration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Level 3 - Full Step Test:     ${results.fullStep ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n⏱️  TOTAL DURATION:', Math.round(totalDuration / 1000), 'seconds');
  
  const allPassed = results.stages && results.integration && results.fullStep;
  
  console.log('\n' + '═'.repeat(80));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED - SYSTEM IS PRODUCTION READY');
    console.log('═'.repeat(80));
    console.log('\n✅ VERIFIED CAPABILITIES:');
    console.log('   ✓ Individual components work correctly');
    console.log('   ✓ Components integrate seamlessly');
    console.log('   ✓ Full production flow generates quality output');
    console.log('   ✓ 4 visuals + transcript per step');
    console.log('   ✓ Animations and labels present');
    console.log('   ✓ Performance acceptable (<120s per step)');
    console.log('   ✓ No fallbacks or templates');
    
    console.log('\n🚀 READY FOR DEPLOYMENT');
    console.log('\nNext Steps:');
    console.log('  1. Start dev server: cd app && npm run dev');
    console.log('  2. Test with browser: http://localhost:5174');
    console.log('  3. Try query: "Teach me Newton\'s First Law"');
    console.log('  4. Verify 4 visuals + transcript appear');
    console.log('  5. Check PRODUCTION_CHECKLIST.md for final verification');
    
  } else {
    console.log('❌ SOME TESTS FAILED - NOT READY FOR PRODUCTION');
    console.log('═'.repeat(80));
    console.log('\n⚠️  FAILED TESTS:');
    if (!results.stages) {
      console.log('   ❌ Stage Tests - Fix individual components first');
      console.log('      → Check codegenV3, transcriptGenerator, retry logic');
    }
    if (!results.integration) {
      console.log('   ❌ Integration Tests - Fix component interaction');
      console.log('      → Check parallel generation and transcript integration');
    }
    if (!results.fullStep) {
      console.log('   ❌ Full Step Test - Fix production flow');
      console.log('      → Check generateStepVisuals function in orchestrator');
    }
    
    console.log('\n🔧 DEBUGGING STEPS:');
    console.log('  1. Review error messages above');
    console.log('  2. Check GEMINI_API_KEY is valid');
    console.log('  3. Verify backend compiled: cd app/backend && npm run build');
    console.log('  4. Check network connectivity');
    console.log('  5. Review API rate limits');
  }
  
  console.log('\n' + '█'.repeat(80));
  console.log('');
  
  return allPassed;
}

// ============================================================================
// Run Test Suite
// ============================================================================
console.log('Starting Master Test Suite...');
console.log('This will take several minutes due to LLM API calls.\n');

runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Fatal Error in Test Suite:', error);
    console.error(error.stack);
    process.exit(1);
  });
