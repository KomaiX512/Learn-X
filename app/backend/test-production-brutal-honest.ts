/**
 * BRUTAL HONEST PRODUCTION TEST
 * 
 * Tests complete end-to-end flow with animation system:
 * - Real topic generation (Blood Circulation)
 * - ALL 5 steps must complete
 * - Monitor for fallbacks, failures, quality issues
 * - Check if animations are actually generated
 * - Verify static vs animation split
 * - Time tracking for each component
 * - NO SUGAR COATING - EXPOSE ALL ISSUES
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

import { plannerAgent } from './src/agents/planner';
import { codegenV3 } from './src/agents/codegenV3';
import { logger } from './src/logger';

// Test topic that should trigger animations
const TEST_TOPIC = 'Blood Circulation in the Human Body';

interface StepAnalysis {
  stepId: number;
  stepDesc: string;
  stepTag: string;
  success: boolean;
  generationTime: number;
  totalOperations: number;
  staticOperations: number;
  animationOperations: number;
  operationTypes: Record<string, number>;
  hasCustomSVG: boolean;
  hasFallback: boolean;
  issues: string[];
  rawActions?: any[];
}

interface BrutalAnalysis {
  topic: string;
  planSuccess: boolean;
  planTime: number;
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  totalTime: number;
  stepAnalyses: StepAnalysis[];
  overallIssues: string[];
  architectureLimitations: string[];
  fallbacksDetected: boolean;
  animationQuality: 'EXCELLENT' | 'GOOD' | 'POOR' | 'FAILED';
  staticQuality: 'EXCELLENT' | 'GOOD' | 'POOR' | 'FAILED';
  dynamicGeneration: boolean;
  contextualRelevance: 'HIGH' | 'MEDIUM' | 'LOW';
  finalVerdict: string;
}

async function brutalProductionTest(): Promise<BrutalAnalysis> {
  console.log('\n' + '='.repeat(100));
  console.log('🔥 BRUTAL HONEST PRODUCTION TEST - NO SUGAR COATING');
  console.log('='.repeat(100));
  console.log(`Topic: ${TEST_TOPIC}`);
  console.log(`Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
  console.log(`Visual Version: ${process.env.USE_VISUAL_VERSION || 'v3'}`);
  console.log('='.repeat(100) + '\n');

  const analysis: BrutalAnalysis = {
    topic: TEST_TOPIC,
    planSuccess: false,
    planTime: 0,
    totalSteps: 0,
    successfulSteps: 0,
    failedSteps: 0,
    totalTime: 0,
    stepAnalyses: [],
    overallIssues: [],
    architectureLimitations: [],
    fallbacksDetected: false,
    animationQuality: 'FAILED',
    staticQuality: 'FAILED',
    dynamicGeneration: false,
    contextualRelevance: 'LOW',
    finalVerdict: ''
  };

  const overallStartTime = Date.now();

  try {
    // ========================================
    // PHASE 1: PLAN GENERATION
    // ========================================
    console.log('\n📋 PHASE 1: TESTING PLAN GENERATION');
    console.log('-'.repeat(80));

    const planStartTime = Date.now();
    let plan;
    
    try {
      plan = await plannerAgent(TEST_TOPIC);
      analysis.planTime = Date.now() - planStartTime;
      analysis.planSuccess = true;
      
      console.log(`✅ Plan generated in ${analysis.planTime}ms`);
      console.log(`   Title: ${plan.title}`);
      console.log(`   Subtitle: ${plan.subtitle}`);
      console.log(`   Steps: ${plan.steps.length}`);
      
      plan.steps.forEach((step, i) => {
        console.log(`   ${i + 1}. [${step.tag}] ${step.desc.substring(0, 60)}...`);
      });
      
      analysis.totalSteps = plan.steps.length;
      
      if (plan.steps.length !== 5) {
        analysis.overallIssues.push(`Expected 5 steps, got ${plan.steps.length}`);
      }
      
    } catch (error: any) {
      analysis.planTime = Date.now() - planStartTime;
      analysis.overallIssues.push(`Plan generation failed: ${error.message}`);
      console.log(`❌ Plan generation FAILED after ${analysis.planTime}ms`);
      console.log(`   Error: ${error.message}`);
      throw error;
    }

    // ========================================
    // PHASE 2: STEP GENERATION (ALL STEPS)
    // ========================================
    console.log('\n🎨 PHASE 2: TESTING STEP GENERATION WITH ANIMATION SYSTEM');
    console.log('-'.repeat(80));

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(`\n[Step ${i + 1}/${plan.steps.length}] ${step.tag}: ${step.desc.substring(0, 50)}...`);
      
      const stepAnalysis: StepAnalysis = {
        stepId: step.id,
        stepDesc: step.desc,
        stepTag: step.tag,
        success: false,
        generationTime: 0,
        totalOperations: 0,
        staticOperations: 0,
        animationOperations: 0,
        operationTypes: {},
        hasCustomSVG: false,
        hasFallback: false,
        issues: []
      };

      const stepStartTime = Date.now();

      try {
        // Call codegenV3 which has our animation system
        const result = await codegenV3(step, TEST_TOPIC);
        
        stepAnalysis.generationTime = Date.now() - stepStartTime;

        if (!result) {
          throw new Error('codegenV3 returned null');
        }

        stepAnalysis.success = true;
        analysis.successfulSteps++;
        
        const actions = result.actions;
        stepAnalysis.totalOperations = actions.length;
        stepAnalysis.rawActions = actions;

        // Analyze operations
        const opCounts: Record<string, number> = {};
        let animationCount = 0;
        let hasCustomSVG = false;

        actions.forEach((action: any) => {
          const op = action.op;
          opCounts[op] = (opCounts[op] || 0) + 1;
          
          if (op === 'customSVG') {
            animationCount++;
            hasCustomSVG = true;
            
            // Validate SVG animation quality
            const svgCode = action.svgCode || '';
            if (!svgCode.includes('<animateMotion') && 
                !svgCode.includes('<animateTransform') && 
                !svgCode.includes('<animate')) {
              stepAnalysis.issues.push('customSVG operation but no SMIL animations found');
            }
            if (!svgCode.includes('repeatCount="indefinite"')) {
              stepAnalysis.issues.push('Animation does not loop indefinitely');
            }
            if ((svgCode.match(/<text/g) || []).length < 2) {
              stepAnalysis.issues.push('Animation has insufficient labeling');
            }
          }
        });

        stepAnalysis.operationTypes = opCounts;
        stepAnalysis.animationOperations = animationCount;
        stepAnalysis.staticOperations = actions.length - animationCount - (opCounts['delay'] || 0);
        stepAnalysis.hasCustomSVG = hasCustomSVG;

        // Check for fallback indicators
        const hasGenericLabels = actions.some((a: any) => 
          a.text && (a.text.includes('Label') || a.text.includes('Part') || a.text.includes('Concept'))
        );
        if (hasGenericLabels) {
          stepAnalysis.hasFallback = true;
          stepAnalysis.issues.push('Generic placeholder labels detected');
          analysis.fallbacksDetected = true;
        }

        // Quality checks
        if (stepAnalysis.totalOperations < 20) {
          stepAnalysis.issues.push(`Low operation count: ${stepAnalysis.totalOperations} (expected 50+)`);
        }
        
        if (stepAnalysis.animationOperations === 0) {
          stepAnalysis.issues.push('NO ANIMATIONS generated for this step');
        }
        
        if (stepAnalysis.animationOperations > 0 && stepAnalysis.animationOperations < 2) {
          stepAnalysis.issues.push(`Only ${stepAnalysis.animationOperations} animation (expected 2-3)`);
        }

        console.log(`✅ Generated in ${stepAnalysis.generationTime}ms`);
        console.log(`   Operations: ${stepAnalysis.totalOperations} total`);
        console.log(`   Static: ${stepAnalysis.staticOperations}`);
        console.log(`   Animations: ${stepAnalysis.animationOperations}`);
        console.log(`   Types: ${JSON.stringify(opCounts)}`);
        
        if (stepAnalysis.issues.length > 0) {
          console.log(`   ⚠️  Issues: ${stepAnalysis.issues.join(', ')}`);
        }

      } catch (error: any) {
        stepAnalysis.generationTime = Date.now() - stepStartTime;
        stepAnalysis.issues.push(`Generation failed: ${error.message}`);
        analysis.failedSteps++;
        
        console.log(`❌ FAILED after ${stepAnalysis.generationTime}ms`);
        console.log(`   Error: ${error.message}`);
      }

      analysis.stepAnalyses.push(stepAnalysis);
    }

    analysis.totalTime = Date.now() - overallStartTime;

  } catch (error: any) {
    analysis.totalTime = Date.now() - overallStartTime;
    analysis.overallIssues.push(`Critical failure: ${error.message}`);
  }

  // ========================================
  // BRUTAL ANALYSIS
  // ========================================
  console.log('\n' + '='.repeat(100));
  console.log('🔬 BRUTAL HONEST ANALYSIS');
  console.log('='.repeat(100));

  // Calculate quality metrics
  const totalAnimations = analysis.stepAnalyses.reduce((sum, s) => sum + s.animationOperations, 0);
  const totalStatic = analysis.stepAnalyses.reduce((sum, s) => sum + s.staticOperations, 0);
  const totalOps = analysis.stepAnalyses.reduce((sum, s) => sum + s.totalOperations, 0);
  const avgOpsPerStep = analysis.successfulSteps > 0 ? totalOps / analysis.successfulSteps : 0;

  // Animation Quality
  if (totalAnimations === 0) {
    analysis.animationQuality = 'FAILED';
    analysis.architectureLimitations.push('ZERO animations generated - animation system NOT working');
  } else if (totalAnimations < 5) {
    analysis.animationQuality = 'POOR';
    analysis.architectureLimitations.push(`Only ${totalAnimations} animations across all steps (expected 10-15)`);
  } else if (totalAnimations < 10) {
    analysis.animationQuality = 'GOOD';
  } else {
    analysis.animationQuality = 'EXCELLENT';
  }

  // Static Quality
  if (avgOpsPerStep < 20) {
    analysis.staticQuality = 'POOR';
    analysis.architectureLimitations.push(`Low operation count: ${avgOpsPerStep.toFixed(1)} per step (expected 50+)`);
  } else if (avgOpsPerStep < 40) {
    analysis.staticQuality = 'GOOD';
  } else {
    analysis.staticQuality = 'EXCELLENT';
  }

  // Dynamic Generation Check
  analysis.dynamicGeneration = !analysis.fallbacksDetected;
  if (analysis.fallbacksDetected) {
    analysis.architectureLimitations.push('Fallback patterns detected - NOT truly dynamic');
  }

  // Contextual Relevance (check if Blood-related terms appear)
  const allActions = analysis.stepAnalyses.flatMap(s => s.rawActions || []);
  const bloodTerms = ['blood', 'RBC', 'WBC', 'platelet', 'vessel', 'artery', 'vein', 'heart', 'circulation'];
  const hasBloodContext = allActions.some((a: any) => {
    const text = JSON.stringify(a).toLowerCase();
    return bloodTerms.some(term => text.includes(term));
  });
  
  analysis.contextualRelevance = hasBloodContext ? 'HIGH' : 'LOW';
  if (!hasBloodContext) {
    analysis.architectureLimitations.push('Generated content NOT contextually relevant to Blood Circulation');
  }

  // Final Verdict
  const successRate = (analysis.successfulSteps / analysis.totalSteps) * 100;
  
  if (successRate === 100 && analysis.animationQuality === 'EXCELLENT' && !analysis.fallbacksDetected) {
    analysis.finalVerdict = '✅ PRODUCTION READY - Animation system working perfectly';
  } else if (successRate >= 80 && totalAnimations > 0) {
    analysis.finalVerdict = '⚠️  MOSTLY WORKING - Some issues need attention';
  } else {
    analysis.finalVerdict = '❌ NOT PRODUCTION READY - Critical failures detected';
  }

  // ========================================
  // DETAILED REPORT
  // ========================================
  console.log('\n📊 PERFORMANCE METRICS');
  console.log('-'.repeat(80));
  console.log(`Plan Generation: ${analysis.planTime}ms`);
  console.log(`Total Time: ${(analysis.totalTime / 1000).toFixed(1)}s`);
  console.log(`Success Rate: ${successRate.toFixed(0)}% (${analysis.successfulSteps}/${analysis.totalSteps} steps)`);
  console.log(`Avg Time per Step: ${analysis.successfulSteps > 0 ? (analysis.stepAnalyses.reduce((sum, s) => sum + s.generationTime, 0) / analysis.successfulSteps / 1000).toFixed(1) : 0}s`);

  console.log('\n🎬 ANIMATION METRICS');
  console.log('-'.repeat(80));
  console.log(`Total Animations: ${totalAnimations}`);
  console.log(`Total Static Ops: ${totalStatic}`);
  console.log(`Animation Quality: ${analysis.animationQuality}`);
  console.log(`Static Quality: ${analysis.staticQuality}`);
  console.log(`Fallbacks Detected: ${analysis.fallbacksDetected ? '❌ YES' : '✅ NO'}`);

  console.log('\n🧬 CONTEXTUAL ANALYSIS');
  console.log('-'.repeat(80));
  console.log(`Topic: ${TEST_TOPIC}`);
  console.log(`Contextual Relevance: ${analysis.contextualRelevance}`);
  console.log(`Dynamic Generation: ${analysis.dynamicGeneration ? '✅ YES' : '❌ NO'}`);

  if (analysis.architectureLimitations.length > 0) {
    console.log('\n⚠️  ARCHITECTURE LIMITATIONS DETECTED');
    console.log('-'.repeat(80));
    analysis.architectureLimitations.forEach((limit, i) => {
      console.log(`${i + 1}. ${limit}`);
    });
  }

  if (analysis.overallIssues.length > 0) {
    console.log('\n❌ CRITICAL ISSUES');
    console.log('-'.repeat(80));
    analysis.overallIssues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }

  console.log('\n📝 PER-STEP BREAKDOWN');
  console.log('-'.repeat(80));
  analysis.stepAnalyses.forEach((step, i) => {
    console.log(`\nStep ${i + 1}: ${step.stepTag} (${step.success ? '✅ SUCCESS' : '❌ FAILED'})`);
    console.log(`  Time: ${(step.generationTime / 1000).toFixed(1)}s`);
    console.log(`  Operations: ${step.totalOperations} (${step.staticOperations} static, ${step.animationOperations} animations)`);
    console.log(`  Has Animations: ${step.hasCustomSVG ? '✅ YES' : '❌ NO'}`);
    console.log(`  Types: ${JSON.stringify(step.operationTypes)}`);
    if (step.issues.length > 0) {
      console.log(`  Issues: ${step.issues.join(', ')}`);
    }
  });

  console.log('\n' + '='.repeat(100));
  console.log('🎯 FINAL VERDICT');
  console.log('='.repeat(100));
  console.log(analysis.finalVerdict);
  console.log('='.repeat(100) + '\n');

  // Save detailed report
  const reportDir = path.join(__dirname, 'test-output-production');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, `brutal-analysis-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  console.log(`📁 Detailed report saved: ${reportPath}\n`);

  return analysis;
}

// Run the test
brutalProductionTest()
  .then((analysis) => {
    process.exit(analysis.successfulSteps === analysis.totalSteps ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 TEST SUITE CRASHED:', error);
    process.exit(1);
  });
