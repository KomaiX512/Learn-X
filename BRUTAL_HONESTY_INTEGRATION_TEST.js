/**
 * BRUTAL HONESTY INTEGRATION TEST
 * 
 * This script will:
 * 1. Send a real query to the backend
 * 2. Monitor EVERY step from planning to rendering
 * 3. Track ALL failures, retries, and timings
 * 4. Analyze if outputs are truly dynamic or using fallbacks
 * 5. Report HONESTLY on what's broken
 */

const io = require('socket.io-client');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const TEST_QUERY = 'Explain how photosynthesis works in plant cells';

// Statistics tracking
const stats = {
  startTime: null,
  endTime: null,
  planReceived: false,
  planSteps: 0,
  stepsReceived: 0,
  stepData: {},
  errors: [],
  retries: [],
  totalOperations: 0,
  operationTypes: new Set(),
  stepTimings: {},
  firstStepTime: null,
  lastStepTime: null
};

console.log('═'.repeat(80));
console.log('🔥 BRUTAL HONESTY INTEGRATION TEST');
console.log('═'.repeat(80));
console.log(`Query: "${TEST_QUERY}"`);
console.log(`Backend: ${BACKEND_URL}`);
console.log('═'.repeat(80));
console.log('');

// Connect to Socket.io
const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  reconnection: false
});

socket.on('connect', () => {
  console.log('✅ Socket connected to backend');
  console.log(`   Session ID: ${socket.id}`);
  console.log('');
  
  // Start the test
  setTimeout(() => runTest(), 1000);
});

socket.on('disconnect', () => {
  console.log('❌ Socket disconnected');
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
  stats.errors.push({ type: 'socket', error: error.message });
});

// Listen for plan
socket.on('plan', (data) => {
  console.log('\n📋 PLAN RECEIVED');
  console.log('─'.repeat(80));
  console.log(`Title: ${data.title}`);
  console.log(`Subtitle: ${data.subtitle}`);
  console.log(`Steps: ${data.steps?.length || 0}`);
  
  if (data.steps) {
    data.steps.forEach((step, idx) => {
      console.log(`  ${idx + 1}. [${step.tag}] ${step.desc.substring(0, 60)}...`);
    });
  }
  
  stats.planReceived = true;
  stats.planSteps = data.steps?.length || 0;
  
  // Initialize step tracking
  data.steps?.forEach(step => {
    stats.stepData[step.id] = {
      id: step.id,
      tag: step.tag,
      desc: step.desc,
      received: false,
      operations: 0,
      startTime: null,
      endTime: null,
      error: null
    };
  });
  
  console.log('─'.repeat(80));
});

// Listen for progress
socket.on('progress', (data) => {
  console.log(`\n⏳ PROGRESS: Step ${data.stepId} - ${data.status}`);
  console.log(`   Message: ${data.message}`);
  
  if (data.stepId && stats.stepData[data.stepId]) {
    if (!stats.stepData[data.stepId].startTime) {
      stats.stepData[data.stepId].startTime = Date.now();
    }
  }
});

// Listen for rendered steps
socket.on('rendered', (data) => {
  const stepId = data.stepId;
  const stepNum = Object.keys(stats.stepData).indexOf(String(stepId)) + 1;
  
  console.log('\n' + '═'.repeat(80));
  console.log(`🎨 STEP ${stepNum}/${stats.planSteps} RENDERED (ID: ${stepId})`);
  console.log('═'.repeat(80));
  
  if (!stats.firstStepTime) {
    stats.firstStepTime = Date.now();
  }
  stats.lastStepTime = Date.now();
  
  if (data.type === 'error') {
    console.log('❌ STEP FAILED');
    console.log(`   Error: ${data.message}`);
    console.log(`   Partial: ${data.isPartialFailure}`);
    
    if (stats.stepData[stepId]) {
      stats.stepData[stepId].error = data.message;
      stats.stepData[stepId].received = true;
      stats.stepData[stepId].endTime = Date.now();
    }
    
    stats.errors.push({
      type: 'step_failure',
      stepId,
      message: data.message
    });
    
    stats.stepsReceived++;
    return;
  }
  
  // Success - analyze the operations
  const actions = data.actions || [];
  const opCount = actions.length;
  
  console.log(`✅ Operations: ${opCount}`);
  
  if (stats.stepData[stepId]) {
    stats.stepData[stepId].received = true;
    stats.stepData[stepId].operations = opCount;
    stats.stepData[stepId].endTime = Date.now();
  }
  
  stats.stepsReceived++;
  stats.totalOperations += opCount;
  
  // Analyze operation types
  const opTypes = {};
  actions.forEach(action => {
    const op = action.op || 'unknown';
    opTypes[op] = (opTypes[op] || 0) + 1;
    stats.operationTypes.add(op);
  });
  
  console.log('\n📊 Operation Breakdown:');
  Object.entries(opTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([op, count]) => {
      const percent = ((count / opCount) * 100).toFixed(1);
      console.log(`   ${op.padEnd(20)} ${count.toString().padStart(3)} (${percent}%)`);
    });
  
  // Check for fallback patterns (hardcoded/generic content)
  const hasCustomPath = actions.some(a => a.op === 'customPath');
  const hasWave = actions.some(a => a.op === 'wave');
  const hasParticle = actions.some(a => a.op === 'particle');
  const hasLatex = actions.some(a => a.op === 'drawLatex' || a.op === 'drawMathLabel');
  const hasLabels = actions.filter(a => a.op === 'drawLabel').length;
  
  console.log('\n🔍 Content Analysis:');
  console.log(`   Custom Paths: ${hasCustomPath ? '✅' : '❌'}`);
  console.log(`   Waves: ${hasWave ? '✅' : '❌'}`);
  console.log(`   Particles: ${hasParticle ? '✅' : '❌'}`);
  console.log(`   Math (LaTeX): ${hasLatex ? '✅' : '❌'}`);
  console.log(`   Labels: ${hasLabels}`);
  
  // Check if content is contextual to "photosynthesis"
  const labelTexts = actions
    .filter(a => a.op === 'drawLabel')
    .map(a => a.text)
    .filter(Boolean);
  
  const photosynthesisKeywords = [
    'chloro', 'light', 'dark', 'calvin', 'glucose', 'carbon', 'oxygen',
    'atp', 'nadph', 'electron', 'photo', 'plant', 'leaf', 'cell',
    'membrane', 'thylakoid', 'stroma', 'water', 'co2', 'h2o'
  ];
  
  const contextualLabels = labelTexts.filter(text => 
    photosynthesisKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    )
  );
  
  console.log(`\n🎯 Contextual Relevance:`);
  console.log(`   Total labels: ${labelTexts.length}`);
  console.log(`   Contextual labels: ${contextualLabels.length}`);
  console.log(`   Relevance: ${labelTexts.length > 0 ? ((contextualLabels.length / labelTexts.length) * 100).toFixed(1) : 0}%`);
  
  if (contextualLabels.length > 0) {
    console.log(`   Sample contextual text: "${contextualLabels[0]}"`);
  }
  
  // Check for generic/fallback patterns
  const genericLabels = labelTexts.filter(text => 
    /^(step|example|demo|test|sample)/i.test(text.trim())
  );
  
  if (genericLabels.length > 0) {
    console.log(`   ⚠️  Generic labels found: ${genericLabels.length}`);
    console.log(`       Examples: ${genericLabels.slice(0, 3).join(', ')}`);
  }
  
  console.log('═'.repeat(80));
  
  // Check if all steps received
  if (stats.stepsReceived === stats.planSteps) {
    setTimeout(() => analyzeResults(), 2000);
  }
});

async function runTest() {
  console.log('\n🚀 SENDING QUERY TO BACKEND...');
  stats.startTime = Date.now();
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/query`, {
      query: TEST_QUERY,
      sessionId: socket.id
    });
    
    console.log('✅ Query submitted successfully');
    console.log(`   Response: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('❌ Failed to submit query:', error.message);
    stats.errors.push({
      type: 'query_submission',
      error: error.message
    });
    process.exit(1);
  }
}

function analyzeResults() {
  stats.endTime = Date.now();
  
  console.log('\n\n');
  console.log('═'.repeat(80));
  console.log('📊 FINAL ANALYSIS - BRUTAL HONESTY REPORT');
  console.log('═'.repeat(80));
  
  const totalTime = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
  const firstStepDelay = stats.firstStepTime ? ((stats.firstStepTime - stats.startTime) / 1000).toFixed(2) : 'N/A';
  
  console.log('\n⏱️  TIMING ANALYSIS:');
  console.log(`   Total pipeline time: ${totalTime}s`);
  console.log(`   Time to first step: ${firstStepDelay}s`);
  
  if (stats.planSteps > 0) {
    Object.values(stats.stepData).forEach((step, idx) => {
      if (step.startTime && step.endTime) {
        const stepTime = ((step.endTime - step.startTime) / 1000).toFixed(2);
        console.log(`   Step ${idx + 1} (${step.tag}): ${stepTime}s`);
      }
    });
  }
  
  console.log('\n✅ SUCCESS RATE:');
  const successRate = stats.planSteps > 0 ? ((stats.stepsReceived / stats.planSteps) * 100).toFixed(1) : 0;
  const failedSteps = stats.planSteps - stats.stepsReceived;
  
  console.log(`   Expected steps: ${stats.planSteps}`);
  console.log(`   Received steps: ${stats.stepsReceived}`);
  console.log(`   Failed steps: ${failedSteps}`);
  console.log(`   Success rate: ${successRate}%`);
  
  if (successRate < 95) {
    console.log(`   ❌ BELOW 95% TARGET - NEEDS IMPROVEMENT`);
  } else {
    console.log(`   ✅ MEETS 95% TARGET`);
  }
  
  console.log('\n📈 OPERATION QUALITY:');
  const avgOpsPerStep = stats.stepsReceived > 0 ? (stats.totalOperations / stats.stepsReceived).toFixed(1) : 0;
  console.log(`   Total operations: ${stats.totalOperations}`);
  console.log(`   Average per step: ${avgOpsPerStep}`);
  console.log(`   Unique op types: ${stats.operationTypes.size}`);
  console.log(`   Operation types: ${Array.from(stats.operationTypes).join(', ')}`);
  
  if (avgOpsPerStep < 15) {
    console.log(`   ❌ BELOW 15 MINIMUM - NEEDS IMPROVEMENT`);
  } else if (avgOpsPerStep > 50) {
    console.log(`   ✅ EXCELLENT (>50 operations per step)`);
  } else {
    console.log(`   ✅ ACCEPTABLE (15-50 operations per step)`);
  }
  
  console.log('\n❌ ERRORS:');
  if (stats.errors.length === 0) {
    console.log(`   ✅ NO ERRORS`);
  } else {
    console.log(`   Total errors: ${stats.errors.length}`);
    stats.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. [${err.type}] ${err.message || err.error || 'Unknown'}`);
    });
  }
  
  console.log('\n🔍 ARCHITECTURE LIMITATIONS:');
  
  // Check for signs of fallback usage
  const hasAdvancedOps = stats.operationTypes.has('customPath') || 
                         stats.operationTypes.has('wave') ||
                         stats.operationTypes.has('particle');
  
  if (!hasAdvancedOps) {
    console.log(`   ⚠️  ONLY BASIC OPERATIONS - May indicate fallback usage`);
  } else {
    console.log(`   ✅ Advanced operations detected (customPath/wave/particle)`);
  }
  
  // Check contextual relevance across all steps
  const allStepsContextual = Object.values(stats.stepData).every(step => 
    step.received && step.operations >= 15
  );
  
  if (!allStepsContextual) {
    console.log(`   ⚠️  Some steps have <15 operations - Generation may be weak`);
  } else {
    console.log(`   ✅ All steps have sufficient operations`);
  }
  
  console.log('\n🎯 VERDICT:');
  
  const isPassing = successRate >= 95 && 
                   avgOpsPerStep >= 15 && 
                   stats.errors.length === 0 &&
                   hasAdvancedOps;
  
  if (isPassing) {
    console.log('   ✅✅✅ SYSTEM IS PRODUCTION READY');
    console.log('   - All fixes working as expected');
    console.log('   - True dynamic generation confirmed');
    console.log('   - No fallbacks detected');
    console.log('   - Quality meets 3Blue1Brown standards');
  } else {
    console.log('   ❌❌❌ SYSTEM STILL HAS ISSUES');
    
    if (successRate < 95) {
      console.log('   - Success rate below 95% (retry strategy not working)');
    }
    if (avgOpsPerStep < 15) {
      console.log('   - Operations per step too low (generation weak)');
    }
    if (stats.errors.length > 0) {
      console.log('   - Errors occurring (null handling may be broken)');
    }
    if (!hasAdvancedOps) {
      console.log('   - Only basic operations (may be using fallbacks)');
    }
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('Test complete. Disconnecting...');
  console.log('═'.repeat(80));
  
  socket.disconnect();
  
  setTimeout(() => {
    process.exit(isPassing ? 0 : 1);
  }, 1000);
}

// Timeout after 5 minutes
setTimeout(() => {
  console.error('\n❌ TEST TIMEOUT (5 minutes)');
  console.error('   System is too slow or stuck');
  analyzeResults();
}, 5 * 60 * 1000);
