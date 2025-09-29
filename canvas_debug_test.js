const io = require('socket.io-client');
const axios = require('axios');

console.log('\n=== CANVAS RENDERING DEBUG TEST ===\n');
console.log('Testing if content actually renders on canvas...\n');

const sessionId = `canvas-debug-${Date.now()}`;
const query = 'teach me recursion';

// Connect to WebSocket
const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: true
});

let planReceived = false;
let stepsReceived = [];
let canvasRendered = false;
let startTime = Date.now();

socket.on('connect', () => {
  console.log('✅ WebSocket connected');
  socket.emit('join', { sessionId });
  console.log(`✅ Joined session: ${sessionId}`);
});

socket.on('rendered', (data) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n📦 RECEIVED EVENT at', elapsed + 's:');
  console.log('  Type:', data.type);
  console.log('  Has actions:', !!data.actions);
  console.log('  Actions count:', data.actions?.length || 0);
  console.log('  Has stepId:', !!data.stepId);
  console.log('  StepId value:', data.stepId);
  console.log('  Has plan:', !!data.plan);
  
  // Check event structure
  if (data.type !== 'actions') {
    console.error('❌ ERROR: type is not "actions", got:', data.type);
    console.error('   Frontend expects type: "actions"');
  }
  
  if (!data.actions && data.stepId) {
    console.error('❌ ERROR: No actions array in event!');
    console.error('   Frontend needs data.actions array');
  }
  
  // Track what we received
  if (data.plan && !data.stepId) {
    planReceived = true;
    console.log('\n✅ PLAN EVENT RECEIVED:');
    console.log('   Title:', data.plan.title);
    console.log('   Subtitle:', data.plan.subtitle);
    console.log('   TOC:', data.plan.toc?.length, 'items');
  }
  
  if (data.stepId && data.actions) {
    if (!stepsReceived.includes(data.stepId)) {
      stepsReceived.push(data.stepId);
      
      console.log(`\n✅ STEP ${data.stepId} RECEIVED:`);
      console.log('   Actions:', data.actions.length);
      console.log('   Step tag:', data.step?.tag);
      
      // Analyze actions for rendering
      const drawOps = data.actions.filter(a => 
        a.op && a.op.startsWith('draw')
      ).length;
      const animOps = data.actions.filter(a => 
        ['orbit', 'wave', 'particle', 'arrow'].includes(a.op)
      ).length;
      
      console.log('   Draw operations:', drawOps);
      console.log('   Animation operations:', animOps);
      
      if (drawOps > 0 || animOps > 0) {
        canvasRendered = true;
        console.log('   🎨 CANVAS SHOULD RENDER!');
      } else {
        console.log('   ⚠️ No visual operations found');
      }
      
      // Check action structure
      const sampleAction = data.actions[0];
      if (sampleAction) {
        console.log('\n   Sample action structure:');
        console.log('     op:', sampleAction.op);
        console.log('     keys:', Object.keys(sampleAction).join(', '));
      }
    }
  }
  
  // Send acknowledgment
  if (data.stepId) {
    socket.emit('step-received', { sessionId, stepId: data.stepId });
  }
});

socket.on('status', (data) => {
  console.log(`📡 Backend status: ${data.message}`);
});

socket.on('progress', (data) => {
  console.log(`⚙️  Progress: Step ${data.stepId} - ${data.status}`);
});

// Make the API request
setTimeout(async () => {
  console.log(`\n🚀 Requesting lecture on: "${query}"`);
  console.log(`   Session: ${sessionId}\n`);
  
  try {
    const response = await axios.post('http://localhost:3001/api/query', {
      query,
      sessionId
    });
    console.log('✅ API request sent successfully');
    startTime = Date.now();
  } catch (error) {
    console.error('❌ API request failed:', error.message);
    process.exit(1);
  }
}, 1000);

// Check results after 60 seconds
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CANVAS RENDERING DEBUG REPORT:');
  console.log('='.repeat(60));
  
  console.log('\n1. EVENT DELIVERY:');
  console.log(`   Plan received: ${planReceived ? '✅ YES' : '❌ NO'}`);
  console.log(`   Steps received: ${stepsReceived.length}/5`);
  if (stepsReceived.length > 0) {
    console.log(`   Step IDs: ${stepsReceived.sort().join(', ')}`);
  }
  
  console.log('\n2. CANVAS RENDERING:');
  console.log(`   Visual content found: ${canvasRendered ? '✅ YES' : '❌ NO'}`);
  
  console.log('\n3. ARCHITECTURE CHECK:');
  const hasCorrectStructure = planReceived && stepsReceived.length > 0;
  console.log(`   Event structure correct: ${hasCorrectStructure ? '✅ YES' : '❌ NO'}`);
  
  // Diagnosis
  console.log('\n4. DIAGNOSIS:');
  if (!planReceived) {
    console.log('   ❌ Plan not received - check plan emission');
  }
  if (stepsReceived.length === 0) {
    console.log('   ❌ No steps received - check step emission');
  }
  if (!canvasRendered) {
    console.log('   ❌ No visual content - check action generation');
  }
  
  if (planReceived && stepsReceived.length > 0 && canvasRendered) {
    console.log('   ✅ ALL SYSTEMS WORKING!');
    console.log('   If canvas is still blank, check:');
    console.log('     - Frontend console for errors');
    console.log('     - execChunk function is being called');
    console.log('     - Konva stage is initialized');
    console.log('     - Actions are being processed');
  }
  
  console.log('\n' + '='.repeat(60));
  
  const success = planReceived && stepsReceived.length === 5 && canvasRendered;
  console.log(`\n🎯 FINAL RESULT: ${success ? '✅ PASS' : '❌ FAIL'}`);
  
  process.exit(success ? 0 : 1);
}, 60000);
