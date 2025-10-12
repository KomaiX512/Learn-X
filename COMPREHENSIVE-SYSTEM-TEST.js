/**
 * COMPREHENSIVE SYSTEM TEST
 * Tests entire pipeline from query to frontend delivery
 * NO SUGAR COATING - Brutally honest analysis
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');

const BACKEND = 'http://localhost:8000';
const TEST_TOPIC = process.argv[2] || 'photosynthesis in plant cells';

console.log('\n' + '='.repeat(80));
console.log('🔬 COMPREHENSIVE SYSTEM TEST - BRUTAL HONESTY MODE');
console.log('='.repeat(80));
console.log(`Topic: "${TEST_TOPIC}"`);
console.log(`Time: ${new Date().toISOString()}\n`);

// Test results tracking
const testResults = {
  topic: TEST_TOPIC,
  startTime: Date.now(),
  sessionId: null,
  stepsReceived: [],
  failures: [],
  warnings: [],
  animations: {
    total: 0,
    byStep: {}
  },
  timing: {
    planning: 0,
    steps: {}
  },
  quality: {
    contextual: false,
    complete: false,
    dynamic: true,
    hasFallback: false
  }
};

async function runComprehensiveTest() {
  try {
    // STEP 1: Create session
    console.log('📋 STEP 1/4: Creating session...');
    const sessionResponse = await axios.post(`${BACKEND}/api/query`, {
      query: TEST_TOPIC
    });
    
    testResults.sessionId = sessionResponse.data.sessionId;
    console.log(`✅ Session created: ${testResults.sessionId}\n`);
    
    // STEP 2: Connect WebSocket and monitor
    console.log('📋 STEP 2/4: Connecting to WebSocket...');
    const ws = new WebSocket(`ws://localhost:8000?sessionId=${testResults.sessionId}`);
    
    return new Promise((resolve) => {
      let stepCount = 0;
      let expectedSteps = 3; // Default, will update if we learn otherwise
      let allStepsReceived = false;
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected\n');
        console.log('📋 STEP 3/4: Listening for generation results...\n');
        console.log('-'.repeat(80));
        ws.send(JSON.stringify({ type: 'join', sessionId: testResults.sessionId }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        // Track different message types
        if (message.type === 'plan') {
          console.log('📊 PLAN RECEIVED');
          console.log(`   Steps: ${message.data.steps?.length || 'unknown'}`);
          if (message.data.steps) {
            expectedSteps = message.data.steps.length;
            console.log(`   Expected steps: ${expectedSteps}`);
          }
          console.log('-'.repeat(80));
        }
        
        if (message.type === 'chunk' && message.data?.type === 'actions') {
          stepCount++;
          const stepId = message.data.stepId;
          const actions = message.data.actions;
          const elapsed = ((Date.now() - testResults.startTime) / 1000).toFixed(1);
          
          console.log(`\n🎬 STEP ${stepId} RECEIVED (${elapsed}s elapsed)`);
          console.log(`   Actions: ${actions.length}`);
          
          // Store step data
          const stepData = {
            stepId,
            receivedAt: elapsed,
            actions: actions.length,
            animations: 0,
            labels: 0,
            shapes: 0,
            svgLength: 0,
            hasAnimation: false,
            contextualWords: []
          };
          
          // Analyze actions
          actions.forEach((action, idx) => {
            console.log(`   Action ${idx + 1}: ${action.op}`);
            
            if (action.op === 'customSVG' && action.svgCode) {
              const svg = action.svgCode;
              stepData.svgLength = svg.length;
              
              // Count animations
              const animateCount = (svg.match(/<animate[^>]*>/g) || []).length;
              const animateMotionCount = (svg.match(/<animateMotion[^>]*>/g) || []).length;
              const animateTransformCount = (svg.match(/<animateTransform[^>]*>/g) || []).length;
              const totalAnims = animateCount + animateMotionCount + animateTransformCount;
              
              stepData.animations = totalAnims;
              stepData.hasAnimation = totalAnims > 0;
              testResults.animations.total += totalAnims;
              testResults.animations.byStep[stepId] = totalAnims;
              
              // Count visual elements
              stepData.labels = (svg.match(/<text/g) || []).length;
              stepData.shapes = (svg.match(/<circle|<rect|<path|<ellipse|<polygon/g) || []).length;
              
              console.log(`   📊 SVG Analysis:`);
              console.log(`      Length: ${stepData.svgLength} chars`);
              console.log(`      Animations: ${totalAnims} (<animate>: ${animateCount}, <animateMotion>: ${animateMotionCount}, <animateTransform>: ${animateTransformCount})`);
              console.log(`      Labels: ${stepData.labels}`);
              console.log(`      Shapes: ${stepData.shapes}`);
              
              // Check for contextual content
              const topicWords = TEST_TOPIC.toLowerCase().split(' ');
              const foundWords = topicWords.filter(word => 
                word.length > 3 && svg.toLowerCase().includes(word)
              );
              stepData.contextualWords = foundWords;
              
              if (foundWords.length > 0) {
                console.log(`      ✅ Contextual words found: ${foundWords.join(', ')}`);
              } else {
                console.log(`      ⚠️  No obvious topic words found in SVG`);
                testResults.warnings.push(`Step ${stepId}: No contextual words detected`);
              }
              
              // Check for fallback indicators
              const fallbackIndicators = ['Label 1', 'Label 2', 'Sample', 'Example', 'Test', 'Generic', 'Placeholder'];
              const hasFallback = fallbackIndicators.some(indicator => svg.includes(indicator));
              
              if (hasFallback) {
                console.log(`      ❌ FALLBACK DETECTED: Generic labels found!`);
                testResults.quality.hasFallback = true;
                testResults.failures.push(`Step ${stepId}: Contains fallback/generic labels`);
              }
              
              // Save SVG for inspection
              const filename = `/tmp/test-step${stepId}-${TEST_TOPIC.replace(/\s+/g, '-').substring(0, 20)}.svg`;
              fs.writeFileSync(filename, svg);
              console.log(`      💾 Saved: ${filename}`);
              
              // Quality checks
              if (totalAnims === 0) {
                console.log(`      ❌ NO ANIMATIONS!`);
                testResults.failures.push(`Step ${stepId}: Zero animations generated`);
              } else {
                console.log(`      ✅ Has animations`);
              }
              
              if (stepData.labels < 5) {
                console.log(`      ⚠️  Low label count (${stepData.labels})`);
                testResults.warnings.push(`Step ${stepId}: Only ${stepData.labels} labels`);
              }
            } else if (action.op !== 'customSVG') {
              console.log(`      ⚠️  Unexpected operation: ${action.op}`);
              testResults.warnings.push(`Step ${stepId}: Non-SVG operation: ${action.op}`);
            }
          });
          
          testResults.stepsReceived.push(stepData);
          testResults.timing.steps[stepId] = elapsed;
          
          console.log('-'.repeat(80));
          
          // Check if all steps received
          if (stepCount >= expectedSteps) {
            allStepsReceived = true;
            console.log(`\n✅ ALL ${expectedSteps} STEPS RECEIVED\n`);
            
            // Wait a bit to ensure everything is processed
            setTimeout(() => {
              ws.close();
              resolve();
            }, 2000);
          }
        }
        
        if (message.type === 'error') {
          console.log(`\n❌ ERROR RECEIVED: ${message.data?.message || 'Unknown error'}`);
          testResults.failures.push(`Error: ${message.data?.message || 'Unknown'}`);
        }
      });
      
      ws.on('error', (err) => {
        console.error(`\n❌ WebSocket error: ${err.message}`);
        testResults.failures.push(`WebSocket error: ${err.message}`);
        ws.close();
        resolve();
      });
      
      ws.on('close', () => {
        if (!allStepsReceived && stepCount < expectedSteps) {
          console.log(`\n⚠️  WebSocket closed prematurely. Received ${stepCount}/${expectedSteps} steps`);
          testResults.failures.push(`Incomplete: Only ${stepCount}/${expectedSteps} steps received`);
        }
        resolve();
      });
      
      // Timeout after 3 minutes
      setTimeout(() => {
        if (!allStepsReceived) {
          console.log(`\n❌ TIMEOUT: Only received ${stepCount}/${expectedSteps} steps`);
          testResults.failures.push(`Timeout: Only ${stepCount}/${expectedSteps} steps`);
          ws.close();
          resolve();
        }
      }, 180000);
    });
    
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    testResults.failures.push(`Fatal error: ${error.message}`);
  }
}

async function generateFinalReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 STEP 4/4: GENERATING BRUTAL HONEST REPORT');
  console.log('='.repeat(80) + '\n');
  
  const totalTime = ((Date.now() - testResults.startTime) / 1000).toFixed(1);
  const stepsReceived = testResults.stepsReceived.length;
  
  console.log('⏱️  TIMING ANALYSIS:');
  console.log(`   Total time: ${totalTime}s`);
  console.log(`   Steps received: ${stepsReceived}`);
  if (stepsReceived > 0) {
    const avgTime = (totalTime / stepsReceived).toFixed(1);
    console.log(`   Average per step: ${avgTime}s`);
  }
  console.log('');
  
  console.log('🎬 ANIMATION ANALYSIS:');
  console.log(`   Total animations: ${testResults.animations.total}`);
  if (stepsReceived > 0) {
    const avgAnims = (testResults.animations.total / stepsReceived).toFixed(1);
    console.log(`   Average per step: ${avgAnims}`);
  }
  Object.entries(testResults.animations.byStep).forEach(([stepId, count]) => {
    const status = count > 0 ? '✅' : '❌';
    console.log(`   ${status} Step ${stepId}: ${count} animations`);
  });
  console.log('');
  
  console.log('📊 CONTENT QUALITY:');
  testResults.stepsReceived.forEach((step) => {
    console.log(`   Step ${step.stepId}:`);
    console.log(`      SVG: ${step.svgLength} chars`);
    console.log(`      Labels: ${step.labels}, Shapes: ${step.shapes}`);
    console.log(`      Animations: ${step.animations} ${step.hasAnimation ? '✅' : '❌'}`);
    if (step.contextualWords.length > 0) {
      console.log(`      Contextual: ✅ (${step.contextualWords.join(', ')})`);
    } else {
      console.log(`      Contextual: ⚠️  (no topic words detected)`);
    }
  });
  console.log('');
  
  console.log('⚠️  WARNINGS (' + testResults.warnings.length + '):');
  if (testResults.warnings.length === 0) {
    console.log('   ✅ No warnings');
  } else {
    testResults.warnings.forEach(w => console.log(`   - ${w}`));
  }
  console.log('');
  
  console.log('❌ FAILURES (' + testResults.failures.length + '):');
  if (testResults.failures.length === 0) {
    console.log('   ✅ No failures');
  } else {
    testResults.failures.forEach(f => console.log(`   - ${f}`));
  }
  console.log('');
  
  // QUALITY ASSESSMENT
  console.log('🎯 QUALITY ASSESSMENT:');
  
  const hasAllSteps = stepsReceived >= 3;
  const hasAnimations = testResults.animations.total > 0;
  const avgAnimsPerStep = stepsReceived > 0 ? testResults.animations.total / stepsReceived : 0;
  const hasGoodAnimations = avgAnimsPerStep >= 15;
  const noFallbacks = !testResults.quality.hasFallback;
  const noFailures = testResults.failures.length === 0;
  
  let score = 0;
  
  if (hasAllSteps) {
    console.log('   ✅ Delivery: All steps received (+20)');
    score += 20;
  } else {
    console.log(`   ❌ Delivery: Only ${stepsReceived} steps received (-20)`);
  }
  
  if (hasAnimations) {
    console.log('   ✅ Animations: Present (+20)');
    score += 20;
    
    if (hasGoodAnimations) {
      console.log('   ✅ Animation Quality: Good quantity (15+ per step) (+20)');
      score += 20;
    } else {
      console.log(`   ⚠️  Animation Quality: Low quantity (${avgAnimsPerStep.toFixed(1)} per step) (+10)`);
      score += 10;
    }
  } else {
    console.log('   ❌ Animations: NONE (-40)');
  }
  
  if (noFallbacks) {
    console.log('   ✅ No Fallbacks: True dynamic generation (+20)');
    score += 20;
  } else {
    console.log('   ❌ Fallbacks Detected: Generic labels present (-20)');
  }
  
  if (noFailures) {
    console.log('   ✅ Stability: No failures (+20)');
    score += 20;
  } else {
    console.log(`   ⚠️  Stability: ${testResults.failures.length} failures (+5)`);
    score += 5;
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log(`FINAL SCORE: ${score}/100`);
  
  if (score >= 90) {
    console.log('VERDICT: ✅ EXCELLENT - Production ready');
  } else if (score >= 75) {
    console.log('VERDICT: ✅ GOOD - Production ready with minor improvements');
  } else if (score >= 60) {
    console.log('VERDICT: ⚠️  ACCEPTABLE - Needs improvement');
  } else {
    console.log('VERDICT: ❌ POOR - Major issues, not production ready');
  }
  console.log('='.repeat(80) + '\n');
  
  // Save detailed report
  const reportPath = `/tmp/test-report-${TEST_TOPIC.replace(/\s+/g, '-').substring(0, 20)}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Detailed report saved: ${reportPath}\n`);
}

// Run the test
runComprehensiveTest()
  .then(generateFinalReport)
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
