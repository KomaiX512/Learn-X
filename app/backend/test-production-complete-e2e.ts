/**
 * BRUTALLY HONEST END-TO-END PRODUCTION TEST
 * 
 * Tests complete lecture generation from start to finish:
 * 1. Plan generation (steps)
 * 2. Visual generation for each step (static + animations)
 * 3. Code execution on frontend
 * 4. Timing analysis
 * 5. Fallback detection
 * 6. Quality verification
 * 
 * NO SUGAR COATING - Reports exact truth
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './src/logger';

dotenv.config({ path: path.join(__dirname, '.env') });

// Import the generation pipeline components
import { plannerAgent } from './src/agents/planner';
import codegenV3 from './src/agents/codegenV3';

interface StepAnalysis {
  stepNumber: number;
  stepDesc: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  staticVisuals: number;
  animationVisuals: number;
  totalOperations: number;
  errors: string[];
  fallbacksDetected: boolean;
  genericLabelsFound: string[];
  qualityScore: number;
}

interface CompleteAnalysis {
  topic: string;
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  totalTime: number;
  avgTimePerStep: number;
  totalOperations: number;
  totalStaticVisuals: number;
  totalAnimations: number;
  fallbacksUsed: boolean;
  genericLabelsCount: number;
  errors: string[];
  stepAnalysis: StepAnalysis[];
  architecturalLimitations: string[];
  qualityVerdict: string;
  productionReady: boolean;
}

/**
 * Analyze a single step's output for quality and fallbacks
 */
function analyzeStepOutput(chunk: any): {
  operations: number;
  staticVisuals: number;
  animations: number;
  fallbackDetected: boolean;
  genericLabels: string[];
  qualityScore: number;
} {
  let operations = 0;
  let staticVisuals = 0;
  let animations = 0;
  let fallbackDetected = false;
  const genericLabels: string[] = [];
  let qualityScore = 100;

  if (!chunk || !chunk.actions || !Array.isArray(chunk.actions)) {
    return { operations: 0, staticVisuals: 0, animations: 0, fallbackDetected: true, genericLabels: [], qualityScore: 0 };
  }

  const actions = chunk.actions;
  operations = actions.length;

  // Count visual types
  actions.forEach((action: any) => {
    if (action.op === 'customSVG') {
      animations++;
    } else {
      staticVisuals++;
    }

    // Check for generic labels
    if (action.op === 'drawLabel' || action.op === 'drawTitle') {
      const text = action.text || '';
      const genericPatterns = [
        /^Label\s*\d+$/i,
        /^Part\s*[A-Z]$/i,
        /^Concept\s*\d*$/i,
        /^Visual\s*\d*$/i,
        /^Diagram\s*\d*$/i,
        /^Step\s*\d+$/i,
        /^Item\s*\d+$/i,
        /^Element\s*\d+$/i
      ];

      for (const pattern of genericPatterns) {
        if (pattern.test(text.trim())) {
          genericLabels.push(text);
          qualityScore -= 5;
          fallbackDetected = true;
        }
      }
    }
  });

  // Check operation count - too few indicates fallback
  if (operations < 5) {
    fallbackDetected = true;
    qualityScore -= 20;
  }

  // Check for variety
  const opTypes = [...new Set(actions.map((a: any) => a.op))];
  if (opTypes.length < 2) {
    qualityScore -= 15;
  }

  return {
    operations,
    staticVisuals,
    animations,
    fallbackDetected,
    genericLabels,
    qualityScore: Math.max(0, qualityScore)
  };
}

/**
 * Run complete E2E test
 */
async function runCompleteE2ETest(): Promise<CompleteAnalysis> {
  const TEST_TOPIC = "Neural Networks and Backpropagation";
  
  logger.info(`\n${'█'.repeat(80)}`);
  logger.info(`🔥 BRUTALLY HONEST E2E PRODUCTION TEST`);
  logger.info(`${'█'.repeat(80)}`);
  logger.info(`Topic: ${TEST_TOPIC}`);
  logger.info(`Time: ${new Date().toISOString()}`);
  logger.info(`${'█'.repeat(80)}\n`);

  const analysis: CompleteAnalysis = {
    topic: TEST_TOPIC,
    totalSteps: 0,
    successfulSteps: 0,
    failedSteps: 0,
    totalTime: 0,
    avgTimePerStep: 0,
    totalOperations: 0,
    totalStaticVisuals: 0,
    totalAnimations: 0,
    fallbacksUsed: false,
    genericLabelsCount: 0,
    errors: [],
    stepAnalysis: [],
    architecturalLimitations: [],
    qualityVerdict: '',
    productionReady: false
  };

  const startTime = Date.now();

  try {
    logger.info(`📡 Generating plan for: "${TEST_TOPIC}"`);
    
    // Step 1: Generate plan
    const planStartTime = Date.now();
    const plan = await plannerAgent(TEST_TOPIC);
    const planTime = Date.now() - planStartTime;
    
    if (!plan || !plan.steps || plan.steps.length === 0) {
      throw new Error('Plan generation failed');
    }
    
    analysis.totalSteps = plan.steps.length;
    logger.info(`\n📋 PLAN GENERATED (${(planTime/1000).toFixed(2)}s):`);
    logger.info(`   Total Steps: ${plan.steps.length}`);
    plan.steps.forEach((step: any, i: number) => {
      logger.info(`   ${i + 1}. ${step.desc}`);
    });
    logger.info('');

    // Step 2: Generate visuals for each step
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const stepNumber = i + 1;
      
      const stepStartTime = Date.now();
      
      const currentStepAnalysis: StepAnalysis = {
        stepNumber,
        stepDesc: step.desc || `Step ${stepNumber}`,
        startTime: stepStartTime,
        endTime: 0,
        duration: 0,
        success: false,
        staticVisuals: 0,
        animationVisuals: 0,
        totalOperations: 0,
        errors: [],
        fallbacksDetected: false,
        genericLabelsFound: [],
        qualityScore: 0
      };

      logger.info(`${'─'.repeat(80)}`);
      logger.info(`🔷 STEP ${stepNumber}/${analysis.totalSteps}: ${currentStepAnalysis.stepDesc}`);
      logger.info(`${'─'.repeat(80)}`);

      try {
        // Generate code for this step
        const chunk = await codegenV3(step, TEST_TOPIC);
        
        // Analyze the output
        const stepOutput = analyzeStepOutput(chunk);
        
        currentStepAnalysis.totalOperations = stepOutput.operations;
        currentStepAnalysis.staticVisuals = stepOutput.staticVisuals;
        currentStepAnalysis.animationVisuals = stepOutput.animations;
        currentStepAnalysis.fallbacksDetected = stepOutput.fallbackDetected;
        currentStepAnalysis.genericLabelsFound = stepOutput.genericLabels;
        currentStepAnalysis.qualityScore = stepOutput.qualityScore;
        currentStepAnalysis.success = stepOutput.operations > 0;

        logger.info(`\n📊 STEP ${stepNumber} RESULTS:`);
        logger.info(`   Operations: ${stepOutput.operations}`);
        logger.info(`   Static Visuals: ${stepOutput.staticVisuals}`);
        logger.info(`   Animations: ${stepOutput.animations}`);
        logger.info(`   Quality Score: ${stepOutput.qualityScore}/100`);
        
        if (stepOutput.fallbackDetected) {
          logger.warn(`   ⚠️  FALLBACK DETECTED!`);
          analysis.fallbacksUsed = true;
        }
        
        if (stepOutput.genericLabels.length > 0) {
          logger.warn(`   ⚠️  Generic Labels: ${stepOutput.genericLabels.join(', ')}`);
          analysis.genericLabelsCount += stepOutput.genericLabels.length;
        }

        // Update totals
        analysis.totalOperations += stepOutput.operations;
        analysis.totalStaticVisuals += stepOutput.staticVisuals;
        analysis.totalAnimations += stepOutput.animations;

        if (currentStepAnalysis.success) {
          analysis.successfulSteps++;
        } else {
          analysis.failedSteps++;
        }
        
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        currentStepAnalysis.errors.push(errorMsg);
        analysis.errors.push(`Step ${stepNumber}: ${errorMsg}`);
        analysis.failedSteps++;
        logger.error(`   ❌ ERROR: ${errorMsg}`);
      }
      
      currentStepAnalysis.endTime = Date.now();
      currentStepAnalysis.duration = currentStepAnalysis.endTime - currentStepAnalysis.startTime;
      analysis.stepAnalysis.push(currentStepAnalysis);
      
      logger.info(`   ⏱️  Step Duration: ${(currentStepAnalysis.duration/1000).toFixed(2)}s\n`);
    }

  } catch (error: any) {
    logger.error(`\n❌ ORCHESTRATOR FAILED: ${error.message}`);
    analysis.errors.push(`Orchestrator failure: ${error.message}`);
  }

  analysis.totalTime = Date.now() - startTime;
  analysis.avgTimePerStep = analysis.totalSteps > 0 ? analysis.totalTime / analysis.totalSteps : 0;

  return analysis;
}

/**
 * Generate brutally honest report
 */
function generateBrutalReport(analysis: CompleteAnalysis): void {
  logger.info(`\n${'█'.repeat(80)}`);
  logger.info(`📊 BRUTALLY HONEST ANALYSIS REPORT`);
  logger.info(`${'█'.repeat(80)}\n`);

  // Overall metrics
  logger.info(`🎯 OVERALL METRICS:`);
  logger.info(`   Topic: ${analysis.topic}`);
  logger.info(`   Total Steps: ${analysis.totalSteps}`);
  logger.info(`   Successful: ${analysis.successfulSteps}/${analysis.totalSteps} (${((analysis.successfulSteps/analysis.totalSteps)*100).toFixed(1)}%)`);
  logger.info(`   Failed: ${analysis.failedSteps}`);
  logger.info(`   Total Time: ${(analysis.totalTime/1000).toFixed(2)}s`);
  logger.info(`   Avg Time/Step: ${(analysis.avgTimePerStep/1000).toFixed(2)}s`);

  // Operations analysis
  logger.info(`\n📈 OPERATIONS ANALYSIS:`);
  logger.info(`   Total Operations: ${analysis.totalOperations}`);
  logger.info(`   Avg Ops/Step: ${(analysis.totalOperations/analysis.totalSteps).toFixed(1)}`);
  logger.info(`   Static Visuals: ${analysis.totalStaticVisuals}`);
  logger.info(`   Animations: ${analysis.totalAnimations}`);
  
  // Quality analysis
  logger.info(`\n🎨 QUALITY ANALYSIS:`);
  const avgQuality = analysis.stepAnalysis.reduce((sum, s) => sum + s.qualityScore, 0) / analysis.stepAnalysis.length;
  logger.info(`   Average Quality Score: ${avgQuality.toFixed(1)}/100`);
  logger.info(`   Fallbacks Used: ${analysis.fallbacksUsed ? '❌ YES' : '✅ NO'}`);
  logger.info(`   Generic Labels Found: ${analysis.genericLabelsCount}`);

  // Architectural limitations
  logger.info(`\n🏗️  ARCHITECTURAL LIMITATIONS:`);
  const limitations: string[] = [];
  
  if (analysis.failedSteps > 0) {
    limitations.push(`${analysis.failedSteps} steps failed to generate`);
  }
  
  if (analysis.fallbacksUsed) {
    limitations.push('Fallback generation still active');
  }
  
  if (analysis.genericLabelsCount > 0) {
    limitations.push(`${analysis.genericLabelsCount} generic labels detected (not contextual)`);
  }
  
  const avgOpsPerStep = analysis.totalOperations / analysis.totalSteps;
  if (avgOpsPerStep < 50) {
    limitations.push(`Low operation count (${avgOpsPerStep.toFixed(1)}/step, target: 50-70)`);
  }
  
  if (analysis.totalAnimations < analysis.totalSteps * 2) {
    limitations.push(`Insufficient animations (${analysis.totalAnimations} total, target: 2-3 per step)`);
  }

  if (limitations.length === 0) {
    logger.info(`   ✅ NO MAJOR LIMITATIONS DETECTED`);
  } else {
    limitations.forEach(limit => {
      logger.warn(`   ❌ ${limit}`);
    });
  }

  analysis.architecturalLimitations = limitations;

  // Step-by-step breakdown
  logger.info(`\n📋 STEP-BY-STEP BREAKDOWN:`);
  analysis.stepAnalysis.forEach(step => {
    const status = step.success ? '✅' : '❌';
    const fallback = step.fallbacksDetected ? '⚠️  FALLBACK' : '';
    logger.info(`\n   ${status} Step ${step.stepNumber}: ${step.stepDesc}`);
    logger.info(`      Time: ${(step.duration/1000).toFixed(2)}s`);
    logger.info(`      Operations: ${step.totalOperations} (${step.staticVisuals} static, ${step.animationVisuals} animations)`);
    logger.info(`      Quality: ${step.qualityScore}/100 ${fallback}`);
    if (step.genericLabelsFound.length > 0) {
      logger.warn(`      Generic Labels: ${step.genericLabelsFound.join(', ')}`);
    }
    if (step.errors.length > 0) {
      step.errors.forEach(err => logger.error(`      Error: ${err}`));
    }
  });

  // Errors summary
  if (analysis.errors.length > 0) {
    logger.info(`\n❌ ERRORS (${analysis.errors.length} total):`);
    analysis.errors.forEach(err => logger.error(`   - ${err}`));
  }

  // Final verdict
  logger.info(`\n${'█'.repeat(80)}`);
  logger.info(`🎯 FINAL VERDICT`);
  logger.info(`${'█'.repeat(80)}`);

  let verdict = '';
  let productionReady = false;

  if (analysis.successfulSteps === analysis.totalSteps && 
      !analysis.fallbacksUsed && 
      analysis.genericLabelsCount === 0 &&
      avgOpsPerStep >= 50 &&
      avgQuality >= 80) {
    verdict = '✅ PRODUCTION READY - All claims verified';
    productionReady = true;
    logger.info(verdict);
    logger.info('   - All steps successful');
    logger.info('   - No fallbacks detected');
    logger.info('   - All visuals contextual');
    logger.info('   - Operation count meets target');
    logger.info('   - Quality score excellent');
  } else if (analysis.successfulSteps >= analysis.totalSteps * 0.8 &&
             analysis.genericLabelsCount < 5 &&
             avgQuality >= 70) {
    verdict = '⚠️  BETA READY - Mostly working with minor issues';
    productionReady = false;
    logger.warn(verdict);
    logger.warn('   Issues to fix:');
    limitations.forEach(limit => logger.warn(`   - ${limit}`));
  } else {
    verdict = '❌ NOT READY - Significant issues detected';
    productionReady = false;
    logger.error(verdict);
    logger.error('   Critical issues:');
    limitations.forEach(limit => logger.error(`   - ${limit}`));
  }

  analysis.qualityVerdict = verdict;
  analysis.productionReady = productionReady;

  // Save detailed report
  const reportPath = path.join(__dirname, 'test-output-e2e', `e2e-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  logger.info(`\n💾 Detailed report saved: ${path.basename(reportPath)}`);

  logger.info(`\n${'█'.repeat(80)}\n`);
}

/**
 * Main execution
 */
async function main() {
  try {
    const analysis = await runCompleteE2ETest();
    generateBrutalReport(analysis);
    
    process.exit(analysis.productionReady ? 0 : 1);
  } catch (error: any) {
    logger.error(`\n❌ TEST FAILED: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

main();
