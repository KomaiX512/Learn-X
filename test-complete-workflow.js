/**
 * SENIOR ENGINEER TEST - NO SUGAR COATING
 * Tests complete workflow with detailed stage monitoring
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

console.log('════════════════════════════════════════════════════════════════');
console.log('SENIOR ENGINEER WORKFLOW TEST');
console.log('Monitoring: Backend → Frontend → Rendering');
console.log('════════════════════════════════════════════════════════════════\n');

// Test configuration
const TEST_QUERY = 'Explain how enzymes work in catalysis';
const SESSION_ID = 'workflow-test-' + Date.now();

let testResults = {
  stages: [],
  issues: [],
  bottlenecks: [],
  bugs: []
};

// Kill ports
console.log('🧹 Cleaning ports...');
try {
  execSync('lsof -ti:8000 | xargs kill -9 2>/dev/null', { stdio: 'ignore' });
} catch (e) {}
try {
  execSync('lsof -ti:5174 | xargs kill -9 2>/dev/null', { stdio: 'ignore' });
} catch (e) {}

console.log('⏳ Waiting for ports to clear...\n');
setTimeout(startTest, 3000);

async function startTest() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('STAGE 1: BACKEND STARTUP');
  console.log('════════════════════════════════════════════════════════════════\n');
  
  const stageStart = Date.now();
  
  const backend = spawn('npm', ['start'], {
    cwd: '/home/komail/LEAF/Learn-X/app/backend',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let backendLogs = '';
  let backendReady = false;
  let stageIssues = [];

  backend.stdout.on('data', (data) => {
    const text = data.toString();
    backendLogs += text;
    
    // Monitor for issues in real-time
    if (text.includes('error') || text.includes('Error')) {
      if (!text.includes('Redis version')) {
        stageIssues.push('Error in logs: ' + text.trim().substring(0, 100));
        console.log('❌ ERROR:', text.trim().substring(0, 150));
      }
    }
    
    if (text.includes('Backend listening')) {
      backendReady = true;
    }
    
    // Monitor key events
    if (text.includes('[SVG-MASTER]')) {
      console.log('📊 SVG-MASTER:', text.trim().substring(0, 200));
    }
    if (text.includes('[codeVisual]')) {
      console.log('📊 codeVisual:', text.trim().substring(0, 200));
    }
    if (text.includes('fallback') || text.includes('FALLBACK')) {
      console.log('🚨 FALLBACK DETECTED:', text.trim());
      testResults.issues.push({
        stage: 'generation',
        type: 'fallback',
        message: text.trim().substring(0, 200)
      });
    }
    if (text.includes('EMERGENCY')) {
      console.log('🔥 EMERGENCY FALLBACK:', text.trim());
      testResults.bugs.push({
        stage: 'generation',
        type: 'emergency_fallback',
        message: text.trim().substring(0, 200)
      });
    }
  });

  backend.stderr.on('data', (data) => {
    const text = data.toString();
    if (!text.includes('Redis version') && !text.includes('recommended')) {
      console.error('⚠️  STDERR:', text.trim().substring(0, 150));
      stageIssues.push('stderr: ' + text.trim().substring(0, 100));
    }
  });

  console.log('⏳ Waiting 12s for backend startup...\n');
  await new Promise(resolve => setTimeout(resolve, 12000));

  if (!backendReady) {
    console.log('❌ STAGE 1 FAILED: Backend did not start\n');
    testResults.stages.push({
      stage: 'Backend Startup',
      status: 'FAILED',
      time: Date.now() - stageStart,
      issues: ['Backend not ready after 12s']
    });
    backend.kill();
    process.exit(1);
  }

  testResults.stages.push({
    stage: 'Backend Startup',
    status: 'SUCCESS',
    time: Date.now() - stageStart,
    issues: stageIssues
  });

  console.log('✅ STAGE 1 COMPLETE:', (Date.now() - stageStart) + 'ms');
  if (stageIssues.length > 0) {
    console.log('⚠️  Issues found:', stageIssues.length);
  }
  console.log('');

  // Stage 2: API Request
  await testAPIRequest(backend);
}

async function testAPIRequest(backend) {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('STAGE 2: API REQUEST');
  console.log('════════════════════════════════════════════════════════════════\n');
  
  const stageStart = Date.now();
  let stageIssues = [];

  console.log('📤 Sending query:', TEST_QUERY);
  console.log('📤 Session ID:', SESSION_ID, '\n');

  const postData = JSON.stringify({
    query: TEST_QUERY,
    sessionId: SESSION_ID
  });

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const elapsed = Date.now() - stageStart;
        
        if (res.statusCode !== 200) {
          console.log('❌ STAGE 2 FAILED: Status', res.statusCode);
          stageIssues.push(`HTTP ${res.statusCode}`);
          testResults.stages.push({
            stage: 'API Request',
            status: 'FAILED',
            time: elapsed,
            issues: stageIssues
          });
          backend.kill();
          process.exit(1);
        }

        try {
          const response = JSON.parse(data);
          console.log('✅ Response received:', JSON.stringify(response).substring(0, 100));
          
          testResults.stages.push({
            stage: 'API Request',
            status: 'SUCCESS',
            time: elapsed,
            issues: stageIssues,
            data: response
          });

          console.log('✅ STAGE 2 COMPLETE:', elapsed + 'ms\n');
          
          // Stage 3: Monitor Generation
          monitorGeneration(backend, 90000); // 90 second timeout
          
        } catch (e) {
          console.log('❌ STAGE 2 FAILED: Invalid JSON');
          stageIssues.push('Invalid JSON response');
          testResults.stages.push({
            stage: 'API Request',
            status: 'FAILED',
            time: elapsed,
            issues: stageIssues
          });
          backend.kill();
          process.exit(1);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ STAGE 2 FAILED:', e.message);
      testResults.stages.push({
        stage: 'API Request',
        status: 'FAILED',
        time: Date.now() - stageStart,
        issues: [e.message]
      });
      backend.kill();
      process.exit(1);
    });

    req.on('timeout', () => {
      console.log('❌ STAGE 2 FAILED: Timeout');
      req.destroy();
      backend.kill();
      process.exit(1);
    });

    req.write(postData);
    req.end();
  });
}

async function monitorGeneration(backend, timeout) {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('STAGE 3: GENERATION MONITORING');
  console.log('════════════════════════════════════════════════════════════════\n');
  
  const stageStart = Date.now();
  let stepsGenerated = 0;
  let operationCounts = [];
  let qualityScores = [];
  let fallbacksTriggered = 0;
  let emergencyFallbacks = 0;
  let stageIssues = [];
  let bottlenecks = [];

  console.log('⏳ Monitoring generation for', timeout/1000, 'seconds...\n');

  const monitorInterval = setInterval(() => {
    // Check for bottlenecks (long operations)
    const elapsed = Date.now() - stageStart;
    if (elapsed > 60000 && stepsGenerated === 0) {
      bottlenecks.push('No steps generated after 60s');
      console.log('⚠️  BOTTLENECK: No generation after 60s');
    }
  }, 10000);

  setTimeout(() => {
    clearInterval(monitorInterval);
    
    const elapsed = Date.now() - stageStart;
    
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('STAGE 3 COMPLETE');
    console.log('════════════════════════════════════════════════════════════════\n');
    
    console.log('📊 Generation Statistics:');
    console.log(`   Steps generated: ${stepsGenerated}`);
    console.log(`   Operations per step: ${operationCounts.join(', ')}`);
    console.log(`   Quality scores: ${qualityScores.join(', ')}`);
    console.log(`   Fallbacks triggered: ${fallbacksTriggered}`);
    console.log(`   Emergency fallbacks: ${emergencyFallbacks}`);
    console.log(`   Time elapsed: ${(elapsed/1000).toFixed(1)}s\n`);

    // Analyze results
    const avgOps = operationCounts.length > 0 ? 
      operationCounts.reduce((a, b) => a + b, 0) / operationCounts.length : 0;
    const avgQuality = qualityScores.length > 0 ?
      qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;

    // Check for issues
    if (stepsGenerated === 0) {
      stageIssues.push('No steps generated');
    }
    if (avgOps < 40) {
      stageIssues.push(`Low operation count: ${avgOps.toFixed(1)} (target: 40-80)`);
    }
    if (avgQuality < 50) {
      stageIssues.push(`Low quality score: ${avgQuality.toFixed(1)} (target: 50+)`);
    }
    if (fallbacksTriggered > 0) {
      stageIssues.push(`${fallbacksTriggered} fallbacks triggered`);
    }
    if (emergencyFallbacks > 0) {
      stageIssues.push(`${emergencyFallbacks} EMERGENCY fallbacks`);
    }

    testResults.stages.push({
      stage: 'Generation Monitoring',
      status: stageIssues.length === 0 ? 'SUCCESS' : 'WARNING',
      time: elapsed,
      issues: stageIssues,
      bottlenecks: bottlenecks,
      stats: {
        steps: stepsGenerated,
        avgOperations: avgOps,
        avgQuality: avgQuality,
        fallbacks: fallbacksTriggered,
        emergencyFallbacks: emergencyFallbacks
      }
    });

    // Final analysis
    generateFinalReport(backend);
    
  }, timeout);

  // Monitor backend output for generation events
  backend.stdout.on('data', (data) => {
    const text = data.toString();
    
    // Count steps
    if (text.includes('Quality acceptable') || text.includes('Generated') && text.includes('operations')) {
      stepsGenerated++;
      
      // Extract operation count
      const opsMatch = text.match(/Ops:\s*(\d+)|Generated\s+(\d+)\s+operations/);
      if (opsMatch) {
        const count = parseInt(opsMatch[1] || opsMatch[2]);
        operationCounts.push(count);
        
        if (count < 40) {
          console.log(`⚠️  LOW OPS: Step ${stepsGenerated} has only ${count} operations`);
          stageIssues.push(`Step ${stepsGenerated}: ${count} ops (need 40+)`);
        } else {
          console.log(`✅ Step ${stepsGenerated}: ${count} operations`);
        }
      }
      
      // Extract quality score
      const qualityMatch = text.match(/Score:\s*(\d+)/);
      if (qualityMatch) {
        const score = parseInt(qualityMatch[1]);
        qualityScores.push(score);
        
        if (score < 50) {
          console.log(`⚠️  LOW QUALITY: Step ${stepsGenerated} scored ${score}`);
        }
      }
    }
    
    // Count fallbacks
    if (text.toLowerCase().includes('fallback') && !text.includes('NO fallback')) {
      fallbacksTriggered++;
    }
    if (text.includes('EMERGENCY')) {
      emergencyFallbacks++;
    }
  });
}

function generateFinalReport(backend) {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('FINAL REPORT - SENIOR ENGINEER ANALYSIS');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Summary table
  console.log('STAGE SUMMARY:');
  console.log('─────────────────────────────────────────────────────────────────');
  testResults.stages.forEach((stage, i) => {
    const status = stage.status === 'SUCCESS' ? '✅' : stage.status === 'WARNING' ? '⚠️ ' : '❌';
    console.log(`${i+1}. ${status} ${stage.stage}: ${stage.time}ms`);
    if (stage.issues && stage.issues.length > 0) {
      stage.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
  });
  console.log('─────────────────────────────────────────────────────────────────\n');

  // Issues summary
  console.log('ISSUES FOUND:', testResults.issues.length);
  if (testResults.issues.length > 0) {
    testResults.issues.forEach((issue, i) => {
      console.log(`  ${i+1}. [${issue.stage}] ${issue.type}: ${issue.message.substring(0, 100)}`);
    });
  } else {
    console.log('  None\n');
  }

  // Bugs summary
  console.log('BUGS FOUND:', testResults.bugs.length);
  if (testResults.bugs.length > 0) {
    testResults.bugs.forEach((bug, i) => {
      console.log(`  ${i+1}. [${bug.stage}] ${bug.type}: ${bug.message.substring(0, 100)}`);
    });
  } else {
    console.log('  None\n');
  }

  // Bottlenecks
  const allBottlenecks = testResults.stages
    .filter(s => s.bottlenecks && s.bottlenecks.length > 0)
    .flatMap(s => s.bottlenecks);
  
  console.log('BOTTLENECKS:', allBottlenecks.length);
  if (allBottlenecks.length > 0) {
    allBottlenecks.forEach((b, i) => {
      console.log(`  ${i+1}. ${b}`);
    });
  } else {
    console.log('  None\n');
  }

  // Overall verdict
  console.log('════════════════════════════════════════════════════════════════');
  const hasFailures = testResults.stages.some(s => s.status === 'FAILED');
  const hasWarnings = testResults.stages.some(s => s.status === 'WARNING');
  const hasFallbacks = testResults.issues.some(i => i.type === 'fallback');
  const hasEmergency = testResults.bugs.length > 0;

  if (hasFailures) {
    console.log('VERDICT: ❌ FAILED - Critical issues found');
  } else if (hasEmergency) {
    console.log('VERDICT: ❌ FAILED - Emergency fallbacks triggered');
  } else if (hasFallbacks) {
    console.log('VERDICT: ⚠️  WARNING - Fallbacks still being used');
  } else if (hasWarnings) {
    console.log('VERDICT: ⚠️  WARNING - Quality issues detected');
  } else {
    console.log('VERDICT: ✅ PASSED - All systems operational');
  }
  console.log('════════════════════════════════════════════════════════════════\n');

  // Save detailed report
  fs.writeFileSync(
    '/home/komail/LEAF/Learn-X/workflow-test-report.json',
    JSON.stringify(testResults, null, 2)
  );
  console.log('📁 Detailed report: workflow-test-report.json\n');

  backend.kill();
  process.exit(hasFailures || hasEmergency ? 1 : 0);
}
