#!/usr/bin/env node
const { spawn } = require('child_process');
const axios = require('axios');

// Start monitoring backend logs
console.log('🔍 MONITORING BACKEND FOR BRUTAL TRUTH...\n');

const stats = {
  attempts: { 1: 0, 2: 0, 3: 0 },
  failures: [],
  timeouts: 0,
  arithmeticErrors: 0,
  successTimes: []
};

// Monitor logs
const grep = spawn('tail', ['-f', '/tmp/backend.log'], { shell: false });
grep.on('error', () => {
  console.log('Starting direct monitoring...');
});

// Parse backend output
process.stdin.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    // Track attempts
    if (line.includes('Attempt 1/3')) stats.attempts[1]++;
    if (line.includes('Attempt 2/3')) stats.attempts[2]++;
    if (line.includes('Attempt 3/3')) stats.attempts[3]++;
    
    // Track failures
    if (line.includes('Attempt 1 failed')) {
      const match = line.match(/failed: (.+)/);
      if (match) stats.failures.push(match[1]);
    }
    
    // Track timeouts
    if (line.includes('timeout after 120000ms')) stats.timeouts++;
    
    // Track arithmetic errors
    if (line.includes('0.5 + ') || line.includes('Math.')) stats.arithmeticErrors++;
    
    // Track success times
    if (line.includes('codegen completed') && line.includes(' in ')) {
      const match = line.match(/in (\d+)ms/);
      if (match) stats.successTimes.push(parseInt(match[1]));
    }
  });
});

// Test a topic
async function testTopic(topic) {
  console.log(`\n📚 TESTING: "${topic}"`);
  stats.attempts = { 1: 0, 2: 0, 3: 0 };
  stats.failures = [];
  
  try {
    const res = await axios.post('http://localhost:3001/api/query', {
      query: topic,
      params: { style: '3blue1brown' }
    });
    console.log(`Session: ${res.data.sessionId}`);
    
    // Wait for all 5 steps
    await new Promise(resolve => setTimeout(resolve, 180000)); // 3 mins
    
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  }
  
  // Print stats for this topic
  console.log('\n📊 RESULTS:');
  console.log(`First attempts: ${stats.attempts[1]}`);
  console.log(`Second attempts: ${stats.attempts[2]} (${((stats.attempts[2]/stats.attempts[1])*100).toFixed(0)}% failure rate)`);
  console.log(`Third attempts: ${stats.attempts[3]}`);
  console.log(`Timeouts: ${stats.timeouts}`);
  console.log(`Arithmetic errors: ${stats.arithmeticErrors}`);
  if (stats.successTimes.length > 0) {
    const avg = stats.successTimes.reduce((a,b)=>a+b,0) / stats.successTimes.length;
    console.log(`Avg generation time: ${(avg/1000).toFixed(1)}s`);
  }
  if (stats.failures.length > 0) {
    console.log('\nFAILURE REASONS:');
    const counts = {};
    stats.failures.forEach(f => {
      const key = f.split(':')[0];
      counts[key] = (counts[key] || 0) + 1;
    });
    Object.entries(counts).forEach(([k,v]) => {
      console.log(`  - ${k}: ${v} times`);
    });
  }
}

// Run test
testTopic('Explain the Krebs cycle in cellular respiration');
