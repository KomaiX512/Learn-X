/**
 * LIVE TEST MONITOR - Real-time analysis of LeaF system
 * Tests with actual query and monitors every step
 */

const http = require('http');
const Redis = require('ioredis');

const BACKEND_URL = 'http://localhost:3001';
const SESSION_ID = `test-${Date.now()}`;
const TEST_QUERY = 'teach me about transistor amplifiers';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy: () => null
});

console.log('============================================');
console.log('🔬 LIVE TEST MONITOR - Brutal Honest Analysis');
console.log('============================================\n');

console.log(`📋 Test Configuration:`);
console.log(`  Query: ${TEST_QUERY}`);
console.log(`  Session: ${SESSION_ID}`);
console.log(`  Backend: ${BACKEND_URL}\n`);

// Track metrics
const metrics = {
  startTime: Date.now(),
  planGenerated: false,
  stepsGenerated: [],
  stepsEmitted: [],
  totalActions: 0,
  errors: [],
  warnings: []
};

// Monitor function
async function monitorStep(stepId) {
  const key = `session:${SESSION_ID}:step:${stepId}:chunk`;
  
  try {
    const data = await redis.get(key);
    if (data) {
      const chunk = JSON.parse(data);
      const actions = chunk.actions || [];
      
      // Count action types
      const labelCount = actions.filter(a => a.op === 'drawLabel').length;
      const visualCount = actions.filter(a => 
        a.op !== 'drawLabel' && a.op !== 'delay' && a.op !== 'drawTitle'
      ).length;
      const delayCount = actions.filter(a => a.op === 'delay').length;
      
      // Check for issues
      const hasTitle = actions.some(a => a.op === 'drawTitle');
      const hasNarrative = labelCount >= 10; // At least 10 labels for narrative
      const hasVisuals = visualCount >= 15; // At least 15 visuals
      const hasPacing = delayCount >= 3; // At least 3 delays
      
      const quality = {
        total: actions.length,
        labels: labelCount,
        visuals: visualCount,
        delays: delayCount,
        hasTitle,
        hasNarrative,
        hasVisuals,
        hasPacing,
        textRatio: (labelCount / actions.length * 100).toFixed(1) + '%'
      };
      
      return quality;
    }
  } catch (error) {
    return null;
  }
  
  return null;
}

// HTTP POST helper
function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Main test function
async function runTest() {
  try {
    // 1. Send query
    console.log('🚀 Sending query...');
    const result = await httpPost(`${BACKEND_URL}/api/query`, {
      query: TEST_QUERY,
      sessionId: SESSION_ID
    });
    
    console.log('✅ Query accepted\n');
    
    // 2. Monitor plan generation
    console.log('⏱️  Waiting for plan generation...');
    let planFound = false;
    for (let i = 0; i < 60; i++) {
      const planKey = `session:${SESSION_ID}:plan`;
      const plan = await redis.get(planKey);
      
      if (plan) {
        const planData = JSON.parse(plan);
        console.log('✅ Plan generated!');
        console.log(`   Steps: ${planData.steps.length}`);
        console.log(`   Title: ${planData.title}`);
        metrics.planGenerated = true;
        planFound = true;
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!planFound) {
      console.error('❌ Plan generation timeout (60s)');
      process.exit(1);
    }
    
    console.log('');
    
    // 3. Monitor step generation
    console.log('⏱️  Monitoring step generation (max 5 minutes)...\n');
    
    const stepMonitor = setInterval(async () => {
      for (let stepId = 0; stepId < 5; stepId++) {
        if (!metrics.stepsGenerated.includes(stepId)) {
          const quality = await monitorStep(stepId);
          
          if (quality) {
            metrics.stepsGenerated.push(stepId);
            metrics.totalActions += quality.total;
            
            // Analyze quality
            const issues = [];
            if (!quality.hasTitle) issues.push('No title');
            if (!quality.hasNarrative) issues.push('Weak narrative (<10 labels)');
            if (!quality.hasVisuals) issues.push('Weak visuals (<15)');
            if (!quality.hasPacing) issues.push('Poor pacing (<3 delays)');
            
            const status = issues.length === 0 ? '✅' : '⚠️';
            
            console.log(`${status} Step ${stepId} Generated:`);
            console.log(`   Total: ${quality.total} actions`);
            console.log(`   Text: ${quality.labels} labels (${quality.textRatio})`);
            console.log(`   Visuals: ${quality.visuals} operations`);
            console.log(`   Delays: ${quality.delays}`);
            
            if (issues.length > 0) {
              console.log(`   Issues: ${issues.join(', ')}`);
              metrics.warnings.push(`Step ${stepId}: ${issues.join(', ')}`);
            }
            
            console.log('');
            
            // Check if all done
            if (metrics.stepsGenerated.length === 5) {
              clearInterval(stepMonitor);
              printFinalAnalysis();
            }
          }
        }
      }
    }, 2000);
    
    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(stepMonitor);
      if (metrics.stepsGenerated.length < 5) {
        console.error('❌ Generation timeout (5 minutes)');
        console.error(`   Only ${metrics.stepsGenerated.length}/5 steps completed`);
        printFinalAnalysis();
      }
    }, 300000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

function printFinalAnalysis() {
  const elapsed = ((Date.now() - metrics.startTime) / 1000).toFixed(1);
  
  console.log('============================================');
  console.log('📊 FINAL ANALYSIS');
  console.log('============================================\n');
  
  console.log(`⏱️  Total Time: ${elapsed}s`);
  console.log(`✅ Steps Generated: ${metrics.stepsGenerated.length}/5`);
  console.log(`📝 Total Actions: ${metrics.totalActions}`);
  console.log(`⚠️  Warnings: ${metrics.warnings.length}\n`);
  
  if (metrics.warnings.length > 0) {
    console.log('⚠️  Quality Issues:');
    metrics.warnings.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }
  
  // Calculate scores
  const completionScore = (metrics.stepsGenerated.length / 5) * 100;
  const qualityScore = 100 - (metrics.warnings.length * 10);
  const speedScore = elapsed < 120 ? 100 : Math.max(0, 100 - ((elapsed - 120) / 60) * 20);
  
  console.log('📈 Scores:');
  console.log(`   Completion: ${completionScore.toFixed(0)}%`);
  console.log(`   Quality: ${qualityScore.toFixed(0)}%`);
  console.log(`   Speed: ${speedScore.toFixed(0)}%`);
  
  const overallScore = (completionScore + qualityScore + speedScore) / 3;
  console.log(`   Overall: ${overallScore.toFixed(0)}%\n`);
  
  // Verdict
  if (overallScore >= 90) {
    console.log('🎉 VERDICT: EXCELLENT - System working as expected!');
  } else if (overallScore >= 70) {
    console.log('✅ VERDICT: GOOD - Minor improvements needed');
  } else if (overallScore >= 50) {
    console.log('⚠️  VERDICT: NEEDS WORK - Significant issues found');
  } else {
    console.log('❌ VERDICT: CRITICAL - Major problems detected');
  }
  
  console.log('\n============================================\n');
  
  redis.disconnect();
  process.exit(0);
}

// Run test
runTest().catch(error => {
  console.error('💥 Fatal error:', error);
  redis.disconnect();
  process.exit(1);
});
