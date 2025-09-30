const io = require('socket.io-client');
const axios = require('axios');

console.log('🧪 Testing V2 Agent - Amplifier Query\n');

const sessionId = `v2-test-${Date.now()}`;
const query = 'explain how amplifiers work';
const startTime = Date.now();

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: false
});

let stepCount = 0;
let domainToolsFound = false;

socket.on('connect', () => {
  console.log('✅ Connected to backend\n');
  socket.emit('join', { sessionId });
  
  setTimeout(() => {
    axios.post('http://localhost:3001/api/query', { query, sessionId })
      .then(() => console.log('📤 Query sent: "' + query + '"\n'))
      .catch(err => console.error('❌ API Error:', err.message));
  }, 500);
});

socket.on('progress', (data) => {
  console.log(`⏳ ${data.message || data.status}`);
});

socket.on('rendered', (data) => {
  if (data.stepId && data.actions) {
    stepCount++;
    console.log(`\n🔸 Step ${data.stepId}: ${data.actions.length} operations`);
    
    // Check for V2-specific operations
    const v2Tools = ['drawCircuitElement', 'drawSignalWaveform', 'drawConnection', 
                     'drawForceVector', 'drawMolecule', 'drawAtom'];
    
    const v2OpsFound = data.actions.filter(a => v2Tools.includes(a.op));
    
    if (v2OpsFound.length > 0) {
      domainToolsFound = true;
      console.log('   ✅ V2 TOOLS FOUND:');
      v2OpsFound.forEach(op => {
        console.log(`      - ${op.op}: ${JSON.stringify(op).substring(0, 80)}...`);
      });
    } else {
      console.log('   ⚠️  No V2 domain tools (still using generic shapes)');
    }
    
    // Show operation breakdown
    const opCounts = {};
    data.actions.forEach(a => opCounts[a.op] = (opCounts[a.op] || 0) + 1);
    console.log('   Operations:', Object.entries(opCounts).map(([k,v]) => `${k}(${v})`).join(', '));
  }
});

setTimeout(() => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('═'.repeat(60));
  console.log(`Time: ${elapsed}s`);
  console.log(`Steps generated: ${stepCount}/5`);
  
  if (domainToolsFound) {
    console.log('\n✅ SUCCESS - V2 AGENT IS WORKING!');
    console.log('Domain-specific tools are being generated');
  } else {
    console.log('\n❌ FAILURE - V2 NOT WORKING');
    console.log('Still generating generic shapes only');
  }
  
  process.exit(domainToolsFound ? 0 : 1);
}, 50000);
