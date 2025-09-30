const io = require('socket.io-client');
const axios = require('axios');

const uniqueQuery = `explain operational amplifiers ${Date.now()}`;
console.log(`🧪 Testing V2 with unique query: "${uniqueQuery}"\n`);

const sessionId = `v2-uncached-${Date.now()}`;
const startTime = Date.now();

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: false
});

let stepCount = 0;
let v2ToolsFound = false;

socket.on('connect', () => {
  console.log('✅ Connected\n');
  socket.emit('join', { sessionId });
  
  setTimeout(() => {
    axios.post('http://localhost:3001/api/query', { query: uniqueQuery, sessionId })
      .then(() => console.log('📤 Query sent\n'))
      .catch(err => console.error('❌ API Error:', err.message));
  }, 500);
});

socket.on('rendered', (data) => {
  if (data.stepId && data.actions) {
    stepCount++;
    console.log(`\n🔸 Step ${data.stepId}: ${data.actions.length} operations`);
    
    // Look for V2-specific operations
    const v2Ops = data.actions.filter(a => 
      ['drawCircuitElement', 'drawSignalWaveform', 'drawConnection'].includes(a.op)
    );
    
    if (v2Ops.length > 0) {
      v2ToolsFound = true;
      console.log(`   ✅ V2 TOOLS FOUND: ${v2Ops.length} domain-specific operations`);
      v2Ops.slice(0, 3).forEach(op => {
        console.log(`      - ${op.op}: ${JSON.stringify(op).substring(0, 70)}...`);
      });
    } else {
      // Show what we got instead
      const ops = {};
      data.actions.forEach(a => ops[a.op] = (ops[a.op] || 0) + 1);
      console.log(`   ❌ Still using V1 generic shapes:`);
      console.log(`      ${Object.entries(ops).map(([k,v]) => `${k}(${v})`).slice(0, 5).join(', ')}...`);
    }
  }
});

setTimeout(() => {
  console.log('\n' + '═'.repeat(60));
  if (v2ToolsFound) {
    console.log('✅ SUCCESS - V2 IS WORKING!');
  } else {
    console.log('❌ FAILURE - V2 NOT WORKING');
    console.log('\nChecking backend logs for errors...');
  }
  console.log('═'.repeat(60));
  process.exit(v2ToolsFound ? 0 : 1);
}, 45000);
