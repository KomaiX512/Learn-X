#!/usr/bin/env node
const axios = require('axios');

async function brutalTest() {
  console.log('\n🔥 BRUTAL HONESTY TEST - NO SHORTCUTS, NO LIES\n');
  
  const topics = [
    'What is electricity?',
    'How does DNA work?', 
    'Explain quantum tunneling',
    'What is machine learning?',
    'How do neurons work?'
  ];
  
  const results = {
    total: 0,
    firstAttempt: 0,
    secondAttempt: 0,
    thirdAttempt: 0,
    failed: 0,
    avgTime: [],
    errors: []
  };
  
  for (const topic of topics) {
    console.log(`\n📚 Testing: "${topic}"`);
    const startTime = Date.now();
    
    try {
      const response = await axios.post('http://localhost:3001/api/query', {
        query: topic,
        params: { style: '3blue1brown' }
      });
      
      const sessionId = response.data.sessionId;
      console.log(`✅ Session: ${sessionId}`);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      const elapsed = Date.now() - startTime;
      results.avgTime.push(elapsed);
      results.total++;
      
      console.log(`⏱️ Time: ${(elapsed/1000).toFixed(1)}s`);
      
    } catch (error) {
      results.errors.push({ topic, error: error.message });
      results.failed++;
      console.log(`❌ FAILED: ${error.message}`);
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BRUTAL TRUTH SUMMARY:');
  console.log('='.repeat(60));
  console.log(`Total tests: ${results.total + results.failed}`);
  console.log(`Successful: ${results.total} (${(results.total/(results.total+results.failed)*100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failed}`);
  if (results.avgTime.length > 0) {
    const avg = results.avgTime.reduce((a,b) => a+b, 0) / results.avgTime.length;
    console.log(`Average time: ${(avg/1000).toFixed(1)}s`);
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ FAILURES:');
    results.errors.forEach(e => {
      console.log(`  - ${e.topic}: ${e.error}`);
    });
  }
}

brutalTest().catch(console.error);
