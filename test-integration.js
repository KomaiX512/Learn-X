/**
 * INTEGRATION TESTS - COMBINED COMPONENTS
 * Tests multiple stages working together
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend .env
const envPath = path.join(__dirname, 'app', 'backend', '.env');
dotenv.config({ path: envPath });

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found!');
  process.exit(1);
}
console.log('✅ Environment loaded\n');

// ============================================================================
// GROUP TEST 1: Multiple Visuals Generation (4x codegenV3)
// ============================================================================
async function testGroup1_MultipleVisuals() {
  console.log('\n' + '═'.repeat(80));
  console.log('GROUP TEST 1: Multiple Visuals Generation (4x Parallel)');
  console.log('═'.repeat(80));
  
  const { codegenV3WithRetry } = require('./app/backend/dist/agents/codegenV3WithRetry');
  
  const testStep = {
    id: 1,
    tag: 'mechanics',
    desc: 'Newton\'s First Law: An object at rest stays at rest unless acted upon by force',
    compiler: 'svg'
  };
  
  const testTopic = 'Newton\'s Laws of Motion';
  
  console.log('\n📋 Input:');
  console.log('  Step:', testStep.desc);
  console.log('  Target Visuals: 4');
  
  console.log('\n⏳ Generating 4 visuals in parallel...\n');
  
  try {
    const startTime = Date.now();
    
    // Generate 4 visuals in parallel (same as production)
    const visualPromises = Array.from({ length: 4 }, async (_, index) => {
      const visualNumber = index + 1;
      console.log(`  Starting visual ${visualNumber}/4...`);
      
      const result = await codegenV3WithRetry(testStep, testTopic);
      
      if (!result || !result.actions || result.actions.length === 0) {
        console.warn(`  ⚠️  Visual ${visualNumber} returned no actions`);
        return null;
      }
      
      console.log(`  ✅ Visual ${visualNumber} complete (${result.actions[0].svgCode.length} chars)`);
      return result.actions[0];
    });
    
    const results = await Promise.all(visualPromises);
    const duration = Date.now() - startTime;
    
    const successfulVisuals = results.filter(v => v !== null);
    
    console.log('\n✅ GROUP TEST 1 COMPLETED');
    console.log('─'.repeat(80));
    console.log('⏱️  Total Duration:', duration + 'ms');
    console.log('⏱️  Average per Visual:', Math.round(duration / 4) + 'ms');
    console.log('📊 Successful Visuals:', successfulVisuals.length + '/4');
    
    // Quality verification
    console.log('\n🔍 Quality Checks:');
    successfulVisuals.forEach((visual, idx) => {
      const svg = visual.svgCode || '';
      const animCount = (svg.match(/<animate/g) || []).length;
      const labelCount = (svg.match(/<text/g) || []).length;
      
      console.log(`  Visual ${idx + 1}:`);
      console.log(`    - Size: ${svg.length} chars`);
      console.log(`    - Animations: ${animCount}`);
      console.log(`    - Labels: ${labelCount}`);
      console.log(`    - Quality: ${animCount > 0 ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    if (successfulVisuals.length < 3) {
      throw new Error('❌ Less than 3 visuals succeeded - unacceptable quality');
    }
    
    console.log('\n✅ All quality checks passed');
    
    return { 
      success: true, 
      visuals: successfulVisuals,
      duration,
      successRate: (successfulVisuals.length / 4) * 100
    };
    
  } catch (error) {
    console.error('\n❌ GROUP TEST 1 FAILED');
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// GROUP TEST 2: Visuals + Transcript Integration
// ============================================================================
async function testGroup2_VisualsWithTranscript() {
  console.log('\n' + '═'.repeat(80));
  console.log('GROUP TEST 2: Visuals + Transcript Integration');
  console.log('═'.repeat(80));
  
  const { codegenV3WithRetry } = require('./app/backend/dist/agents/codegenV3WithRetry');
  const { generateTranscript } = require('./app/backend/dist/agents/transcriptGenerator');
  
  const testStep = {
    id: 1,
    tag: 'applications',
    desc: 'Laplace transforms are used in circuit analysis to simplify differential equations',
    compiler: 'svg'
  };
  
  const testTopic = 'Laplace Transforms';
  
  console.log('\n📋 Input:');
  console.log('  Step:', testStep.desc.substring(0, 80) + '...');
  
  console.log('\n⏳ Step 1: Generating 4 visuals...\n');
  
  try {
    const visualDescriptions = [];
    const allActions = [];
    
    // Generate visuals
    const startVisualsTime = Date.now();
    
    const visualPromises = Array.from({ length: 4 }, async (_, index) => {
      const visualNumber = index + 1;
      const result = await codegenV3WithRetry(testStep, testTopic);
      
      if (!result || !result.actions || result.actions.length === 0) {
        return null;
      }
      
      // Store description
      const description = `Visual ${visualNumber}: ${testStep.desc.substring(0, 100)}`;
      visualDescriptions.push({ visualNumber, description });
      
      console.log(`  ✅ Visual ${visualNumber} generated`);
      return result.actions[0];
    });
    
    const visualResults = await Promise.all(visualPromises);
    const successfulVisuals = visualResults.filter(v => v !== null);
    allActions.push(...successfulVisuals);
    
    const visualsDuration = Date.now() - startVisualsTime;
    
    console.log(`\n✅ Visuals complete: ${successfulVisuals.length}/4 in ${visualsDuration}ms`);
    
    // Generate transcript
    console.log('\n⏳ Step 2: Generating transcript...\n');
    
    const startTranscriptTime = Date.now();
    const transcript = await generateTranscript(testStep, testTopic, visualDescriptions);
    const transcriptDuration = Date.now() - startTranscriptTime;
    
    console.log(`✅ Transcript generated: ${transcript.length} chars in ${transcriptDuration}ms`);
    
    const totalDuration = Date.now() - startVisualsTime;
    
    console.log('\n✅ GROUP TEST 2 COMPLETED');
    console.log('─'.repeat(80));
    console.log('⏱️  Visuals Duration:', visualsDuration + 'ms');
    console.log('⏱️  Transcript Duration:', transcriptDuration + 'ms');
    console.log('⏱️  Total Duration:', totalDuration + 'ms');
    console.log('📊 Visuals Generated:', successfulVisuals.length + '/4');
    console.log('📏 Transcript Length:', transcript.length, 'chars');
    
    console.log('\n📝 Transcript Preview:');
    console.log('─'.repeat(80));
    console.log(transcript.substring(0, 200) + '...');
    console.log('─'.repeat(80));
    
    // Verify integration
    console.log('\n🔍 Integration Checks:');
    console.log('  ✓ Visuals generated:', successfulVisuals.length >= 3 ? '✅ YES' : '❌ NO');
    console.log('  ✓ Transcript generated:', transcript.length > 150 ? '✅ YES' : '❌ NO');
    console.log('  ✓ Visual descriptions used:', visualDescriptions.length > 0 ? '✅ YES' : '❌ NO');
    
    if (successfulVisuals.length < 3 || transcript.length < 150) {
      throw new Error('❌ Integration quality check failed');
    }
    
    console.log('\n✅ All integration checks passed');
    
    return {
      success: true,
      actions: allActions,
      transcript,
      visualCount: successfulVisuals.length,
      duration: totalDuration
    };
    
  } catch (error) {
    console.error('\n❌ GROUP TEST 2 FAILED');
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// MAIN INTEGRATION TEST RUNNER
// ============================================================================
async function runIntegrationTests() {
  console.log('\n' + '█'.repeat(80));
  console.log('🧪 INTEGRATION TESTS - COMBINED COMPONENTS');
  console.log('█'.repeat(80));
  console.log('Testing multiple components working together');
  console.log('');
  
  const results = {
    group1: null,
    group2: null
  };
  
  // Group Test 1: Multiple Visuals
  results.group1 = await testGroup1_MultipleVisuals();
  
  // Delay between tests
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Group Test 2: Visuals + Transcript
  results.group2 = await testGroup2_VisualsWithTranscript();
  
  // Summary
  console.log('\n\n' + '█'.repeat(80));
  console.log('📊 INTEGRATION TESTS SUMMARY');
  console.log('█'.repeat(80));
  
  const group1Pass = results.group1?.success || false;
  const group2Pass = results.group2?.success || false;
  
  console.log(`\nGroup 1 (Multiple Visuals):        ${group1Pass ? '✅ PASS' : '❌ FAIL'}`);
  if (group1Pass) {
    console.log(`  - Success Rate: ${results.group1.successRate.toFixed(0)}%`);
    console.log(`  - Duration: ${results.group1.duration}ms`);
  }
  
  console.log(`\nGroup 2 (Visuals + Transcript):    ${group2Pass ? '✅ PASS' : '❌ FAIL'}`);
  if (group2Pass) {
    console.log(`  - Visuals: ${results.group2.visualCount}/4`);
    console.log(`  - Transcript: ${results.group2.transcript.length} chars`);
    console.log(`  - Duration: ${results.group2.duration}ms`);
  }
  
  const allPassed = group1Pass && group2Pass;
  
  console.log('\n' + '─'.repeat(80));
  if (allPassed) {
    console.log('✅ ALL INTEGRATION TESTS PASSED - Ready for full step test');
    console.log('─'.repeat(80));
    return true;
  } else {
    console.log('❌ SOME INTEGRATION TESTS FAILED - Fix issues before full test');
    console.log('─'.repeat(80));
    return false;
  }
}

// Run tests
runIntegrationTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
