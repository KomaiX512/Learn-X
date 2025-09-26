#!/usr/bin/env node

/**
 * VERIFY SYSTEM IS WORKING
 * Quick test to ensure backend generates and delivers content
 */

const axios = require('axios');
const { execSync } = require('child_process');

async function verifySystem() {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║   SYSTEM VERIFICATION TEST                                        ║
║   Testing if backend generates and delivers content               ║
╚════════════════════════════════════════════════════════════════════╝
  `);
  
  // Simple test query
  const sessionId = `verify-${Date.now()}`;
  const query = "Explain how a simple pendulum works with diagrams";
  
  console.log(`Testing with: "${query}"`);
  console.log(`Session ID: ${sessionId}\n`);
  
  try {
    // Send query
    console.log('📤 Sending query...');
    const response = await axios.post('http://localhost:3001/api/query', {
      query: query,
      sessionId: sessionId
    });
    
    console.log('✅ Query accepted\n');
    console.log('⏳ Waiting for generation (20 seconds)...\n');
    
    // Wait for generation
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    // Check backend logs
    console.log('📊 CHECKING BACKEND GENERATION:\n');
    
    // Get process ID of backend
    const backendPid = execSync("ps aux | grep 'node dist/index.js' | grep -v grep | awk '{print $2}'", { encoding: 'utf8' }).trim();
    console.log(`Backend PID: ${backendPid || 'Not found'}`);
    
    // Check if backend generated content
    const logFiles = execSync('ls -la /tmp/backend*.log 2>/dev/null || echo "No log files"', { encoding: 'utf8' });
    console.log('Log files:\n', logFiles);
    
    // Check latest log
    const latestLog = execSync(`tail -500 /tmp/backend*.log 2>/dev/null | grep -E "${sessionId}" | tail -20 || echo "No logs found"`, { encoding: 'utf8' });
    
    if (latestLog.includes('No logs found')) {
      console.log('❌ No logs found for this session\n');
    } else {
      console.log('📝 Latest log entries:');
      console.log(latestLog.substring(0, 500) + '...\n');
      
      // Count key events
      const fullLog = execSync(`tail -2000 /tmp/backend*.log 2>/dev/null | grep "${sessionId}" || echo ""`, { encoding: 'utf8' });
      
      const planCount = (fullLog.match(/plan/gi) || []).length;
      const stepCount = (fullLog.match(/step=\d+/g) || []).length;
      const emitCount = (fullLog.match(/EMIT/gi) || []).length;
      const errorCount = (fullLog.match(/ERROR|error|timeout/gi) || []).length;
      const actionCount = (fullLog.match(/op: '/g) || []).length;
      
      console.log('📊 STATISTICS:');
      console.log(`  Plan mentions: ${planCount}`);
      console.log(`  Steps generated: ${stepCount}`);
      console.log(`  Emit events: ${emitCount}`);
      console.log(`  Actions generated: ${actionCount}`);
      console.log(`  Errors: ${errorCount}`);
      
      // Check for JSON errors
      const jsonErrors = (fullLog.match(/JSON.*parse.*failed|Unexpected token/gi) || []).length;
      if (jsonErrors > 0) {
        console.log(`  ⚠️  JSON parsing errors: ${jsonErrors}`);
      }
      
      // Verdict
      console.log('\n🏁 VERDICT:');
      if (stepCount >= 5 && actionCount >= 20 && errorCount === 0) {
        console.log('✅ SYSTEM IS WORKING! Content is being generated.');
      } else if (stepCount > 0 || actionCount > 0) {
        console.log('⚠️  PARTIAL SUCCESS - Some content generated but issues exist:');
        if (stepCount < 5) console.log('   - Not all steps generated');
        if (actionCount < 20) console.log('   - Low action count');
        if (errorCount > 0) console.log('   - Errors detected');
        if (jsonErrors > 0) console.log('   - JSON parsing issues');
      } else {
        console.log('❌ SYSTEM FAILURE - No content generated');
        console.log('   Possible causes:');
        console.log('   - Backend not processing queries');
        console.log('   - Gemini API timeout');
        console.log('   - Worker queue issues');
      }
    }
    
    // Check if frontend would receive content
    console.log('\n📡 FRONTEND DELIVERY CHECK:');
    const socketConnections = execSync(`netstat -an 2>/dev/null | grep :3001 | grep ESTABLISHED | wc -l || echo "0"`, { encoding: 'utf8' }).trim();
    console.log(`  Active WebSocket connections: ${socketConnections}`);
    
    if (parseInt(socketConnections) > 0) {
      console.log('  ✅ WebSocket connections active');
    } else {
      console.log('  ⚠️  No active WebSocket connections');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Backend is not running!');
      console.log('Please start the backend first.');
    }
  }
  
  console.log('\n' + '='.repeat(70));
}

verifySystem().catch(console.error);
