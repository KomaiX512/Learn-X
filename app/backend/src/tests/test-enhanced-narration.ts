/**
 * ENHANCED NARRATION SYSTEM - COMPREHENSIVE STRESS TESTS
 * 
 * Runnable test suite for both main content narration and clarification narration
 * Tests visual-focused language, word counts, and production readiness
 * 
 * Usage: npx ts-node src/tests/test-enhanced-narration.ts
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { 
  generateStepNarration, 
  generateClarificationNarration,
  VisualInput,
  ClarificationNarrationInput
} from '../agents/narrationGenerator';
import { PlanStep } from '../types';

// Test configuration
const MAIN_NARRATION_MIN_WORDS = 120; // 2x the original 40-80 words
const MAIN_NARRATION_MAX_WORDS = 240; // 3x the original
const CLARIFICATION_MIN_WORDS = 120;
const CLARIFICATION_MAX_WORDS = 240;

// Visual-focused keywords to check
const VISUAL_KEYWORDS = [
  'see',
  'notice',
  'look',
  'observe',
  'watch',
  'working',
  'mechanism',
  'part',
  'here',
  'visual',
  'relationship'
];

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.log(`   ❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

/**
 * Test Suite 1: Main Content Narration Enhancement
 */
async function testMainContentNarration() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUITE 1: Main Content Narration Enhancement');
  console.log('='.repeat(70));
  
  const testStep: PlanStep = {
    id: 1,
    tag: 'Introduction to Neural Networks',
    desc: 'Understanding how artificial neurons process information and learn patterns',
    complexity: 3,
    compiler: 'js'
  };
  
  const testTopic = 'Machine Learning';
  
  const testVisuals: VisualInput[] = [
    {
      type: 'notes',
      visualNumber: 0,
      svgCode: '<svg><text>Neural Network Basics</text></svg>',
      description: 'Educational notes about neural networks'
    },
    {
      type: 'animation',
      visualNumber: 1,
      actionCount: 25,
      description: 'Animation showing neuron activation'
    },
    {
      type: 'animation',
      visualNumber: 2,
      actionCount: 30,
      description: 'Animation showing backpropagation'
    }
  ];

  // TEST 1: Word Count Validation
  try {
    testsRun++;
    console.log('\n🧪 TEST 1: Word Count Validation (2-3x increase)');
    
    const result = await generateStepNarration(testStep, testTopic, testVisuals);
    
    assert(result !== undefined, 'Result should be defined');
    assert(result.narrations.length === testVisuals.length, `Should have ${testVisuals.length} narrations`);
    
    console.log(`   Generated ${result.narrations.length} narrations\n`);
    
    let allPass = true;
    result.narrations.forEach((narration, idx) => {
      const wordCount = narration.narration.split(/\s+/).length;
      const status = wordCount >= MAIN_NARRATION_MIN_WORDS && wordCount <= MAIN_NARRATION_MAX_WORDS;
      
      console.log(`   Narration ${idx} (${narration.type}):`);
      console.log(`   - Word count: ${wordCount} words`);
      console.log(`   - Duration: ${narration.duration}s`);
      console.log(`   - Status: ${status ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   - Preview: "${narration.narration.substring(0, 100)}..."\n`);
      
      if (!status) allPass = false;
    });
    
    assert(allPass, 'All narrations should meet word count requirements');
    console.log(`   ✅ TEST 1 PASSED: All narrations meet 2-3x word count requirement`);
    testsPassed++;
  } catch (error: any) {
    console.log(`   ❌ TEST 1 FAILED: ${error.message}`);
    testsFailed++;
  }

  // TEST 2: Visual-Focused Language
  try {
    testsRun++;
    console.log('\n🧪 TEST 2: Visual-Focused Language Check');
    
    const result = await generateStepNarration(testStep, testTopic, testVisuals);
    
    let allPass = true;
    result.narrations.forEach((narration, idx) => {
      const text = narration.narration.toLowerCase();
      const foundKeywords = VISUAL_KEYWORDS.filter(keyword => text.includes(keyword));
      
      console.log(`   Narration ${idx}:`);
      console.log(`   - Visual keywords found: ${foundKeywords.length}/${VISUAL_KEYWORDS.length}`);
      console.log(`   - Keywords: [${foundKeywords.join(', ')}]`);
      console.log(`   - Status: ${foundKeywords.length >= 3 ? '✅ PASS' : '❌ FAIL'}\n`);
      
      if (foundKeywords.length < 3) allPass = false;
    });
    
    assert(allPass, 'All narrations should use visual-focused language');
    console.log(`   ✅ TEST 2 PASSED: All narrations use visual-focused language`);
    testsPassed++;
  } catch (error: any) {
    console.log(`   ❌ TEST 2 FAILED: ${error.message}`);
    testsFailed++;
  }

  // TEST 3: Duration Estimates
  try {
    testsRun++;
    console.log('\n🧪 TEST 3: Duration Estimates (30-120 seconds)');
    
    const result = await generateStepNarration(testStep, testTopic, testVisuals);
    
    let allPass = true;
    result.narrations.forEach((narration, idx) => {
      const status = narration.duration >= 30 && narration.duration <= 120;
      console.log(`   Narration ${idx}:`);
      console.log(`   - Duration: ${narration.duration}s`);
      console.log(`   - Status: ${status ? '✅ PASS' : '❌ FAIL'}\n`);
      
      if (!status) allPass = false;
    });
    
    assert(allPass, 'All durations should be appropriate');
    console.log(`   ✅ TEST 3 PASSED: All durations are appropriate`);
    testsPassed++;
  } catch (error: any) {
    console.log(`   ❌ TEST 3 FAILED: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Test Suite 2: Clarification Narration
 */
async function testClarificationNarration() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUITE 2: Clarification Narration Generation');
  console.log('='.repeat(70));
  
  const testInput: ClarificationNarrationInput = {
    question: 'Why does the voltage spike during action potential?',
    svgActions: [
      { op: 'drawTitle', text: 'Action Potential Explained', x: 0.5, y: 0.1 },
      { op: 'drawLabel', text: 'Voltage-gated channels', x: 0.3, y: 0.3 },
      { op: 'drawVector', x: 0.5, y: 0.5, dx: 0.2, dy: 0, label: 'Na+ influx' },
      { op: 'graph', function: 'spike', x: 0.5, y: 0.7 }
    ],
    topic: 'Neuroscience',
    stepContext: 'Understanding action potentials in neurons'
  };

  // TEST 4: Clarification Word Count
  try {
    testsRun++;
    console.log('\n🧪 TEST 4: Clarification Narration Word Count');
    
    const result = await generateClarificationNarration(testInput);
    
    assert(result !== undefined, 'Result should be defined');
    assert(result.narration !== undefined, 'Narration should be defined');
    assert(result.duration > 0, 'Duration should be > 0');
    assert(result.wordCount > 0, 'Word count should be > 0');
    
    console.log(`   Question: "${testInput.question}"`);
    console.log(`   Word count: ${result.wordCount} words`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Status: ${result.wordCount >= CLARIFICATION_MIN_WORDS ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Preview: "${result.narration.substring(0, 150)}..."\n`);
    
    assert(result.wordCount >= CLARIFICATION_MIN_WORDS, `Word count should be >= ${CLARIFICATION_MIN_WORDS}`);
    
    console.log(`   ✅ TEST 4 PASSED: Clarification narration meets word count`);
    testsPassed++;
  } catch (error: any) {
    console.log(`   ❌ TEST 4 FAILED: ${error.message}`);
    testsFailed++;
  }

  // TEST 5: Friendly & Encouraging Tone
  try {
    testsRun++;
    console.log('\n🧪 TEST 5: Friendly & Encouraging Tone');
    
    const result = await generateClarificationNarration(testInput);
    
    const text = result.narration.toLowerCase();
    const friendlyPhrases = [
      'great question',
      'let me',
      'help',
      'understand',
      'see',
      'notice',
      'look',
      'here'
    ];
    
    const foundPhrases = friendlyPhrases.filter(phrase => text.includes(phrase));
    
    console.log(`   Friendly phrases found: ${foundPhrases.length}/${friendlyPhrases.length}`);
    console.log(`   Phrases: [${foundPhrases.join(', ')}]`);
    console.log(`   Status: ${foundPhrases.length >= 2 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    assert(foundPhrases.length >= 2, 'Should contain at least 2 friendly phrases');
    console.log(`   ✅ TEST 5 PASSED: Clarification uses friendly tone`);
    testsPassed++;
  } catch (error: any) {
    console.log(`   ❌ TEST 5 FAILED: ${error.message}`);
    testsFailed++;
  }

  // TEST 6: Visual Element References
  try {
    testsRun++;
    console.log('\n🧪 TEST 6: Visual Element References');
    
    const result = await generateClarificationNarration(testInput);
    
    const text = result.narration.toLowerCase();
    const visualReferences = VISUAL_KEYWORDS.filter(keyword => text.includes(keyword));
    
    console.log(`   Visual references found: ${visualReferences.length}`);
    console.log(`   Keywords: [${visualReferences.join(', ')}]`);
    console.log(`   Status: ${visualReferences.length >= 4 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    assert(visualReferences.length >= 4, 'Should have at least 4 visual references');
    console.log(`   ✅ TEST 6 PASSED: Strong visual references`);
    testsPassed++;
  } catch (error: any) {
    console.log(`   ❌ TEST 6 FAILED: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Test Suite 3: Edge Cases
 */
async function testEdgeCases() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUITE 3: Edge Cases and Error Handling');
  console.log('='.repeat(70));

  // TEST 7: Long Question Handling
  try {
    testsRun++;
    console.log('\n🧪 TEST 7: Very Long Question (Edge Case)');
    
    const longQuestion = 'Why does the voltage spike during action potential and how does this relate to the sodium-potassium pump mechanism and what are the implications for neural signal propagation across synapses in the context of neuroplasticity and long-term potentiation?';
    
    const testInput: ClarificationNarrationInput = {
      question: longQuestion,
      svgActions: [{ op: 'drawLabel', text: 'Test', x: 0.5, y: 0.5 }],
      topic: 'Neuroscience'
    };
    
    const result = await generateClarificationNarration(testInput);
    
    console.log(`   Long question length: ${longQuestion.length} chars`);
    console.log(`   Generated narration: ${result.wordCount} words`);
    console.log(`   Status: ${result.wordCount > 50 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    assert(result.wordCount > 50, 'Should handle long questions');
    console.log(`   ✅ TEST 7 PASSED: Long question handled`);
    testsPassed++;
  } catch (error: any) {
    console.log(`   ❌ TEST 7 FAILED: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Test Suite 4: Performance
 */
async function testPerformance() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUITE 4: Performance and Production Readiness');
  console.log('='.repeat(70));

  // TEST 8: Response Time
  try {
    testsRun++;
    console.log('\n🧪 TEST 8: Performance Test (Response Time)');
    
    const testStep: PlanStep = {
      id: 1,
      tag: 'Test Step',
      desc: 'Performance test',
      complexity: 3,
      compiler: 'js'
    };
    
    const testVisuals: VisualInput[] = [
      { type: 'notes', visualNumber: 0, description: 'Test' },
      { type: 'animation', visualNumber: 1, actionCount: 20, description: 'Test' }
    ];
    
    const startTime = Date.now();
    const result = await generateStepNarration(testStep, 'Test Topic', testVisuals);
    const elapsed = Date.now() - startTime;
    
    console.log(`   Generation time: ${elapsed}ms`);
    console.log(`   Narrations: ${result.narrations.length}`);
    console.log(`   Status: ${elapsed < 30000 ? '✅ PASS' : '⚠️  SLOW'}\n`);
    
    assert(elapsed < 30000, 'Should complete within 30 seconds');
    console.log(`   ✅ TEST 8 PASSED: Performance acceptable`);
    testsPassed++;
  } catch (error: any) {
    console.log(`   ❌ TEST 8 FAILED: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('ENHANCED NARRATION SYSTEM - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(70));
  console.log('\nTarget Specifications:');
  console.log(`- Main narration: ${MAIN_NARRATION_MIN_WORDS}-${MAIN_NARRATION_MAX_WORDS} words (2-3x increase)`);
  console.log(`- Clarification narration: ${CLARIFICATION_MIN_WORDS}-${CLARIFICATION_MAX_WORDS} words`);
  console.log('- Visual-focused language required');
  console.log('- Friendly, encouraging tone for Q&A');
  console.log('='.repeat(70));

  try {
    await testMainContentNarration();
    await testClarificationNarration();
    await testEdgeCases();
    await testPerformance();
    
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${testsRun}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
    console.log('='.repeat(70));
    
    if (testsFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED - PRODUCTION READY! 🎉\n');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${testsFailed} TEST(S) FAILED - REVIEW REQUIRED\n`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}
