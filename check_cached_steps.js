/**
 * Check what's actually cached for the stuck session
 */

const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379
});

const sessionId = '58210b85-a9b6-4492-bb8a-d935a12c807d';

async function checkCachedSteps() {
  console.log('\n🔍 Checking cached steps for session:', sessionId);
  console.log('═'.repeat(80) + '\n');
  
  for (let stepId = 1; stepId <= 5; stepId++) {
    const key = `chunk:${sessionId}:${stepId}`;
    const cached = await redis.get(key);
    
    if (cached) {
      const chunk = JSON.parse(cached);
      console.log(`✅ Step ${stepId}: ${chunk.actions?.length || 0} actions`);
      
      if (chunk.actions && chunk.actions.length > 0) {
        // Count operation types
        const ops = {};
        chunk.actions.forEach(a => {
          ops[a.op] = (ops[a.op] || 0) + 1;
        });
        
        console.log(`   Operations:`, ops);
        
        // Show first 2 actions
        console.log(`   First actions:`);
        chunk.actions.slice(0, 2).forEach(a => {
          console.log(`     - ${a.op}:`, JSON.stringify(a).substring(0, 100));
        });
      }
      console.log('');
    } else {
      console.log(`❌ Step ${stepId}: NOT CACHED`);
    }
  }
  
  redis.disconnect();
}

checkCachedSteps().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
