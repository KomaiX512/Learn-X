const http = require('http');

// Simple test
const TEST_QUERY = 'What is a derivative?';

console.log('🧪 SIMPLE TEST');
console.log('Query:', TEST_QUERY);

const data = JSON.stringify({
  query: TEST_QUERY,
  params: { style: '3blue1brown', depth: 'profound' }
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Response:', body);
    
    // Now monitor backend logs
    setTimeout(() => {
      console.log('\nWaiting for processing...');
    }, 1000);
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(data);
req.end();
