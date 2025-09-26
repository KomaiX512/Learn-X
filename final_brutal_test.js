// FINAL BRUTAL HONEST TEST - Complete end-to-end verification
const io = require('socket.io-client');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const sessionId = `final-test-${Date.now()}`;

console.log('🔬 FINAL BRUTAL HONEST TEST');
console.log('=' .repeat(60));
console.log(`Session ID: ${sessionId}`);
console.log('Testing complete pipeline: Socket → Query → Plan → Generate → Emit → Render\n');

// Track all events
const events = {
  socketConnected: false,
  roomJoined: false,
  queryAccepted: false,
  planGenerated: false,
  chunksReceived: 0,
  actionsReceived: 0,
  errors: []
};

// Connect socket
const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  reconnection: true
});

socket.on('connect', () => {
  events.socketConnected = true;
  console.log('✅ [1/6] Socket connected:', socket.id);
  socket.emit('join', { sessionId });
});

socket.on('joined', (data) => {
  events.roomJoined = true;
  console.log('✅ [2/6] Room joined:', data.sessionId);
});

socket.on('test', (data) => {
  console.log('📨 Test message:', data.message);
});

// Main event - rendered content
socket.on('rendered', (data) => {
  events.chunksReceived++;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 CHUNK RECEIVED #${events.chunksReceived}`);
  console.log(`${'='.repeat(60)}`);
  
  // Plan info
  if (data.plan) {
    events.planGenerated = true;
    console.log('📚 PLAN:');
    console.log('  Title:', data.plan.title);
    console.log('  Subtitle:', data.plan.subtitle);
    if (data.plan.toc) {
      console.log('  TOC:', data.plan.toc.length, 'items');
    }
  }
  
  // Step info
  if (data.step) {
    console.log('📝 STEP:');
    console.log('  ID:', data.step.id);
    console.log('  Tag:', data.step.tag);
    console.log('  Description:', data.step.desc?.substring(0, 100));
  }
  
  // Actions info
  if (data.actions && Array.isArray(data.actions)) {
    events.actionsReceived += data.actions.length;
    console.log('🎨 ACTIONS:', data.actions.length, 'total');
    
    // Count by type
    const types = {};
    data.actions.forEach(a => {
      types[a.op] = (types[a.op] || 0) + 1;
    });
    
    console.log('  Breakdown:');
    Object.entries(types).forEach(([op, count]) => {
      console.log(`    - ${op}: ${count}`);
    });
    
    // Show first few actions
    console.log('  First 5 actions:');
    data.actions.slice(0, 5).forEach((a, i) => {
      let detail = '';
      if (a.text) detail = `"${a.text.substring(0, 50)}..."`;
      if (a.tex) detail = `LaTeX: ${a.tex}`;
      if (a.points) detail = `${a.points.length} points`;
      console.log(`    ${i+1}. ${a.op} ${detail}`);
    });
  }
});

socket.on('error', (error) => {
  events.errors.push(error);
  console.error('❌ Socket error:', error);
});

// Send query after connection
setTimeout(async () => {
  console.log('\n📤 [3/6] Sending query...');
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/query`, {
      query: 'TEST: Draw parabola y=x^2 with vertex and axis labels',
      sessionId: sessionId
    });
    
    events.queryAccepted = true;
    console.log('✅ [4/6] Query accepted');
    console.log('⏳ [5/6] Waiting for plan generation and rendering...');
    
  } catch (error) {
    events.errors.push(error.message);
    console.error('❌ Query failed:', error.message);
  }
}, 2000);

// Final report after 60 seconds
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(60));
  
  console.log('\n✅ SUCCESSES:');
  if (events.socketConnected) console.log('  • Socket connected');
  if (events.roomJoined) console.log('  • Room joined');
  if (events.queryAccepted) console.log('  • Query accepted');
  if (events.planGenerated) console.log('  • Plan generated');
  if (events.chunksReceived > 0) console.log(`  • ${events.chunksReceived} chunks received`);
  if (events.actionsReceived > 0) console.log(`  • ${events.actionsReceived} total actions`);
  
  console.log('\n❌ FAILURES:');
  if (!events.socketConnected) console.log('  • Socket connection failed');
  if (!events.roomJoined) console.log('  • Room join failed');
  if (!events.queryAccepted) console.log('  • Query not accepted');
  if (!events.planGenerated) console.log('  • Plan not generated');
  if (events.chunksReceived === 0) console.log('  • NO CHUNKS RECEIVED');
  if (events.actionsReceived === 0) console.log('  • NO ACTIONS RECEIVED');
  
  if (events.errors.length > 0) {
    console.log('\n🔥 ERRORS:');
    events.errors.forEach(e => console.log('  •', e));
  }
  
  console.log('\n🎯 VERDICT:');
  if (events.chunksReceived > 0 && events.actionsReceived > 10) {
    console.log('  ✅✅✅ SYSTEM WORKING! Content is being generated and delivered!');
  } else if (events.chunksReceived > 0) {
    console.log('  ⚠️ PARTIAL SUCCESS - Some content received but limited');
  } else {
    console.log('  ❌❌❌ SYSTEM BROKEN - No content reaching client');
  }
  
  console.log('\n' + '='.repeat(60));
  socket.disconnect();
  process.exit(events.chunksReceived > 0 ? 0 : 1);
}, 60000); // Wait full minute for all processing
