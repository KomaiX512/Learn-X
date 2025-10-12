/**
 * BRUTAL HONESTY SYSTEM TEST
 * Tests complete pipeline: Planning → Generation → Rendering
 * Monitors for: Fallbacks, Hardcoding, Quality Issues
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

console.log('════════════════════════════════════════════════════════════════');
console.log('BRUTAL HONESTY SYSTEM TEST - NO SUGAR COATING');
console.log('════════════════════════════════════════════════════════════════\n');

// Test configuration
const TEST_QUERY = 'Explain protein folding and enzyme catalysis';
const SESSION_ID = 'test-' + Date.now();

let backendProcess = null;
let frontendProcess = null;
let testResults = {
  planning: { status: 'pending', time: 0, data: null },
  generation: { status: 'pending', steps: [], totalTime: 0 },
  fallbacksUsed: [],
  hardcodingDetected: [],
  qualityIssues: [],
  animations: [],
  visualTypes: {}
};

// Kill existing processes
console.log('🧹 Cleaning up ports...');
const killPort = (port) => {
  return new Promise((resolve) => {
    const kill = spawn('lsof', ['-ti', `:${port}`]);
    let pids = '';
    kill.stdout.on('data', (data) => pids += data);
    kill.on('close', () => {
      if (pids.trim()) {
        pids.trim().split('\n').forEach(pid => {
          try {
            process.kill(parseInt(pid), 9);
          } catch (e) {}
        });
      }
      setTimeout(resolve, 1000);
    });
  });
};

async function startBackend() {
  console.log('🚀 Starting backend...');
  
  return new Promise((resolve, reject) => {
    backendProcess = spawn('npm', ['start'], {
      cwd: '/home/komail/LEAF/Learn-X/app/backend',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const backendLog = fs.createWriteStream('/tmp/backend-brutalhonest.log');
    
    backendProcess.stdout.pipe(backendLog);
    backendProcess.stderr.pipe(backendLog);

    // Monitor for fallbacks and issues
    backendProcess.stdout.on('data', (data) => {
      const text = data.toString();
      
      // Check for fallbacks
      if (text.includes('EMERGENCY') || text.includes('fallback') || text.includes('Fallback')) {
        testResults.fallbacksUsed.push({
          time: new Date().toISOString(),
          message: text.trim().substring(0, 200)
        });
        console.log('⚠️  FALLBACK DETECTED:', text.trim().substring(0, 100));
      }
      
      // Check for hardcoding indicators
      if (text.includes('dummy') || text.includes('placeholder') || text.includes('generic')) {
        testResults.hardcodingDetected.push({
          time: new Date().toISOString(),
          message: text.trim().substring(0, 200)
        });
        console.log('🚨 HARDCODING DETECTED:', text.trim().substring(0, 100));
      }
      
      // Check for quality issues
      if (text.includes('Low quality') || text.includes('Too few') || text.includes('insufficient')) {
        testResults.qualityIssues.push({
          time: new Date().toISOString(),
          message: text.trim().substring(0, 200)
        });
      }
    });

    backendProcess.on('error', reject);

    // Wait for backend to be ready
    setTimeout(() => {
      http.get('http://localhost:8000/health', (res) => {
        if (res.statusCode === 200) {
          console.log('✅ Backend ready\n');
          resolve();
        } else {
          reject(new Error('Backend not healthy'));
        }
      }).on('error', () => {
        setTimeout(() => {
          http.get('http://localhost:8000/health', (res) => {
            if (res.statusCode === 200) {
              console.log('✅ Backend ready\n');
              resolve();
            } else {
              reject(new Error('Backend not healthy'));
            }
          }).on('error', reject);
        }, 5000);
      });
    }, 8000);
  });
}

async function testPlanning() {
  console.log('📋 PHASE 1: TESTING PLANNING');
  console.log('────────────────────────────────────────────────────────────────');
  
  const start = Date.now();
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: TEST_QUERY,
      sessionId: SESSION_ID,
      difficulty: 'intermediate'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/plan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const elapsed = Date.now() - start;
        try {
          const plan = JSON.parse(data);
          testResults.planning = {
            status: 'completed',
            time: elapsed,
            data: plan
          };
          
          console.log(`✅ Planning completed in ${(elapsed/1000).toFixed(1)}s`);
          console.log(`   Title: ${plan.title}`);
          console.log(`   Steps: ${plan.steps?.length || 0}`);
          console.log('');
          
          resolve(plan);
        } catch (e) {
          testResults.planning.status = 'failed';
          reject(new Error('Failed to parse plan: ' + e.message));
        }
      });
    });

    req.on('error', (e) => {
      testResults.planning.status = 'failed';
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function monitorGeneration(plan) {
  console.log('🎨 PHASE 2: MONITORING GENERATION');
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`Monitoring ${plan.steps.length} steps...\n`);

  return new Promise((resolve) => {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:8000');

    const stepTimings = {};
    let stepsCompleted = 0;

    ws.on('open', () => {
      console.log('🔌 WebSocket connected');
      ws.send(JSON.stringify({
        type: 'init',
        sessionId: SESSION_ID
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        
        if (msg.type === 'rendered' && msg.stepId) {
          const stepId = msg.stepId;
          
          if (!stepTimings[stepId]) {
            stepTimings[stepId] = { start: Date.now() };
          }
          
          const elapsed = Date.now() - stepTimings[stepId].start;
          
          console.log(`📊 Step ${stepId}:`);
          console.log(`   Time: ${(elapsed/1000).toFixed(1)}s`);
          console.log(`   Actions: ${msg.actions?.length || 0}`);
          
          // Analyze operations
          const operations = msg.actions || [];
          const opTypes = {};
          let customPathCount = 0;
          let basicShapeCount = 0;
          let labelCount = 0;
          
          operations.forEach(op => {
            const type = op.op || 'unknown';
            opTypes[type] = (opTypes[type] || 0) + 1;
            
            if (type === 'customPath') customPathCount++;
            if (type === 'drawCircle' || type === 'drawRect') basicShapeCount++;
            if (type === 'drawLabel') labelCount++;
          });
          
          testResults.generation.steps.push({
            stepId,
            time: elapsed,
            operations: operations.length,
            customPaths: customPathCount,
            basicShapes: basicShapeCount,
            labels: labelCount,
            opTypes
          });
          
          console.log(`   customPath: ${customPathCount}`);
          console.log(`   basicShapes: ${basicShapeCount}`);
          console.log(`   labels: ${labelCount}`);
          
          // Quality check
          if (customPathCount === 0 && basicShapeCount > 5) {
            console.log('   ⚠️  WARNING: Only basic shapes, no complex SVG!');
            testResults.qualityIssues.push({
              step: stepId,
              issue: 'Only basic shapes (no customPath)',
              count: basicShapeCount
            });
          }
          
          if (operations.length < 30) {
            console.log(`   ⚠️  WARNING: Only ${operations.length} operations (target: 40-80)`);
            testResults.qualityIssues.push({
              step: stepId,
              issue: 'Too few operations',
              count: operations.length
            });
          }
          
          // Check for placeholder text
          operations.filter(op => op.op === 'drawLabel').forEach(op => {
            const text = (op.text || '').toLowerCase();
            if (text.match(/label \d|part \d|component \d|visual \d|placeholder/)) {
              console.log(`   🚨 PLACEHOLDER DETECTED: "${op.text}"`);
              testResults.hardcodingDetected.push({
                step: stepId,
                type: 'placeholder_label',
                text: op.text
              });
            }
          });
          
          console.log('');
          
          stepsCompleted++;
          if (stepsCompleted >= plan.steps.length) {
            setTimeout(() => {
              ws.close();
              resolve();
            }, 2000);
          }
        }
      } catch (e) {
        console.error('Error parsing message:', e.message);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      ws.close();
      resolve();
    }, 300000);
  });
}

async function analyzeResults() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('FINAL ANALYSIS - BRUTAL HONESTY');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Save detailed results
  fs.writeFileSync(
    '/home/komail/LEAF/Learn-X/test-results-brutal.json',
    JSON.stringify(testResults, null, 2)
  );

  console.log('📊 PLANNING:');
  console.log(`   Status: ${testResults.planning.status}`);
  console.log(`   Time: ${(testResults.planning.time/1000).toFixed(1)}s`);
  console.log(`   Steps: ${testResults.planning.data?.steps?.length || 0}\n`);

  console.log('📊 GENERATION:');
  console.log(`   Steps completed: ${testResults.generation.steps.length}`);
  
  if (testResults.generation.steps.length > 0) {
    const totalOps = testResults.generation.steps.reduce((sum, s) => sum + s.operations, 0);
    const avgOps = totalOps / testResults.generation.steps.length;
    const totalCustomPath = testResults.generation.steps.reduce((sum, s) => sum + s.customPaths, 0);
    const totalBasicShapes = testResults.generation.steps.reduce((sum, s) => sum + s.basicShapes, 0);
    
    console.log(`   Avg operations/step: ${avgOps.toFixed(1)}`);
    console.log(`   Total customPath: ${totalCustomPath}`);
    console.log(`   Total basic shapes: ${totalBasicShapes}`);
    console.log(`   customPath ratio: ${((totalCustomPath / totalOps) * 100).toFixed(1)}%\n`);
  }

  console.log('🚨 CRITICAL ISSUES:');
  console.log(`   Fallbacks used: ${testResults.fallbacksUsed.length}`);
  if (testResults.fallbacksUsed.length > 0) {
    testResults.fallbacksUsed.forEach((f, i) => {
      console.log(`   ${i+1}. ${f.message.substring(0, 80)}`);
    });
  }
  console.log('');

  console.log(`   Hardcoding detected: ${testResults.hardcodingDetected.length}`);
  if (testResults.hardcodingDetected.length > 0) {
    testResults.hardcodingDetected.slice(0, 5).forEach((h, i) => {
      console.log(`   ${i+1}. ${h.message?.substring(0, 80) || h.type}`);
    });
  }
  console.log('');

  console.log(`   Quality issues: ${testResults.qualityIssues.length}`);
  if (testResults.qualityIssues.length > 0) {
    const issueTypes = {};
    testResults.qualityIssues.forEach(q => {
      const issue = q.issue || q.message?.substring(0, 50);
      issueTypes[issue] = (issueTypes[issue] || 0) + 1;
    });
    Object.entries(issueTypes).forEach(([issue, count]) => {
      console.log(`   - ${issue}: ${count} times`);
    });
  }
  console.log('');

  console.log('════════════════════════════════════════════════════════════════');
  console.log('VERDICT:');
  console.log('════════════════════════════════════════════════════════════════');
  
  const passed = testResults.fallbacksUsed.length === 0 && 
                 testResults.hardcodingDetected.length === 0 &&
                 testResults.qualityIssues.length === 0;
  
  if (passed) {
    console.log('✅ SYSTEM PASSED - TRUE GENERATION WITHOUT FALLBACKS');
  } else {
    console.log('❌ SYSTEM FAILED - ISSUES DETECTED');
    console.log('');
    if (testResults.fallbacksUsed.length > 0) {
      console.log(`   ⚠️  ${testResults.fallbacksUsed.length} fallback(s) triggered`);
    }
    if (testResults.hardcodingDetected.length > 0) {
      console.log(`   ⚠️  ${testResults.hardcodingDetected.length} hardcoded content detected`);
    }
    if (testResults.qualityIssues.length > 0) {
      console.log(`   ⚠️  ${testResults.qualityIssues.length} quality issue(s) found`);
    }
  }
  
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('📁 Detailed results saved to: test-results-brutal.json');
  console.log('📁 Backend log: /tmp/backend-brutalhonest.log\n');
}

async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  if (backendProcess) backendProcess.kill();
  if (frontendProcess) frontendProcess.kill();
  
  await killPort(8000);
  await killPort(5174);
  
  console.log('✅ Cleanup complete');
}

// Run test
(async () => {
  try {
    await killPort(8000);
    await killPort(5174);
    
    await startBackend();
    
    const plan = await testPlanning();
    await monitorGeneration(plan);
    await analyzeResults();
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
  } finally {
    await cleanup();
    process.exit(0);
  }
})();
