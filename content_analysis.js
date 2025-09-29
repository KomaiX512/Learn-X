const io = require('socket.io-client');
const axios = require('axios');

console.log('\n=== CONTENT ANALYSIS TEST ===\n');

const sessionId = `content-test-${Date.now()}`;
const query = 'teach me binary search';

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: true
});

let stepCount = 0;
let totalLabels = 0;
let totalDrawOps = 0;

socket.on('connect', () => {
  console.log('✅ Connected');
  socket.emit('join', { sessionId });
});

socket.on('rendered', (data) => {
  if (data.stepId && data.actions) {
    stepCount++;
    console.log(`\n📦 STEP ${data.stepId} CONTENT:`);
    console.log(`   Total actions: ${data.actions.length}`);
    
    // Analyze each action
    let labels = [];
    let draws = [];
    let animations = [];
    
    data.actions.forEach(action => {
      if (action.op === 'drawLabel' || action.op === 'drawTitle' || action.op === 'drawMathLabel') {
        labels.push({
          op: action.op,
          text: action.text || action.label || 'NO TEXT'
        });
        totalLabels++;
      } else if (action.op?.startsWith('draw')) {
        draws.push(action.op);
        totalDrawOps++;
      } else if (['orbit', 'wave', 'particle', 'arrow'].includes(action.op)) {
        animations.push(action.op);
      }
    });
    
    console.log(`   Labels found: ${labels.length}`);
    if (labels.length > 0) {
      console.log('   Sample labels:');
      labels.slice(0, 5).forEach(l => {
        console.log(`     - [${l.op}]: "${l.text}"`);
      });
    }
    
    console.log(`   Draw operations: ${draws.length}`);
    console.log(`   Animations: ${animations.length}`);
    
    // Check for suspicious content
    const hasLabels = labels.length > 0;
    const hasVisuals = draws.length > 0;
    
    if (!hasLabels) {
      console.log('   ❌ WARNING: No educational labels!');
    }
    if (!hasVisuals) {
      console.log('   ❌ WARNING: No visual content!');
    }
  }
});

// Make request
setTimeout(async () => {
  console.log(`\n🚀 Testing: "${query}"`);
  
  try {
    await axios.post('http://localhost:3001/api/query', {
      query,
      sessionId
    });
    console.log('✅ Request sent\n');
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}, 1000);

// Final report
setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 CONTENT ANALYSIS REPORT');
  console.log('='.repeat(50));
  console.log(`Steps received: ${stepCount}/5`);
  console.log(`Total labels: ${totalLabels}`);
  console.log(`Total draw operations: ${totalDrawOps}`);
  console.log(`Average labels per step: ${(totalLabels / stepCount).toFixed(1)}`);
  console.log(`Average draws per step: ${(totalDrawOps / stepCount).toFixed(1)}`);
  
  if (totalLabels === 0) {
    console.log('\n❌ CRITICAL: NO LABELS FOUND!');
    console.log('Students will see shapes without any explanations!');
  } else if (totalLabels < 10) {
    console.log('\n⚠️ WARNING: Very few labels');
  } else {
    console.log('\n✅ Good educational content with labels');
  }
  
  console.log('='.repeat(50));
  process.exit(0);
}, 30000);
