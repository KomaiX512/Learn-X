const io = require('socket.io-client');
const axios = require('axios');

console.log('\n=== CINEMATIC QUALITY TEST ===\n');
console.log('Testing for 3Blue1Brown-style lecture quality...\n');

const sessionId = `cinematic-${Date.now()}`;
const query = 'teach me the golden ratio';

// Connect to WebSocket
const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: true
});

let planReceived = false;
let stepsReceived = [];
let stepTimings = {};
let startTime = Date.now();

socket.on('connect', () => {
  console.log('✅ WebSocket connected');
  socket.emit('join', { sessionId });
  console.log(`✅ Joined session: ${sessionId}`);
});

socket.on('rendered', (data) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (data.type === 'plan') {
    planReceived = true;
    console.log(`\n📋 PLAN RECEIVED at ${elapsed}s:`);
    console.log(`   Title: ${data.plan.title}`);
    console.log(`   Subtitle: ${data.plan.subtitle}`);
    console.log(`   Steps: ${data.plan.toc?.length || 0}`);
    data.plan.toc?.forEach((item, i) => {
      console.log(`     ${i+1}. ${item.title}`);
    });
  } else if (data.type === 'chunk' && data.chunk) {
    const stepId = data.chunk.stepId || data.step?.id;
    const actionCount = data.chunk.actions?.length || 0;
    
    if (stepId && !stepsReceived.includes(stepId)) {
      // Track step timing
      if (!stepTimings[stepId]) {
        stepTimings[stepId] = { start: Date.now() };
      }
      
      stepsReceived.push(stepId);
      
      console.log(`\n🎬 STEP ${stepId} RECEIVED at ${elapsed}s:`);
      console.log(`   Step Type: ${data.step?.tag || 'unknown'}`);
      console.log(`   Actions: ${actionCount}`);
      console.log(`   Expected Duration: ${(data.timing?.stepDuration/1000).toFixed(1)}s`);
      console.log(`   Pause After: ${(data.timing?.nextStepDelay/1000).toFixed(1)}s`);
      
      // Analyze content quality
      if (data.chunk.actions) {
        const titles = data.chunk.actions.filter(a => a.op === 'drawTitle').length;
        const labels = data.chunk.actions.filter(a => a.op === 'drawLabel').length;
        const visuals = data.chunk.actions.filter(a => 
          ['drawCircle', 'drawVector', 'drawRect', 'orbit', 'wave', 'particle', 'arrow'].includes(a.op)
        ).length;
        const delays = data.chunk.actions.filter(a => a.op === 'delay').length;
        
        console.log(`\n   📊 CONTENT QUALITY:`);
        console.log(`      Titles: ${titles} ${titles > 0 ? '✅' : '❌'}`);
        console.log(`      Labels: ${labels} ${labels >= 5 ? '✅' : '⚠️'}`);
        console.log(`      Visuals: ${visuals} ${visuals >= 10 ? '✅' : '⚠️'}`);
        console.log(`      Delays: ${delays} ${delays > 0 ? '✅' : '⚠️'}`);
        
        // Check for 3Blue1Brown quality markers
        const hasTitle = titles > 0;
        const hasRichLabels = labels >= 10;
        const hasRichVisuals = visuals >= 15;
        const hasPacing = delays > 0;
        
        const quality = hasTitle && hasRichLabels && hasRichVisuals && hasPacing;
        console.log(`\n   🎯 3BLUE1BROWN QUALITY: ${quality ? '✅ YES!' : '❌ NO'}`);
        
        if (!quality) {
          console.log('   Missing:');
          if (!hasTitle) console.log('     - Title presentation');
          if (!hasRichLabels) console.log('     - Rich explanatory labels (need 10+)');
          if (!hasRichVisuals) console.log('     - Rich visual animations (need 15+)');
          if (!hasPacing) console.log('     - Proper pacing with delays');
        }
      }
      
      // Send acknowledgment
      socket.emit('step-received', { sessionId, stepId });
    }
  }
});

socket.on('status', (data) => {
  console.log(`📡 Status: ${data.message}`);
});

socket.on('progress', (data) => {
  console.log(`⚙️  Progress: Step ${data.stepId} - ${data.status}`);
});

// Make the API request
setTimeout(async () => {
  console.log(`\n🚀 Requesting cinematic lecture on: "${query}"`);
  console.log(`   Session: ${sessionId}\n`);
  
  try {
    const response = await axios.post('http://localhost:3001/api/query', {
      query,
      sessionId
    });
    console.log('✅ API request sent successfully');
    startTime = Date.now(); // Reset timer
  } catch (error) {
    console.error('❌ API request failed:', error.message);
    process.exit(1);
  }
}, 1000);

// Monitor for completion (5 minutes max for quality content)
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL CINEMATIC QUALITY REPORT:');
  console.log('='.repeat(60));
  
  console.log(`\nDelivery Summary:`);
  console.log(`  Plan Received: ${planReceived ? 'YES' : 'NO'}`);
  console.log(`  Steps Delivered: ${stepsReceived.length}/5`);
  console.log(`  Steps: ${stepsReceived.sort().join(', ') || 'NONE'}`);
  
  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\nTiming Analysis:`);
  console.log(`  Total Time: ${totalTime.toFixed(1)}s`);
  console.log(`  Average per Step: ${(totalTime / stepsReceived.length).toFixed(1)}s`);
  
  // Quality assessment
  const isQuality = stepsReceived.length === 5 && totalTime > 120;
  console.log(`\n🎯 CINEMATIC QUALITY: ${isQuality ? '✅ ACHIEVED!' : '❌ NOT ACHIEVED'}`);
  
  if (!isQuality) {
    console.log('\nIssues:');
    if (stepsReceived.length < 5) console.log('  - Not all steps delivered');
    if (totalTime < 120) console.log('  - Too fast, not cinematic (need 2+ minutes)');
  }
  
  console.log('\n' + '='.repeat(60));
  process.exit(isQuality ? 0 : 1);
}, 300000); // 5 minutes timeout
