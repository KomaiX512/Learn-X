const Redis = require('ioredis');
const redis = new Redis();

async function checkKeys() {
  const allKeys = await redis.keys('*');
  console.log(`Total keys: ${allKeys.length}\n`);
  
  const chunkKeys = allKeys.filter(k => k.startsWith('chunk:'));
  const planKeys = allKeys.filter(k => k.startsWith('plan:'));
  
  console.log(`Chunk keys: ${chunkKeys.length}`);
  console.log(`Plan keys: ${planKeys.length}\n`);
  
  console.log('Recent chunk keys:');
  chunkKeys.slice(0, 10).forEach(k => console.log(`  ${k}`));
  
  console.log('\nRecent plan keys:');
  planKeys.slice(0, 5).forEach(k => console.log(`  ${k}`));
  
  redis.disconnect();
}

checkKeys();
