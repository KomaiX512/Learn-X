#!/usr/bin/env node

/**
 * PRODUCTION-GRADE SYSTEM TEST
 * 
 * Tests complete workflow with detailed monitoring:
 * 1. Planning stage
 * 2. Sub-planning (visual specs)
 * 3. Visual generation (static + animations)
 * 4. Progressive emission
 * 5. Quality verification
 * 
 * NO FALLBACKS - TRUE DYNAMIC GENERATION
 */

const io = require('socket.io-client');
const fs = require('fs');

const TEST_QUERY = process.argv[2] || "teach me about how photosynthesis works at the molecular level";
const BACKEND_URL = "http://localhost:8000";

const logFile = fs.createWriteStream('production-test-results.log', { flags: 'w' });
const startTime = Date.now();

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const logMessage = `[${timestamp}] [${elapsed}s] [${level}] ${message}`;
  console.log(logMessage);
  logFile.write(logMessage + '\n');
}

function logSection(title) {
  const line = '='.repeat(70);
  log('');
  log(line);
  log(title);
  log(line);
}

// Test metrics
const metrics = {
  planTime: 0,
  stepTimes: [],
  visualCounts: [],
  animationCounts: [],
  stepsReceived: 0,
  failures: [],
  warnings: []
};

logSection('PRODUCTION SYSTEM TEST STARTING');
log(`Query: "${TEST_QUERY}"`);
log(`Backend: ${BACKEND_URL}`);
log('');

const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  reconnection: false
});

socket.on('connect', () => {
  log('✅ WebSocket connected', 'NETWORK');
  log(`Socket ID: ${socket.id}`, 'NETWORK');
  log('');
  
  log('📤 Sending query...', 'REQUEST');
  socket.emit('query', {
    query: TEST_QUERY,
    sessionId: socket.id
  });
});

socket.on('rendered', (data) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (data.type === 'plan') {
    metrics.planTime = parseFloat(elapsed);
    
    logSection(`📋 PLAN RECEIVED (${elapsed}s)`);
    log(`Title: ${data.plan.title}`);
    log(`Subtitle: ${data.plan.subtitle}`);
    log(`Steps: ${data.plan.toc?.length || 0}`);
    log('');
    
    if (data.plan.toc) {
      log('Step Structure:');
      data.plan.toc.forEach((item, i) => {
        log(`  ${i + 1}. ${item.title} - ${item.summary}`);
      });
    }
    log('');
    
    // Validation
    if (data.plan.toc && data.plan.toc.length !== 3) {
      const warning = `⚠️  Expected 3 steps, got ${data.plan.toc.length}`;
      log(warning, 'WARNING');
      metrics.warnings.push(warning);
    } else {
      log('✅ Correct: 3 steps as expected', 'VALIDATION');
    }
    
  } else if (data.type === 'actions' && data.actions) {
    const stepId = data.stepId || metrics.stepsReceived + 1;
    metrics.stepsReceived++;
    metrics.stepTimes.push(parseFloat(elapsed));
    
    logSection(`📦 STEP ${stepId} RECEIVED (${elapsed}s)`);
    log(`Tag: ${data.step?.tag || 'unknown'}`);
    log(`Description: ${data.step?.desc?.substring(0, 100) || 'unknown'}...`);
    log(`Total Actions: ${data.actions.length}`);
    log('');
    
    // Analyze action types
    const actionTypes = {};
    let svgCount = 0;
    let animationCount = 0;
    let advancedOps = [];
    let basicShapes = 0;
    
    data.actions.forEach(action => {
      const op = action.op || 'unknown';
      actionTypes[op] = (actionTypes[op] || 0) + 1;
      
      // Count SVG visuals
      if (op === 'customSVG') {
        svgCount++;
        
        // Check if animated
        if (action.svgCode && (
          action.svgCode.includes('<animate') ||
          action.svgCode.includes('animateMotion') ||
          action.svgCode.includes('animateTransform')
        )) {
          animationCount++;
        }
        
        // Check length
        const lines = action.svgCode.split('\n').length;
        log(`  SVG Visual ${svgCount}: ${lines} lines, animated: ${action.svgCode.includes('<animate') ? 'YES' : 'NO'}`);
      }
      
      // Track basic shapes (potential dummy content)
      if (op === 'drawCircle' || op === 'drawRect') {
        basicShapes++;
      }
      
      // Track advanced operations (good quality indicator)
      if (['drawGraph', 'drawLatex', 'customPath', 'drawVector', 'drawDiagram', 'drawWave', 'drawParticle'].includes(op)) {
        advancedOps.push(op);
      }
    });
    
    metrics.visualCounts.push(svgCount);
    metrics.animationCounts.push(animationCount);
    
    log('');
    log('Action Breakdown:');
    Object.entries(actionTypes).forEach(([op, count]) => {
      log(`  ${op}: ${count}`);
    });
    
    log('');
    log('Quality Analysis:');
    log(`  SVG Visuals: ${svgCount}`);
    log(`  Animations: ${animationCount}`);
    log(`  Advanced Operations: ${advancedOps.length} (${advancedOps.join(', ')})`);
    log(`  Basic Shapes: ${basicShapes}`);
    log('');
    
    // Quality checks
    if (svgCount < 4) {
      const warning = `⚠️  Expected 4 visuals, got ${svgCount}`;
      log(warning, 'WARNING');
      metrics.warnings.push(warning);
    } else {
      log(`✅ Visual count OK: ${svgCount}`, 'VALIDATION');
    }
    
    if (animationCount < 2) {
      const warning = `⚠️  Expected 2 animations, got ${animationCount}`;
      log(warning, 'WARNING');
      metrics.warnings.push(warning);
    } else {
      log(`✅ Animation count OK: ${animationCount}`, 'VALIDATION');
    }
    
    // Check for fallback/dummy patterns
    const dummyIndicators = ['placeholder', 'example', 'dummy', 'test', 'sample', 'generic'];
    let dummyFound = false;
    
    data.actions.forEach(action => {
      if (action.text) {
        const text = action.text.toLowerCase();
        dummyIndicators.forEach(indicator => {
          if (text.includes(indicator)) {
            dummyFound = true;
            const warning = `⚠️  Dummy content: "${indicator}" in "${action.text}"`;
            log(warning, 'QUALITY');
            metrics.warnings.push(warning);
          }
        });
      }
      
      if (action.svgCode) {
        const svg = action.svgCode.toLowerCase();
        dummyIndicators.forEach(indicator => {
          if (svg.includes(indicator)) {
            dummyFound = true;
            const warning = `⚠️  Dummy content: "${indicator}" in SVG`;
            log(warning, 'QUALITY');
            metrics.warnings.push(warning);
          }
        });
      }
    });
    
    if (!dummyFound) {
      log('✅ No dummy content detected', 'QUALITY');
    }
    
    // All steps received?
    if (metrics.stepsReceived === 3) {
      log('');
      logSection('ALL 3 STEPS RECEIVED - GENERATING FINAL REPORT');
      setTimeout(() => {
        generateFinalReport();
        process.exit(0);
      }, 2000);
    }
    
  } else if (data.type === 'error') {
    const error = `❌ ERROR in step ${data.stepId}: ${data.message || data.error}`;
    log(error, 'ERROR');
    metrics.failures.push(error);
  }
});

socket.on('progress', (data) => {
  log(`Progress: ${data.message || JSON.stringify(data)}`, 'PROGRESS');
});

socket.on('generation_progress', (data) => {
  log(`Generation: ${data.message || JSON.stringify(data)}`, 'PROGRESS');
});

socket.on('connect_error', (err) => {
  log(`❌ Connection error: ${err.message}`, 'ERROR');
  log('Is backend running on port 8000?', 'ERROR');
  process.exit(1);
});

socket.on('disconnect', () => {
  log('Disconnected from backend', 'NETWORK');
});

// Timeout after 3 minutes
setTimeout(() => {
  log('', 'TIMEOUT');
  log('❌ TEST TIMEOUT: No completion in 3 minutes', 'TIMEOUT');
  generateFinalReport();
  process.exit(1);
}, 180000);

function generateFinalReport() {
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  log('');
  log('');
  logSection('FINAL PRODUCTION TEST REPORT');
  log('');
  
  log('📊 TIMING METRICS:');
  log(`  Total Time: ${totalTime}s`);
  log(`  Plan Generation: ${metrics.planTime}s`);
  if (metrics.stepTimes.length > 0) {
    metrics.stepTimes.forEach((time, i) => {
      log(`  Step ${i + 1} Delivery: ${time}s`);
    });
    
    // Calculate intervals
    if (metrics.stepTimes.length > 1) {
      log('');
      log('  Progressive Delivery Intervals:');
      for (let i = 1; i < metrics.stepTimes.length; i++) {
        const interval = metrics.stepTimes[i] - metrics.stepTimes[i - 1];
        log(`    Step ${i} → Step ${i + 1}: ${interval.toFixed(1)}s`);
      }
    }
  }
  log('');
  
  log('📈 CONTENT METRICS:');
  log(`  Steps Received: ${metrics.stepsReceived} / 3`);
  log(`  Total Visuals: ${metrics.visualCounts.reduce((a, b) => a + b, 0)}`);
  log(`  Total Animations: ${metrics.animationCounts.reduce((a, b) => a + b, 0)}`);
  if (metrics.visualCounts.length > 0) {
    log('');
    log('  Per-Step Breakdown:');
    metrics.visualCounts.forEach((count, i) => {
      log(`    Step ${i + 1}: ${count} visuals (${metrics.animationCounts[i]} animated)`);
    });
  }
  log('');
  
  log('⚠️  WARNINGS:');
  if (metrics.warnings.length === 0) {
    log('  ✅ No warnings - system performing as expected!');
  } else {
    metrics.warnings.forEach((warning, i) => {
      log(`  ${i + 1}. ${warning}`);
    });
  }
  log('');
  
  log('❌ FAILURES:');
  if (metrics.failures.length === 0) {
    log('  ✅ No failures - all steps succeeded!');
  } else {
    metrics.failures.forEach((failure, i) => {
      log(`  ${i + 1}. ${failure}`);
    });
  }
  log('');
  
  // Production readiness score
  let score = 0;
  const checks = [];
  
  if (metrics.stepsReceived === 3) {
    score += 30;
    checks.push('✅ All 3 steps delivered');
  } else {
    checks.push(`❌ Only ${metrics.stepsReceived}/3 steps delivered`);
  }
  
  if (metrics.failures.length === 0) {
    score += 20;
    checks.push('✅ No failures');
  } else {
    checks.push(`❌ ${metrics.failures.length} failures occurred`);
  }
  
  const totalVisuals = metrics.visualCounts.reduce((a, b) => a + b, 0);
  if (totalVisuals >= 12) {
    score += 20;
    checks.push(`✅ Sufficient visuals (${totalVisuals})`);
  } else {
    checks.push(`❌ Insufficient visuals (${totalVisuals}/12)`);
  }
  
  const totalAnimations = metrics.animationCounts.reduce((a, b) => a + b, 0);
  if (totalAnimations >= 6) {
    score += 15;
    checks.push(`✅ Sufficient animations (${totalAnimations})`);
  } else {
    checks.push(`⚠️  Low animations (${totalAnimations}/6)`);
  }
  
  if (parseFloat(totalTime) <= 180) {
    score += 15;
    checks.push(`✅ Time under 3 minutes (${totalTime}s)`);
  } else {
    checks.push(`⚠️  Time over 3 minutes (${totalTime}s)`);
  }
  
  logSection('PRODUCTION READINESS ASSESSMENT');
  log('');
  checks.forEach(check => log(`  ${check}`));
  log('');
  log(`📊 SCORE: ${score}/100`);
  log('');
  
  if (score >= 85) {
    log('✅ PRODUCTION READY - System performing excellently');
  } else if (score >= 70) {
    log('⚠️  ACCEPTABLE - Minor issues but usable');
  } else if (score >= 50) {
    log('⚠️  NEEDS IMPROVEMENT - Significant issues present');
  } else {
    log('❌ NOT PRODUCTION READY - Major failures detected');
  }
  
  log('');
  log('Full logs saved to: production-test-results.log');
  logSection('TEST COMPLETE');
  
  logFile.end();
}
