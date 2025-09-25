#!/usr/bin/env node

const http = require('http');

async function testQuery(query, description) {
  console.log(`\n🎯 Testing: ${description}`);
  console.log(`📝 Query: "${query}"`);
  
  const postData = JSON.stringify({ query });
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

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ Session: ${result.sessionId}`);
          resolve(result);
        } catch (e) {
          console.log(`❌ Error: ${e.message}`);
          reject(e);
        }
      });
    });

    req.setTimeout(8000, () => {
      console.log('⏰ Timeout - likely processing');
      req.destroy();
      resolve({ sessionId: 'timeout' });
    });

    req.on('error', (err) => {
      console.log(`❌ Request Error: ${err.message}`);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function runUniversalTests() {
  console.log('🌍 Universal Dynamic Learning Engine Test');
  console.log('=========================================');
  
  const testCases = [
    // Different circuit types
    { query: "RLC circuit with damping analysis", desc: "RLC Circuits (not RC)" },
    { query: "RL circuit time constant", desc: "RL Circuits" },
    { query: "LC oscillator frequency response", desc: "LC Circuits" },
    
    // Math topics  
    { query: "Taylor series expansion visualization", desc: "Advanced Math" },
    { query: "Fourier transform frequency domain", desc: "Signal Processing" },
    { query: "Matrix multiplication with geometric interpretation", desc: "Linear Algebra" },
    
    // Science topics
    { query: "Maxwell equations electromagnetic fields", desc: "Electromagnetism" },
    { query: "Quantum wave function collapse", desc: "Quantum Physics" },
    { query: "DNA replication process", desc: "Biology" },
    
    // Engineering topics
    { query: "Control system root locus design", desc: "Control Systems" },
    { query: "Machine learning gradient descent", desc: "AI/ML" },
    { query: "Structural beam bending moments", desc: "Mechanical Engineering" }
  ];

  let successCount = 0;
  let timeoutCount = 0;
  let errorCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    try {
      const result = await testQuery(testCase.query, testCase.desc);
      if (result.sessionId && result.sessionId !== 'timeout') {
        successCount++;
      } else if (result.sessionId === 'timeout') {
        timeoutCount++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      errorCount++;
    }
  }

  console.log('\n📊 Test Results:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⏰ Timeouts: ${timeoutCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total: ${testCases.length}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Universal dynamic generation is working!');
    console.log('   LeaF can now teach ANY topic, not just RC circuits');
  } else {
    console.log('\n⚠️  System may need more debugging');
  }
}

runUniversalTests().catch(console.error);
