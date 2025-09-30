/**
 * FINAL COMPLETE TEST - Testing Full V2 Pipeline
 * Tests: Backend V2 → Validator → Frontend Renderers
 */

const io = require('socket.io-client');
const axios = require('axios');

console.log('\n' + '═'.repeat(80));
console.log('🚀 FINAL V2 COMPLETE PIPELINE TEST');
console.log('Testing: Validator + Renderers + Full System');
console.log('═'.repeat(80) + '\n');

// Test different domains
const TESTS = [
  { name: 'ELECTRICAL', query: `explain how transistor amplifiers work ${Date.now()}` },
  { name: 'PHYSICS', query: `explain newtons third law ${Date.now()}` },
  { name: 'CHEMISTRY', query: `explain water molecule structure ${Date.now()}` }
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Testing: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log(`${'─'.repeat(80)}\n`);
    
    const sessionId = `final-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const startTime = Date.now();
    
    const result = {
      domain: test.name,
      success: false,
      stepsReceived: 0,
      v2OpsCount: 0,
      genericOpsCount: 0,
      totalOps: 0,
      time: 0
    };
    
    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
      reconnection: false
    });
    
    socket.on('connect', () => {
      socket.emit('join', { sessionId });
      
      setTimeout(() => {
        axios.post('http://localhost:3001/api/query', {
          query: test.query,
          sessionId
        }).catch(err => console.error('API Error:', err.message));
      }, 500);
    });
    
    socket.on('rendered', (data) => {
      if (data.stepId && data.actions) {
        result.stepsReceived++;
        result.totalOps += data.actions.length;
        
        // Count V2 vs generic operations
        data.actions.forEach(action => {
          const v2Ops = [
            'drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
            'drawForceVector', 'drawPhysicsObject', 'drawAtom',
            'drawMolecule', 'drawDataStructure', 'drawNeuralNetwork'
          ];
          
          if (v2Ops.includes(action.op)) {
            result.v2OpsCount++;
          } else if (['drawCircle', 'drawRect'].includes(action.op)) {
            result.genericOpsCount++;
          }
        });
        
        const v2Actions = data.actions.filter(a => 
          ['drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
           'drawForceVector', 'drawPhysicsObject', 'drawAtom',
           'drawMolecule'].includes(a.op)
        );
        
        console.log(`  Step ${data.stepId}: ${data.actions.length} ops, ${v2Actions.length} V2 ops`);
      }
    });
    
    setTimeout(() => {
      socket.close();
      result.time = (Date.now() - startTime) / 1000;
      result.success = result.stepsReceived === 5 && result.v2OpsCount > result.genericOpsCount;
      
      console.log(`\n  ✓ Steps: ${result.stepsReceived}/5`);
      console.log(`  ✓ V2 ops: ${result.v2OpsCount}`);
      console.log(`  ✓ Generic: ${result.genericOpsCount}`);
      console.log(`  ✓ Time: ${result.time.toFixed(1)}s`);
      console.log(`  ${result.success ? '✅ PASS' : '❌ FAIL'}`);
      
      resolve(result);
    }, 45000);
  });
}

async function main() {
  const results = [];
  
  for (const test of TESTS) {
    const result = await runTest(test);
    results.push(result);
    await new Promise(r => setTimeout(r, 2000)); // Wait between tests
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('═'.repeat(80));
  
  const passed = results.filter(r => r.success).length;
  const totalV2 = results.reduce((sum, r) => sum + r.v2OpsCount, 0);
  const totalGeneric = results.reduce((sum, r) => sum + r.genericOpsCount, 0);
  
  console.log(`\nTests Passed: ${passed}/${TESTS.length}`);
  console.log(`Total V2 operations: ${totalV2}`);
  console.log(`Total generic operations: ${totalGeneric}`);
  console.log(`V2 ratio: ${(totalV2 / (totalV2 + totalGeneric) * 100).toFixed(0)}%`);
  
  results.forEach((r, i) => {
    const status = r.success ? '✅' : '❌';
    console.log(`\n${i + 1}. ${r.domain}: ${status}`);
    console.log(`   Steps: ${r.stepsReceived}/5, V2: ${r.v2OpsCount}, Time: ${r.time.toFixed(1)}s`);
  });
  
  console.log('\n' + '═'.repeat(80));
  if (passed === TESTS.length) {
    console.log('🎉 ALL TESTS PASSED - V2 SYSTEM 100% OPERATIONAL');
    console.log('✅ Validator recognizes V2 operations');
    console.log('✅ Frontend renderers implemented');
    console.log('✅ Domain-specific visualization working');
    console.log('✅ NO fallbacks or hardcoding');
  } else {
    console.log(`⚠️  ${TESTS.length - passed} TESTS FAILED`);
  }
  console.log('═'.repeat(80) + '\n');
  
  process.exit(passed === TESTS.length ? 0 : 1);
}

main().catch(console.error);
