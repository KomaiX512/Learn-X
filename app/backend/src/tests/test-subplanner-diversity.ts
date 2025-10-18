/**
 * TEST: SubPlanner Diversity Validation
 * 
 * Tests the subPlanner on 5 diverse topics to ensure:
 * 1. Each visual covers a DIFFERENT aspect
 * 2. No repetition between visuals
 * 3. Descriptions are rich and specific
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { subPlannerAgent } from '../agents/subPlanner';
import { PlanStep } from '../types';

const TEST_CASES = [
  {
    topic: 'Carnot Heat Engine',
    step: {
      id: 1,
      tag: 'hook',
      desc: 'Understanding the Carnot cycle and its theoretical maximum efficiency',
      complexity: 3
    } as PlanStep
  },
  {
    topic: 'Neural Action Potential',
    step: {
      id: 2,
      tag: 'formalism',
      desc: 'How neurons transmit electrical signals through ion channel dynamics',
      complexity: 4
    } as PlanStep
  },
  {
    topic: 'Quicksort Algorithm',
    step: {
      id: 3,
      tag: 'exploration',
      desc: 'Divide-and-conquer sorting with pivot-based partitioning',
      complexity: 3
    } as PlanStep
  },
  {
    topic: 'Photosynthesis',
    step: {
      id: 4,
      tag: 'mastery',
      desc: 'Light-dependent and light-independent reactions in chloroplasts',
      complexity: 4
    } as PlanStep
  },
  {
    topic: 'Fourier Transform',
    step: {
      id: 5,
      tag: 'formalism',
      desc: 'Decomposing signals into frequency components using integral transforms',
      complexity: 5
    } as PlanStep
  }
];

interface DiversityMetrics {
  uniqueTypes: number;
  avgDescriptionLength: number;
  overlapScore: number; // 0-100, lower is better
  hasStructure: boolean;
  hasMechanism: boolean;
  hasAnalysis: boolean;
  hasContext: boolean;
}

function calculateWordOverlap(desc1: string, desc2: string): number {
  const words1 = new Set(desc1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(desc2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  const intersection = new Set(Array.from(words1).filter(w => words2.has(w)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);
  
  return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
}

function analyzeDiversity(scripts: any[]): DiversityMetrics {
  const types = new Set(scripts.map(s => s.type));
  const avgLength = scripts.reduce((sum, s) => sum + s.description.length, 0) / scripts.length;
  
  // Calculate pairwise overlap
  let totalOverlap = 0;
  let comparisons = 0;
  
  for (let i = 0; i < scripts.length; i++) {
    for (let j = i + 1; j < scripts.length; j++) {
      totalOverlap += calculateWordOverlap(scripts[i].description, scripts[j].description);
      comparisons++;
    }
  }
  
  const avgOverlap = comparisons > 0 ? totalOverlap / comparisons : 0;
  
  return {
    uniqueTypes: types.size,
    avgDescriptionLength: Math.round(avgLength),
    overlapScore: Math.round(avgOverlap),
    hasStructure: scripts.some(s => s.type === 'structure'),
    hasMechanism: scripts.some(s => s.type === 'mechanism'),
    hasAnalysis: scripts.some(s => s.type === 'analysis'),
    hasContext: scripts.some(s => s.type === 'context')
  };
}

async function runTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('🧪 SUBPLANNER DIVERSITY TEST');
  console.log('═'.repeat(80));
  console.log(`Testing ${TEST_CASES.length} diverse topics...\n`);
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const testCase of TEST_CASES) {
    console.log('\n' + '─'.repeat(80));
    console.log(`📚 TOPIC: ${testCase.topic}`);
    console.log(`📝 STEP: ${testCase.step.desc}`);
    console.log('─'.repeat(80));
    
    try {
      const result = await subPlannerAgent(testCase.step, testCase.topic);
      
      if (!result || !result.visualScripts || result.visualScripts.length !== 4) {
        console.log('❌ FAILED: Invalid result structure');
        totalFailed++;
        continue;
      }
      
      // Analyze diversity
      const metrics = analyzeDiversity(result.visualScripts);
      
      console.log('\n📊 DIVERSITY METRICS:');
      console.log(`   Unique visual types: ${metrics.uniqueTypes}/4 ${metrics.uniqueTypes === 4 ? '✅' : '⚠️'}`);
      console.log(`   Avg description length: ${metrics.avgDescriptionLength} chars ${metrics.avgDescriptionLength > 80 && metrics.avgDescriptionLength < 250 ? '✅' : '⚠️ TARGET: 80-250'}`);
      console.log(`   Content overlap: ${metrics.overlapScore}% ${metrics.overlapScore < 30 ? '✅' : '⚠️'}`);
      console.log(`   Has structure visual: ${metrics.hasStructure ? '✅' : '❌'}`);
      console.log(`   Has mechanism visual: ${metrics.hasMechanism ? '✅' : '❌'}`);
      console.log(`   Has analysis visual: ${metrics.hasAnalysis ? '✅' : '❌'}`);
      console.log(`   Has context visual: ${metrics.hasContext ? '✅' : '❌'}`);
      
      // Display visual scripts
      console.log('\n🎬 VISUAL SCRIPTS GENERATED:');
      result.visualScripts.forEach((script, idx) => {
        console.log(`\n   ${idx + 1}. [${script.type.toUpperCase()}] ${script.title}`);
        console.log(`      Focus: ${script.focus}`);
        console.log(`      Description: ${script.description.substring(0, 150)}...`);
        if (script.mustInclude && script.mustInclude.length > 0) {
          console.log(`      Must include: ${script.mustInclude.join(', ')}`);
        }
      });
      
      // Pass/Fail criteria (updated for concise descriptions)
      const passed = 
        metrics.uniqueTypes === 4 &&
        metrics.overlapScore < 40 &&
        metrics.avgDescriptionLength > 80 && metrics.avgDescriptionLength < 300 && // Concise but informative
        metrics.hasStructure &&
        metrics.hasMechanism &&
        metrics.hasAnalysis &&
        metrics.hasContext;
      
      if (passed) {
        console.log('\n✅ PASSED: Visuals are diverse and complementary');
        totalPassed++;
      } else {
        console.log('\n⚠️  NEEDS IMPROVEMENT: Some diversity criteria not met');
        totalFailed++;
      }
      
    } catch (error: any) {
      console.log(`\n❌ ERROR: ${error.message}`);
      totalFailed++;
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📈 TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total tests: ${TEST_CASES.length}`);
  console.log(`Passed: ${totalPassed} ✅`);
  console.log(`Failed: ${totalFailed} ❌`);
  console.log(`Success rate: ${Math.round((totalPassed / TEST_CASES.length) * 100)}%`);
  console.log('═'.repeat(80));
  
  if (totalPassed === TEST_CASES.length) {
    console.log('\n🎉 ALL TESTS PASSED! SubPlanner generates diverse visuals.');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Prompt may need further refinement.');
  }
  
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
