/**
 * QUICK FIX VERIFICATION TEST
 * Tests the two critical fixes:
 * 1. MAX_TOKENS handling
 * 2. Subtopic simplification
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { generateNotes } from '../agents/transcriptGenerator';
import { PlanStep } from '../types';

async function quickTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          QUICK FIX VERIFICATION TEST                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const step: PlanStep = {
    id: 1,
    tag: 'intuition',
    desc: 'Imagine a tiny electron, not as a mini-ball, but as a blurry cloud of probability, existing in multiple places at once.',
    compiler: 'svg'
  } as any;
  
  console.log('Testing with long narrative description...');
  console.log(`Description: "${step.desc}"`);
  console.log('');
  
  const startTime = Date.now();
  const result = await generateNotes(step, 'Quantum Mechanics', step.desc);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (result && result.length > 2000) {
    console.log(`✅ SUCCESS in ${duration}s`);
    console.log(`   - Length: ${result.length} chars`);
    console.log(`   - Text elements: ${(result.match(/<text/g) || []).length}`);
    console.log(`   - Contains "quantum": ${result.toLowerCase().includes('quantum') ? 'YES' : 'NO'}`);
    console.log(`   - Contains "electron": ${result.toLowerCase().includes('electron') ? 'YES' : 'NO'}`);
    console.log('');
    console.log('🎉 FIXES VERIFIED - System working!');
    process.exit(0);
  } else {
    console.log(`❌ FAILED in ${duration}s`);
    console.log(`   - Result: ${result ? `${result.length} chars` : 'null'}`);
    console.log('');
    console.log('⚠️ FIXES NOT WORKING - Review logs above');
    process.exit(1);
  }
}

if (require.main === module) {
  quickTest().catch(error => {
    console.error('\n💥 TEST CRASHED:', error);
    process.exit(1);
  });
}
