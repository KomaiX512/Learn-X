/**
 * UNIT TEST: PLANNER
 * Validates planner generates BOTH descriptions correctly
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { plannerAgent } from '../agents/planner';

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
      const plan = await plannerAgent(topic);
      
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
      } else {
        console.log(`\n❌ FAILED: Some steps missing descriptions`);
        failed++;
      }
      
    } catch (error: any) {
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

export { testPlanner };
