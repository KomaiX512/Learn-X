#!/usr/bin/env node

const Redis = require('ioredis');
const axios = require('axios');

async function diagnose() {
  console.log('=== SYSTEM DIAGNOSIS ===\n');
  
  // 1. Check backend health
  try {
    const health = await axios.get('http://localhost:3001/health');
    console.log('✓ Backend is running');
    console.log('  Gemini API Key:', health.data.env.GEMINI_API_KEY ? 'Set' : 'Missing');
    console.log('  Timeout:', health.data.env.LLM_TIMEOUT_MS || 'Default');
  } catch (e) {
    console.log('✗ Backend is not responding');
    return;
  }
  
  // 2. Check Redis
  const redis = new Redis();
  try {
    await redis.ping();
    console.log('✓ Redis is running');
    
    // Check for queues
    const queues = await redis.keys('bull:*');
    console.log(`  Queues found: ${queues.length}`);
    
    // Check plan queue
    const planJobs = await redis.keys('bull:plan-jobs:*');
    console.log(`  Plan jobs: ${planJobs.length}`);
    
    // Check gen queue  
    const genJobs = await redis.keys('bull:gen-jobs:*');
    console.log(`  Gen jobs: ${genJobs.length}`);
    
    // Check for stuck jobs
    const waitingPlan = await redis.llen('bull:plan-jobs:wait');
    const waitingGen = await redis.llen('bull:gen-jobs:wait');
    const activePlan = await redis.hlen('bull:plan-jobs:active');
    const activeGen = await redis.hlen('bull:gen-jobs:active');
    const failedPlan = await redis.zcard('bull:plan-jobs:failed');
    const failedGen = await redis.zcard('bull:gen-jobs:failed');
    
    console.log('\nQueue Status:');
    console.log(`  Plan - Waiting: ${waitingPlan}, Active: ${activePlan}, Failed: ${failedPlan}`);
    console.log(`  Gen  - Waiting: ${waitingGen}, Active: ${activeGen}, Failed: ${failedGen}`);
    
    // Get recent failed jobs
    if (failedPlan > 0 || failedGen > 0) {
      console.log('\nRecent Failures:');
      
      if (failedPlan > 0) {
        const failed = await redis.zrange('bull:plan-jobs:failed', -3, -1);
        for (const jobId of failed) {
          const job = await redis.hgetall(`bull:plan-jobs:${jobId}`);
          if (job.failedReason) {
            console.log(`  Plan job ${jobId}: ${job.failedReason.slice(0, 100)}`);
          }
        }
      }
      
      if (failedGen > 0) {
        const failed = await redis.zrange('bull:gen-jobs:failed', -3, -1);
        for (const jobId of failed) {
          const job = await redis.hgetall(`bull:gen-jobs:${jobId}`);
          if (job.failedReason) {
            console.log(`  Gen job ${jobId}: ${job.failedReason.slice(0, 100)}`);
          }
        }
      }
    }
    
    // Check sessions
    const sessions = await redis.keys('session:*');
    console.log(`\nSessions in Redis: ${sessions.length}`);
    if (sessions.length > 0) {
      const recent = sessions.slice(-3);
      for (const key of recent) {
        const parts = key.split(':');
        if (parts[2] === 'plan') {
          const plan = await redis.get(key);
          if (plan) {
            const parsed = JSON.parse(plan);
            console.log(`  ${parts[1]}: Plan with ${parsed.steps?.length || 0} steps`);
          }
        }
      }
    }
    
  } catch (e) {
    console.log('✗ Redis error:', e.message);
  } finally {
    redis.disconnect();
  }
  
  // 3. Test Gemini API directly
  console.log('\nTesting Gemini API:');
  try {
    const res = await axios.get('http://localhost:3001/api/gemini-test');
    console.log('✓ Gemini API works:', res.data.text);
  } catch (e) {
    console.log('✗ Gemini API error:', e.response?.data || e.message);
  }
  
  // 4. Test simple query
  console.log('\nTesting simple query:');
  const testId = `diag-${Date.now()}`;
  try {
    const res = await axios.post('http://localhost:3001/api/query', {
      query: 'hello',
      sessionId: testId
    });
    console.log('✓ Query accepted:', res.data);
    
    // Wait and check Redis
    await new Promise(r => setTimeout(r, 5000));
    
    const redis2 = new Redis();
    const plan = await redis2.get(`session:${testId}:plan`);
    if (plan) {
      console.log('✓ Plan generated');
    } else {
      console.log('✗ No plan found after 5 seconds');
    }
    redis2.disconnect();
    
  } catch (e) {
    console.log('✗ Query failed:', e.message);
  }
}

diagnose().catch(console.error);
