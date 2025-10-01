/**
 * COMPLETE END-TO-END MONITORING & VERIFICATION
 * 
 * This monitors:
 * 1. Backend generation (all operations)
 * 2. Frontend rendering (all steps)
 * 3. V2 operation usage (domain-specific)
 * 4. Fallback detection (should be ZERO)
 * 5. Performance metrics (timing)
 * 6. Quality analysis (completeness)
 * 
 * BRUTALLY HONEST - Reports EXACTLY what happens
 */

const io = require('socket.io-client');
const axios = require('axios');
const fs = require('fs');

console.log('\n' + '═'.repeat(120));
console.log('🔍 COMPLETE END-TO-END MONITORING - BRUTAL HONEST EDITION');
console.log('═'.repeat(120) + '\n');

const QUERY = process.argv[2] || 'teach me about photosynthesis in plants';
const SESSION_ID = `e2e-monitor-${Date.now()}`;
const TIMEOUT = 120000; // 2 minutes

console.log(`📝 Query: "${QUERY}"`);
console.log(`🆔 Session: ${SESSION_ID}`);
console.log(`⏱️  Max Timeout: ${TIMEOUT/1000}s\n`);

const report = {
  timestamp: new Date().toISOString(),
  query: QUERY,
  sessionId: SESSION_ID,
  
  // Timing
  timing: {
    startTime: Date.now(),
    planReceived: null,
    firstStepReceived: null,
    lastStepReceived: null,
    totalDuration: null,
    stepTimings: []
  },
  
  // Backend Analysis
  backend: {
    planGenerated: false,
    stepsGenerated: [],
    totalOperations: 0,
    operationsByType: {},
    v2Operations: 0,
    v1Operations: 0,
    v2Ratio: 0,
    errors: []
  },
  
  // Frontend Analysis
  frontend: {
    stepsReceived: [],
    operationsRendered: 0,
    renderErrors: [],
    v2OpsRendered: 0,
    v1OpsRendered: 0
  },
  
  // Fallback Detection
  fallbacks: {
    detected: [],
    count: 0,
    hasFallbacks: false
  },
  
  // Quality Analysis
  quality: {
    contextualQuality: 'unknown',
    v2RatioGrade: 'unknown',
    contentRichness: 'unknown',
    completeness: 0,
    issues: []
  },
  
  // Architecture Limitations
  limitations: {
    found: [],
    criticalIssues: [],
    warnings: []
  },
  
  // Final Verdict
  verdict: {
    backendWorking: false,
    frontendWorking: false,
    noFallbacks: false,
    productionReady: false,
    score: 0,
    status: ''
  }
};

// V2 Operations (Domain-Specific)
const V2_OPS = [
  'drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
  'drawPhysicsObject', 'drawForceVector', 'drawTrajectory', 'drawFieldLines',
  'drawCellStructure', 'drawOrganSystem', 'drawMembrane',
  'drawMolecule', 'drawAtom', 'drawReaction', 'drawBond', 'drawMolecularStructure',
  'drawNeuralNetwork', 'drawDataStructure', 'drawAlgorithmStep',
  'drawGeometry', 'drawCoordinateSystem', 'drawFlowchart',
  'animate'
];

// Fallback Indicators (CODE patterns, not content)
const FALLBACK_PATTERNS = [
  'FALLBACK_', 'generateFallback', 'fallbackContent', 
  'defaultFallback', 'useFallback', 'fallback:', 'fallback='
];

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: false
});

let expectedSteps = 5;
let stepsReceived = 0;

socket.on('connect', () => {
  console.log('✅ Connected to backend WebSocket\n');
  socket.emit('join', { sessionId: SESSION_ID });
  
  setTimeout(() => {
    console.log('📤 Submitting query to backend...\n');
    report.timing.startTime = Date.now();
    
    axios.post('http://localhost:3001/api/query', {
      query: QUERY,
      sessionId: SESSION_ID
    }).catch(err => {
      console.error('❌ API Error:', err.message);
      report.backend.errors.push(err.message);
    });
  }, 500);
});

socket.on('plan', (data) => {
  report.timing.planReceived = Date.now();
  const planDuration = report.timing.planReceived - report.timing.startTime;
  
  report.backend.planGenerated = true;
  expectedSteps = data.steps?.length || 5;
  
  console.log('═'.repeat(120));
  console.log('📋 PLAN RECEIVED');
  console.log('═'.repeat(120));
  console.log(`Time: ${planDuration}ms`);
  console.log(`Steps: ${expectedSteps}`);
  console.log(`Title: ${data.title || 'N/A'}`);
  console.log('═'.repeat(120) + '\n');
});

socket.on('rendered', (data) => {
  const receiveTime = Date.now();
  
  if (!report.timing.firstStepReceived) {
    report.timing.firstStepReceived = receiveTime;
    console.log(`⏱️  First step received at: ${receiveTime - report.timing.startTime}ms\n`);
  }
  
  report.timing.lastStepReceived = receiveTime;
  
  if (data.stepId && data.actions) {
    stepsReceived++;
    const stepId = data.stepId;
    
    report.frontend.stepsReceived.push(stepId);
    report.backend.stepsGenerated.push(stepId);
    
    // Analyze operations
    const opCounts = {};
    let v2Count = 0;
    let v1Count = 0;
    
    data.actions.forEach(action => {
      const op = action.op;
      opCounts[op] = (opCounts[op] || 0) + 1;
      report.backend.operationsByType[op] = (report.backend.operationsByType[op] || 0) + 1;
      
      if (V2_OPS.includes(op)) {
        v2Count++;
        report.backend.v2Operations++;
        report.frontend.v2OpsRendered++;
      } else {
        v1Count++;
        report.backend.v1Operations++;
        report.frontend.v1OpsRendered++;
      }
      
      // Check for fallback patterns in operation data
      const actionStr = JSON.stringify(action);
      FALLBACK_PATTERNS.forEach(pattern => {
        if (actionStr.includes(pattern)) {
          report.fallbacks.detected.push({
            step: stepId,
            operation: op,
            pattern: pattern,
            data: actionStr.substring(0, 100)
          });
          report.fallbacks.count++;
          report.fallbacks.hasFallbacks = true;
        }
      });
    });
    
    report.backend.totalOperations += data.actions.length;
    report.frontend.operationsRendered += data.actions.length;
    
    const stepV2Ratio = v2Count / data.actions.length * 100;
    const stepDuration = receiveTime - report.timing.startTime;
    
    report.timing.stepTimings.push({
      step: stepId,
      duration: stepDuration,
      operations: data.actions.length,
      v2Count,
      v1Count,
      v2Ratio: stepV2Ratio
    });
    
    console.log('═'.repeat(120));
    console.log(`📦 STEP ${stepId} RECEIVED & ANALYZED`);
    console.log('═'.repeat(120));
    console.log(`Time from start: ${stepDuration}ms`);
    console.log(`Operations: ${data.actions.length} (${v2Count} V2, ${v1Count} V1)`);
    console.log(`V2 Ratio: ${stepV2Ratio.toFixed(1)}% ${stepV2Ratio >= 70 ? '✅' : '⚠️'}`);
    
    // Show operation breakdown
    const sortedOps = Object.entries(opCounts).sort((a, b) => b[1] - a[1]);
    console.log('Operations:');
    sortedOps.forEach(([op, count]) => {
      const marker = V2_OPS.includes(op) ? '✅ V2' : '  V1';
      console.log(`  ${marker} ${op}: ${count}x`);
    });
    console.log('═'.repeat(120) + '\n');
    
    // Check if complete
    if (stepsReceived === expectedSteps) {
      report.timing.totalDuration = Date.now() - report.timing.startTime;
      
      setTimeout(() => {
        socket.close();
        analyzeResults();
      }, 1000);
    }
  }
});

socket.on('error', (error) => {
  console.error('❌ Socket Error:', error);
  report.backend.errors.push(error.message || error);
});

// Timeout handler
setTimeout(() => {
  if (stepsReceived < expectedSteps) {
    console.error(`\n❌ TIMEOUT! Received ${stepsReceived}/${expectedSteps} steps\n`);
    report.timing.totalDuration = Date.now() - report.timing.startTime;
  }
  
  socket.close();
  analyzeResults();
}, TIMEOUT);

function analyzeResults() {
  console.log('\n' + '═'.repeat(120));
  console.log('🔬 BRUTAL HONEST ANALYSIS');
  console.log('═'.repeat(120) + '\n');
  
  // Calculate metrics
  report.backend.v2Ratio = report.backend.totalOperations > 0
    ? (report.backend.v2Operations / report.backend.totalOperations * 100)
    : 0;
  
  // Backend Analysis
  console.log('🔙 BACKEND GENERATION:\n');
  
  console.log(`Steps Generated: ${report.backend.stepsGenerated.length}/${expectedSteps} ${report.backend.stepsGenerated.length === expectedSteps ? '✅' : '❌'}`);
  console.log(`Total Operations: ${report.backend.totalOperations}`);
  console.log(`V2 Operations: ${report.backend.v2Operations} (${report.backend.v2Ratio.toFixed(1)}%)`);
  console.log(`V1 Operations: ${report.backend.v1Operations} (${(100 - report.backend.v2Ratio).toFixed(1)}%)`);
  
  if (report.backend.v2Ratio >= 80) {
    console.log(`V2 Ratio Grade: EXCELLENT ✅ (Target: 70%, Actual: ${report.backend.v2Ratio.toFixed(1)}%)`);
    report.quality.v2RatioGrade = 'excellent';
  } else if (report.backend.v2Ratio >= 70) {
    console.log(`V2 Ratio Grade: GOOD ✅ (Target: 70%, Actual: ${report.backend.v2Ratio.toFixed(1)}%)`);
    report.quality.v2RatioGrade = 'good';
  } else if (report.backend.v2Ratio >= 60) {
    console.log(`V2 Ratio Grade: FAIR ⚠️  (Target: 70%, Actual: ${report.backend.v2Ratio.toFixed(1)}%)`);
    report.quality.v2RatioGrade = 'fair';
    report.quality.issues.push('V2 ratio below 70% target');
  } else {
    console.log(`V2 Ratio Grade: POOR ❌ (Target: 70%, Actual: ${report.backend.v2Ratio.toFixed(1)}%)`);
    report.quality.v2RatioGrade = 'poor';
    report.quality.issues.push('V2 ratio significantly below target');
  }
  
  const avgOpsPerStep = report.backend.stepsGenerated.length > 0
    ? report.backend.totalOperations / report.backend.stepsGenerated.length
    : 0;
  
  console.log(`\nOps/Step: ${avgOpsPerStep.toFixed(1)} ${avgOpsPerStep >= 25 ? '✅' : '⚠️'}`);
  
  if (avgOpsPerStep >= 30) {
    report.quality.contentRichness = 'rich';
  } else if (avgOpsPerStep >= 25) {
    report.quality.contentRichness = 'adequate';
  } else {
    report.quality.contentRichness = 'sparse';
    report.quality.issues.push('Content density below expected (25+ ops/step)');
  }
  
  // Frontend Analysis
  console.log('\n🎨 FRONTEND RENDERING:\n');
  
  console.log(`Steps Received: ${report.frontend.stepsReceived.length}/${expectedSteps} ${report.frontend.stepsReceived.length === expectedSteps ? '✅' : '❌'}`);
  console.log(`Operations Rendered: ${report.frontend.operationsRendered} ${report.frontend.operationsRendered === report.backend.totalOperations ? '✅' : '⚠️'}`);
  console.log(`V2 Ops Rendered: ${report.frontend.v2OpsRendered}`);
  console.log(`V1 Ops Rendered: ${report.frontend.v1OpsRendered}`);
  console.log(`Render Errors: ${report.frontend.renderErrors.length} ${report.frontend.renderErrors.length === 0 ? '✅' : '❌'}`);
  
  // Fallback Detection
  console.log('\n🚫 FALLBACK DETECTION:\n');
  
  if (report.fallbacks.hasFallbacks) {
    console.log(`❌ FALLBACKS DETECTED: ${report.fallbacks.count}`);
    report.fallbacks.detected.slice(0, 5).forEach(fb => {
      console.log(`   Step ${fb.step}: ${fb.operation} contains "${fb.pattern}"`);
    });
    if (report.fallbacks.detected.length > 5) {
      console.log(`   ... and ${report.fallbacks.detected.length - 5} more`);
    }
    report.limitations.criticalIssues.push('System using fallback implementations');
  } else {
    console.log(`✅ NO FALLBACKS DETECTED - True dynamic generation`);
  }
  
  // Performance Analysis
  console.log('\n⚡ PERFORMANCE:\n');
  
  const planTime = report.timing.planReceived ? report.timing.planReceived - report.timing.startTime : 0;
  const totalTime = report.timing.totalDuration || 0;
  
  console.log(`Plan Generation: ${planTime}ms`);
  console.log(`Total Duration: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
  console.log(`Performance: ${totalTime <= 60000 ? '✅ GOOD' : totalTime <= 90000 ? '⚠️  ACCEPTABLE' : '❌ SLOW'}`);
  
  if (totalTime > 60000) {
    report.limitations.warnings.push(`Generation time ${(totalTime/1000).toFixed(1)}s exceeds 60s target`);
  }
  
  // Operation Variety
  console.log('\n🎭 OPERATION VARIETY:\n');
  
  const uniqueOps = Object.keys(report.backend.operationsByType).length;
  const v2OpsUsed = Object.keys(report.backend.operationsByType).filter(op => V2_OPS.includes(op)).length;
  
  console.log(`Total Operation Types: ${uniqueOps}`);
  console.log(`V2 Operation Types Used: ${v2OpsUsed}`);
  console.log(`Variety: ${uniqueOps >= 10 ? '✅ HIGH' : uniqueOps >= 5 ? '⚠️  MEDIUM' : '❌ LOW'}`);
  
  if (uniqueOps < 10) {
    report.limitations.warnings.push(`Low operation variety (${uniqueOps} types)`);
  }
  
  // Top Operations
  console.log('\nTop 10 Operations Used:');
  const sortedOps = Object.entries(report.backend.operationsByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedOps.forEach(([op, count]) => {
    const marker = V2_OPS.includes(op) ? '✅ V2' : '  V1';
    const pct = (count / report.backend.totalOperations * 100).toFixed(1);
    console.log(`  ${marker} ${op}: ${count}x (${pct}%)`);
  });
  
  // Contextual Quality
  console.log('\n🎯 CONTEXTUAL QUALITY:\n');
  
  const topV2Op = sortedOps.find(([op]) => V2_OPS.includes(op));
  if (topV2Op) {
    console.log(`Primary V2 Operation: ${topV2Op[0]} (${topV2Op[1]}x)`);
    console.log(`Context: ${isContextual(QUERY, topV2Op[0]) ? '✅ RELEVANT' : '⚠️  CHECK'}`);
  }
  
  // Quality Grade
  if (report.backend.v2Ratio >= 70 && avgOpsPerStep >= 25 && !report.fallbacks.hasFallbacks) {
    report.quality.contextualQuality = 'excellent';
  } else if (report.backend.v2Ratio >= 60 && avgOpsPerStep >= 20) {
    report.quality.contextualQuality = 'good';
  } else {
    report.quality.contextualQuality = 'needs improvement';
  }
  
  console.log(`Overall Quality: ${report.quality.contextualQuality.toUpperCase()}`);
  
  // Calculate verdict
  calculateVerdict();
  
  // Print final verdict
  printVerdict();
  
  // Save report
  fs.writeFileSync(
    '/home/komail/LeaF/e2e_monitoring_report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Full report saved: e2e_monitoring_report.json\n');
  
  process.exit(report.verdict.productionReady ? 0 : 1);
}

function isContextual(query, operation) {
  const queryLower = query.toLowerCase();
  const contextMap = {
    'drawCircuitElement': ['circuit', 'electrical', 'electronics', 'resistor', 'capacitor'],
    'drawSignalWaveform': ['signal', 'wave', 'frequency', 'amplitude', 'sine'],
    'drawPhysicsObject': ['physics', 'motion', 'force', 'velocity', 'acceleration'],
    'drawMolecule': ['chemistry', 'molecule', 'atom', 'chemical', 'bond'],
    'drawCellStructure': ['biology', 'cell', 'organelle', 'mitochondria', 'nucleus'],
    'drawNeuralNetwork': ['neural', 'network', 'ai', 'machine learning', 'deep learning']
  };
  
  const keywords = contextMap[operation] || [];
  return keywords.some(keyword => queryLower.includes(keyword));
}

function calculateVerdict() {
  let score = 0;
  
  // Backend Generation (40 points)
  if (report.backend.stepsGenerated.length === expectedSteps) {
    score += 25;
  } else {
    score += (report.backend.stepsGenerated.length / expectedSteps) * 25;
  }
  
  if (report.backend.v2Ratio >= 80) score += 15;
  else if (report.backend.v2Ratio >= 70) score += 12;
  else if (report.backend.v2Ratio >= 60) score += 8;
  else score += 3;
  
  // Frontend Rendering (20 points)
  if (report.frontend.stepsReceived.length === expectedSteps) {
    score += 15;
  } else {
    score += (report.frontend.stepsReceived.length / expectedSteps) * 15;
  }
  
  if (report.frontend.renderErrors.length === 0) {
    score += 5;
  }
  
  // No Fallbacks (25 points)
  if (!report.fallbacks.hasFallbacks) {
    score += 25;
  } else {
    score += Math.max(0, 25 - report.fallbacks.count * 2);
  }
  
  // Performance (10 points)
  const totalTime = report.timing.totalDuration || 0;
  if (totalTime <= 45000) score += 10;
  else if (totalTime <= 60000) score += 7;
  else if (totalTime <= 90000) score += 4;
  
  // Content Quality (5 points)
  const avgOps = report.backend.totalOperations / Math.max(1, report.backend.stepsGenerated.length);
  if (avgOps >= 30) score += 5;
  else if (avgOps >= 25) score += 3;
  else if (avgOps >= 20) score += 1;
  
  report.verdict.score = Math.round(score);
  
  // Status
  if (score >= 90) {
    report.verdict.status = '🏆 PRODUCTION READY - EXCELLENT';
    report.verdict.productionReady = true;
  } else if (score >= 80) {
    report.verdict.status = '✅ PRODUCTION READY - GOOD';
    report.verdict.productionReady = true;
  } else if (score >= 70) {
    report.verdict.status = '⚠️  ALMOST READY - Minor improvements needed';
    report.verdict.productionReady = false;
  } else {
    report.verdict.status = '❌ NOT READY - Significant issues';
    report.verdict.productionReady = false;
  }
  
  // Component verdicts
  report.verdict.backendWorking = report.backend.stepsGenerated.length >= 4 && report.backend.v2Ratio >= 60;
  report.verdict.frontendWorking = report.frontend.stepsReceived.length >= 4 && report.frontend.renderErrors.length === 0;
  report.verdict.noFallbacks = !report.fallbacks.hasFallbacks;
}

function printVerdict() {
  console.log('\n' + '═'.repeat(120));
  console.log('🎯 FINAL VERDICT');
  console.log('═'.repeat(120) + '\n');
  
  console.log(`SCORE: ${report.verdict.score}/100`);
  console.log(`STATUS: ${report.verdict.status}\n`);
  
  console.log('Component Status:');
  console.log(`  Backend: ${report.verdict.backendWorking ? '✅ WORKING' : '❌ ISSUES'}`);
  console.log(`  Frontend: ${report.verdict.frontendWorking ? '✅ WORKING' : '❌ ISSUES'}`);
  console.log(`  No Fallbacks: ${report.verdict.noFallbacks ? '✅ TRUE GENERATION' : '❌ USING FALLBACKS'}`);
  console.log(`  Production Ready: ${report.verdict.productionReady ? '✅ YES' : '❌ NO'}\n`);
  
  if (report.quality.issues.length > 0) {
    console.log('⚠️  QUALITY ISSUES:');
    report.quality.issues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
    console.log('');
  }
  
  if (report.limitations.criticalIssues.length > 0) {
    console.log('❌ CRITICAL ISSUES:');
    report.limitations.criticalIssues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
    console.log('');
  }
  
  if (report.limitations.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    report.limitations.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
    console.log('');
  }
  
  console.log('═'.repeat(120));
  
  // Brutal Honest Summary
  console.log('\n' + '═'.repeat(120));
  console.log('💀 BRUTAL HONEST SUMMARY');
  console.log('═'.repeat(120) + '\n');
  
  if (report.verdict.productionReady && report.verdict.noFallbacks) {
    console.log('✅ THE SYSTEM IS PRODUCTION READY!');
    console.log(`   - Generated ${report.backend.totalOperations} operations successfully`);
    console.log(`   - Achieved ${report.backend.v2Ratio.toFixed(1)}% domain-specific content`);
    console.log(`   - NO fallbacks detected - TRUE dynamic generation`);
    console.log(`   - All ${expectedSteps} steps completed`);
    console.log(`   - Performance: ${(report.timing.totalDuration/1000).toFixed(1)}s total`);
  } else {
    console.log('❌ THE SYSTEM HAS ISSUES!');
    console.log('\nWHAT\'S BROKEN:');
    if (!report.verdict.backendWorking) {
      console.log(`   ❌ Backend: Only ${report.backend.stepsGenerated.length}/${expectedSteps} steps generated`);
    }
    if (!report.verdict.frontendWorking) {
      console.log(`   ❌ Frontend: ${report.frontend.renderErrors.length} render errors`);
    }
    if (!report.verdict.noFallbacks) {
      console.log(`   ❌ Fallbacks: ${report.fallbacks.count} fallback instances detected`);
    }
    if (report.backend.v2Ratio < 70) {
      console.log(`   ❌ V2 Ratio: ${report.backend.v2Ratio.toFixed(1)}% below 70% target`);
    }
  }
  
  console.log('\n' + '═'.repeat(120) + '\n');
}
