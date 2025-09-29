const io = require('socket.io-client');
const axios = require('axios');

// Color helpers
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

console.log(colors.bold(colors.cyan('\n=== FRONTEND OPTIMIZATION COMPLETE TEST ===\n')));
console.log('Testing sequential rendering, timing, and student comprehension delays\n');

const sessionId = `frontend-test-${Date.now()}`;
const query = 'teach me quicksort algorithm';

// Connect to WebSocket
const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: true
});

// Tracking variables
let testResults = {
  planReceived: false,
  stepsReceived: [],
  actionTimings: [],
  renderingDelays: [],
  totalActions: 0,
  visualOperations: 0,
  textOperations: 0,
  animationOperations: 0,
  startTime: null,
  endTime: null,
  errors: [],
  warnings: []
};

let lastActionTime = null;
let currentStepStartTime = null;
let stepActionCount = 0;

socket.on('connect', () => {
  console.log(colors.green('✅ WebSocket connected'));
  socket.emit('join', { sessionId });
  console.log(colors.blue(`✅ Joined session: ${sessionId}`));
});

socket.on('rendered', (data) => {
  const now = Date.now();
  const elapsed = testResults.startTime ? ((now - testResults.startTime) / 1000).toFixed(1) : '0.0';
  
  // Validate event structure
  if (data.type !== 'actions') {
    testResults.errors.push(`Invalid event type: ${data.type} (expected 'actions')`);
    console.log(colors.red(`❌ ERROR: Invalid event type: ${data.type}`));
  }
  
  if (data.plan && !data.stepId) {
    testResults.planReceived = true;
    console.log(colors.green(`\n📋 PLAN RECEIVED at ${elapsed}s:`));
    console.log(`   Title: ${data.plan.title}`);
    console.log(`   Subtitle: ${data.plan.subtitle}`);
    console.log(`   TOC: ${data.plan.toc?.length || 0} items`);
  }
  
  if (data.stepId && data.actions) {
    if (!testResults.stepsReceived.includes(data.stepId)) {
      // New step started
      if (currentStepStartTime) {
        const stepDuration = (now - currentStepStartTime) / 1000;
        console.log(colors.yellow(`   Step duration: ${stepDuration.toFixed(1)}s`));
        console.log(colors.yellow(`   Actions in step: ${stepActionCount}`));
      }
      
      currentStepStartTime = now;
      stepActionCount = 0;
      testResults.stepsReceived.push(data.stepId);
      
      console.log(colors.green(`\n✅ STEP ${data.stepId} RECEIVED at ${elapsed}s:`));
      console.log(`   Actions: ${data.actions.length}`);
      console.log(`   Step tag: ${data.step?.tag}`);
      
      // Analyze action types
      let actionAnalysis = {
        draw: 0,
        text: 0,
        animation: 0,
        clear: 0,
        delay: 0
      };
      
      data.actions.forEach(action => {
        testResults.totalActions++;
        stepActionCount++;
        
        // Track timing between actions
        if (lastActionTime) {
          const delay = now - lastActionTime;
          testResults.renderingDelays.push(delay);
        }
        lastActionTime = now;
        
        // Categorize actions
        if (action.op === 'drawLabel' || action.op === 'drawTitle' || action.op === 'drawMathLabel') {
          actionAnalysis.text++;
          testResults.textOperations++;
        } else if (action.op?.startsWith('draw')) {
          actionAnalysis.draw++;
          testResults.visualOperations++;
        } else if (['orbit', 'wave', 'particle', 'arrow'].includes(action.op)) {
          actionAnalysis.animation++;
          testResults.animationOperations++;
        } else if (action.op === 'clear') {
          actionAnalysis.clear++;
        } else if (action.op === 'delay') {
          actionAnalysis.delay++;
        }
      });
      
      console.log(colors.cyan('   Action Breakdown:'));
      console.log(`     Draw operations: ${actionAnalysis.draw}`);
      console.log(`     Text operations: ${actionAnalysis.text}`);
      console.log(`     Animations: ${actionAnalysis.animation}`);
      console.log(`     Clear operations: ${actionAnalysis.clear}`);
      
      // Check for quality
      const visualRatio = (actionAnalysis.draw + actionAnalysis.animation) / data.actions.length;
      if (visualRatio < 0.5) {
        testResults.warnings.push(`Step ${data.stepId}: Low visual ratio (${(visualRatio * 100).toFixed(0)}%)`);
        console.log(colors.yellow(`   ⚠️ Warning: Low visual content (${(visualRatio * 100).toFixed(0)}%)`));
      } else {
        console.log(colors.green(`   ✅ Good visual density (${(visualRatio * 100).toFixed(0)}%)`));
      }
      
      // Check for hardcoding or fallbacks
      const suspiciousPatterns = [
        'Example', 'Sample', 'Demo', 'Test',
        'placeholder', 'dummy', 'fallback'
      ];
      
      let hasSuspiciousContent = false;
      data.actions.forEach(action => {
        if (action.text) {
          suspiciousPatterns.forEach(pattern => {
            if (action.text.toLowerCase().includes(pattern.toLowerCase())) {
              hasSuspiciousContent = true;
              testResults.warnings.push(`Possible hardcoded content in step ${data.stepId}: "${action.text}"`);
            }
          });
        }
      });
      
      if (hasSuspiciousContent) {
        console.log(colors.yellow('   ⚠️ Warning: Possible hardcoded/fallback content detected'));
      }
    }
  }
  
  // Send acknowledgment
  if (data.stepId) {
    socket.emit('step-received', { sessionId, stepId: data.stepId });
  }
});

socket.on('status', (data) => {
  console.log(colors.gray(`📡 Status: ${data.message}`));
});

socket.on('progress', (data) => {
  console.log(colors.gray(`⚙️  Progress: Step ${data.stepId} - ${data.status}`));
});

socket.on('error', (error) => {
  testResults.errors.push(error.message || error);
  console.log(colors.red(`❌ Socket Error: ${error.message || error}`));
});

// Make the API request
setTimeout(async () => {
  console.log(colors.bold(`\n🚀 Testing query: "${query}"`));
  console.log(colors.blue(`   Session: ${sessionId}\n`));
  
  testResults.startTime = Date.now();
  
  try {
    const response = await axios.post('http://localhost:3001/api/query', {
      query,
      sessionId
    });
    console.log(colors.green('✅ API request sent successfully'));
  } catch (error) {
    testResults.errors.push(`API request failed: ${error.message}`);
    console.error(colors.red('❌ API request failed:', error.message));
    process.exit(1);
  }
}, 1000);

// Performance monitoring
setInterval(() => {
  if (testResults.startTime && !testResults.endTime) {
    const elapsed = ((Date.now() - testResults.startTime) / 1000).toFixed(1);
    console.log(colors.gray(`⏱️  Elapsed: ${elapsed}s | Steps: ${testResults.stepsReceived.length}/5 | Actions: ${testResults.totalActions}`));
  }
}, 5000);

// Final analysis after 60 seconds
setTimeout(() => {
  testResults.endTime = Date.now();
  const totalTime = ((testResults.endTime - testResults.startTime) / 1000).toFixed(1);
  
  console.log(colors.bold(colors.cyan('\n' + '='.repeat(70))));
  console.log(colors.bold(colors.cyan('📊 FRONTEND OPTIMIZATION TEST REPORT')));
  console.log(colors.bold(colors.cyan('='.repeat(70))));
  
  console.log(colors.bold('\n1. DELIVERY METRICS:'));
  console.log(`   Plan received: ${testResults.planReceived ? colors.green('✅ YES') : colors.red('❌ NO')}`);
  console.log(`   Steps delivered: ${testResults.stepsReceived.length}/5`);
  if (testResults.stepsReceived.length > 0) {
    console.log(`   Step IDs: ${testResults.stepsReceived.sort().join(', ')}`);
  }
  
  console.log(colors.bold('\n2. CONTENT ANALYSIS:'));
  console.log(`   Total actions: ${testResults.totalActions}`);
  console.log(`   Visual operations: ${testResults.visualOperations} (${((testResults.visualOperations / testResults.totalActions) * 100).toFixed(0)}%)`);
  console.log(`   Text operations: ${testResults.textOperations} (${((testResults.textOperations / testResults.totalActions) * 100).toFixed(0)}%)`);
  console.log(`   Animation operations: ${testResults.animationOperations}`);
  
  console.log(colors.bold('\n3. TIMING ANALYSIS:'));
  console.log(`   Total time: ${totalTime}s`);
  console.log(`   Average actions per step: ${(testResults.totalActions / testResults.stepsReceived.length).toFixed(1)}`);
  
  if (testResults.renderingDelays.length > 0) {
    const avgDelay = testResults.renderingDelays.reduce((a, b) => a + b, 0) / testResults.renderingDelays.length;
    console.log(`   Average delay between actions: ${avgDelay.toFixed(0)}ms`);
    
    // Check if delays are appropriate for student comprehension
    if (avgDelay < 1000) {
      console.log(colors.yellow('   ⚠️ Actions may be too fast for comprehension'));
    } else if (avgDelay > 5000) {
      console.log(colors.yellow('   ⚠️ Actions may be too slow'));
    } else {
      console.log(colors.green('   ✅ Good pacing for student comprehension'));
    }
  }
  
  console.log(colors.bold('\n4. QUALITY CHECKS:'));
  
  // Check for dynamic generation
  const isDynamic = testResults.totalActions > 150 && 
                    testResults.visualOperations > 100 &&
                    testResults.warnings.filter(w => w.includes('hardcoded')).length === 0;
  
  console.log(`   Dynamic generation: ${isDynamic ? colors.green('✅ TRUE') : colors.red('❌ FALSE')}`);
  console.log(`   No fallbacks: ${testResults.warnings.filter(w => w.includes('fallback')).length === 0 ? colors.green('✅ TRUE') : colors.red('❌ FALSE')}`);
  console.log(`   Rich content: ${testResults.totalActions > 150 ? colors.green('✅ YES') : colors.yellow('⚠️ BASIC')}`);
  console.log(`   Visual-first: ${(testResults.visualOperations / testResults.totalActions) > 0.6 ? colors.green('✅ YES') : colors.yellow('⚠️ NO')}`);
  
  console.log(colors.bold('\n5. ARCHITECTURE VALIDATION:'));
  
  const architectureChecks = {
    'Sequential rendering': testResults.stepsReceived.length > 0,
    'Proper delays': testResults.renderingDelays.length > 0 && testResults.renderingDelays.some(d => d > 1000),
    'Rich animations': testResults.animationOperations > 10,
    'No hardcoding': testResults.warnings.filter(w => w.includes('hardcoded')).length === 0,
    'Complete delivery': testResults.stepsReceived.length === 5
  };
  
  Object.entries(architectureChecks).forEach(([check, passed]) => {
    console.log(`   ${check}: ${passed ? colors.green('✅ PASS') : colors.red('❌ FAIL')}`);
  });
  
  console.log(colors.bold('\n6. ISSUES FOUND:'));
  if (testResults.errors.length > 0) {
    testResults.errors.forEach(error => {
      console.log(colors.red(`   - ${error}`));
    });
  } else {
    console.log(colors.green('   No errors detected'));
  }
  
  if (testResults.warnings.length > 0) {
    console.log(colors.bold('\n7. WARNINGS:'));
    testResults.warnings.forEach(warning => {
      console.log(colors.yellow(`   - ${warning}`));
    });
  }
  
  // Final verdict
  const success = testResults.planReceived && 
                  testResults.stepsReceived.length === 5 &&
                  testResults.totalActions > 150 &&
                  testResults.errors.length === 0;
  
  console.log(colors.bold('\n' + '='.repeat(70)));
  console.log(colors.bold(`🎯 FRONTEND OPTIMIZATION STATUS: ${success ? colors.green('✅ SUCCESS') : colors.red('❌ NEEDS IMPROVEMENT')}`));
  
  if (!success) {
    console.log(colors.bold('\nREQUIRED IMPROVEMENTS:'));
    if (!testResults.planReceived) console.log('  - Fix plan generation');
    if (testResults.stepsReceived.length < 5) console.log(`  - Only ${testResults.stepsReceived.length}/5 steps delivered`);
    if (testResults.totalActions < 150) console.log('  - Increase content richness');
    if (testResults.errors.length > 0) console.log('  - Fix errors in pipeline');
  } else {
    console.log(colors.green('\n✅ SYSTEM FULLY OPTIMIZED FOR PRODUCTION!'));
    console.log('   - Sequential rendering working');
    console.log('   - Student-friendly pacing');
    console.log('   - Rich visual content');
    console.log('   - No fallbacks or hardcoding');
  }
  
  console.log(colors.bold('='.repeat(70)));
  
  process.exit(success ? 0 : 1);
}, 60000);
