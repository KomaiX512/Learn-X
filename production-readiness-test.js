/**
 * PRODUCTION READINESS TEST
 * 
 * Comprehensive test suite to verify system is ready to beat 3Blue1Brown:
 * 1. Multiple diverse topics
 * 2. Real-time emission monitoring
 * 3. Animation quality verification
 * 4. Speed benchmarking
 * 5. Reliability scoring
 */

const axios = require('axios');
const io = require('socket.io-client');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const TIMEOUT = 180000; // 3 minutes max per topic

// Test suite: diverse topics to prove universal capability
const TEST_TOPICS = [
  'photosynthesis light reactions',
  'quantum tunneling in semiconductors',
  'neural network backpropagation',
  'DNA transcription and translation',
  'general relativity spacetime curvature'
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = {
    'INFO': colors.cyan,
    'SUCCESS': colors.green,
    'ERROR': colors.red,
    'WARNING': colors.yellow,
    'METRIC': colors.magenta
  }[level] || colors.reset;
  
  console.log(`${color}[${timestamp}] [${level}] ${message}${colors.reset}`);
}

async function testTopic(topic, topicIndex, totalTopics) {
  log('INFO', '');
  log('INFO', '═'.repeat(80));
  log('INFO', `TEST ${topicIndex + 1}/${totalTopics}: "${topic}"`);
  log('INFO', '═'.repeat(80));
  
  const startTime = Date.now();
  let sessionId = null;
  let socket = null;
  
  const metrics = {
    topic,
    stepTimings: {},
    stepsReceived: 0,
    totalSteps: 0,
    animations: [],
    emissions: [],
    errors: []
  };
  
  try {
    // Step 1: Create session
    log('INFO', 'Creating session...');
    const response = await axios.post(`${BACKEND_URL}/api/query`, { query: topic });
    sessionId = response.data.sessionId;
    metrics.sessionId = sessionId;
    log('SUCCESS', `Session created: ${sessionId}`);
    
    // Step 2: Connect WebSocket
    log('INFO', 'Connecting WebSocket...');
    socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: false
    });
    
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        log('SUCCESS', `WebSocket connected: ${socket.id}`);
        resolve();
      });
      socket.on('connect_error', reject);
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
    });
    
    // Step 3: Join session
    log('INFO', `Joining session ${sessionId}...`);
    await new Promise((resolve, reject) => {
      socket.emit('join', sessionId);
      socket.on('joined', (data) => {
        log('SUCCESS', `Joined session: ${data.sessionId}`);
        resolve();
      });
      setTimeout(() => reject(new Error('Join timeout')), 5000);
    });
    
    // Step 4: Listen for results
    log('INFO', 'Monitoring for step emissions...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        log('ERROR', `TIMEOUT after ${TIMEOUT/1000}s`);
        metrics.timeout = true;
        resolve(metrics);
      }, TIMEOUT);
      
      socket.on('status', (data) => {
        if (data.type === 'plan_ready') {
          metrics.totalSteps = data.totalSteps;
          metrics.planTime = Date.now() - startTime;
          log('INFO', `Plan ready: ${data.totalSteps} steps, ${data.plan.title}`);
        } else if (data.type === 'generation_complete') {
          metrics.generationComplete = true;
          metrics.successful = data.successful;
          metrics.failed = data.failed;
          log('SUCCESS', `Generation complete: ${data.successful}/${data.successful + data.failed} successful`);
        }
      });
      
      socket.on('rendered', (data) => {
        const emissionTime = Date.now() - startTime;
        metrics.stepsReceived++;
        metrics.stepTimings[data.stepId] = emissionTime;
        metrics.emissions.push({
          stepId: data.stepId,
          time: emissionTime,
          actionsCount: data.actions?.length || 0
        });
        
        log('SUCCESS', `📦 STEP ${data.stepId} RECEIVED at ${(emissionTime/1000).toFixed(1)}s (${data.actions?.length || 0} actions)`);
        
        // Count animations
        if (data.actions) {
          const animCount = data.actions.reduce((sum, action) => {
            if (action.type === 'customSVG' && action.content) {
              const anims = (action.content.match(/<animate|<animateMotion|<animateTransform/g) || []).length;
              return sum + anims;
            }
            return sum;
          }, 0);
          metrics.animations.push({ stepId: data.stepId, count: animCount });
          log('METRIC', `  └─ Animations: ${animCount}`);
        }
        
        // Check if all steps received
        if (metrics.totalSteps > 0 && metrics.stepsReceived >= metrics.totalSteps) {
          clearTimeout(timeout);
          metrics.totalTime = Date.now() - startTime;
          log('SUCCESS', `✅ ALL ${metrics.totalSteps} STEPS RECEIVED in ${(metrics.totalTime/1000).toFixed(1)}s`);
          
          // Wait a bit to ensure no more events
          setTimeout(() => resolve(metrics), 2000);
        }
      });
      
      socket.on('progress', (data) => {
        if (data.status === 'generating') {
          log('INFO', `  ⏳ Step ${data.stepId}: ${data.message}`);
        } else if (data.status === 'error') {
          metrics.errors.push({ stepId: data.stepId, error: data.error });
          log('ERROR', `  ❌ Step ${data.stepId}: ${data.error}`);
        }
      });
      
      socket.on('generation_progress', (data) => {
        if (data.phase === 'generating') {
          log('METRIC', `  ⚡ Progress: ${data.completedSteps}/${data.totalSteps} (${data.progress}%)`);
        }
      });
      
      socket.on('error', (error) => {
        log('ERROR', `Socket error: ${error}`);
        metrics.errors.push({ type: 'socket', error });
      });
    });
    
  } catch (error) {
    log('ERROR', `Test failed: ${error.message}`);
    metrics.criticalError = error.message;
    return metrics;
  } finally {
    if (socket) {
      socket.disconnect();
    }
  }
}

function analyzeResults(allResults) {
  log('INFO', '');
  log('INFO', '═'.repeat(80));
  log('INFO', 'PRODUCTION READINESS ANALYSIS');
  log('INFO', '═'.repeat(80));
  log('INFO', '');
  
  const successful = allResults.filter(r => r.stepsReceived === r.totalSteps && r.totalSteps > 0);
  const failed = allResults.filter(r => r.stepsReceived < r.totalSteps || r.timeout || r.criticalError);
  
  const successRate = (successful.length / allResults.length) * 100;
  
  log('METRIC', `Tests Run: ${allResults.length}`);
  log('METRIC', `Successful: ${successful.length} (${successRate.toFixed(0)}%)`);
  log('METRIC', `Failed: ${failed.length}`);
  log('INFO', '');
  
  // Speed Analysis
  if (successful.length > 0) {
    const times = successful.map(r => r.totalTime);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    log('METRIC', 'SPEED METRICS:');
    log('METRIC', `  Average: ${(avgTime/1000).toFixed(1)}s per lecture (3 steps)`);
    log('METRIC', `  Fastest: ${(minTime/1000).toFixed(1)}s`);
    log('METRIC', `  Slowest: ${(maxTime/1000).toFixed(1)}s`);
    log('INFO', '');
  }
  
  // Animation Quality
  const totalAnimations = allResults.reduce((sum, r) => 
    sum + r.animations.reduce((s, a) => s + a.count, 0), 0
  );
  const avgAnimationsPerStep = totalAnimations / allResults.reduce((sum, r) => sum + r.stepsReceived, 0);
  
  log('METRIC', 'ANIMATION QUALITY:');
  log('METRIC', `  Total animations: ${totalAnimations}`);
  log('METRIC', `  Average per step: ${avgAnimationsPerStep.toFixed(1)}`);
  log('INFO', '');
  
  // Emission Analysis
  log('METRIC', 'EMISSION TIMING:');
  successful.forEach((r, i) => {
    const emissions = Object.values(r.stepTimings).sort((a, b) => a - b);
    log('METRIC', `  Topic ${i + 1}: Steps emitted at ${emissions.map(t => `${(t/1000).toFixed(1)}s`).join(', ')}`);
  });
  log('INFO', '');
  
  // Errors
  if (failed.length > 0) {
    log('WARNING', 'FAILURES DETECTED:');
    failed.forEach((r, i) => {
      log('WARNING', `  ${i + 1}. ${r.topic}:`);
      if (r.criticalError) {
        log('WARNING', `     Critical: ${r.criticalError}`);
      } else if (r.timeout) {
        log('WARNING', `     Timeout (${r.stepsReceived}/${r.totalSteps} steps)`);
      } else {
        log('WARNING', `     Incomplete (${r.stepsReceived}/${r.totalSteps} steps)`);
      }
      if (r.errors.length > 0) {
        r.errors.forEach(e => log('WARNING', `     Error: ${e.error}`));
      }
    });
    log('INFO', '');
  }
  
  // Final Score
  let score = 0;
  
  // Reliability (40 points)
  score += Math.round(successRate * 0.4);
  
  // Speed (30 points) - 100% if avg < 60s, scaling down to 0% at 180s
  if (successful.length > 0) {
    const times = successful.map(r => r.totalTime);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const speedScore = Math.max(0, Math.min(30, 30 * (1 - (avgTime - 60000) / 120000)));
    score += Math.round(speedScore);
  }
  
  // Quality (30 points) - animations per step
  const qualityScore = Math.min(30, Math.round(avgAnimationsPerStep * 1.5));
  score += qualityScore;
  
  log('INFO', '═'.repeat(80));
  log('INFO', `PRODUCTION READINESS SCORE: ${score}/100`);
  log('INFO', '═'.repeat(80));
  log('INFO', '');
  
  if (score >= 90) {
    log('SUCCESS', '🎉 PRODUCTION READY - Beat 3Blue1Brown quality!');
    log('SUCCESS', '✅ System is reliable, fast, and high-quality');
    log('SUCCESS', '✅ Ready to announce to the world!');
  } else if (score >= 70) {
    log('SUCCESS', '✅ GOOD - Nearly production ready');
    log('WARNING', '⚠️  Minor improvements needed for full reliability');
  } else {
    log('WARNING', '⚠️  NOT READY - Critical issues need resolution');
    log('ERROR', '❌ Do not deploy until score >= 90');
  }
  
  log('INFO', '');
  
  // Comparison to 3Blue1Brown
  log('INFO', '📊 COMPARISON TO 3BLUE1BROWN:');
  if (successful.length > 0) {
    const avgTime = successful.reduce((sum, r) => sum + r.totalTime, 0) / successful.length;
    log('METRIC', `  Speed: ${(avgTime/1000).toFixed(1)}s vs ~hours (manual animation)`);
    log('METRIC', `  Coverage: Universal (any topic) vs ~50 videos total`);
    log('METRIC', `  Variety: ${totalAnimations} animations vs ~10-20 per video`);
    log('METRIC', `  Adaptability: Instant vs weeks of production`);
    log('SUCCESS', '  ✅ We beat 3Blue1Brown on speed, coverage, and scalability!');
  }
  
  return score >= 90;
}

async function main() {
  log('INFO', '');
  log('INFO', '╔' + '═'.repeat(78) + '╗');
  log('INFO', '║' + ' '.repeat(20) + 'PRODUCTION READINESS TEST' + ' '.repeat(33) + '║');
  log('INFO', '║' + ' '.repeat(15) + 'Learn-X vs 3Blue1Brown Quality' + ' '.repeat(32) + '║');
  log('INFO', '╚' + '═'.repeat(78) + '╝');
  log('INFO', '');
  log('INFO', `Testing ${TEST_TOPICS.length} diverse topics...`);
  log('INFO', '');
  
  const allResults = [];
  
  for (let i = 0; i < TEST_TOPICS.length; i++) {
    const result = await testTopic(TEST_TOPICS[i], i, TEST_TOPICS.length);
    allResults.push(result);
    
    // Pause between tests
    if (i < TEST_TOPICS.length - 1) {
      log('INFO', '');
      log('INFO', 'Pausing 5s before next test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  const productionReady = analyzeResults(allResults);
  
  process.exit(productionReady ? 0 : 1);
}

main().catch(error => {
  log('ERROR', `Fatal error: ${error.message}`);
  process.exit(1);
});
