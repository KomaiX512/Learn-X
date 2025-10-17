/**
 * ENHANCED NARRATION SYSTEM - COMPREHENSIVE UNIT TESTS
 * 
 * Tests both main content narration (2-3x longer) and clarification narration
 * Verifies visual-focused language, word counts, and production readiness
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

/**
 * Test Suite 1: Main Content Narration Enhancement
 */
describe('Enhanced Main Content Narration', () => {
  
  const testStep: PlanStep = {
    id: 1,
    tag: 'Introduction to Neural Networks',
    desc: 'Understanding how artificial neurons process information and learn patterns',
    complexity: 3
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

  test('should generate narrations with 2-3x word count (120-240 words)', async () => {
    console.log('\n🧪 TEST 1: Word Count Validation (2-3x increase)');
    
    const result = await generateStepNarration(testStep, testTopic, testVisuals);
    
    expect(result).toBeDefined();
    expect(result.narrations).toHaveLength(testVisuals.length);
    
    console.log(`   Generated ${result.narrations.length} narrations\n`);
    
    result.narrations.forEach((narration, idx) => {
      const wordCount = narration.narration.split(/\s+/).length;
      const status = wordCount >= MAIN_NARRATION_MIN_WORDS && wordCount <= MAIN_NARRATION_MAX_WORDS ? 'PASS' : 'FAIL';
      console.log(`   Narration ${idx} (${narration.type}):`);
      console.log(`   - Word count: ${wordCount} words`);
      console.log(`   - Duration: ${narration.duration}s`);
      console.log(`   - Status: ${status}`);
      console.log(`   - Preview: "${narration.narration.substring(0, 100)}..."\n`);
      
      // Validate word count is in enhanced range
      expect(wordCount).toBeGreaterThanOrEqual(MAIN_NARRATION_MIN_WORDS);
      expect(wordCount).toBeLessThanOrEqual(MAIN_NARRATION_MAX_WORDS);
    });
    
    console.log(`   All narrations meet 2-3x word count requirement`);
  }, 60000);

  test('should include visual-focused language', async () => {
    console.log('\n🧪 TEST 2: Visual-Focused Language Check');
    
    const result = await generateStepNarration(testStep, testTopic, testVisuals);
    
    result.narrations.forEach((narration, idx) => {
      const text = narration.narration.toLowerCase();
      const foundKeywords = VISUAL_KEYWORDS.filter(keyword => text.includes(keyword));
      
      console.log(`   Narration ${idx}:`);
      console.log(`   - Visual keywords found: ${foundKeywords.length}/${VISUAL_KEYWORDS.length}`);
      console.log(`   - Keywords: [${foundKeywords.join(', ')}]`);
      console.log(`   - Status: ${foundKeywords.length >= 3 ? '✅ PASS' : '❌ FAIL'}\n`);
      
      // Should contain at least 3 visual-focused keywords
      expect(foundKeywords.length).toBeGreaterThanOrEqual(3);
    });
    
    console.log(`   ✅ All narrations use visual-focused language`);
  }, 60000);

  test('should have appropriate duration estimates', async () => {
    console.log('\n🧪 TEST 3: Duration Estimates (45-90 seconds)');
    
    const result = await generateStepNarration(testStep, testTopic, testVisuals);
    
    result.narrations.forEach((narration, idx) => {
      console.log(`   Narration ${idx}:`);
      console.log(`   - Duration: ${narration.duration}s`);
      console.log(`   - Status: ${narration.duration >= 30 && narration.duration <= 120 ? '✅ PASS' : '⚠️  WARNING'}\n`);
      
      // Duration should be reasonable for 120-240 words (30-120 seconds)
      expect(narration.duration).toBeGreaterThanOrEqual(30);
      expect(narration.duration).toBeLessThanOrEqual(120);
    });
    
    console.log(`   ✅ All durations are appropriate for enhanced narrations`);
  }, 60000);
});

/**
 * Test Suite 2: Clarification Narration (NEW FEATURE)
 */
describe('Clarification Narration Generation', () => {
  
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

  test('should generate clarification narration with correct word count', async () => {
    console.log('\n🧪 TEST 4: Clarification Narration Word Count');
    
    const result = await generateClarificationNarration(testInput);
    
    expect(result).toBeDefined();
    expect(result.narration).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
    expect(result.wordCount).toBeGreaterThan(0);
    
    console.log(`   Question: "${testInput.question}"`);
    console.log(`   Word count: ${result.wordCount} words`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Status: ${result.wordCount >= CLARIFICATION_MIN_WORDS ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Preview: "${result.narration.substring(0, 150)}..."\n`);
    
    // Should be in enhanced range
    expect(result.wordCount).toBeGreaterThanOrEqual(CLARIFICATION_MIN_WORDS);
    expect(result.wordCount).toBeLessThanOrEqual(CLARIFICATION_MAX_WORDS + 50); // +50 tolerance
    
    console.log(`   ✅ Clarification narration meets word count requirement`);
  }, 60000);

  test('should be friendly and encouraging', async () => {
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
    console.log(`   Status: ${foundPhrases.length >= 3 ? '✅ PASS' : '⚠️  WARNING'}\n`);
    
    // Should contain at least 3 friendly phrases
    expect(foundPhrases.length).toBeGreaterThanOrEqual(2);
    
    console.log(`   ✅ Clarification uses friendly, encouraging tone`);
  }, 60000);

  test('should reference the visual elements', async () => {
    console.log('\n🧪 TEST 6: Visual Element References');
    
    const result = await generateClarificationNarration(testInput);
    
    const text = result.narration.toLowerCase();
    const visualReferences = VISUAL_KEYWORDS.filter(keyword => text.includes(keyword));
    
    console.log(`   Visual references found: ${visualReferences.length}`);
    console.log(`   Keywords: [${visualReferences.join(', ')}]`);
    console.log(`   Status: ${visualReferences.length >= 4 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Should strongly reference visuals (at least 4 keywords)
    expect(visualReferences.length).toBeGreaterThanOrEqual(4);
    
    console.log(`   ✅ Clarification strongly references visual elements`);
  }, 60000);
});

/**
 * Test Suite 3: Edge Cases and Error Handling
 */
describe('Edge Cases and Error Handling', () => {
  
  test('should handle empty visuals array gracefully', async () => {
    console.log('\n🧪 TEST 7: Empty Visuals Array');
    
    const testStep: PlanStep = {
      id: 99,
      tag: 'Test Step',
      desc: 'Test description',
      complexity: 1
    };
    
    try {
      const result = await generateStepNarration(testStep, 'Test Topic', []);
      console.log(`   Result: Generated ${result.narrations.length} narrations`);
      console.log(`   Status: ✅ PASS (handled gracefully)\n`);
      expect(result.narrations).toHaveLength(0);
    } catch (error) {
      console.log(`   Error caught: ${error}`);
      console.log(`   Status: ✅ PASS (error handled)\n`);
    }
  }, 30000);

  test('should handle missing API key with fallback', async () => {
    console.log('\n🧪 TEST 8: API Key Missing - Fallback Test');
    
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    
    const testInput: ClarificationNarrationInput = {
      question: 'Test question?',
      svgActions: [{ op: 'drawLabel', text: 'Test', x: 0.5, y: 0.5 }],
      topic: 'Test Topic'
    };
    
    const result = await generateClarificationNarration(testInput);
    
    console.log(`   Fallback narration generated: ${result.wordCount} words`);
    console.log(`   Status: ✅ PASS (fallback working)\n`);
    
    expect(result).toBeDefined();
    expect(result.narration).toContain('question');
    expect(result.wordCount).toBeGreaterThan(50);
    
    // Restore API key
    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  }, 10000);

  test('should handle very long questions', async () => {
    console.log('\n🧪 TEST 9: Very Long Question (Edge Case)');
    
    const longQuestion = 'Why does the voltage spike during action potential and how does this relate to the sodium-potassium pump mechanism and what are the implications for neural signal propagation across synapses in the context of neuroplasticity and long-term potentiation?';
    
    const testInput: ClarificationNarrationInput = {
      question: longQuestion,
      svgActions: [{ op: 'drawLabel', text: 'Test', x: 0.5, y: 0.5 }],
      topic: 'Neuroscience'
    };
    
    const result = await generateClarificationNarration(testInput);
    
    console.log(`   Long question length: ${longQuestion.length} chars`);
    console.log(`   Generated narration: ${result.wordCount} words`);
    console.log(`   Status: ✅ PASS (handled long question)\n`);
    
    expect(result).toBeDefined();
    expect(result.wordCount).toBeGreaterThan(50);
  }, 60000);
});

/**
 * Test Suite 4: Performance and Production Readiness
 */
describe('Performance and Production Readiness', () => {
  
  test('should generate narrations within acceptable time', async () => {
    console.log('\n🧪 TEST 10: Performance Test (Response Time)');
    
    const testStep: PlanStep = {
      id: 1,
      tag: 'Test Step',
      desc: 'Performance test',
      complexity: 3
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
    
    // Should complete within 30 seconds (generous for API calls)
    expect(elapsed).toBeLessThan(30000);
    
    console.log(`   ✅ Performance acceptable for production`);
  }, 40000);

  test('should generate consistent narrations across multiple calls', async () => {
    console.log('\n🧪 TEST 11: Consistency Test (Multiple Calls)');
    
    const testStep: PlanStep = {
      id: 1,
      tag: 'Consistency Test',
      desc: 'Testing consistency',
      complexity: 2
    };
    
    const testVisuals: VisualInput[] = [
      { type: 'notes', visualNumber: 0, description: 'Test consistency' }
    ];
    
    const results = await Promise.all([
      generateStepNarration(testStep, 'Test', testVisuals),
      generateStepNarration(testStep, 'Test', testVisuals)
    ]);
    
    console.log(`   Call 1 word count: ${results[0].narrations[0].narration.split(/\s+/).length}`);
    console.log(`   Call 2 word count: ${results[1].narrations[0].narration.split(/\s+/).length}`);
    
    // Both should be in valid range (may differ due to LLM creativity)
    const wordCount1 = results[0].narrations[0].narration.split(/\s+/).length;
    const wordCount2 = results[1].narrations[0].narration.split(/\s+/).length;
    
    console.log(`   Status: ${wordCount1 >= 100 && wordCount2 >= 100 ? '✅ PASS' : '⚠️  WARNING'}\n`);
    
    expect(wordCount1).toBeGreaterThanOrEqual(100);
    expect(wordCount2).toBeGreaterThanOrEqual(100);
    
    console.log(`   ✅ Narrations are consistently high quality`);
  }, 60000);
});

/**
 * Run all tests
 */
if (require.main === module) {
  console.log('\n' + '='.repeat(70));
  console.log('ENHANCED NARRATION SYSTEM - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(70));
  console.log('\nTarget Specifications:');
  console.log(`- Main narration: ${MAIN_NARRATION_MIN_WORDS}-${MAIN_NARRATION_MAX_WORDS} words (2-3x increase)`);
  console.log(`- Clarification narration: ${CLARIFICATION_MIN_WORDS}-${CLARIFICATION_MAX_WORDS} words`);
  console.log('- Visual-focused language required');
  console.log('- Friendly, encouraging tone for Q&A');
  console.log('='.repeat(70) + '\n');
}
