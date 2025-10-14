/**
 * FULL SYSTEM TEST - End-to-End Generation
 * 
 * Tests complete pipeline with real topic:
 * - Planner generates steps
 * - Each step generates notes + animations
 * - Monitor all timings and failures
 * - Verify quality and contextuality
 */

import axios from 'axios';

const BACKEND_URL = 'http://localhost:8000';
const TEST_TOPIC = 'Teach me about Neural Networks - forward propagation, backpropagation, and gradient descent';

interface StepResult {
  stepNumber: number;
  success: boolean;
  hasNotes: boolean;
  hasAnimations: boolean;
  animationCount: number;
  timeTaken: number;
  errors: string[];
}

interface TestResults {
  topic: string;
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  totalTime: number;
  steps: StepResult[];
  overallSuccess: boolean;
}

async function testFullGeneration(): Promise<TestResults> {
  console.log('\n' + '='.repeat(80));
  console.log('FULL SYSTEM TEST - BRUTAL HONESTY MODE');
  console.log('='.repeat(80));
  console.log(`Topic: ${TEST_TOPIC}`);
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();
  const results: TestResults = {
    topic: TEST_TOPIC,
    totalSteps: 0,
    successfulSteps: 0,
    failedSteps: 0,
    totalTime: 0,
    steps: [],
    overallSuccess: false,
  };

  try {
    // Step 1: Check server health
    console.log('📡 Checking server health...');
    try {
      const healthCheck = await axios.get(`${BACKEND_URL}/health`, { timeout: 3000 });
      console.log(`✅ Server is UP: ${healthCheck.data.status}`);
    } catch (err: any) {
      console.error('❌ Server is DOWN:', err.message);
      throw new Error('Backend server not accessible');
    }

    // Step 2: Send generation request via WebSocket simulation
    console.log('\n🚀 Starting generation via API...');
    const response = await axios.post(`${BACKEND_URL}/generate`, {
      topic: TEST_TOPIC,
    }, {
      timeout: 300000, // 5 minutes max
    });

    console.log('📦 Response received');

    // Step 3: Monitor and analyze response
    if (!response.data || !response.data.steps) {
      throw new Error('Invalid response structure - no steps');
    }

    results.totalSteps = response.data.steps.length;
    console.log(`\n📊 Generated ${results.totalSteps} steps\n`);

    // Analyze each step
    response.data.steps.forEach((step: any, idx: number) => {
      const stepResult: StepResult = {
        stepNumber: idx + 1,
        success: false,
        hasNotes: false,
        hasAnimations: false,
        animationCount: 0,
        timeTaken: 0,
        errors: [],
      };

      console.log(`\n${'─'.repeat(80)}`);
      console.log(`STEP ${idx + 1}/${results.totalSteps}`);
      console.log(`${'─'.repeat(80)}`);

      // Check for actions
      if (!step.actions || !Array.isArray(step.actions)) {
        stepResult.errors.push('No actions array');
        console.log('❌ No actions array found');
      } else {
        console.log(`📦 Total actions: ${step.actions.length}`);

        // Check for notes (customSVG with isNotesKeynote)
        const notesAction = step.actions.find((a: any) => 
          a.op === 'customSVG' && a.isNotesKeynote === true
        );
        
        if (notesAction) {
          stepResult.hasNotes = true;
          const svgLength = notesAction.svgCode?.length || 0;
          console.log(`✅ Notes present: ${svgLength} chars`);
          
          // Validate SVG quality
          if (svgLength < 3000) {
            stepResult.errors.push(`Notes too short: ${svgLength} chars`);
            console.log(`⚠️  Notes quality warning: only ${svgLength} chars`);
          }
        } else {
          stepResult.errors.push('No notes keynote');
          console.log('❌ No notes keynote found');
        }

        // Check for animations (customSVG without isNotesKeynote)
        const animationActions = step.actions.filter((a: any) => 
          a.op === 'customSVG' && a.isNotesKeynote !== true
        );
        
        if (animationActions.length > 0) {
          stepResult.hasAnimations = true;
          stepResult.animationCount = animationActions.length;
          console.log(`✅ Animations present: ${animationActions.length} animations`);
          
          // Check animation quality
          animationActions.forEach((anim: any, animIdx: number) => {
            const animLength = anim.svgCode?.length || 0;
            const hasAnimateTag = anim.svgCode?.includes('<animate');
            console.log(`   Animation ${animIdx + 1}: ${animLength} chars, ${hasAnimateTag ? '✅ has <animate>' : '❌ no <animate>'}`);
            
            if (!hasAnimateTag) {
              stepResult.errors.push(`Animation ${animIdx + 1} has no <animate> tags`);
            }
          });
        } else {
          stepResult.errors.push('No animations');
          console.log('❌ No animations found');
        }

        // Check for contextuality (topic-specific keywords)
        const allSVG = step.actions
          .filter((a: any) => a.op === 'customSVG')
          .map((a: any) => a.svgCode || '')
          .join(' ');
        
        const topicKeywords = ['neural', 'network', 'forward', 'backward', 'gradient', 'descent', 'propagation'];
        const foundKeywords = topicKeywords.filter(kw => 
          allSVG.toLowerCase().includes(kw)
        );
        
        if (foundKeywords.length > 0) {
          console.log(`✅ Context keywords found: ${foundKeywords.join(', ')}`);
        } else {
          stepResult.errors.push('No topic keywords - may be generic content');
          console.log(`⚠️  No topic keywords found - content may be generic`);
        }
      }

      // Mark success if has both notes and animations with no critical errors
      stepResult.success = stepResult.hasNotes && stepResult.hasAnimations && stepResult.errors.length === 0;
      
      if (stepResult.success) {
        results.successfulSteps++;
        console.log(`\n✅ STEP ${idx + 1}: SUCCESS`);
      } else {
        results.failedSteps++;
        console.log(`\n❌ STEP ${idx + 1}: FAILED`);
        console.log(`   Errors: ${stepResult.errors.join(', ')}`);
      }

      results.steps.push(stepResult);
    });

  } catch (error: any) {
    console.error('\n❌ GENERATION FAILED:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  results.totalTime = Date.now() - startTime;
  results.overallSuccess = results.failedSteps === 0 && results.successfulSteps > 0;

  // Final Report
  console.log('\n' + '='.repeat(80));
  console.log('FINAL TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`Total Time: ${(results.totalTime / 1000).toFixed(2)}s`);
  console.log(`Total Steps: ${results.totalSteps}`);
  console.log(`Successful: ${results.successfulSteps}/${results.totalSteps} (${((results.successfulSteps / results.totalSteps) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failedSteps}/${results.totalSteps}`);
  console.log('');
  console.log(`Overall: ${results.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log('='.repeat(80) + '\n');

  return results;
}

// Run test
testFullGeneration()
  .then(results => {
    process.exit(results.overallSuccess ? 0 : 1);
  })
  .catch(err => {
    console.error('Test crashed:', err);
    process.exit(1);
  });
