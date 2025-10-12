#!/usr/bin/env node

/**
 * BRUTAL HONEST SYSTEM TEST
 * 
 * Tests the COMPLETE pipeline with NO MERCY:
 * 1. Send real query to backend
 * 2. Monitor WebSocket events
 * 3. Analyze ALL steps, visuals, animations
 * 4. Check for fallbacks, dummy content, hardcoding
 * 5. Report BRUTAL TRUTH about quality
 */

const io = require('socket.io-client');
const fs = require('fs');

const TEST_QUERY = "teach me about how DNA replication works at the molecular level";
const BACKEND_URL = "http://localhost:8000";

// Create detailed log file
const logFile = fs.createWriteStream('brutal-honest-test-results.log', { flags: 'w' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logFile.write(logMessage + '\n');
}

// Connect to backend
log('========================================');
log('BRUTAL HONEST SYSTEM TEST - STARTING');
log('========================================');
log(`Query: "${TEST_QUERY}"`);
log('');

const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  reconnection: false
});

const startTime = Date.now();
let planReceived = false;
let stepsReceived = [];
let errors = [];
let totalVisuals = 0;
let totalAnimations = 0;

// Analysis metrics
const metrics = {
  planTime: 0,
  stepTimes: [],
  visualCounts: [],
  animationCounts: [],
  failures: [],
  warnings: []
};

socket.on('connect', () => {
  log('✅ Connected to backend');
  log('Sending query...');
  
  socket.emit('query', {
    query: TEST_QUERY,
    sessionId: socket.id
  });
});

socket.on('rendered', (data) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (data.type === 'plan') {
    planReceived = true;
    metrics.planTime = elapsed;
    
    log('');
    log('═══════════════════════════════════════');
    log(`📋 PLAN RECEIVED (${elapsed}s)`);
    log('═══════════════════════════════════════');
    log(`Title: ${data.plan.title}`);
    log(`Subtitle: ${data.plan.subtitle}`);
    log(`Steps: ${data.plan.toc?.length || 0}`);
    
    if (data.plan.toc) {
      data.plan.toc.forEach((item, i) => {
        log(`  Step ${i + 1}: ${item.title}`);
      });
    }
    log('');
    
    // BRUTAL CHECK: Are we getting exactly 3 steps?
    if (data.plan.toc && data.plan.toc.length !== 3) {
      const warning = `⚠️ PROBLEM: Expected 3 steps, got ${data.plan.toc.length}`;
      log(warning);
      metrics.warnings.push(warning);
    } else {
      log('✅ CORRECT: 3 steps as expected');
    }
    
  } else if (data.type === 'actions' && data.actions) {
    const stepId = data.stepId || stepsReceived.length + 1;
    const stepTime = parseFloat(elapsed);
    metrics.stepTimes.push(stepTime);
    
    stepsReceived.push({
      stepId,
      stepTag: data.step?.tag,
      stepDesc: data.step?.desc,
      actionCount: data.actions.length,
      time: stepTime
    });
    
    log('');
    log('═══════════════════════════════════════');
    log(`📦 STEP ${stepId} RECEIVED (${elapsed}s)`);
    log('═══════════════════════════════════════');
    log(`Tag: ${data.step?.tag || 'unknown'}`);
    log(`Description: ${data.step?.desc?.substring(0, 80) || 'unknown'}...`);
    log(`Total Actions: ${data.actions.length}`);
    log('');
    
    // Analyze actions
    const actionTypes = {};
    let svgCount = 0;
    let animationCount = 0;
    let basicShapesCount = 0;
    let advancedOpsCount = 0;
    
    data.actions.forEach(action => {
      const op = action.op || 'unknown';
      actionTypes[op] = (actionTypes[op] || 0) + 1;
      
      // Count SVG visuals
      if (op === 'customSVG') {
        svgCount++;
        
        // Check if it's animated
        if (action.svgCode && (
          action.svgCode.includes('<animate') ||
          action.svgCode.includes('animateMotion') ||
          action.svgCode.includes('animateTransform')
        )) {
          animationCount++;
        }
      }
      
      // Basic shapes (potential dummy content)
      if (op === 'drawCircle' || op === 'drawRect') {
        basicShapesCount++;
      }
      
      // Advanced operations (good sign)
      if (op === 'drawGraph' || op === 'drawLatex' || op === 'customPath' || 
          op === 'drawVector' || op === 'drawDiagram') {
        advancedOpsCount++;
      }
    });
    
    metrics.visualCounts.push(svgCount);
    metrics.animationCounts.push(animationCount);
    totalVisuals += svgCount;
    totalAnimations += animationCount;
    
    log('Action Breakdown:');
    Object.entries(actionTypes).forEach(([op, count]) => {
      log(`  ${op}: ${count}`);
    });
    log('');
    
    log(`📊 Visual Analysis:`);
    log(`  Total SVG visuals: ${svgCount}`);
    log(`  Animated visuals: ${animationCount}`);
    log(`  Basic shapes (circles/rects): ${basicShapesCount}`);
    log(`  Advanced operations: ${advancedOpsCount}`);
    log('');
    
    // BRUTAL CHECKS
    if (svgCount < 4) {
      const warning = `⚠️ PROBLEM: Expected 4 visuals (2 static + 2 animations), got ${svgCount}`;
      log(warning);
      metrics.warnings.push(warning);
    } else {
      log(`✅ CORRECT: ${svgCount} visuals (expected 4)`);
    }
    
    if (animationCount < 2) {
      const warning = `⚠️ PROBLEM: Expected 2 animations, got ${animationCount}`;
      log(warning);
      metrics.warnings.push(warning);
    } else {
      log(`✅ CORRECT: ${animationCount} animations (expected 2)`);
    }
    
    // Check for dummy/fallback content
    if (basicShapesCount > advancedOpsCount * 2) {
      const warning = `⚠️ SUSPICIOUS: Too many basic shapes (${basicShapesCount}) vs advanced ops (${advancedOpsCount}) - possible dummy content`;
      log(warning);
      metrics.warnings.push(warning);
    }
    
    // Check action texts for dummy indicators
    const dummyIndicators = ['placeholder', 'example', 'dummy', 'test', 'sample'];
    let dummyContentFound = false;
    
    data.actions.forEach(action => {
      if (action.text) {
        const text = action.text.toLowerCase();
        dummyIndicators.forEach(indicator => {
          if (text.includes(indicator)) {
            dummyContentFound = true;
            const warning = `⚠️ DUMMY CONTENT: Found "${indicator}" in action text: "${action.text}"`;
            log(warning);
            metrics.warnings.push(warning);
          }
        });
      }
      
      if (action.svgCode) {
        const svg = action.svgCode.toLowerCase();
        dummyIndicators.forEach(indicator => {
          if (svg.includes(indicator)) {
            dummyContentFound = true;
            const warning = `⚠️ DUMMY CONTENT: Found "${indicator}" in SVG code`;
            log(warning);
            metrics.warnings.push(warning);
          }
        });
      }
    });
    
    if (!dummyContentFound) {
      log('✅ NO DUMMY CONTENT: No placeholder/example text found');
    }
    
    // Check if all steps received
    if (stepsReceived.length === 3) {
      log('');
      log('═══════════════════════════════════════');
      log('ALL 3 STEPS RECEIVED - FINAL ANALYSIS');
      log('═══════════════════════════════════════');
      
      setTimeout(() => {
        generateFinalReport();
        process.exit(0);
      }, 2000);
    }
    
  } else if (data.type === 'error') {
    const error = `❌ ERROR in step ${data.stepId}: ${data.message || data.error}`;
    log(error);
    metrics.failures.push(error);
    errors.push(data);
  }
});

socket.on('progress', (data) => {
  log(`[Progress] ${data.message || JSON.stringify(data)}`);
});

socket.on('generation_progress', (data) => {
  log(`[Gen Progress] ${data.message || JSON.stringify(data)}`);
});

socket.on('connect_error', (err) => {
  log(`❌ Connection error: ${err.message}`);
  process.exit(1);
});

socket.on('disconnect', () => {
  log('Disconnected from backend');
});

// Timeout after 5 minutes
setTimeout(() => {
  log('');
  log('❌ TIMEOUT: Test did not complete in 5 minutes');
  generateFinalReport();
  process.exit(1);
}, 300000);

function generateFinalReport() {
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  log('');
  log('');
  log('╔════════════════════════════════════════════════════════════╗');
  log('║         BRUTAL HONEST TEST - FINAL REPORT                 ║');
  log('╔════════════════════════════════════════════════════════════╗');
  log('');
  
  log('📊 TIMING METRICS:');
  log(`  Total time: ${totalTime}s`);
  log(`  Plan generation: ${metrics.planTime}s`);
  if (metrics.stepTimes.length > 0) {
    metrics.stepTimes.forEach((time, i) => {
      log(`  Step ${i + 1} delivery: ${time}s`);
    });
  }
  log('');
  
  log('📈 CONTENT METRICS:');
  log(`  Steps received: ${stepsReceived.length} / 3`);
  log(`  Total visuals: ${totalVisuals}`);
  log(`  Total animations: ${totalAnimations}`);
  if (metrics.visualCounts.length > 0) {
    metrics.visualCounts.forEach((count, i) => {
      log(`  Step ${i + 1} visuals: ${count} (${metrics.animationCounts[i]} animated)`);
    });
  }
  log('');
  
  log('⚠️ WARNINGS:');
  if (metrics.warnings.length === 0) {
    log('  ✅ No warnings - system performing as expected!');
  } else {
    metrics.warnings.forEach(warning => {
      log(`  ${warning}`);
    });
  }
  log('');
  
  log('❌ FAILURES:');
  if (metrics.failures.length === 0) {
    log('  ✅ No failures - all steps succeeded!');
  } else {
    metrics.failures.forEach(failure => {
      log(`  ${failure}`);
    });
  }
  log('');
  
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('BRUTALLY HONEST ASSESSMENT:');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const success = stepsReceived.length === 3 && 
                  metrics.failures.length === 0 &&
                  totalVisuals >= 12 &&
                  totalAnimations >= 6;
  
  if (success) {
    log('✅ SYSTEM IS WORKING AS DESIGNED');
    log('   - All 3 steps delivered');
    log('   - Sufficient visuals and animations');
    log('   - No critical failures');
    if (parseFloat(totalTime) <= 180) {
      log('   - ✅ Time is under 3 minutes');
    } else {
      log(`   - ⚠️ Time is over 3 minutes (${totalTime}s)`);
    }
  } else {
    log('❌ SYSTEM HAS PROBLEMS:');
    if (stepsReceived.length < 3) {
      log(`   - Only ${stepsReceived.length}/3 steps delivered`);
    }
    if (metrics.failures.length > 0) {
      log(`   - ${metrics.failures.length} failures occurred`);
    }
    if (totalVisuals < 12) {
      log(`   - Only ${totalVisuals} visuals (expected 12)`);
    }
    if (totalAnimations < 6) {
      log(`   - Only ${totalAnimations} animations (expected 6)`);
    }
  }
  
  log('');
  log('Full logs saved to: brutal-honest-test-results.log');
  log('╚════════════════════════════════════════════════════════════╝');
  
  logFile.end();
}
