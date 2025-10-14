#!/usr/bin/env node

/**
 * FULL PIPELINE TEST - Complete Query Flow
 * 
 * Tests the complete pipeline:
 * 1. Plan generation
 * 2. Parallel step generation (notes + 1 animation per step)
 * 3. Measures success rate, time, quality
 * 
 * This mimics the real production flow to catch any issues.
 */

const path = require('path');

// Set up paths
process.env.NODE_ENV = 'development';

// Load environment
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('\n' + '═'.repeat(80));
console.log('🔬 FULL PIPELINE TEST');
console.log('═'.repeat(80));

console.log('\n📋 Configuration:');
console.log(`   Query: "Explain DNA replication"`);
console.log(`   Expected: 3 steps`);
console.log(`   Per step: 1 notes + 1 animation = 2 visuals`);
console.log(`   Total: 6 visuals`);
console.log(`   Timeout: 180s per visual`);
console.log(`   Expected time: 3-5 minutes`);

console.log('\n🚀 Sending query to backend...');
console.log('');

const startTime = Date.now();

// Use curl to send query
const { exec } = require('child_process');

exec(`curl -X POST http://localhost:8000/api/query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Explain DNA replication"}' \\
  --max-time 600 2>&1`, 
  (error, stdout, stderr) => {
    
    if (error) {
      console.log('\n❌ Request failed:');
      console.log(error.message);
      process.exit(1);
    }
    
    try {
      const response = JSON.parse(stdout);
      const sessionId = response.sessionId;
      
      console.log(`✅ Query accepted`);
      console.log(`   Session ID: ${sessionId}`);
      console.log('');
      console.log('⏳ Monitoring generation...');
      console.log('   (Check backend-new-test.log for detailed progress)');
      console.log('');
      
      // Monitor progress
      let lastProgress = '';
      const monitorInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        process.stdout.write(`\r⏱️  Elapsed: ${elapsed}s... `);
      }, 1000);
      
      // Wait for completion (max 10 minutes)
      setTimeout(() => {
        clearInterval(monitorInterval);
        
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        
        console.log('\n\n' + '═'.repeat(80));
        console.log('📊 ANALYZING RESULTS');
        console.log('═'.repeat(80));
        
        // Read backend logs
        const fs = require('fs');
        const logs = fs.readFileSync(path.join(__dirname, 'backend-new-test.log'), 'utf8');
        
        // Count successes
        const notesSuccess = (logs.match(/\[notes\] ✅ Generated SVG keynote/g) || []).length;
        const animSuccess = (logs.match(/\[codegenV3\] ✅ Generated SVG/g) || []).length;
        const timeouts = (logs.match(/TIMEOUT at/g) || []).length;
        const failures = (logs.match(/All attempts failed/g) || []).length;
        
        console.log(`\n⏱️  Total time: ${totalTime}s (${(totalTime/60).toFixed(1)} minutes)`);
        console.log('');
        console.log('📊 Generation Results:');
        console.log(`   Notes generated: ${notesSuccess}/3`);
        console.log(`   Animations generated: ${animSuccess}/3`);
        console.log(`   Total visuals: ${notesSuccess + animSuccess}/6`);
        console.log('');
        console.log('❌ Failures:');
        console.log(`   Timeouts: ${timeouts}`);
        console.log(`   Complete failures: ${failures}`);
        console.log('');
        
        // Success rate
        const totalGenerated = notesSuccess + animSuccess;
        const successRate = Math.floor((totalGenerated / 6) * 100);
        
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log('');
        
        // Verdict
        console.log('═'.repeat(80));
        console.log('🎯 FINAL VERDICT');
        console.log('═'.repeat(80));
        console.log('');
        
        if (successRate === 100) {
          console.log('✅ ✅ ✅ PERFECT! ✅ ✅ ✅');
          console.log('');
          console.log('All visuals generated successfully!');
          console.log('No timeouts, no failures.');
          console.log('System is PRODUCTION READY!');
          console.log('');
          process.exit(0);
        } else if (successRate >= 80) {
          console.log('✅ GOOD - Minor issues');
          console.log('');
          console.log(`${totalGenerated}/6 visuals generated (${successRate}%)`);
          console.log('System is mostly working.');
          console.log('');
          if (timeouts > 0) {
            console.log('⚠️  Some timeouts detected:');
            console.log('   - Consider increasing timeout further (240s or 300s)');
            console.log('   - Or simplify prompts');
          }
          process.exit(0);
        } else if (successRate >= 50) {
          console.log('⚠️  ACCEPTABLE - Significant issues');
          console.log('');
          console.log(`Only ${totalGenerated}/6 visuals generated (${successRate}%)`);
          console.log('');
          console.log('Issues to investigate:');
          console.log('  - Check backend-new-test.log for errors');
          console.log('  - Timeout may still be too short');
          console.log('  - API rate limiting?');
          console.log('  - Parallel generation conflicts?');
          console.log('');
          process.exit(1);
        } else {
          console.log('❌ ❌ ❌ FAILED ❌ ❌ ❌');
          console.log('');
          console.log(`Only ${totalGenerated}/6 visuals generated (${successRate}%)`);
          console.log('');
          console.log('CRITICAL ISSUES:');
          console.log('  - System is NOT production ready');
          console.log('  - Check backend-new-test.log for root cause');
          console.log('  - May need architectural changes');
          console.log('');
          process.exit(1);
        }
        
      }, 600000); // 10 minutes max wait
      
    } catch (e) {
      console.log('\n❌ Failed to parse response:');
      console.log(stdout);
      process.exit(1);
    }
  }
);
