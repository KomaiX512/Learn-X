/**
 * QUICK VERIFICATION TEST
 * Fast test to verify basic functionality without full API calls
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment
const envPath = path.join(__dirname, 'app', 'backend', '.env');
dotenv.config({ path: envPath });

console.log('█'.repeat(80));
console.log('🔍 QUICK VERIFICATION TEST');
console.log('█'.repeat(80));

// Test 1: Environment
console.log('\n📋 TEST 1: Environment Variables');
console.log('─'.repeat(80));
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('USE_VISUAL_VERSION:', process.env.USE_VISUAL_VERSION || 'not set');
console.log('LOG_LEVEL:', process.env.LOG_LEVEL || 'not set');

if (!process.env.GEMINI_API_KEY) {
  console.error('\n❌ GEMINI_API_KEY not found - tests will fail');
  process.exit(1);
}

// Test 2: Backend Build
console.log('\n📋 TEST 2: Backend Build');
console.log('─'.repeat(80));
try {
  const fs = require('fs');
  const backendDist = path.join(__dirname, 'app', 'backend', 'dist');
  const agentsDir = path.join(backendDist, 'agents');
  
  if (!fs.existsSync(backendDist)) {
    throw new Error('Backend not built - run: cd app/backend && npm run build');
  }
  
  console.log('Backend dist:', fs.existsSync(backendDist) ? '✅ EXISTS' : '❌ MISSING');
  console.log('Agents dir:', fs.existsSync(agentsDir) ? '✅ EXISTS' : '❌ MISSING');
  
  // Check specific files
  const requiredFiles = [
    'agents/codegenV3.js',
    'agents/codegenV3WithRetry.js',
    'agents/transcriptGenerator.js'
  ];
  
  console.log('\nRequired Files:');
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    const filePath = path.join(backendDist, file);
    const exists = fs.existsSync(filePath);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allFilesExist = false;
  });
  
  if (!allFilesExist) {
    throw new Error('Some required files missing - rebuild backend');
  }
  
} catch (error) {
  console.error('❌', error.message);
  process.exit(1);
}

// Test 3: Module Loading
console.log('\n📋 TEST 3: Module Loading');
console.log('─'.repeat(80));
try {
  const { codegenV3 } = require('./app/backend/dist/agents/codegenV3');
  console.log('codegenV3:', typeof codegenV3 === 'function' ? '✅ LOADED' : '❌ INVALID');
  
  const { codegenV3WithRetry } = require('./app/backend/dist/agents/codegenV3WithRetry');
  console.log('codegenV3WithRetry:', typeof codegenV3WithRetry === 'function' ? '✅ LOADED' : '❌ INVALID');
  
  const { generateTranscript } = require('./app/backend/dist/agents/transcriptGenerator');
  console.log('generateTranscript:', typeof generateTranscript === 'function' ? '✅ LOADED' : '❌ INVALID');
  
} catch (error) {
  console.error('❌ Module loading failed:', error.message);
  process.exit(1);
}

// Test 4: Quick API Test (single call)
console.log('\n📋 TEST 4: Quick API Test');
console.log('─'.repeat(80));
console.log('Testing single Gemini API call (this may take 15-20 seconds)...\n');

async function quickAPITest() {
  try {
    const { codegenV3 } = require('./app/backend/dist/agents/codegenV3');
    
    const testStep = {
      id: 1,
      tag: 'test',
      desc: 'Show a simple circle with animation',
      compiler: 'svg'
    };
    
    const startTime = Date.now();
    const result = await codegenV3(testStep, 'Test Topic');
    const duration = Date.now() - startTime;
    
    if (!result || !result.actions || result.actions.length === 0) {
      throw new Error('API returned no result');
    }
    
    const svg = result.actions[0].svgCode || '';
    const hasAnimations = (svg.match(/<animate/g) || []).length > 0;
    
    console.log('✅ API Test Passed');
    console.log('─'.repeat(80));
    console.log('Duration:', duration + 'ms');
    console.log('SVG Length:', svg.length, 'chars');
    console.log('Animations:', hasAnimations ? '✅ YES' : '⚠️  NONE');
    
    if (!hasAnimations) {
      console.warn('\n⚠️  Warning: No animations generated (quality issue)');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    return false;
  }
}

quickAPITest().then(success => {
  console.log('\n' + '█'.repeat(80));
  if (success) {
    console.log('✅ QUICK VERIFICATION PASSED - System is functional');
    console.log('█'.repeat(80));
    console.log('\n✅ You can now run the full test suite:');
    console.log('   node test-all.js');
    console.log('\nOr run individual test levels:');
    console.log('   node test-unit-stages.js      # Stage tests (~30s)');
    console.log('   node test-integration.js      # Integration (~3min)');
    console.log('   node test-full-step.js        # Full step (~5min)');
    process.exit(0);
  } else {
    console.log('❌ QUICK VERIFICATION FAILED - Fix issues before running full tests');
    console.log('█'.repeat(80));
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
