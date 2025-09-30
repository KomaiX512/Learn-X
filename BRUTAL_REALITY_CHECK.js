/**
 * BRUTAL REALITY CHECK - Complete Pipeline Monitoring
 * Shows EXACTLY what happens at every stage
 */

const io = require('socket.io-client');
const axios = require('axios');
const fs = require('fs');

console.log('\n' + '═'.repeat(100));
console.log('🔬 BRUTAL REALITY CHECK - COMPLETE PIPELINE MONITORING');
console.log('═'.repeat(100) + '\n');

const query = `explain photosynthesis in detail ${Date.now()}`;
const sessionId = `brutal-${Date.now()}`;
const startTime = Date.now();

const report = {
  query,
  sessionId,
  startTime: new Date().toISOString(),
  
  backend: {
    planReceived: false,
    planTime: 0,
    stepsGenerated: [],
    stepsEmitted: [],
    errors: []
  },
  
  frontend: {
    stepsReceived: [],
    operationsReceived: 0,
    v2Operations: 0,
    renderedOnCanvas: 0,
    renderErrors: []
  },
  
  operations: {
    byStep: {},
    v2Types: [],
    genericTypes: []
  },
  
  timing: {
    backendGeneration: 0,
    frontendDelivery: 0,
    totalTime: 0
  }
};

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: false
});

socket.on('connect', () => {
  console.log(`✅ [${elapsed()}s] Connected to backend`);
  socket.emit('join', { sessionId });
  
  setTimeout(() => {
    console.log(`\n📤 [${elapsed()}s] Sending query: "${query}"\n`);
    axios.post('http://localhost:3001/api/query', { query, sessionId })
      .catch(err => {
        console.error(`❌ API Error: ${err.message}`);
        report.backend.errors.push(err.message);
      });
  }, 500);
});

socket.on('rendered', (data) => {
  const time = elapsed();
  
  // PLAN received
  if (data.plan && !report.backend.planReceived) {
    report.backend.planReceived = true;
    report.backend.planTime = Date.now() - startTime;
    console.log(`\n${'─'.repeat(100)}`);
    console.log(`📋 [${time}s] PLAN RECEIVED`);
    console.log(`${'─'.repeat(100)}`);
    console.log(`Title: "${data.plan.title}"`);
    console.log(`Subtitle: "${data.plan.subtitle}"`);
    if (data.plan.toc) {
      console.log(`Steps:`);
      data.plan.toc.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step}`);
      });
    }
    console.log(`${'─'.repeat(100)}\n`);
  }
  
  // STEP received
  if (data.stepId && data.actions && Array.isArray(data.actions)) {
    report.frontend.stepsReceived.push(data.stepId);
    report.frontend.operationsReceived += data.actions.length;
    
    // Analyze operations
    const v2Ops = [
      'drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
      'drawForceVector', 'drawPhysicsObject', 'drawTrajectory',
      'drawCellStructure', 'drawMolecule', 'drawAtom',
      'drawDataStructure', 'drawNeuralNetwork'
    ];
    
    const genericOps = ['drawCircle', 'drawRect'];
    
    const stepV2Count = data.actions.filter(a => v2Ops.includes(a.op)).length;
    const stepGenericCount = data.actions.filter(a => genericOps.includes(a.op)).length;
    
    report.frontend.v2Operations += stepV2Count;
    
    // Count operation types
    const opCounts = {};
    data.actions.forEach(a => {
      opCounts[a.op] = (opCounts[a.op] || 0) + 1;
      if (v2Ops.includes(a.op)) {
        report.operations.v2Types.push(a.op);
      } else if (genericOps.includes(a.op)) {
        report.operations.genericTypes.push(a.op);
      }
    });
    
    report.operations.byStep[data.stepId] = opCounts;
    
    console.log(`\n${'─'.repeat(100)}`);
    console.log(`📦 [${time}s] STEP ${data.stepId} RECEIVED`);
    console.log(`${'─'.repeat(100)}`);
    console.log(`Total operations: ${data.actions.length}`);
    console.log(`V2 operations: ${stepV2Count} (${(stepV2Count/data.actions.length*100).toFixed(0)}%)`);
    console.log(`Generic shapes: ${stepGenericCount}`);
    
    // Show operation breakdown
    console.log(`\nOperation breakdown:`);
    const sortedOps = Object.entries(opCounts).sort((a, b) => b[1] - a[1]);
    sortedOps.slice(0, 10).forEach(([op, count]) => {
      const marker = v2Ops.includes(op) ? '✅' : genericOps.includes(op) ? '❌' : '  ';
      console.log(`  ${marker} ${op}: ${count}`);
    });
    
    // Show sample V2 operations
    const v2Actions = data.actions.filter(a => v2Ops.includes(a.op));
    if (v2Actions.length > 0) {
      console.log(`\n✅ V2 OPERATIONS FOUND:`);
      v2Actions.slice(0, 3).forEach(a => {
        const preview = JSON.stringify(a).substring(0, 80);
        console.log(`  - ${a.op}: ${preview}...`);
      });
    } else {
      console.log(`\n❌ NO V2 OPERATIONS - Using V1 generic shapes`);
    }
    
    // Check for fallback indicators
    const fallbackIndicators = ['placeholder', 'dummy', 'imagine', 'visualize'];
    const hasFallback = data.actions.some(a => {
      const text = (a.text || a.label || '').toLowerCase();
      return fallbackIndicators.some(f => text.includes(f));
    });
    
    if (hasFallback) {
      console.log(`\n⚠️  FALLBACK CONTENT DETECTED`);
    }
    
    console.log(`${'─'.repeat(100)}\n`);
  }
});

socket.on('disconnect', () => {
  console.log(`❌ [${elapsed()}s] Disconnected from backend`);
});

socket.on('error', (error) => {
  console.error(`❌ [${elapsed()}s] Socket error:`, error);
  report.backend.errors.push(error.toString());
});

function elapsed() {
  return ((Date.now() - startTime) / 1000).toFixed(1);
}

// Monitor backend logs in parallel
const { spawn } = require('child_process');
let backendLogMonitor;
try {
  backendLogMonitor = spawn('tail', ['-f', '-n', '50', '/tmp/backend_v2_full.log']);
  
  backendLogMonitor.stdout.on('data', (data) => {
    const log = data.toString();
    
    // Track step generation
    if (log.includes('Successfully generated') && log.includes('operations for step')) {
      const match = log.match(/step (\d+)/);
      if (match) {
        const stepId = parseInt(match[1]);
        if (!report.backend.stepsGenerated.includes(stepId)) {
          report.backend.stepsGenerated.push(stepId);
          console.log(`🔧 [${elapsed()}s] Backend generated step ${stepId}`);
        }
      }
    }
    
    // Track step emission
    if (log.includes('Emitted step')) {
      const match = log.match(/step (\d+)/);
      if (match) {
        const stepId = parseInt(match[1]);
        if (!report.backend.stepsEmitted.includes(stepId)) {
          report.backend.stepsEmitted.push(stepId);
          console.log(`📡 [${elapsed()}s] Backend emitted step ${stepId}`);
        }
      }
    }
    
    // Track errors
    if (log.includes('ERROR') || log.includes('error') && !log.includes('[debug]')) {
      const errorLine = log.split('\n').find(l => l.includes('error'));
      if (errorLine) {
        console.error(`⚠️  Backend: ${errorLine.substring(0, 100)}`);
      }
    }
  });
} catch (e) {
  console.log('(Backend log monitoring not available)');
}

// Final report after timeout
setTimeout(() => {
  if (backendLogMonitor) backendLogMonitor.kill();
  socket.close();
  
  report.timing.totalTime = (Date.now() - startTime) / 1000;
  report.timing.backendGeneration = report.backend.planTime / 1000;
  report.timing.frontendDelivery = (report.timing.totalTime - report.timing.backendGeneration);
  
  console.log('\n' + '═'.repeat(100));
  console.log('📊 BRUTAL HONEST FINAL REPORT');
  console.log('═'.repeat(100));
  
  console.log(`\n⏱️  TIMING:`);
  console.log(`  Total time: ${report.timing.totalTime.toFixed(1)}s`);
  console.log(`  Backend generation: ${report.timing.backendGeneration.toFixed(1)}s`);
  console.log(`  Frontend delivery: ${report.timing.frontendDelivery.toFixed(1)}s`);
  
  console.log(`\n🔧 BACKEND:`);
  console.log(`  Plan received: ${report.backend.planReceived ? '✅' : '❌'}`);
  console.log(`  Steps generated: ${report.backend.stepsGenerated.sort().join(', ') || 'NONE'}`);
  console.log(`  Steps emitted: ${report.backend.stepsEmitted.sort().join(', ') || 'NONE'}`);
  console.log(`  Errors: ${report.backend.errors.length}`);
  
  console.log(`\n🖥️  FRONTEND:`);
  console.log(`  Steps received: ${report.frontend.stepsReceived.sort().join(', ') || 'NONE'}`);
  console.log(`  Total operations: ${report.frontend.operationsReceived}`);
  console.log(`  V2 operations: ${report.frontend.v2Operations}`);
  console.log(`  V2 ratio: ${report.frontend.operationsReceived > 0 ? (report.frontend.v2Operations / report.frontend.operationsReceived * 100).toFixed(0) : 0}%`);
  
  console.log(`\n🎨 OPERATIONS:`);
  console.log(`  V2 types used: ${[...new Set(report.operations.v2Types)].join(', ') || 'NONE'}`);
  console.log(`  Generic types: ${[...new Set(report.operations.genericTypes)].join(', ') || 'NONE'}`);
  
  console.log(`\n📋 STEP-BY-STEP BREAKDOWN:`);
  Object.entries(report.operations.byStep).forEach(([step, ops]) => {
    const total = Object.values(ops).reduce((sum, n) => sum + n, 0);
    console.log(`  Step ${step}: ${total} operations`);
    Object.entries(ops).slice(0, 5).forEach(([op, count]) => {
      console.log(`    - ${op}: ${count}`);
    });
  });
  
  // ANALYSIS
  console.log(`\n` + '═'.repeat(100));
  console.log('🔍 BRUTAL HONEST ANALYSIS');
  console.log('═'.repeat(100));
  
  const allStepsGenerated = report.backend.stepsGenerated.length === 5;
  const allStepsEmitted = report.backend.stepsEmitted.length === 5;
  const allStepsReceived = report.frontend.stepsReceived.length === 5;
  const usingV2 = report.frontend.v2Operations > report.operations.genericTypes.length;
  
  console.log(`\n✓ Backend Generation: ${allStepsGenerated ? '✅ WORKING' : '❌ BROKEN'}`);
  if (!allStepsGenerated) {
    console.log(`  → Only ${report.backend.stepsGenerated.length}/5 steps generated`);
    console.log(`  → Missing: ${[1,2,3,4,5].filter(s => !report.backend.stepsGenerated.includes(s)).join(', ')}`);
  }
  
  console.log(`\n✓ Backend Emission: ${allStepsEmitted ? '✅ WORKING' : '❌ BROKEN'}`);
  if (!allStepsEmitted) {
    console.log(`  → Only ${report.backend.stepsEmitted.length}/5 steps emitted`);
    console.log(`  → Generated but not emitted: ${report.backend.stepsGenerated.filter(s => !report.backend.stepsEmitted.includes(s)).join(', ') || 'None'}`);
  }
  
  console.log(`\n✓ Frontend Delivery: ${allStepsReceived ? '✅ WORKING' : '❌ BROKEN'}`);
  if (!allStepsReceived) {
    console.log(`  → Only ${report.frontend.stepsReceived.length}/5 steps received`);
    console.log(`  → Emitted but not received: ${report.backend.stepsEmitted.filter(s => !report.frontend.stepsReceived.includes(s)).join(', ') || 'None'}`);
    console.log(`  → DIAGNOSIS: WebSocket delivery failure`);
  }
  
  console.log(`\n✓ V2 Agent: ${usingV2 ? '✅ WORKING' : '❌ BROKEN'}`);
  if (!usingV2) {
    console.log(`  → V2 operations: ${report.frontend.v2Operations}`);
    console.log(`  → Generic shapes: ${report.operations.genericTypes.length}`);
    console.log(`  → DIAGNOSIS: Still using V1 generic shapes`);
  }
  
  console.log(`\n✓ Frontend Rendering: ${'⚠️  UNKNOWN (check browser console)'}`);
  console.log(`  → Operations received: ${report.frontend.operationsReceived}`);
  console.log(`  → Check browser developer console for rendering errors`);
  
  // FINAL VERDICT
  console.log(`\n` + '═'.repeat(100));
  console.log('💎 FINAL VERDICT');
  console.log('═'.repeat(100));
  
  const score = (
    (allStepsGenerated ? 25 : 0) +
    (allStepsEmitted ? 25 : 0) +
    (allStepsReceived ? 25 : 0) +
    (usingV2 ? 25 : 0)
  );
  
  console.log(`\n📈 SYSTEM SCORE: ${score}/100\n`);
  
  if (score === 100) {
    console.log('✅ PERFECT - All systems working');
  } else if (score >= 75) {
    console.log('⚠️  PARTIAL - Some issues remain');
  } else if (score >= 50) {
    console.log('❌ BROKEN - Major issues present');
  } else {
    console.log('💀 CRITICAL FAILURE - System not working');
  }
  
  console.log('\n' + '═'.repeat(100));
  
  // Save report
  fs.writeFileSync('/home/komail/LeaF/brutal_reality_report.json', JSON.stringify(report, null, 2));
  console.log('📄 Full report saved: brutal_reality_report.json\n');
  
  process.exit(score >= 75 ? 0 : 1);
}, 60000);
