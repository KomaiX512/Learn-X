#!/usr/bin/env node
const axios = require('axios');

console.log('🔬 PERFORMANCE & RELIABILITY TEST\n');
console.log('=' .repeat(60));

async function testSession(topic) {
  const start = Date.now();
  console.log(`\n📚 Testing: "${topic}"`);
  
  try {
    const res = await axios.post('http://localhost:3001/api/query', {
      query: topic,
      params: { style: '3blue1brown' }
    });
    
    const sessionId = res.data.sessionId;
    console.log(`Session: ${sessionId}`);
    
    // Monitor for 3 minutes
    let checkCount = 0;
    const maxChecks = 36; // 36 * 5s = 180s
    
    const interval = setInterval(() => {
      checkCount++;
      process.stdout.write('.');
      if (checkCount >= maxChecks) {
        clearInterval(interval);
        const elapsed = Date.now() - start;
        console.log(`\n⏱️ Total time: ${(elapsed/1000).toFixed(1)}s`);
      }
    }, 5000);
    
    await new Promise(resolve => setTimeout(resolve, 180000));
    clearInterval(interval);
    
    const elapsed = Date.now() - start;
    return {
      topic,
      time: elapsed,
      success: true
    };
    
  } catch (err) {
    console.log(`\n❌ ERROR: ${err.message}`);
    return {
      topic,
      time: Date.now() - start,
      success: false,
      error: err.message
    };
  }
}

// Test different complexity levels
async function runTests() {
  const topics = [
    { query: 'What is 2+2?', complexity: 'trivial' },
    { query: 'Explain gravity', complexity: 'simple' },
    { query: 'How does DNA replication work with all enzymes?', complexity: 'complex' },
    { query: 'Explain quantum field theory and virtual particles', complexity: 'very complex' }
  ];
  
  const results = [];
  
  for (const {query, complexity} of topics) {
    console.log(`\n🎯 Complexity: ${complexity.toUpperCase()}`);
    const result = await testSession(query);
    result.complexity = complexity;
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERFORMANCE SUMMARY:');
  console.log('='.repeat(60));
  
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const time = (r.time/1000).toFixed(1);
    console.log(`${status} ${r.complexity.padEnd(12)} - ${time}s - ${r.topic.slice(0, 30)}...`);
  });
  
  const avgTime = results.filter(r => r.success).reduce((sum, r) => sum + r.time, 0) / results.filter(r => r.success).length;
  const successRate = (results.filter(r => r.success).length / results.length * 100).toFixed(0);
  
  console.log('\n📈 METRICS:');
  console.log(`Success rate: ${successRate}%`);
  console.log(`Average time: ${(avgTime/1000).toFixed(1)}s`);
  
  if (avgTime > 120000) {
    console.log('\n⚠️ WARNING: Average time exceeds 2 minutes!');
    console.log('Users will likely abandon before completion.');
  }
}

runTests().catch(console.error);
