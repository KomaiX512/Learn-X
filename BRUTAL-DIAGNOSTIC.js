const axios = require('axios');
const WebSocket = require('ws');

const BACKEND = 'http://localhost:8000';
const TEST_TOPIC = 'photosynthesis';

console.log('\n=================================================================');
console.log('BRUTAL HONEST DIAGNOSTIC TEST');
console.log('=================================================================\n');

let stepResults = {
  step1: null,
  step2: null,
  step3: null
};

async function runTest() {
  console.log(`[TEST] Topic: "${TEST_TOPIC}"\n`);
  
  // Step 1: Create session
  console.log('[1/3] Creating session...');
  const sessionResponse = await axios.post(`${BACKEND}/api/query`, {
    query: TEST_TOPIC
  });
  const sessionId = sessionResponse.data.sessionId;
  console.log(`✅ Session: ${sessionId}\n`);
  
  // Step 2: Connect WebSocket
  console.log('[2/3] Connecting WebSocket...');
  const ws = new WebSocket(`ws://localhost:8000?sessionId=${sessionId}`);
  
  return new Promise((resolve) => {
    let receivedSteps = 0;
    let startTime = Date.now();
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected\n');
      console.log('[3/3] Listening for results...\n');
      ws.send(JSON.stringify({ type: 'join', sessionId }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'chunk' && message.data?.type === 'actions') {
        receivedSteps++;
        const stepId = message.data.stepId;
        const actions = message.data.actions;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`\n========================================`);
        console.log(`STEP ${stepId} RECEIVED (${elapsed}s)`);
        console.log(`========================================`);
        console.log(`Actions: ${actions.length}`);
        
        // Analyze the action
        if (actions.length > 0) {
          const action = actions[0];
          console.log(`Op type: ${action.op}`);
          
          if (action.op === 'customSVG' && action.svgCode) {
            const svg = action.svgCode;
            console.log(`\n📊 SVG ANALYSIS:`);
            console.log(`  Length: ${svg.length} chars`);
            console.log(`  Has <?xml: ${svg.includes('<?xml')}`);
            console.log(`  Has <svg>: ${svg.includes('<svg')}`);
            console.log(`  Has </svg>: ${svg.includes('</svg>')}`);
            
            // Check for topic-specific content
            const topicWords = ['photosynthesis', 'chlorophyll', 'chloroplast', 'light', 'CO2', 'glucose', 'oxygen', 'leaf'];
            const foundWords = topicWords.filter(w => svg.toLowerCase().includes(w.toLowerCase()));
            
            console.log(`\n🔍 CONTEXTUAL CONTENT CHECK:`);
            console.log(`  Topic words found: ${foundWords.length}/${topicWords.length}`);
            if (foundWords.length > 0) {
              console.log(`  Found: ${foundWords.join(', ')}`);
            } else {
              console.log(`  ❌ NO TOPIC-SPECIFIC WORDS FOUND!`);
            }
            
            // Check for labels
            const labelCount = (svg.match(/<text/g) || []).length;
            const shapeCount = (svg.match(/<circle|<rect|<path|<ellipse|<polygon/g) || []).length;
            const animCount = (svg.match(/<animate|animateMotion|animateTransform/g) || []).length;
            
            console.log(`\n📈 QUALITY METRICS:`);
            console.log(`  Text labels: ${labelCount}`);
            console.log(`  Shapes: ${shapeCount}`);
            console.log(`  Animations: ${animCount}`);
            
            // Extract first few labels
            const labelMatches = svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g);
            const labels = Array.from(labelMatches).slice(0, 5).map(m => m[1]);
            if (labels.length > 0) {
              console.log(`\n📝 SAMPLE LABELS (first 5):`);
              labels.forEach((label, i) => {
                console.log(`  ${i+1}. "${label}"`);
              });
            }
            
            // Check for generic/fallback content
            const genericWords = ['Label 1', 'Label 2', 'Sample', 'Example', 'Test', 'Generic'];
            const hasGeneric = genericWords.some(w => svg.includes(w));
            
            if (hasGeneric) {
              console.log(`\n⚠️  WARNING: Contains generic/fallback labels!`);
            }
            
            // Store result
            stepResults[`step${stepId}`] = {
              svgLength: svg.length,
              labels: labelCount,
              shapes: shapeCount,
              animations: animCount,
              topicWords: foundWords,
              hasGeneric,
              sampleLabels: labels
            };
          } else {
            console.log(`\n❌ ACTION IS NOT customSVG!`);
            console.log(`   Actual: ${JSON.stringify(action, null, 2).substring(0, 200)}`);
          }
        } else {
          console.log(`\n❌ NO ACTIONS IN THIS STEP!`);
        }
        
        // Check if all done
        if (receivedSteps >= 3) {
          console.log(`\n\n=================================================================`);
          console.log('FINAL ANALYSIS');
          console.log('=================================================================\n');
          
          const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`⏱️  Total Time: ${totalTime}s`);
          console.log(`📊 Steps Received: ${receivedSteps}/3\n`);
          
          let totalLabels = 0;
          let totalShapes = 0;
          let totalAnims = 0;
          let totalContextualWords = 0;
          let hasAnyGeneric = false;
          
          for (let i = 1; i <= 3; i++) {
            const step = stepResults[`step${i}`];
            if (step) {
              totalLabels += step.labels;
              totalShapes += step.shapes;
              totalAnims += step.animations;
              totalContextualWords += step.topicWords.length;
              if (step.hasGeneric) hasAnyGeneric = true;
            }
          }
          
          console.log('📈 AGGREGATE METRICS:');
          console.log(`  Total Labels: ${totalLabels}`);
          console.log(`  Total Shapes: ${totalShapes}`);
          console.log(`  Total Animations: ${totalAnims}`);
          console.log(`  Contextual Words: ${totalContextualWords}\n`);
          
          console.log('🎯 QUALITY ASSESSMENT:');
          const avgLabels = totalLabels / 3;
          const avgShapes = totalShapes / 3;
          
          if (avgLabels >= 20 && avgShapes >= 15 && totalContextualWords >= 6) {
            console.log('  ✅ QUALITY: EXCELLENT');
          } else if (avgLabels >= 10 && avgShapes >= 10 && totalContextualWords >= 3) {
            console.log('  ⚠️  QUALITY: ACCEPTABLE');
          } else {
            console.log('  ❌ QUALITY: POOR');
          }
          
          if (hasAnyGeneric) {
            console.log('  ⚠️  WARNING: Generic/fallback content detected!');
          }
          
          if (totalAnims === 0) {
            console.log('  ⚠️  WARNING: No animations generated!');
          }
          
          console.log('\n🔍 CONTEXTUALITY CHECK:');
          if (totalContextualWords >= 5) {
            console.log('  ✅ TRULY CONTEXTUAL - Topic-specific content present');
          } else if (totalContextualWords >= 2) {
            console.log('  ⚠️  PARTIALLY CONTEXTUAL - Some topic words present');
          } else {
            console.log('  ❌ NOT CONTEXTUAL - No topic-specific content!');
          }
          
          console.log('\n=================================================================\n');
          
          ws.close();
          resolve();
        }
      }
    });
    
    ws.on('error', (err) => {
      console.error('❌ WebSocket error:', err.message);
      ws.close();
      resolve();
    });
    
    // Timeout after 3 minutes
    setTimeout(() => {
      console.log('\n❌ TIMEOUT after 3 minutes');
      ws.close();
      resolve();
    }, 180000);
  });
}

runTest().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
