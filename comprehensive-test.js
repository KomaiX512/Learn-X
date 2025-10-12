/**
 * COMPREHENSIVE END-TO-END TEST
 * 
 * This test will:
 * 1. Connect to backend WebSocket
 * 2. Submit a real query
 * 3. Monitor ALL events (plan, progress, rendered)
 * 4. Track timing for each step
 * 5. Analyze animations and visual quality
 * 6. Report brutally honest results
 */

const io = require('socket.io-client');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:8000';
const TEST_QUERY = 'Explain how neural networks learn through backpropagation at a deep mathematical level';

// Test results tracking
const testResults = {
  sessionId: null,
  startTime: null,
  planReceived: false,
  planTime: null,
  stepsReceived: [],
  stepTimings: {},
  stepDetails: {},
  errors: [],
  warnings: [],
  totalSteps: 0,
  successfulSteps: 0,
  failedSteps: 0
};

console.log('═'.repeat(80));
console.log('🧪 COMPREHENSIVE PRODUCTION READINESS TEST');
console.log('═'.repeat(80));
console.log(`Query: "${TEST_QUERY}"`);
console.log(`Backend: ${BACKEND_URL}`);
console.log('═'.repeat(80));
console.log('');

async function runTest() {
  return new Promise((resolve) => {
    testResults.startTime = Date.now();
    
    // Generate session ID
    const sessionId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    testResults.sessionId = sessionId;
    
    console.log(`📋 Session ID: ${sessionId}`);
    console.log('');
    
    // Connect to WebSocket
    console.log('🔌 Connecting to WebSocket...');
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: false
    });
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected, socket ID:', socket.id);
      console.log('');
      
      // Join session room
      console.log(`🚪 Joining session room: ${sessionId}`);
      socket.emit('join', { sessionId });
    });
    
    socket.on('joined', (data) => {
      console.log('✅ Joined room confirmed:', data.sessionId);
      console.log('');
      
      // Submit query
      console.log('📤 Submitting query to backend...');
      axios.post(`${BACKEND_URL}/api/query`, {
        query: TEST_QUERY,
        sessionId: sessionId
      }).then((response) => {
        console.log('✅ Query submitted successfully');
        console.log('Response:', response.data);
        console.log('');
        console.log('⏳ Waiting for plan and step generations...');
        console.log('');
      }).catch((error) => {
        console.error('❌ Failed to submit query:', error.message);
        testResults.errors.push(`Query submission failed: ${error.message}`);
      });
    });
    
    // Listen for plan
    socket.on('plan', (data) => {
      const planTime = Date.now() - testResults.startTime;
      testResults.planReceived = true;
      testResults.planTime = planTime;
      testResults.totalSteps = data.steps?.length || 0;
      
      console.log('═'.repeat(80));
      console.log('📋 PLAN RECEIVED');
      console.log('═'.repeat(80));
      console.log(`Time: ${planTime}ms (${(planTime / 1000).toFixed(2)}s)`);
      console.log(`Title: ${data.title}`);
      console.log(`Subtitle: ${data.subtitle}`);
      console.log(`Total Steps: ${testResults.totalSteps}`);
      console.log('Table of Contents:');
      (data.toc || []).forEach((item, idx) => {
        console.log(`  ${idx + 1}. Minute ${item.minute}: ${item.title}`);
        if (item.summary) console.log(`     ${item.summary}`);
      });
      console.log('═'.repeat(80));
      console.log('');
    });
    
    // Listen for progress updates
    socket.on('progress', (data) => {
      console.log(`📊 Progress: Step ${data.stepId} - ${data.status} - ${data.message || ''}`);
    });
    
    socket.on('generation_progress', (data) => {
      console.log(`⚡ Generation: ${data.completedSteps}/${data.totalSteps} (${data.progress}%) - ${data.message}`);
    });
    
    // Listen for rendered events (THE CRITICAL ONE)
    socket.on('rendered', (event) => {
      const stepId = event.stepId || event.step?.id;
      const receiveTime = Date.now() - testResults.startTime;
      
      if (!testResults.stepsReceived.includes(stepId)) {
        testResults.stepsReceived.push(stepId);
      }
      
      testResults.stepTimings[stepId] = receiveTime;
      
      console.log('');
      console.log('═'.repeat(80));
      console.log(`✅ STEP ${stepId} RENDERED`);
      console.log('═'.repeat(80));
      console.log(`Time: ${receiveTime}ms (${(receiveTime / 1000).toFixed(2)}s from start)`);
      console.log(`Step Description: ${event.step?.desc?.slice(0, 100)}...`);
      console.log(`Actions Count: ${event.actions?.length || 0}`);
      
      // CRITICAL ANALYSIS: Analyze the actions
      if (event.actions && event.actions.length > 0) {
        console.log('');
        console.log('🔍 ACTION ANALYSIS:');
        console.log('─'.repeat(80));
        
        const actionTypes = {};
        let hasCustomSVG = false;
        let hasFallback = false;
        let hasPlaceholder = false;
        let svgDetails = null;
        
        event.actions.forEach((action, idx) => {
          actionTypes[action.op] = (actionTypes[action.op] || 0) + 1;
          
          if (action.op === 'customSVG') {
            hasCustomSVG = true;
            const svgCode = action.svgCode || '';
            const svgLength = svgCode.length;
            const hasAnimations = svgCode.includes('<animate') || svgCode.includes('animateTransform') || svgCode.includes('animateMotion');
            const animateCount = (svgCode.match(/<animate/g) || []).length;
            const animateTransformCount = (svgCode.match(/<animateTransform/g) || []).length;
            const animateMotionCount = (svgCode.match(/<animateMotion/g) || []).length;
            const totalAnimations = animateCount + animateTransformCount + animateMotionCount;
            
            svgDetails = {
              length: svgLength,
              hasAnimations,
              animateCount,
              animateTransformCount,
              animateMotionCount,
              totalAnimations
            };
            
            console.log(`  Action ${idx + 1}: customSVG`);
            console.log(`    ├─ SVG Length: ${svgLength} characters`);
            console.log(`    ├─ Animations: ${totalAnimations} total`);
            console.log(`    │  ├─ <animate>: ${animateCount}`);
            console.log(`    │  ├─ <animateTransform>: ${animateTransformCount}`);
            console.log(`    │  └─ <animateMotion>: ${animateMotionCount}`);
            console.log(`    └─ Quality: ${hasAnimations ? '✅ ANIMATED' : '⚠️ STATIC ONLY'}`);
          } else {
            console.log(`  Action ${idx + 1}: ${action.op}`);
            
            // Check for fallback patterns
            if (action.op.includes('placeholder') || action.op.includes('Placeholder')) {
              hasPlaceholder = true;
              console.log(`    └─ ⚠️ WARNING: PLACEHOLDER DETECTED`);
            }
            if (action.op.includes('fallback') || action.op.includes('Fallback')) {
              hasFallback = true;
              console.log(`    └─ ⚠️ WARNING: FALLBACK DETECTED`);
            }
          }
        });
        
        console.log('');
        console.log('📊 ACTION SUMMARY:');
        Object.entries(actionTypes).forEach(([op, count]) => {
          console.log(`  ${op}: ${count}`);
        });
        
        // QUALITY ASSESSMENT
        console.log('');
        console.log('🎯 QUALITY ASSESSMENT:');
        console.log('─'.repeat(80));
        
        if (hasCustomSVG && svgDetails) {
          console.log(`✅ Uses customSVG: TRUE`);
          console.log(`${svgDetails.hasAnimations ? '✅' : '❌'} Has Animations: ${svgDetails.hasAnimations}`);
          console.log(`${svgDetails.totalAnimations >= 3 ? '✅' : '⚠️'} Animation Count: ${svgDetails.totalAnimations} ${svgDetails.totalAnimations >= 3 ? '(GOOD)' : '(LOW)'}`);
          console.log(`${svgDetails.length >= 1000 ? '✅' : '⚠️'} SVG Complexity: ${svgDetails.length} chars ${svgDetails.length >= 1000 ? '(DETAILED)' : '(SIMPLE)'}`);
          
          testResults.stepDetails[stepId] = {
            hasCustomSVG: true,
            svgLength: svgDetails.length,
            animations: svgDetails.totalAnimations,
            quality: svgDetails.hasAnimations && svgDetails.totalAnimations >= 3 ? 'HIGH' : 'MEDIUM'
          };
          testResults.successfulSteps++;
        } else {
          console.log('❌ No customSVG: Using basic operations only');
          console.log('⚠️ This suggests fallback to simple rendering');
          testResults.stepDetails[stepId] = {
            hasCustomSVG: false,
            quality: 'LOW'
          };
          testResults.warnings.push(`Step ${stepId}: No customSVG, using basic operations`);
        }
        
        if (hasFallback) {
          console.log('❌ FALLBACK DETECTED: System using fallback mechanisms');
          testResults.warnings.push(`Step ${stepId}: Fallback mechanism detected`);
        }
        
        if (hasPlaceholder) {
          console.log('❌ PLACEHOLDER DETECTED: Not fully implemented');
          testResults.errors.push(`Step ${stepId}: Placeholder content detected`);
        }
        
        if (!hasFallback && !hasPlaceholder && hasCustomSVG && svgDetails.hasAnimations) {
          console.log('✅ TRUE GENERATION: No fallbacks, fully dynamic');
        }
      } else {
        console.log('❌ NO ACTIONS: Step has no visual content');
        testResults.errors.push(`Step ${stepId}: No actions received`);
        testResults.failedSteps++;
      }
      
      console.log('═'.repeat(80));
      console.log('');
      
      // Check if all steps received
      if (testResults.stepsReceived.length === testResults.totalSteps && testResults.totalSteps > 0) {
        console.log('');
        console.log('🎉 ALL STEPS RECEIVED - Test Complete');
        console.log('');
        setTimeout(() => {
          socket.disconnect();
          printFinalReport();
          resolve(testResults);
        }, 2000);
      }
    });
    
    // Error handling
    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      testResults.errors.push(`Connection error: ${error.message}`);
    });
    
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      testResults.errors.push(`Socket error: ${error}`);
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      console.log('');
      console.log('⏰ TEST TIMEOUT (5 minutes)');
      console.log('');
      socket.disconnect();
      printFinalReport();
      resolve(testResults);
    }, 300000);
  });
}

function printFinalReport() {
  const totalTime = Date.now() - testResults.startTime;
  
  console.log('');
  console.log('═'.repeat(80));
  console.log('📊 FINAL TEST REPORT');
  console.log('═'.repeat(80));
  console.log('');
  
  console.log('⏱️  TIMING:');
  console.log(`  Total Duration: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`  Plan Generation: ${testResults.planTime}ms (${(testResults.planTime / 1000).toFixed(2)}s)`);
  console.log('');
  
  console.log('📋 PLAN STATUS:');
  console.log(`  Received: ${testResults.planReceived ? '✅ YES' : '❌ NO'}`);
  console.log(`  Expected Steps: ${testResults.totalSteps}`);
  console.log('');
  
  console.log('🎬 STEP GENERATION:');
  console.log(`  Steps Received: ${testResults.stepsReceived.length}/${testResults.totalSteps}`);
  console.log(`  Successful: ${testResults.successfulSteps}`);
  console.log(`  Failed: ${testResults.failedSteps}`);
  console.log(`  Success Rate: ${testResults.totalSteps > 0 ? ((testResults.successfulSteps / testResults.totalSteps) * 100).toFixed(1) : 0}%`);
  console.log('');
  
  if (testResults.stepsReceived.length > 0) {
    console.log('📊 STEP DETAILS:');
    testResults.stepsReceived.forEach(stepId => {
      const timing = testResults.stepTimings[stepId];
      const details = testResults.stepDetails[stepId] || {};
      console.log(`  Step ${stepId}:`);
      console.log(`    Time: ${timing}ms (${(timing / 1000).toFixed(2)}s)`);
      console.log(`    Custom SVG: ${details.hasCustomSVG ? '✅' : '❌'}`);
      if (details.hasCustomSVG) {
        console.log(`    SVG Length: ${details.svgLength} chars`);
        console.log(`    Animations: ${details.animations}`);
      }
      console.log(`    Quality: ${details.quality || 'UNKNOWN'}`);
    });
    console.log('');
  }
  
  console.log('🎯 QUALITY METRICS:');
  const highQuality = Object.values(testResults.stepDetails).filter(d => d.quality === 'HIGH').length;
  const mediumQuality = Object.values(testResults.stepDetails).filter(d => d.quality === 'MEDIUM').length;
  const lowQuality = Object.values(testResults.stepDetails).filter(d => d.quality === 'LOW').length;
  console.log(`  High Quality: ${highQuality}`);
  console.log(`  Medium Quality: ${mediumQuality}`);
  console.log(`  Low Quality: ${lowQuality}`);
  console.log('');
  
  if (testResults.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    testResults.warnings.forEach(w => console.log(`  - ${w}`));
    console.log('');
  }
  
  if (testResults.errors.length > 0) {
    console.log('❌ ERRORS:');
    testResults.errors.forEach(e => console.log(`  - ${e}`));
    console.log('');
  }
  
  console.log('═'.repeat(80));
  console.log('🏁 BRUTAL HONESTY ASSESSMENT:');
  console.log('═'.repeat(80));
  
  // Calculate overall score
  const planScore = testResults.planReceived ? 20 : 0;
  const stepCompletionScore = testResults.totalSteps > 0 ? 
    (testResults.successfulSteps / testResults.totalSteps) * 40 : 0;
  const qualityScore = testResults.successfulSteps > 0 ?
    (highQuality / testResults.successfulSteps) * 40 : 0;
  const totalScore = planScore + stepCompletionScore + qualityScore;
  
  console.log(`Overall Score: ${totalScore.toFixed(1)}/100`);
  console.log('');
  
  if (totalScore >= 90) {
    console.log('✅ PRODUCTION READY: System is performing excellently');
  } else if (totalScore >= 70) {
    console.log('⚠️  NEEDS IMPROVEMENT: System works but has quality issues');
  } else if (totalScore >= 50) {
    console.log('❌ SIGNIFICANT ISSUES: System has major problems');
  } else {
    console.log('🚨 CRITICAL FAILURE: System is not functional');
  }
  
  console.log('');
  console.log('DETAILED ANALYSIS:');
  
  if (!testResults.planReceived) {
    console.log('❌ Plan generation failed - This is a critical issue');
  }
  
  if (testResults.stepsReceived.length < testResults.totalSteps) {
    console.log(`❌ Missing ${testResults.totalSteps - testResults.stepsReceived.length} steps - Not all content delivered`);
  }
  
  if (lowQuality > 0) {
    console.log(`❌ ${lowQuality} low-quality steps detected - Using fallback rendering`);
  }
  
  if (testResults.errors.length > 0) {
    console.log(`❌ ${testResults.errors.length} errors encountered - System stability issues`);
  }
  
  const avgAnimations = Object.values(testResults.stepDetails)
    .filter(d => d.hasCustomSVG)
    .reduce((sum, d) => sum + (d.animations || 0), 0) / 
    Object.values(testResults.stepDetails).filter(d => d.hasCustomSVG).length;
  
  if (avgAnimations < 3) {
    console.log(`⚠️  Low animation count (avg: ${avgAnimations.toFixed(1)}) - Content may be too static`);
  } else {
    console.log(`✅ Good animation count (avg: ${avgAnimations.toFixed(1)}) - Content is dynamic`);
  }
  
  console.log('');
  console.log('═'.repeat(80));
}

// Run the test
runTest().then((results) => {
  console.log('');
  console.log('Test completed. Results saved to memory.');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
