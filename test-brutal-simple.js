/**
 * SIMPLE BRUTAL HONESTY TEST
 * Direct API test with log monitoring
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

console.log('════════════════════════════════════════════════════════════════');
console.log('SIMPLE BRUTAL HONESTY TEST');
console.log('════════════════════════════════════════════════════════════════\n');

// Kill ports
console.log('🧹 Killing ports...');
try {
  execSync('lsof -ti:8000 | xargs kill -9 2>/dev/null', { stdio: 'ignore' });
} catch (e) {}
try {
  execSync('lsof -ti:5174 | xargs kill -9 2>/dev/null', { stdio: 'ignore' });
} catch (e) {}

console.log('⏳ Waiting for ports to clear...');
setTimeout(startTest, 3000);

async function startTest() {
  console.log('🚀 Starting backend...\n');
  
  const backend = spawn('npm', ['start'], {
    cwd: '/home/komail/LEAF/Learn-X/app/backend',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let logs = '';
  let fallbackCount = 0;
  let hardcodingCount = 0;
  let emergencyCount = 0;

  backend.stdout.on('data', (data) => {
    const text = data.toString();
    logs += text;
    
    // Real-time monitoring
    if (text.includes('EMERGENCY')) {
      emergencyCount++;
      console.log('🚨 EMERGENCY FALLBACK:', text.trim().substring(0, 150));
    }
    if (text.toLowerCase().includes('fallback')) {
      fallbackCount++;
      console.log('⚠️  FALLBACK:', text.trim().substring(0, 150));
    }
    if (text.includes('dummy') || text.includes('placeholder')) {
      hardcodingCount++;
      console.log('🔴 HARDCODING:', text.trim().substring(0, 150));
    }
    
    // Monitor generation details
    if (text.includes('[SVG-MASTER]') || text.includes('[codeVisual]')) {
      console.log('📊', text.trim().substring(0, 200));
    }
  });

  backend.stderr.on('data', (data) => {
    const text = data.toString();
    if (!text.includes('Redis version')) {
      console.error('ERROR:', text.trim().substring(0, 200));
    }
  });

  // Wait for backend
  console.log('⏳ Waiting 12s for backend to start...\n');
  await new Promise(resolve => setTimeout(resolve, 12000));

  console.log('📤 Sending test query...\n');
  
  const sessionId = 'test-' + Date.now();
  const postData = JSON.stringify({
    query: 'Explain protein folding',
    sessionId: sessionId
  });

  const req = http.request({
    hostname: 'localhost',
    port: 8000,
    path: '/api/query',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ Query accepted:', data.substring(0, 100));
      console.log('\n⏳ Monitoring generation for 60 seconds...\n');
      
      setTimeout(() => {
        console.log('\n════════════════════════════════════════════════════════════════');
        console.log('RESULTS');
        console.log('════════════════════════════════════════════════════════════════\n');
        console.log(`Emergency fallbacks: ${emergencyCount}`);
        console.log(`Fallbacks used: ${fallbackCount}`);
        console.log(`Hardcoding detected: ${hardcodingCount}\n`);
        
        fs.writeFileSync('/tmp/brutal-test-logs.txt', logs);
        console.log('📁 Full logs saved to: /tmp/brutal-test-logs.txt\n');
        
        if (emergencyCount > 0) {
          console.log('❌ CRITICAL: Emergency fallbacks were used!');
        } else if (fallbackCount > 0) {
          console.log('⚠️  WARNING: Fallbacks were triggered');
        } else if (hardcodingCount > 0) {
          console.log('⚠️  WARNING: Hardcoded content detected');
        } else {
          console.log('✅ PASSED: No fallbacks or hardcoding detected');
        }
        
        backend.kill();
        process.exit(0);
      }, 60000);
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request failed:', e.message);
    backend.kill();
    process.exit(1);
  });

  req.write(postData);
  req.end();
}
