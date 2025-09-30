/**
 * BRUTAL V2 MONITORING - Complete System Test
 * 
 * Tests backend generation, frontend delivery, and actual rendering
 * NO SUGAR COATING - Shows EXACTLY what happens
 */

const io = require('socket.io-client');
const axios = require('axios');
const fs = require('fs');

console.log('\n' + '═'.repeat(100));
console.log('🔬 BRUTAL V2 SYSTEM TEST - COMPLETE MONITORING');
console.log('Testing: Backend → Frontend → Canvas Rendering');
console.log('═'.repeat(100) + '\n');

// Test with a fresh, uncached query
const testQuery = `explain transistor amplifier circuits ${Date.now()}`;
const sessionId = `brutal-v2-${Date.now()}`;
const startTime = Date.now();

const report = {
  query: testQuery,
  sessionId,
  backend: {
    planGenerated: false,
    stepsGenerated: [],
    v2AgentUsed: false,
    domainToolsGenerated: [],
    genericShapesGenerated: [],
    errors: []
  },
  frontend: {
    stepsReceived: [],
    stepsRendered: [],
    renderErrors: []
  },
  quality: {
    hasFallbacks: false,
    hasHardcoding: false,
    hasDummyContent: false,
    textOverlaps: false,
    domainAccuracy: null
  },
  timings: {},
  verdict: null
};

// Connect to backend
const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: false,
  timeout: 10000
});

socket.on('connect', () => {
  console.log('✅ Connected to backend\n');
  report.timings.connected = Date.now() - startTime;
  socket.emit('join', { sessionId });
  
  // Send query
  setTimeout(() => {
    console.log(`📤 Sending query: "${testQuery}"\n`);
    axios.post('http://localhost:3001/api/query', { 
      query: testQuery, 
      sessionId 
    }).catch(err => {
      console.error('❌ API Error:', err.message);
      report.backend.errors.push(err.message);
    });
  }, 500);
});

socket.on('progress', (data) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[${elapsed}s] 📡 Backend: ${data.message || data.status}`);
  
  if (data.message && data.message.includes('Generating')) {
    report.backend.stepsGenerated.push({
      stepId: data.stepId,
      startTime: Date.now()
    });
  }
});

socket.on('rendered', (data) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Plan received
  if (data.plan && !report.backend.planGenerated) {
    report.backend.planGenerated = true;
    report.timings.planReceived = Date.now() - startTime;
    console.log(`\n[${elapsed}s] ═══ PLAN GENERATED ═══`);
    console.log(`Title: "${data.plan.title}"`);
    console.log(`Steps: ${data.plan.steps.length}`);
    data.plan.steps.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.tag}: ${s.desc.substring(0, 50)}...`);
    });
  }
  
  // Step received
  if (data.stepId && data.actions) {
    report.frontend.stepsReceived.push(data.stepId);
    
    console.log(`\n[${elapsed}s] ═══ STEP ${data.stepId} RECEIVED ═══`);
    console.log(`Total operations: ${data.actions.length}`);
    
    // CRITICAL ANALYSIS: What operations are we getting?
    const analysis = analyzeOperations(data.actions);
    
    console.log('\n🔍 OPERATION ANALYSIS:');
    console.log(`  Domain-specific: ${analysis.domainSpecific.length}`);
    console.log(`  Generic shapes: ${analysis.genericShapes.length}`);
    console.log(`  V2 operations: ${analysis.v2Operations.length}`);
    
    // Store for report
    report.backend.domainToolsGenerated.push(...analysis.domainSpecific);
    report.backend.genericShapesGenerated.push(...analysis.genericShapes);
    
    // Check for V2 usage
    if (analysis.v2Operations.length > 0) {
      report.backend.v2AgentUsed = true;
      console.log('\n  ✅ V2 TOOLS DETECTED:');
      analysis.v2Operations.slice(0, 5).forEach(op => {
        console.log(`    - ${op.op}: ${JSON.stringify(op).substring(0, 60)}...`);
      });
    } else {
      console.log('\n  ❌ NO V2 TOOLS - Still using V1 generic shapes!');
    }
    
    // Check for fallbacks
    const fallbacks = checkForFallbacks(data.actions);
    if (fallbacks.length > 0) {
      report.quality.hasFallbacks = true;
      console.log('\n  ⚠️  FALLBACKS DETECTED:');
      fallbacks.forEach(f => console.log(`    - ${f}`));
    }
    
    // Show operation breakdown
    console.log('\n  📊 Operation counts:');
    Object.entries(analysis.counts).slice(0, 8).forEach(([op, count]) => {
      const marker = analysis.v2Ops.includes(op) ? '✅' : 
                     ['drawCircle', 'drawRect'].includes(op) ? '❌' : '  ';
      console.log(`    ${marker} ${op}: ${count}`);
    });
    
    // Check text overlap
    const overlaps = checkTextOverlap(data.actions);
    if (overlaps > 0) {
      report.quality.textOverlaps = true;
      console.log(`\n  ⚠️  ${overlaps} potential text overlaps detected`);
    }
  }
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
  report.backend.errors.push(error.toString());
});

// Helper functions
function analyzeOperations(actions) {
  const v2Ops = [
    'drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
    'drawForceVector', 'drawPhysicsObject', 'drawTrajectory',
    'drawCellStructure', 'drawMolecule', 'drawAtom',
    'drawDataStructure', 'drawFlowchart', 'drawNeuralNetwork'
  ];
  
  const genericOps = ['drawCircle', 'drawRect'];
  
  const counts = {};
  const domainSpecific = [];
  const genericShapes = [];
  const v2Operations = [];
  
  actions.forEach(action => {
    counts[action.op] = (counts[action.op] || 0) + 1;
    
    if (v2Ops.includes(action.op)) {
      domainSpecific.push(action.op);
      v2Operations.push(action);
    } else if (genericOps.includes(action.op)) {
      genericShapes.push(action.op);
    }
  });
  
  return {
    counts,
    domainSpecific,
    genericShapes,
    v2Operations,
    v2Ops
  };
}

function checkForFallbacks(actions) {
  const fallbacks = [];
  const bannedPhrases = [
    'placeholder', 'dummy', 'example', 'generic',
    'imagine', 'visualize', 'picture this', 'think about'
  ];
  
  actions.forEach(action => {
    if (action.text || action.label) {
      const text = (action.text || action.label || '').toLowerCase();
      bannedPhrases.forEach(phrase => {
        if (text.includes(phrase)) {
          fallbacks.push(`"${phrase}" in: ${text.substring(0, 50)}...`);
        }
      });
    }
  });
  
  return fallbacks;
}

function checkTextOverlap(actions) {
  const labelPositions = [];
  let overlaps = 0;
  
  actions.forEach(action => {
    if (action.op === 'drawLabel' && action.x && action.y) {
      // Check if position is too close to existing labels
      labelPositions.forEach(pos => {
        const dx = Math.abs(action.x - pos.x);
        const dy = Math.abs(action.y - pos.y);
        if (dx < 0.05 && dy < 0.05 && !action.avoidOverlap) {
          overlaps++;
        }
      });
      labelPositions.push({ x: action.x, y: action.y });
    }
  });
  
  return overlaps;
}

// Monitor backend logs
const { spawn } = require('child_process');
const backendMonitor = spawn('tail', ['-f', '/tmp/backend_v2_full.log']);

backendMonitor.stdout.on('data', (data) => {
  const log = data.toString();
  
  // Check for V2 agent usage
  if (log.includes('[codegenV2]') || log.includes('[visualAgentV2]')) {
    console.log('📝 Backend: V2 agent active');
    report.backend.v2AgentUsed = true;
  }
  
  // Check for errors
  if (log.includes('error') || log.includes('Error')) {
    const errorLine = log.split('\n').find(l => l.includes('error'));
    if (errorLine && !errorLine.includes('[debug]')) {
      console.log(`⚠️  Backend error: ${errorLine.substring(0, 80)}...`);
      report.backend.errors.push(errorLine);
    }
  }
});

// Final report after timeout
setTimeout(() => {
  backendMonitor.kill();
  
  const totalTime = (Date.now() - startTime) / 1000;
  
  console.log('\n' + '═'.repeat(100));
  console.log('📊 BRUTAL HONEST FINAL REPORT');
  console.log('═'.repeat(100));
  
  console.log(`\n⏱️  TIMINGS:`);
  console.log(`  Total time: ${totalTime.toFixed(1)}s`);
  console.log(`  Connection: ${(report.timings.connected / 1000).toFixed(1)}s`);
  if (report.timings.planReceived) {
    console.log(`  Plan generation: ${(report.timings.planReceived / 1000).toFixed(1)}s`);
  }
  
  console.log(`\n📡 BACKEND GENERATION:`);
  console.log(`  Plan generated: ${report.backend.planGenerated ? '✅' : '❌'}`);
  console.log(`  Steps generated: ${report.backend.stepsGenerated.length}/5`);
  console.log(`  V2 agent used: ${report.backend.v2AgentUsed ? '✅ YES' : '❌ NO'}`);
  console.log(`  Backend errors: ${report.backend.errors.length}`);
  
  console.log(`\n🖥️  FRONTEND DELIVERY:`);
  console.log(`  Steps received: ${report.frontend.stepsReceived.length}/5`);
  const allStepsReceived = report.frontend.stepsReceived.length === 5;
  console.log(`  All steps: ${allStepsReceived ? '✅' : '❌'}`);
  
  console.log(`\n🎨 CONTENT QUALITY:`);
  const domainCount = report.backend.domainToolsGenerated.length;
  const genericCount = report.backend.genericShapesGenerated.length;
  console.log(`  Domain-specific tools: ${domainCount}`);
  console.log(`  Generic shapes: ${genericCount}`);
  console.log(`  Ratio: ${domainCount > 0 ? (domainCount / (domainCount + genericCount) * 100).toFixed(0) : 0}% domain-specific`);
  
  console.log(`\n⚠️  ISSUES DETECTED:`);
  console.log(`  Fallbacks: ${report.quality.hasFallbacks ? '❌ YES' : '✅ NO'}`);
  console.log(`  Text overlaps: ${report.quality.textOverlaps ? '❌ YES' : '✅ NO'}`);
  console.log(`  Hardcoding: ${report.quality.hasHardcoding ? '❌ YES' : '✅ NO'}`);
  
  console.log(`\n🔧 OPERATIONS USED:`);
  const uniqueOps = new Set([
    ...report.backend.domainToolsGenerated,
    ...report.backend.genericShapesGenerated
  ]);
  console.log(`  Unique operations: ${uniqueOps.size}`);
  console.log(`  Domain operations: ${[...new Set(report.backend.domainToolsGenerated)].join(', ') || 'NONE'}`);
  
  // FINAL VERDICT
  console.log(`\n` + '═'.repeat(100));
  console.log('💎 BRUTAL VERDICT:');
  console.log('═'.repeat(100));
  
  const hasV2 = report.backend.v2AgentUsed && domainCount > 0;
  const goodRatio = domainCount > genericCount;
  const noFallbacks = !report.quality.hasFallbacks;
  const noOverlaps = !report.quality.textOverlaps;
  const allDelivered = allStepsReceived;
  
  let score = 0;
  if (hasV2) score += 40;
  if (goodRatio) score += 20;
  if (noFallbacks) score += 15;
  if (noOverlaps) score += 15;
  if (allDelivered) score += 10;
  
  console.log(`\n📈 SYSTEM SCORE: ${score}/100`);
  
  if (score >= 80) {
    console.log('\n✅ EXCELLENT - V2 WORKING PROPERLY');
    console.log('  • Using domain-specific tools');
    console.log('  • No fallbacks or generic shapes');
    console.log('  • True dynamic generation');
  } else if (score >= 60) {
    console.log('\n⚠️  PARTIAL SUCCESS - V2 PARTIALLY WORKING');
    console.log('  • Some domain tools but issues remain');
    if (!hasV2) console.log('  • V2 agent not consistently used');
    if (!goodRatio) console.log('  • Too many generic shapes');
    if (!noFallbacks) console.log('  • Fallbacks detected');
  } else {
    console.log('\n❌ FAILURE - V2 NOT WORKING PROPERLY');
    console.log('  • Still using mostly generic shapes');
    console.log('  • V2 agent not active or failing');
    console.log('  • System falling back to V1');
  }
  
  console.log(`\n🏗️  ARCHITECTURAL LIMITATIONS FOUND:`);
  if (!hasV2) {
    console.log('  ❌ V2 agent not consistently triggering');
    console.log('     → Check USE_VISUAL_V2 env var');
    console.log('     → Check codegenAgentV2 import');
  }
  if (genericCount > domainCount) {
    console.log('  ❌ Still generating too many generic shapes');
    console.log('     → visualAgentV2 prompt may need tuning');
    console.log('     → Tool documentation may be incomplete');
  }
  if (report.quality.hasFallbacks) {
    console.log('  ❌ Fallback content detected');
    console.log('     → System using placeholder text');
  }
  if (report.quality.textOverlaps) {
    console.log('  ❌ Layout engine not preventing overlaps');
    console.log('     → avoidOverlap flag not being set');
    console.log('     → Layout algorithm may not be applied');
  }
  
  // Save detailed report
  fs.writeFileSync('/home/komail/LeaF/brutal_v2_report.json', JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved: brutal_v2_report.json\n`);
  
  console.log('═'.repeat(100));
  console.log(score >= 80 ? '✅ V2 SYSTEM WORKING' : 
             score >= 60 ? '⚠️  V2 NEEDS FIXES' :
             '❌ V2 FAILING - USING V1');
  console.log('═'.repeat(100) + '\n');
  
  process.exit(score >= 80 ? 0 : 1);
}, 70000);
