/**
 * Test Delivery Fix - Verify all 5 steps are delivered and rendered
 */

const io = require('socket.io-client');
const axios = require('axios');

console.log('\n🧪 TESTING DELIVERY FIX\n');

const query = `explain maxwell equations ${Date.now()}`;
const sessionId = `delivery-test-${Date.now()}`;
let stepsReceived = 0;
const receivedSteps = [];

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: false
});

socket.on('connect', () => {
  console.log('✅ Connected to backend\n');
  socket.emit('join', { sessionId });
  
  setTimeout(() => {
    console.log(`📤 Sending query: "${query}"\n`);
    axios.post('http://localhost:3001/api/query', {
      query,
      sessionId
    }).catch(err => console.error('API Error:', err.message));
  }, 500);
});

socket.on('rendered', (data) => {
  if (data.stepId && data.actions) {
    stepsReceived++;
    receivedSteps.push(data.stepId);
    
    const v2Ops = data.actions.filter(a => 
      ['drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
       'drawForceVector', 'drawPhysicsObject', 'drawAtom'].includes(a.op)
    ).length;
    
    console.log(`✅ Step ${data.stepId} received: ${data.actions.length} ops (${v2Ops} V2 ops)`);
  }
});

setTimeout(() => {
  socket.close();
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 DELIVERY TEST RESULTS');
  console.log('═'.repeat(60));
  console.log(`Steps received: ${stepsReceived}/5`);
  console.log(`Step IDs: ${receivedSteps.join(', ')}`);
  
  if (stepsReceived === 5 && receivedSteps.length === 5) {
    console.log('\n✅ SUCCESS - All 5 steps delivered!');
    console.log('✅ Delivery fix working!');
    process.exit(0);
  } else {
    console.log('\n❌ FAILURE - Missing steps');
    console.log(`Expected: 1, 2, 3, 4, 5`);
    console.log(`Got: ${receivedSteps.join(', ')}`);
    process.exit(1);
  }
}, 50000);
