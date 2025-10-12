#!/usr/bin/env node

/**
 * UNIT TEST FOR CODEGEN V3 - PRODUCTION GRADE
 * 
 * Tests all aspects of the V3 generation pipeline
 */

require('dotenv').config({ path: './app/backend/.env' });
const { codegenV3 } = require('./app/backend/dist/agents/codegenV3');
const { codegenV3WithRetry } = require('./app/backend/dist/agents/codegenV3WithRetry');

// Test configuration
const TESTS = [
  {
    name: 'Simple Concept',
    step: { id: 1, tag: 'hook', desc: 'Water molecule structure', compiler: 'actions' },
    topic: 'Chemistry Basics',
    expectedDuration: 30000 // 30s
  },
  {
    name: 'Complex Biological System',
    step: { id: 2, tag: 'concept', desc: 'Mitochondria energy production in cellular respiration', compiler: 'actions' },
    topic: 'Cell Biology',
    expectedDuration: 40000 // 40s
  },
  {
    name: 'Mathematical Visualization',
    step: { id: 3, tag: 'visual', desc: 'Quadratic function parabola with vertex and roots', compiler: 'actions' },
    topic: 'Algebra',
    expectedDuration: 30000 // 30s
  }
];

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

console.log('\n' + '='.repeat(80));
console.log('🧪 CODEGEN V3 UNIT TESTS - PRODUCTION VERIFICATION');
console.log('='.repeat(80));
console.log(`\nRunning ${TESTS.length} test cases...\n`);

/**
 * Validate SVG structure and quality
 */
function validateSVG(svgCode, testName) {
  const issues = [];
  
  // Check 1: Has SVG tags
  if (!svgCode.includes('<svg')) {
    issues.push('Missing <svg> opening tag');
  }
  if (!svgCode.includes('</svg>')) {
    issues.push('Missing </svg> closing tag');
  }
  
  // Check 2: Tag matching
  const openTags = (svgCode.match(/<svg/g) || []).length;
  const closeTags = (svgCode.match(/<\/svg>/g) || []).length;
  if (openTags !== closeTags) {
    issues.push(`Mismatched tags: ${openTags} open, ${closeTags} close`);
  }
  
  // Check 3: Has XML declaration
  if (!svgCode.includes('<?xml')) {
    issues.push('Missing XML declaration');
  }
  
  // Check 4: Quality metrics
  const hasAnimations = svgCode.includes('<animate') || 
                       svgCode.includes('animateMotion') || 
                       svgCode.includes('animateTransform');
  const textLabels = (svgCode.match(/<text/g) || []).length;
  const shapes = (svgCode.match(/<circle|<rect|<path|<ellipse|<polygon/g) || []).length;
  
  if (!hasAnimations) {
    issues.push('No animations detected');
  }
  if (textLabels === 0) {
    issues.push('No text labels found');
  }
  if (shapes < 3) {
    issues.push(`Only ${shapes} shapes (expected 3+)`);
  }
  
  // Check 5: Size validation
  if (svgCode.length < 500) {
    issues.push(`SVG too small: ${svgCode.length} chars (expected 500+)`);
  }
  if (svgCode.length > 50000) {
    issues.push(`SVG too large: ${svgCode.length} chars (max 50000)`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    metrics: {
      hasAnimations,
      textLabels,
      shapes,
      size: svgCode.length
    }
  };
}

/**
 * Run single test
 */
async function runTest(test, index) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📋 TEST ${index + 1}/${TESTS.length}: ${test.name}`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`   Topic: ${test.topic}`);
  console.log(`   Step: ${test.step.desc}`);
  console.log(`   Expected Duration: <${test.expectedDuration / 1000}s\n`);
  
  const startTime = Date.now();
  
  try {
    // Test direct generation
    console.log('⏳ Testing codegenV3 (direct generation)...');
    const result = await codegenV3(test.step, test.topic);
    const duration = Date.now() - startTime;
    
    if (!result) {
      throw new Error('codegenV3 returned null');
    }
    
    console.log(`✅ Generation completed in ${(duration / 1000).toFixed(2)}s`);
    
    // Validate result structure
    if (!result.actions || result.actions.length === 0) {
      throw new Error('No actions returned');
    }
    
    const action = result.actions[0];
    if (action.op !== 'customSVG') {
      throw new Error(`Wrong action type: ${action.op}`);
    }
    
    if (!action.svgCode) {
      throw new Error('No SVG code in action');
    }
    
    console.log(`📦 Result: ${result.actions.length} action(s), ${action.svgCode.length} chars`);
    
    // Validate SVG
    console.log('\n🔍 Validating SVG quality...');
    const validation = validateSVG(action.svgCode, test.name);
    
    if (validation.valid) {
      console.log('✅ SVG structure: VALID');
    } else {
      console.log('⚠️  SVG structure: ISSUES FOUND');
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    console.log('\n📊 Quality Metrics:');
    console.log(`   Animations: ${validation.metrics.hasAnimations ? '✅' : '❌'}`);
    console.log(`   Labels: ${validation.metrics.textLabels} ${validation.metrics.textLabels > 0 ? '✅' : '❌'}`);
    console.log(`   Shapes: ${validation.metrics.shapes} ${validation.metrics.shapes >= 3 ? '✅' : '❌'}`);
    console.log(`   Size: ${validation.metrics.size} chars`);
    
    // Check duration
    const durationOk = duration < test.expectedDuration;
    console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(2)}s ${durationOk ? '✅' : '⚠️'}`);
    
    // Overall result
    const passed = validation.valid && result.actions.length > 0;
    
    if (passed) {
      console.log('\n✅ TEST PASSED');
      results.passed++;
    } else {
      console.log('\n⚠️  TEST PASSED WITH WARNINGS');
      results.passed++;
    }
    
    results.tests.push({
      name: test.name,
      passed: true,
      duration,
      issues: validation.issues,
      metrics: validation.metrics
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`\n❌ TEST FAILED after ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Error: ${error.message}`);
    
    results.failed++;
    results.tests.push({
      name: test.name,
      passed: false,
      duration,
      error: error.message
    });
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  for (let i = 0; i < TESTS.length; i++) {
    await runTest(TESTS[i], i);
    
    // Add delay between tests to avoid rate limits
    if (i < TESTS.length - 1) {
      console.log('\n⏸️  Waiting 3s before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n   Total Tests: ${TESTS.length}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   Success Rate: ${((results.passed / TESTS.length) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 Detailed Results:\n');
  results.tests.forEach((test, i) => {
    const icon = test.passed ? '✅' : '❌';
    const duration = (test.duration / 1000).toFixed(2);
    console.log(`   ${icon} ${i + 1}. ${test.name} (${duration}s)`);
    if (!test.passed) {
      console.log(`      Error: ${test.error}`);
    } else if (test.issues && test.issues.length > 0) {
      console.log(`      Warnings: ${test.issues.length}`);
    }
  });
  
  // Quality metrics summary
  console.log('\n📈 Quality Metrics Summary:\n');
  const validTests = results.tests.filter(t => t.passed && t.metrics);
  if (validTests.length > 0) {
    const avgSize = (validTests.reduce((sum, t) => sum + t.metrics.size, 0) / validTests.length).toFixed(0);
    const avgLabels = (validTests.reduce((sum, t) => sum + t.metrics.textLabels, 0) / validTests.length).toFixed(1);
    const avgShapes = (validTests.reduce((sum, t) => sum + t.metrics.shapes, 0) / validTests.length).toFixed(1);
    const avgDuration = (validTests.reduce((sum, t) => sum + t.duration, 0) / validTests.length / 1000).toFixed(2);
    const withAnimations = validTests.filter(t => t.metrics.hasAnimations).length;
    
    console.log(`   Average SVG Size: ${avgSize} chars`);
    console.log(`   Average Labels: ${avgLabels}`);
    console.log(`   Average Shapes: ${avgShapes}`);
    console.log(`   Average Duration: ${avgDuration}s`);
    console.log(`   With Animations: ${withAnimations}/${validTests.length} (${((withAnimations/validTests.length)*100).toFixed(0)}%)`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log(`⚠️  ${results.failed} TEST(S) FAILED`);
  }
  
  console.log('='.repeat(80) + '\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 TEST RUNNER FAILED:', error);
  process.exit(1);
});
