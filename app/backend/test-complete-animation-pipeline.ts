/**
 * COMPLETE ANIMATION PIPELINE TEST
 * 
 * Tests the full V3 pipeline with animation support:
 * 1. Plan generation
 * 2. Visual specification with animation marking
 * 3. Static visual generation (SVG Master)
 * 4. Animation visual generation (SVG Animation)
 * 5. Combined output validation
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { plannerAgent } from './src/agents/planner';
import { codegenV3 } from './src/agents/codegenV3';
import { logger } from './src/logger';

const TEST_TOPICS = [
  'Blood Circulation in the Human Body',
  'Atomic Structure and Electron Orbitals',
  'Simple Harmonic Motion and Wave Propagation',
  'Photosynthesis Process in Plant Cells',
  'Mechanical Advantage in Pulley Systems'
];

async function testCompletePipeline(topic: string) {
  logger.info(`\n${'='.repeat(60)}`);
  logger.info(`  TESTING: ${topic}`);
  logger.info('='.repeat(60));

  const results = {
    topic,
    planSuccess: false,
    stepsCompleted: 0,
    totalSteps: 0,
    staticVisuals: 0,
    animationVisuals: 0,
    totalOperations: 0,
    errors: [] as string[]
  };

  try {
    // STEP 1: Plan Generation
    logger.info('\n📋 STEP 1: Generating educational plan...');
    const plan = await plannerAgent(topic);
    
    if (!plan || !plan.steps || plan.steps.length === 0) {
      throw new Error('Plan generation failed');
    }
    
    results.planSuccess = true;
    results.totalSteps = plan.steps.length;
    
    logger.info(`✅ Plan generated: "${plan.title}"`);
    logger.info(`   Subtitle: ${plan.subtitle}`);
    logger.info(`   Steps: ${plan.steps.length}`);
    plan.steps.forEach((step, i) => {
      logger.info(`   ${i + 1}. [${step.tag}] ${step.desc.substring(0, 60)}...`);
    });

    // STEP 2: Test first step with animation pipeline
    logger.info('\n🎨 STEP 2: Testing V3 CodeGen with Animation Support...');
    const testStep = plan.steps[0]; // Test first step
    
    const codegenResult = await codegenV3(testStep, topic);
    
    if (!codegenResult) {
      throw new Error('CodegenV3 returned null');
    }
    
    results.stepsCompleted = 1;
    results.totalOperations = codegenResult.actions.length;
    
    // Count operation types
    const opTypes = codegenResult.actions.reduce((acc, action) => {
      acc[action.op] = (acc[action.op] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Count static vs animation visuals
    results.animationVisuals = opTypes['customSVG'] || 0;
    results.staticVisuals = Object.keys(opTypes).filter(op => op !== 'customSVG' && op !== 'delay').length;
    
    logger.info(`✅ CodeGen completed for step 1`);
    logger.info(`   Total Operations: ${results.totalOperations}`);
    logger.info(`   Animation Visuals: ${results.animationVisuals}`);
    logger.info(`   Operation Types: ${JSON.stringify(opTypes)}`);
    
    // STEP 3: Validate animations
    if (results.animationVisuals > 0) {
      logger.info('\n🎬 STEP 3: Validating animations...');
      
      const animations = codegenResult.actions.filter(a => a.op === 'customSVG') as any[];
      
      for (let i = 0; i < animations.length; i++) {
        const anim = animations[i];
        const svgCode = anim.svgCode || '';
        
        // Validate animation structure
        const hasAnimateMotion = svgCode.includes('<animateMotion');
        const hasAnimateTransform = svgCode.includes('<animateTransform');
        const hasAnimate = svgCode.includes('<animate');
        const hasLoop = svgCode.includes('repeatCount="indefinite"');
        const hasLabels = (svgCode.match(/<text/g) || []).length >= 2;
        
        const valid = (hasAnimateMotion || hasAnimateTransform || hasAnimate) && hasLoop;
        
        logger.info(`   Animation ${i + 1}:`);
        logger.info(`      Has SMIL: ${valid ? '✅' : '❌'}`);
        logger.info(`      Loops: ${hasLoop ? '✅' : '❌'}`);
        logger.info(`      Labeled: ${hasLabels ? '✅' : '❌'}`);
        logger.info(`      Size: ${svgCode.length} chars`);
        
        if (!valid) {
          results.errors.push(`Animation ${i + 1} missing SMIL or loop attributes`);
        }
      }
    }
    
    // STEP 4: Save output
    const outputDir = path.join(__dirname, 'test-output-pipeline');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `${topic.replace(/\s+/g, '-')}-step1.json`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify({
      topic,
      plan: {
        title: plan.title,
        subtitle: plan.subtitle,
        steps: plan.steps
      },
      stepResult: {
        stepId: testStep.id,
        stepDesc: testStep.desc,
        actions: codegenResult.actions
      }
    }, null, 2));
    
    logger.info(`\n💾 Results saved to: ${filepath}`);
    
  } catch (error: any) {
    logger.error(`❌ Pipeline failed: ${error.message}`);
    results.errors.push(error.message);
  }

  return results;
}

async function runAllTests() {
  logger.info('═══════════════════════════════════════');
  logger.info('  COMPLETE ANIMATION PIPELINE TESTS');
  logger.info('═══════════════════════════════════════\n');

  const allResults: Array<{
    topic: string;
    planSuccess: boolean;
    stepsCompleted: number;
    totalSteps: number;
    staticVisuals: number;
    animationVisuals: number;
    totalOperations: number;
    errors: string[];
  }> = [];

  for (let i = 0; i < TEST_TOPICS.length; i++) {
    const topic = TEST_TOPICS[i];
    const result = await testCompletePipeline(topic);
    allResults.push(result);
    
    // Delay between tests
    if (i < TEST_TOPICS.length - 1) {
      logger.info('\n⏳ Waiting 5 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Final Summary
  logger.info('\n' + '='.repeat(60));
  logger.info('  FINAL SUMMARY');
  logger.info('='.repeat(60));

  const successful = allResults.filter(r => r.stepsCompleted > 0 && r.errors.length === 0);
  const failed = allResults.filter(r => r.stepsCompleted === 0 || r.errors.length > 0);

  logger.info(`\nTotal Topics Tested: ${allResults.length}`);
  logger.info(`Successful: ${successful.length} ✅`);
  logger.info(`Failed: ${failed.length} ❌`);
  logger.info(`Success Rate: ${((successful.length / allResults.length) * 100).toFixed(1)}%`);

  if (successful.length > 0) {
    logger.info('\n✅ SUCCESSFUL TOPICS:');
    successful.forEach((r, i) => {
      logger.info(`   ${i + 1}. ${r.topic}`);
      logger.info(`      Operations: ${r.totalOperations}`);
      logger.info(`      Animations: ${r.animationVisuals}`);
      logger.info(`      Static: ${r.staticVisuals}`);
    });
  }

  if (failed.length > 0) {
    logger.info('\n❌ FAILED TOPICS:');
    failed.forEach((r, i) => {
      logger.info(`   ${i + 1}. ${r.topic}`);
      logger.info(`      Errors: ${r.errors.join(', ')}`);
    });
  }

  // Calculate averages for successful tests
  if (successful.length > 0) {
    const avgOps = successful.reduce((sum, r) => sum + r.totalOperations, 0) / successful.length;
    const avgAnimations = successful.reduce((sum, r) => sum + r.animationVisuals, 0) / successful.length;
    
    logger.info('\n📊 AVERAGE METRICS (Successful):');
    logger.info(`   Operations per step: ${avgOps.toFixed(1)}`);
    logger.info(`   Animations per step: ${avgAnimations.toFixed(1)}`);
  }

  // Key findings
  logger.info('\n🔑 KEY FINDINGS:');
  logger.info(`   ✓ Plan generation works: ${allResults.filter(r => r.planSuccess).length}/${allResults.length}`);
  logger.info(`   ✓ Animation support: ${allResults.filter(r => r.animationVisuals > 0).length}/${allResults.length} topics had animations`);
  logger.info(`   ✓ Static visuals: ${allResults.every(r => r.staticVisuals > 0) ? 'All topics' : 'Some topics'}`);

  logger.info('\n' + '='.repeat(60));

  // Exit code
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run all tests
runAllTests().catch((error) => {
  logger.error('Test suite crashed:', error);
  process.exit(1);
});
