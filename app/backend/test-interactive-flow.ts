/**
 * Interactive System Flow Test
 * Tests complete flow: Generation → Rendering → Interactive UI
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface TestResult {
  phase: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function log(phase: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, data?: any) {
  const result = { phase, status, message, data };
  results.push(result);
  
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${icon} [${phase}] ${message}\x1b[0m`);
  if (data) {
    console.log(`   Data:`, JSON.stringify(data, null, 2).substring(0, 200));
  }
}

async function testBackendGeneration() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('PHASE 1: Backend Generation Quality');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Test planner
    const { plannerAgent } = await import('./src/agents/planner');
    
    log('Planner', 'PASS', 'Planner module loaded');
    
    const testQuery = 'Explain binary search algorithm';
    console.log(`\nTesting with query: "${testQuery}"\n`);
    
    const plan = await plannerAgent(testQuery, 'medium');
    
    if (!plan || !plan.steps) {
      log('Planner', 'FAIL', 'Plan generation failed - no steps returned');
      return;
    }
    
    log('Planner', 'PASS', `Generated plan with ${plan.steps.length} steps`, {
      stepCount: plan.steps.length,
      steps: plan.steps.map(s => s.tag)
    });
    
    if (plan.steps.length < 3) {
      log('Planner', 'WARN', 'Too few steps (expected 3-5)', { count: plan.steps.length });
    }
    
    // Test visual generation for first step
    const firstStep = plan.steps[0];
    console.log(`\nTesting visual generation for: "${firstStep.desc}"\n`);
    
    const { generateStepVisuals } = await import('./src/agents/codegenV4');
    
    const visuals = await generateStepVisuals(firstStep, testQuery);
    
    if (!visuals || visuals.length === 0) {
      log('Visuals', 'FAIL', 'No visuals generated');
      return;
    }
    
    log('Visuals', 'PASS', `Generated ${visuals.length} operations`, {
      count: visuals.length,
      types: [...new Set(visuals.map((v: any) => v.op))]
    });
    
    // Analyze operation quality
    const opTypes = visuals.map((v: any) => v.op);
    const uniqueTypes = new Set(opTypes);
    const hasAdvanced = opTypes.some((op: string) => 
      ['graph', 'latex', 'path', 'wave', 'particle'].includes(op)
    );
    
    if (uniqueTypes.size === 1) {
      log('Visuals', 'WARN', 'Only one operation type used', { type: opTypes[0] });
    }
    
    if (hasAdvanced) {
      log('Visuals', 'PASS', 'Advanced operations present (graph/latex/path/wave)');
    } else {
      log('Visuals', 'WARN', 'Only basic shapes (drawRect/drawCircle)', {
        types: Array.from(uniqueTypes)
      });
    }
    
    // Check operation counts
    if (visuals.length < 50) {
      log('Visuals', 'WARN', `Low operation count: ${visuals.length} (target: 50-100)`);
    } else if (visuals.length > 100) {
      log('Visuals', 'WARN', `High operation count: ${visuals.length} (target: 50-100)`);
    } else {
      log('Visuals', 'PASS', `Operation count within range: ${visuals.length}`);
    }
    
  } catch (error: any) {
    log('Backend', 'FAIL', `Generation failed: ${error.message}`, { error: error.stack });
  }
}

async function testInteractiveComponents() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('PHASE 2: Interactive Components');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const fs = require('fs');
  const path = require('path');
  
  // Check if components exist
  const frontendPath = path.join(__dirname, '../frontend/src/components');
  
  const requiredComponents = [
    'CanvasToolbar.tsx',
    'HandRaiseButton.tsx',
    'PenDrawingLayer.tsx',
    'CanvasQuestionInput.tsx'
  ];
  
  for (const component of requiredComponents) {
    const filePath = path.join(frontendPath, component);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      log('Components', 'PASS', `${component} exists (${content.length} bytes)`);
      
      // Check for critical functions
      if (component === 'CanvasStage.tsx') {
        const hasFrozenContext = content.includes('frozenStepContext');
        const hasErrorMessage = content.includes('errorMessage');
        const hasValidation = content.includes('question.length < 5');
        
        if (!hasFrozenContext) {
          log('Components', 'FAIL', 'CanvasStage missing frozenStepContext fix');
        }
        if (!hasErrorMessage) {
          log('Components', 'FAIL', 'CanvasStage missing error message state');
        }
        if (!hasValidation) {
          log('Components', 'FAIL', 'CanvasStage missing input validation');
        }
        
        if (hasFrozenContext && hasErrorMessage && hasValidation) {
          log('Components', 'PASS', 'All critical fixes present in CanvasStage');
        }
      }
    } else {
      log('Components', 'FAIL', `${component} not found`);
    }
  }
  
  // Check CanvasStage integration
  const canvasStage = path.join(frontendPath, 'CanvasStage.tsx');
  if (fs.existsSync(canvasStage)) {
    const content = fs.readFileSync(canvasStage, 'utf8');
    
    const hasUseMemo = content.includes('useMemo');
    const hasScrollFix = content.includes('scrollTop');
    const hasDelay = content.includes('setTimeout(resolve, 100)');
    
    if (hasUseMemo) {
      log('Fixes', 'PASS', 'Sticky overlay fix (useMemo) present');
    } else {
      log('Fixes', 'FAIL', 'Missing sticky overlay fix');
    }
    
    if (hasScrollFix) {
      log('Fixes', 'PASS', 'Scroll positioning fix present');
    } else {
      log('Fixes', 'FAIL', 'Missing scroll positioning fix');
    }
    
    if (hasDelay) {
      log('Fixes', 'PASS', 'Screenshot timing fix present');
    } else {
      log('Fixes', 'FAIL', 'Missing screenshot timing fix');
    }
  }
}

async function testClarificationEndpoint() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('PHASE 3: Clarification Endpoint');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const { clarifierAgent } = await import('./src/agents/clarifier');
    
    log('Clarifier', 'PASS', 'Clarifier module loaded');
    
    const testStep = {
      id: 1,
      tag: 'Introduction',
      desc: 'Understanding binary search basics',
      complexity: 3
    };
    
    const testQuestion = 'Why do we need the array to be sorted?';
    
    console.log(`Testing clarification for question: "${testQuestion}"\n`);
    
    const clarification = await clarifierAgent({
      query: 'Binary search algorithm',
      step: testStep,
      question: testQuestion,
      screenshot: null,
      plan: { steps: [testStep] }
    });
    
    if (!clarification || !clarification.actions) {
      log('Clarifier', 'FAIL', 'Clarification generation failed');
      return;
    }
    
    log('Clarifier', 'PASS', `Generated clarification with ${clarification.actions.length} operations`, {
      title: clarification.title,
      actionCount: clarification.actions.length
    });
    
    if (clarification.actions.length < 10) {
      log('Clarifier', 'WARN', `Low operation count: ${clarification.actions.length} (target: 10-15)`);
    }
    
    // Check if multimodal ready
    const hasScreenshotParam = clarification.toString().includes('screenshot');
    if (hasScreenshotParam) {
      log('Clarifier', 'PASS', 'Multimodal screenshot support confirmed');
    } else {
      log('Clarifier', 'WARN', 'Screenshot parameter may not be used');
    }
    
  } catch (error: any) {
    log('Clarifier', 'FAIL', `Clarification failed: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║        INTERACTIVE SYSTEM FLOW TEST - BACKEND                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  await testBackendGeneration();
  await testInteractiveComponents();
  await testClarificationEndpoint();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  
  console.log(`✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log(`⚠ WARNED: ${warned}`);
  console.log(`  TOTAL:  ${results.length}\n`);
  
  if (failed > 0) {
    console.log('\x1b[31mFAILURES DETECTED:\x1b[0m');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - [${r.phase}] ${r.message}`);
    });
    console.log('');
  }
  
  if (warned > 0) {
    console.log('\x1b[33mWARNINGS:\x1b[0m');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  - [${r.phase}] ${r.message}`);
    });
    console.log('');
  }
  
  const score = Math.round((passed / results.length) * 100);
  console.log(`Overall Score: ${score}%\n`);
  
  if (score >= 90) {
    console.log('\x1b[32m🎉 EXCELLENT - System ready for production\x1b[0m\n');
  } else if (score >= 75) {
    console.log('\x1b[33m✓ GOOD - Minor issues need attention\x1b[0m\n');
  } else if (score >= 60) {
    console.log('\x1b[33m⚠ FAIR - Several issues need fixing\x1b[0m\n');
  } else {
    console.log('\x1b[31m✗ POOR - Critical issues must be fixed\x1b[0m\n');
  }
  
  console.log('═══════════════════════════════════════════════════════════\n');
}

runTests().catch(console.error);
