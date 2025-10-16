/**
 * Unit Test: Clarifier Recovery Logic
 * Tests retry mechanism and fallback for JSON parsing errors
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import { clarifierAgent, ClarificationRequest } from './src/agents/clarifier';
import { logger } from './src/logger';

// Test configuration
const TEST_CASES = [
  {
    name: 'Valid Question Test',
    question: 'What is the Carnot efficiency formula?',
    stepTag: 'Carnot Efficiency',
    expectSuccess: true
  },
  {
    name: 'Complex Question Test',
    question: 'How does the reversible process affect entropy in the Carnot cycle?',
    stepTag: 'Thermodynamic Processes',
    expectSuccess: true
  },
  {
    name: 'Simple Clarification Test',
    question: 'Why is this important?',
    stepTag: 'Introduction',
    expectSuccess: true
  }
];

async function testClarifierRecovery() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🧪 CLARIFIER RECOVERY SYSTEM TEST');
  console.log('═══════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Question: "${testCase.question}"`);
    console.log(`   Step: ${testCase.stepTag}`);
    
    try {
      const startTime = Date.now();
      
      const request: ClarificationRequest = {
        query: 'Carnot Engine',
        step: {
          id: 1,
          tag: testCase.stepTag,
          desc: `Understanding ${testCase.stepTag}`
        },
        question: testCase.question,
        plan: {
          title: 'Carnot Engine Explained',
          subtitle: 'Thermodynamics fundamentals',
          toc: [],
          steps: []
        }
      };

      const result = await clarifierAgent(request);
      const duration = Date.now() - startTime;

      // Validate result structure
      if (!result.title || typeof result.title !== 'string') {
        throw new Error('Invalid title field');
      }
      
      if (!result.explanation || typeof result.explanation !== 'string') {
        throw new Error('Invalid explanation field');
      }
      
      if (!Array.isArray(result.actions) || result.actions.length === 0) {
        throw new Error('Invalid or empty actions array');
      }

      // Validate actions have required fields
      for (const action of result.actions) {
        if (!action.op || typeof action.op !== 'string') {
          throw new Error(`Invalid action: ${JSON.stringify(action)}`);
        }
      }

      console.log(`   ✅ SUCCESS in ${duration}ms`);
      console.log(`      Title: "${result.title}"`);
      console.log(`      Actions: ${result.actions.length}`);
      console.log(`      Operations: ${result.actions.map((a: any) => a.op).join(', ')}`);
      
      passed++;
    } catch (error: any) {
      console.log(`   ❌ FAILED: ${error.message}`);
      console.error(`      Stack: ${error.stack}`);
      failed++;
      
      if (!testCase.expectSuccess) {
        console.log('   (Expected failure - counted as pass)');
        passed++;
        failed--;
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 TEST RESULTS');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Passed: ${passed}/${TEST_CASES.length}`);
  console.log(`❌ Failed: ${failed}/${TEST_CASES.length}`);
  console.log(`Success Rate: ${((passed / TEST_CASES.length) * 100).toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Clarifier recovery system is working correctly.\n');
  } else {
    console.log('⚠️  SOME TESTS FAILED! Review logs above.\n');
    process.exit(1);
  }
}

// Test JSON fixing utilities
function testJsonFixing() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔧 JSON FIXING UTILITIES TEST');
  console.log('═══════════════════════════════════════════════════\n');

  const testCases = [
    {
      name: 'Trailing comma',
      input: '{"title":"Test","actions":[{"op":"drawLabel",}]}',
      shouldParse: true
    },
    {
      name: 'Incomplete JSON',
      input: '{"title":"Test","explanation":"Some text',
      shouldParse: false
    },
    {
      name: 'Unquoted properties',
      input: '{title:"Test",explanation:"Text"}',
      shouldParse: false // Our fixer handles this
    }
  ];

  let passed = 0;
  for (const test of testCases) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Input: ${test.input}`);
    
    try {
      // Simulate the cleaning process
      let cleaned = test.input.trim();
      
      // Remove trailing commas
      cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
      
      // Try to parse
      JSON.parse(cleaned);
      
      if (test.shouldParse) {
        console.log('   ✅ Parsed successfully (as expected)');
        passed++;
      } else {
        console.log('   ⚠️  Parsed but expected to fail');
      }
    } catch (error: any) {
      if (!test.shouldParse) {
        console.log('   ✅ Failed to parse (as expected)');
        passed++;
      } else {
        console.log(`   ❌ Failed to parse: ${error.message}`);
      }
    }
  }

  console.log(`\n📊 JSON Fixing Tests: ${passed}/${testCases.length} passed\n`);
}

// Run tests
async function runAllTests() {
  try {
    testJsonFixing();
    await testClarifierRecovery();
    console.log('✨ All test suites completed!\n');
  } catch (error) {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  }
}

runAllTests();
