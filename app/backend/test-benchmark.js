/**
 * BENCHMARK TEST RUNNER
 * Tests if our system can match the Human Heart SVG quality standard
 */

const { stressTestWithRetry, runCompleteBenchmarkTest } = require('./dist/agents/svgBenchmarkTest.js');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function testSingleTopic() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔬 SINGLE TOPIC BENCHMARK TEST');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('Testing: Human Heart Anatomy (matching benchmark complexity)\n');
  
  const result = await stressTestWithRetry(
    'Human Heart Anatomy',
    'Create detailed anterior view showing four chambers (right/left atrium and ventricles), major vessels (aorta, pulmonary artery, vena cava), valves (tricuspid, mitral, pulmonary, aortic), and internal structures with proper anatomical labels',
    API_KEY,
    5 // Max 5 retries
  );
  
  console.log('\n📊 RESULTS:');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Success: ${result.success ? '✅ YES' : '❌ NO'}`);
  console.log(`Quality Score: ${result.quality}/100`);
  console.log(`Attempts: ${result.attempts}`);
  console.log(`Operations Generated: ${result.operations.length}`);
  
  if (result.operations.length > 0) {
    // Analyze operation types
    const opCounts = {};
    let pathComplexity = [];
    
    result.operations.forEach(op => {
      opCounts[op.op] = (opCounts[op.op] || 0) + 1;
      
      if (op.op === 'customPath' && op.path) {
        const commands = (op.path.match(/[MLCQAHVS]/gi) || []).length;
        pathComplexity.push(commands);
      }
    });
    
    console.log('\n📈 OPERATION BREAKDOWN:');
    console.log('───────────────────────────────────────────────────────');
    Object.entries(opCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([op, count]) => {
        const percent = Math.round(count / result.operations.length * 100);
        console.log(`  ${op}: ${count} (${percent}%)`);
      });
    
    if (pathComplexity.length > 0) {
      const avgComplexity = pathComplexity.reduce((a, b) => a + b, 0) / pathComplexity.length;
      const maxComplexity = Math.max(...pathComplexity);
      
      console.log('\n🔍 PATH COMPLEXITY ANALYSIS:');
      console.log('───────────────────────────────────────────────────────');
      console.log(`  Total Paths: ${pathComplexity.length}`);
      console.log(`  Average Commands per Path: ${avgComplexity.toFixed(1)}`);
      console.log(`  Most Complex Path: ${maxComplexity} commands`);
      console.log(`  Meets Benchmark (8+ avg): ${avgComplexity >= 8 ? '✅ YES' : '❌ NO'}`);
    }
    
    // Show sample operations
    console.log('\n📝 SAMPLE OPERATIONS (First 3):');
    console.log('───────────────────────────────────────────────────────');
    result.operations.slice(0, 3).forEach((op, i) => {
      const opStr = JSON.stringify(op);
      console.log(`${i+1}. ${opStr.substring(0, 200)}${opStr.length > 200 ? '...' : ''}`);
    });
  }
  
  // Quality interpretation
  console.log('\n🎯 QUALITY INTERPRETATION:');
  console.log('───────────────────────────────────────────────────────');
  if (result.quality >= 80) {
    console.log('✅ EXCELLENT: Matches or exceeds benchmark standard!');
    console.log('   This quality rivals medical textbook illustrations.');
  } else if (result.quality >= 60) {
    console.log('⚠️ GOOD: Acceptable quality but room for improvement.');
    console.log('   Add more complex paths and detailed labels.');
  } else {
    console.log('❌ POOR: Falls short of benchmark standard.');
    console.log('   Needs significant improvement in complexity and detail.');
  }
}

async function runFullSuite() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🧪 RUNNING FULL BENCHMARK TEST SUITE');
  console.log('═══════════════════════════════════════════════════════\n');
  
  await runCompleteBenchmarkTest(API_KEY);
}

// Command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'single';

if (testType === 'full') {
  runFullSuite().catch(console.error);
} else {
  testSingleTopic().catch(console.error);
}

console.log('\nUsage:');
console.log('  node test-benchmark.js        # Test single topic');
console.log('  node test-benchmark.js full   # Run full test suite');
