const io = require('socket.io-client');
const axios = require('axios');

console.log('\n🧪 Simple V2 Test - Checking domain tools\n');

const query = `explain operational amplifiers in detail ${Date.now()}`;
const sessionId = `simple-${Date.now()}`;

const socket = io('http://localhost:3001', {
  transports: ['websocket']
});

let v2Found = false;
let stepCount = 0;
const domainOps = [];
const genericOps = [];

socket.on('connect', () => {
  socket.emit('join', { sessionId });
  console.log('Connected, sending query...\n');
  
  setTimeout(() => {
    axios.post('http://localhost:3001/api/query', { query, sessionId })
      .catch(err => console.error('API Error:', err.message));
  }, 500);
});

socket.on('rendered', (data) => {
  if (data.stepId && data.actions) {
    stepCount++;
    
    // Count operations
    data.actions.forEach(action => {
      if (['drawCircuitElement', 'drawSignalWaveform', 'drawConnection'].includes(action.op)) {
        domainOps.push(action.op);
        v2Found = true;
      } else if (['drawCircle', 'drawRect'].includes(action.op)) {
        genericOps.push(action.op);
      }
    });
    
    console.log(`Step ${data.stepId}: ${data.actions.length} ops`);
    
    // Show first few V2 operations
    const v2Actions = data.actions.filter(a => 
      ['drawCircuitElement', 'drawSignalWaveform', 'drawConnection'].includes(a.op)
    );
    
    if (v2Actions.length > 0) {
      console.log(`  ✅ V2 ops found: ${v2Actions.length}`);
      v2Actions.slice(0, 2).forEach(a => {
        console.log(`    - ${a.op}: ${a.type || a.waveform || 'wire'}`);
      });
    } else {
      console.log(`  ❌ No V2 ops - using generic shapes`);
    }
  }
});

setTimeout(() => {
  console.log('\n' + '═'.repeat(60));
  console.log('RESULTS:');
  console.log('═'.repeat(60));
  console.log(`Steps: ${stepCount}/5`);
  console.log(`Domain ops: ${domainOps.length}`);
  console.log(`Generic ops: ${genericOps.length}`);
  
  if (v2Found && domainOps.length > genericOps.length) {
    console.log('\n✅ V2 WORKING - Domain tools dominate');
  } else if (v2Found) {
    console.log('\n⚠️  V2 PARTIAL - Some domain tools but too many generics');
  } else {
    console.log('\n❌ V2 NOT WORKING - Only generic shapes');
  }
  
  process.exit(0);
}, 45000);
