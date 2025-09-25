#!/usr/bin/env node

const http = require('http');

async function makeQuery(query) {
  return new Promise((resolve, reject) => {
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

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          console.log(`✅ Query Response: ${data}`);
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.setTimeout(5000, () => {
      console.log('⏰ Request timeout - likely Gemini API delay');
      req.destroy();
      resolve({ sessionId: 'timeout' });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testQueries() {
  console.log('🎯 LeaF Universal Learning Engine - Final Demo');
  console.log('=============================================');
  
  const queries = [
    "How does integration work in calculus?",
    "Explain RC circuit charging",
    "Show me derivatives with examples"
  ];
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`\n📚 Query ${i+1}: "${query}"`);
    
    try {
      const result = await makeQuery(query);
      if (result.sessionId && result.sessionId !== 'timeout') {
        console.log(`   🆔 Session: ${result.sessionId}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Demo completed!');
  console.log('\n📖 What LeaF Can Now Teach:');
  console.log('• Integration (area under curves, Riemann sums)');
  console.log('• RC Circuits (charging curves, time constants)');  
  console.log('• Derivatives (slopes, tangent lines)');
  console.log('• Plus any topic via Gemini AI generation!');
}

testQueries();
