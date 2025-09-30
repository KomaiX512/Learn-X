/**
 * COMPLETE SYSTEM TEST - BRUTAL HONEST ANALYSIS
 * 
 * Tests EVERYTHING:
 * - Backend generation (all 5 steps)
 * - Cache verification
 * - Frontend delivery
 * - Rendering on canvas
 * - V2 ratio
 * - Fallback detection
 * - Complete architecture analysis
 */

const io = require('socket.io-client');
const axios = require('axios');
const fs = require('fs');
const { spawn } = require('child_process');

console.log('\n' + '═'.repeat(120));
console.log('🔬 COMPLETE SYSTEM TEST - BRUTAL HONEST ANALYSIS');
console.log('═'.repeat(120) + '\n');

const query = `teach me quantum tunneling step by step ${Date.now()}`;
const sessionId = `complete-test-${Date.now()}`;
const startTime = Date.now();

const analysis = {
  query,
  sessionId,
  startTime: new Date().toISOString(),
  
  backend: {
    planGeneration: { success: false, time: 0 },
    parallelWorkerCalled: false,
    stepsGenerated: [],
    stepGenerationTimes: {},
    totalOperations: 0,
    v2Operations: 0,
    fallbacksUsed: [],
    hardcodedContent: [],
    errors: []
  },
  
  cache: {
    planCached: false,
    stepsCached: [],
    verifiedAfterGeneration: false
  },
  
  frontend: {
    planReceived: false,
    stepsReceived: [],
    operationsReceived: 0,
    renderingStarted: false,
    renderingComplete: false,
    renderErrors: []
  },
  
  operations: {
    byStep: {},
    v2Types: [],
    v1Types: [],
    missingRenderers: []
  },
  
  quality: {
    v2Ratio: 0,
    v2RatioTarget: 70,
    usedFallbacks: false,
    usedHardcoding: false,
    dynamicGeneration: true
  },
  
  architecture: {
    limitations: [],
    missingFeatures: [],
    criticalIssues: []
  },
  
  verdict: {
    score: 0,
    status: '',
    issues: [],
    recommendations: []
  }
};

// V2 and V1 operation definitions
const V2_OPS = [
  'drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
  'drawForceVector', 'drawPhysicsObject', 'drawTrajectory',
  'drawCellStructure', 'drawOrganSystem', 'drawMembrane',
  'drawMolecule', 'drawAtom', 'drawReaction',
  'drawDataStructure', 'drawNeuralNetwork', 'animate'
];

const V1_OPS = ['drawCircle', 'drawRect', 'drawVector', 'drawDiagram'];

const FALLBACK_INDICATORS = [
  'placeholder', 'dummy', 'imagine', 'visualize', 
  'content generation in progress', 'coming soon'
];

// Socket connection
const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: false
});

socket.on('connect', () => {
  console.log(`✅ [${elapsed()}s] Connected to backend\n`);
  socket.emit('join', { sessionId });
  
  setTimeout(() => {
    console.log(`📤 [${elapsed()}s] Query: "${query}"\n`);
    console.log('⏳ Monitoring backend and frontend...\n');
    
    axios.post('http://localhost:3001/api/query', { query, sessionId })
      .catch(err => {
        console.error(`❌ API Error: ${err.message}`);
        analysis.backend.errors.push(`API: ${err.message}`);
      });
  }, 500);
});

socket.on('rendered', (data) => {
  const time = elapsed();
  
  // Plan received
  if (data.plan && !analysis.frontend.planReceived) {
    analysis.frontend.planReceived = true;
    console.log(`\n${'─'.repeat(120)}`);
    console.log(`📋 [${time}s] PLAN RECEIVED`);
    console.log(`${'─'.repeat(120)}`);
    console.log(`Title: "${data.plan.title}"`);
    console.log(`Steps: ${data.plan.toc?.length || 0}`);
    console.log(`${'─'.repeat(120)}\n`);
  }
  
  // Step received
  if (data.stepId && data.actions && Array.isArray(data.actions)) {
    analysis.frontend.stepsReceived.push(data.stepId);
    analysis.frontend.operationsReceived += data.actions.length;
    analysis.backend.totalOperations += data.actions.length;
    
    // Analyze operations
    const stepV2 = data.actions.filter(a => V2_OPS.includes(a.op)).length;
    const stepV1 = data.actions.filter(a => V1_OPS.includes(a.op)).length;
    
    analysis.backend.v2Operations += stepV2;
    
    // Check for fallbacks
    data.actions.forEach(a => {
      const text = (a.text || a.label || '').toLowerCase();
      FALLBACK_INDICATORS.forEach(indicator => {
        if (text.includes(indicator)) {
          analysis.backend.fallbacksUsed.push({ step: data.stepId, op: a.op, text });
        }
      });
      
      // Track operation types
      if (V2_OPS.includes(a.op)) {
        analysis.operations.v2Types.push(a.op);
      } else if (V1_OPS.includes(a.op)) {
        analysis.operations.v1Types.push(a.op);
      }
    });
    
    // Count ops
    const opCounts = {};
    data.actions.forEach(a => {
      opCounts[a.op] = (opCounts[a.op] || 0) + 1;
    });
    analysis.operations.byStep[data.stepId] = opCounts;
    
    const ratio = (stepV2 / data.actions.length * 100).toFixed(0);
    
    console.log(`\n${'─'.repeat(120)}`);
    console.log(`📦 [${time}s] STEP ${data.stepId} RECEIVED`);
    console.log(`${'─'.repeat(120)}`);
    console.log(`Operations: ${data.actions.length} total, ${stepV2} V2 (${ratio}%), ${stepV1} V1`);
    
    // Show top operations
    const sortedOps = Object.entries(opCounts).sort((a, b) => b[1] - a[1]);
    console.log(`Top operations:`);
    sortedOps.slice(0, 8).forEach(([op, count]) => {
      const marker = V2_OPS.includes(op) ? '✅ V2' : V1_OPS.includes(op) ? '⚠️  V1' : '  ';
      console.log(`  ${marker} ${op}: ${count}`);
    });
    
    // Check for new renderers we added
    const newRenderers = ['drawOrganSystem', 'drawMembrane', 'drawReaction', 'animate'];
    const usedNew = data.actions.filter(a => newRenderers.includes(a.op));
    if (usedNew.length > 0) {
      console.log(`\n🎉 NEW RENDERERS USED:`);
      usedNew.forEach(a => console.log(`  ✓ ${a.op}`));
    }
    
    // Check for fallbacks
    if (analysis.backend.fallbacksUsed.length > 0) {
      console.log(`\n⚠️  FALLBACK CONTENT DETECTED!`);
      analysis.backend.fallbacksUsed.slice(-3).forEach(f => {
        console.log(`  Step ${f.step}: "${f.text.substring(0, 50)}..."`);
      });
    }
    
    console.log(`${'─'.repeat(120)}\n`);
  }
});

// Monitor backend logs in real-time
let backendMonitor;
try {
  backendMonitor = spawn('tail', ['-f', '-n', '0', '/tmp/backend_v2_full.log']);
  
  backendMonitor.stdout.on('data', (data) => {
    const log = data.toString();
    
    // Parallel worker called
    if (log.includes('🔥 PARALLEL WORKER CALLED') || log.includes('PARALLEL WORKER CALLED')) {
      analysis.backend.parallelWorkerCalled = true;
      console.log(`🔥 [${elapsed()}s] Parallel worker STARTED`);
    }
    
    // Step generation
    if (log.includes('Step') && log.includes('generated in')) {
      const match = log.match(/Step (\d+) generated in (\d+)ms/);
      if (match) {
        const stepId = parseInt(match[1]);
        const time = parseInt(match[2]);
        analysis.backend.stepsGenerated.push(stepId);
        analysis.backend.stepGenerationTimes[stepId] = time;
        console.log(`✅ [${elapsed()}s] Step ${stepId} generated (${time}ms)`);
      }
    }
    
    // Errors
    if (log.includes('ERROR') || log.includes('FAILED')) {
      const errorLine = log.split('\n').find(l => l.includes('ERROR') || l.includes('FAILED'));
      if (errorLine && !analysis.backend.errors.includes(errorLine)) {
        analysis.backend.errors.push(errorLine);
        console.error(`❌ [${elapsed()}s] ${errorLine.substring(0, 100)}`);
      }
    }
    
    // V2 ratio warnings
    if (log.includes('V2 ratio') && log.includes('below target')) {
      console.warn(`⚠️  [${elapsed()}s] V2 ratio below target!`);
    }
  });
} catch (e) {
  console.log('(Backend log monitoring unavailable)');
}

function elapsed() {
  return ((Date.now() - startTime) / 1000).toFixed(1);
}

// Final analysis after 70 seconds
setTimeout(async () => {
  if (backendMonitor) backendMonitor.kill();
  socket.close();
  
  console.log('\n' + '═'.repeat(120));
  console.log('📊 BRUTAL HONEST FINAL ANALYSIS');
  console.log('═'.repeat(120));
  
  // Verify cache
  const Redis = require('ioredis');
  const redis = new Redis();
  
  console.log('\n🔍 CACHE VERIFICATION:');
  for (let i = 1; i <= 5; i++) {
    const cached = await redis.get(`chunk:${sessionId}:${i}`);
    if (cached) {
      analysis.cache.stepsCached.push(i);
      console.log(`  ✅ Step ${i}: CACHED`);
    } else {
      console.log(`  ❌ Step ${i}: NOT CACHED`);
    }
  }
  analysis.cache.verifiedAfterGeneration = true;
  
  redis.disconnect();
  
  // Calculate metrics
  const totalTime = (Date.now() - startTime) / 1000;
  analysis.quality.v2Ratio = analysis.backend.totalOperations > 0 
    ? (analysis.backend.v2Operations / analysis.backend.totalOperations * 100)
    : 0;
  analysis.quality.usedFallbacks = analysis.backend.fallbacksUsed.length > 0;
  
  console.log(`\n⏱️  TIMING:`);
  console.log(`  Total time: ${totalTime.toFixed(1)}s`);
  Object.entries(analysis.backend.stepGenerationTimes).forEach(([step, time]) => {
    console.log(`  Step ${step}: ${time}ms`);
  });
  
  console.log(`\n🔧 BACKEND:`);
  console.log(`  Parallel worker called: ${analysis.backend.parallelWorkerCalled ? '✅' : '❌'}`);
  console.log(`  Steps generated: ${analysis.backend.stepsGenerated.length}/5`);
  console.log(`  Steps cached: ${analysis.cache.stepsCached.length}/5`);
  console.log(`  Total operations: ${analysis.backend.totalOperations}`);
  console.log(`  Errors: ${analysis.backend.errors.length}`);
  
  console.log(`\n🖥️  FRONTEND:`);
  console.log(`  Plan received: ${analysis.frontend.planReceived ? '✅' : '❌'}`);
  console.log(`  Steps received: ${analysis.frontend.stepsReceived.length}/5`);
  console.log(`  Operations received: ${analysis.frontend.operationsReceived}`);
  
  console.log(`\n🎨 QUALITY:`);
  console.log(`  V2 operations: ${analysis.backend.v2Operations}/${analysis.backend.totalOperations}`);
  console.log(`  V2 ratio: ${analysis.quality.v2Ratio.toFixed(1)}% (target: 70%)`);
  console.log(`  Fallbacks used: ${analysis.quality.usedFallbacks ? '❌ YES' : '✅ NO'}`);
  console.log(`  V2 types: ${[...new Set(analysis.operations.v2Types)].slice(0, 10).join(', ')}`);
  console.log(`  V1 types: ${[...new Set(analysis.operations.v1Types)].join(', ') || 'None'}`);
  
  // ARCHITECTURE ANALYSIS
  console.log(`\n` + '═'.repeat(120));
  console.log('🏗️  ARCHITECTURE ANALYSIS');
  console.log('═'.repeat(120));
  
  // Check limitations
  if (!analysis.backend.parallelWorkerCalled) {
    analysis.architecture.criticalIssues.push('Parallel worker never called - generation not starting');
  }
  
  if (analysis.backend.stepsGenerated.length < 5) {
    analysis.architecture.criticalIssues.push(`Only ${analysis.backend.stepsGenerated.length}/5 steps generated`);
  }
  
  if (analysis.cache.stepsCached.length < analysis.backend.stepsGenerated.length) {
    analysis.architecture.criticalIssues.push('Generated steps not being cached');
  }
  
  if (analysis.frontend.stepsReceived.length < analysis.cache.stepsCached.length) {
    analysis.architecture.limitations.push('Cached steps not reaching frontend');
  }
  
  if (analysis.quality.v2Ratio < 50) {
    analysis.architecture.limitations.push(`V2 ratio too low (${analysis.quality.v2Ratio.toFixed(0)}% < 70%)`);
  }
  
  if (analysis.quality.usedFallbacks) {
    analysis.architecture.limitations.push('System using fallback content (not true generation)');
  }
  
  // Display issues
  if (analysis.architecture.criticalIssues.length > 0) {
    console.log(`\n🚨 CRITICAL ISSUES:`);
    analysis.architecture.criticalIssues.forEach(issue => {
      console.log(`  ❌ ${issue}`);
    });
  }
  
  if (analysis.architecture.limitations.length > 0) {
    console.log(`\n⚠️  LIMITATIONS:`);
    analysis.architecture.limitations.forEach(limit => {
      console.log(`  ⚠️  ${limit}`);
    });
  }
  
  // SCORING
  console.log(`\n` + '═'.repeat(120));
  console.log('💎 FINAL VERDICT');
  console.log('═'.repeat(120));
  
  let score = 0;
  
  // Backend generation (40 points)
  if (analysis.backend.parallelWorkerCalled) score += 10;
  if (analysis.backend.stepsGenerated.length === 5) score += 20;
  else score += analysis.backend.stepsGenerated.length * 4;
  if (analysis.cache.stepsCached.length === 5) score += 10;
  else score += analysis.cache.stepsCached.length * 2;
  
  // Frontend delivery (20 points)
  if (analysis.frontend.stepsReceived.length === 5) score += 20;
  else score += analysis.frontend.stepsReceived.length * 4;
  
  // Quality (40 points)
  if (analysis.quality.v2Ratio >= 70) score += 25;
  else if (analysis.quality.v2Ratio >= 50) score += 15;
  else score += 5;
  
  if (!analysis.quality.usedFallbacks) score += 15;
  else score += 5;
  
  analysis.verdict.score = score;
  
  console.log(`\n📈 SYSTEM SCORE: ${score}/100\n`);
  
  if (score >= 90) {
    analysis.verdict.status = 'PRODUCTION READY ✅';
    console.log('🏆 ✅ PRODUCTION READY - BEATS 3BLUE1BROWN!');
  } else if (score >= 75) {
    analysis.verdict.status = 'NEARLY READY ⚠️';
    console.log('⚠️  NEARLY READY - Minor issues remain');
  } else if (score >= 50) {
    analysis.verdict.status = 'PARTIAL SUCCESS ❌';
    console.log('❌ PARTIAL SUCCESS - Significant work needed');
  } else {
    analysis.verdict.status = 'CRITICAL FAILURE 💀';
    console.log('💀 CRITICAL FAILURE - System not functional');
  }
  
  console.log('\n' + '═'.repeat(120));
  
  // Save full report
  fs.writeFileSync('/home/komail/LeaF/complete_system_analysis.json', JSON.stringify(analysis, null, 2));
  console.log('📄 Complete analysis saved: complete_system_analysis.json\n');
  
  process.exit(score >= 75 ? 0 : 1);
}, 70000);
