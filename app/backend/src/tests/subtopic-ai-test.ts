/**
 * UNIT TEST: AI-Powered Subtopic Simplification
 * 
 * Tests that the AI can correctly extract core concepts from long descriptions
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { generateNotes } from '../agents/transcriptGenerator';
import { PlanStep } from '../types';

const TEST_CASES = [
  {
    topic: 'Quantum Mechanics',
    longDesc: 'Imagine a tiny electron, not as a mini-ball, but as a blurry cloud of probability, existing in multiple places at once. Our everyday intuition says things have definite positions, but at the quantum scale, particles are fundamentally uncertain until observed.',
    expectedKeywords: ['quantum', 'electron', 'superposition', 'probability']
  },
  {
    topic: 'Operational Amplifiers',
    longDesc: 'Imagine you have a tiny whisper from a microphone or a faint signal from a temperature sensor – too small for a computer or speaker to understand. The Op-Amp (Operational Amplifier) is like a vigilant, high-gain amplifier ready to magnify that tiny voltage difference.',
    expectedKeywords: ['op-amp', 'amplifier', 'operational']
  },
  {
    topic: 'Neural Networks',
    longDesc: 'Think of your brain as a massive network of interconnected neurons, each firing signals to others. An artificial neural network mimics this structure with layers of mathematical "neurons" that learn patterns from data through training.',
    expectedKeywords: ['neural', 'network', 'neurons', 'learning']
  }
];

async function testAISubtopicSimplification() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              AI-POWERED SUBTOPIC SIMPLIFICATION TEST                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  let passed = 0;
  let failed = 0;
  
  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`TEST ${i + 1}/${TEST_CASES.length}: ${testCase.topic}`);
    console.log('═'.repeat(80));
    console.log(`Long Description (${testCase.longDesc.length} chars):`);
    console.log(`"${testCase.longDesc.substring(0, 100)}..."`);
    console.log('');
    
    const step: PlanStep = {
      id: i + 1,
      tag: 'test',
      desc: testCase.longDesc,
      compiler: 'svg'
    } as any;
    
    try {
      const startTime = Date.now();
      const result = await generateNotes(step, testCase.topic, testCase.longDesc);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (result && result.length > 2000) {
        // Check if result is contextual (contains expected keywords)
        const resultLower = result.toLowerCase();
        const foundKeywords = testCase.expectedKeywords.filter(kw => 
          resultLower.includes(kw.toLowerCase())
        );
        
        const contextual = foundKeywords.length >= Math.ceil(testCase.expectedKeywords.length / 2);
        
        console.log(`✅ SUCCESS in ${duration}s`);
        console.log(`   - Length: ${result.length} chars`);
        console.log(`   - Text elements: ${(result.match(/<text/g) || []).length}`);
        console.log(`   - Contextual: ${contextual ? '✅ YES' : '⚠️ PARTIAL'}`);
        console.log(`   - Keywords found: ${foundKeywords.join(', ')}`);
        
        if (contextual) {
          passed++;
        } else {
          console.log(`   ⚠️ WARNING: Missing keywords: ${testCase.expectedKeywords.filter(kw => !foundKeywords.includes(kw)).join(', ')}`);
          failed++;
        }
      } else {
        console.log(`❌ FAILED in ${duration}s`);
        console.log(`   - Result: ${result ? `${result.length} chars (too short)` : 'null'}`);
        failed++;
      }
      
    } catch (error: any) {
      console.log(`❌ EXCEPTION: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log('FINAL RESULTS');
  console.log('═'.repeat(80));
  console.log(`Passed: ${passed}/${TEST_CASES.length}`);
  console.log(`Failed: ${failed}/${TEST_CASES.length}`);
  console.log(`Success Rate: ${((passed / TEST_CASES.length) * 100).toFixed(1)}%`);
  console.log('═'.repeat(80));
  console.log('');
  
  if (passed === TEST_CASES.length) {
    console.log('🎉 ALL TESTS PASSED - AI subtopic simplification works!');
    process.exit(0);
  } else {
    console.log('⚠️ SOME TESTS FAILED - Review results above');
    process.exit(1);
  }
}

if (require.main === module) {
  testAISubtopicSimplification().catch(error => {
    console.error('\n💥 TEST CRASHED:', error);
    process.exit(1);
  });
}
