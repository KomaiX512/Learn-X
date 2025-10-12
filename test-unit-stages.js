/**
 * UNIT TESTS - INDIVIDUAL STAGES
 * Tests each component in isolation with real inputs/outputs
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend .env
const envPath = path.join(__dirname, 'app', 'backend', '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Verify API key is loaded
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment!');
  console.error('Expected .env file at:', envPath);
  process.exit(1);
}
console.log('✅ GEMINI_API_KEY loaded\n');

// ============================================================================
// STAGE 1: Test codegenV3 (Single Visual Generation)
// ============================================================================
async function testStage1_CodegenV3() {
  console.log('\n' + '═'.repeat(80));
  console.log('STAGE 1: Testing codegenV3 (Single Visual Generator)');
  console.log('═'.repeat(80));
  
  const { codegenV3 } = require('./app/backend/dist/agents/codegenV3');
  
  const testStep = {
    id: 1,
    tag: 'test',
    desc: 'Show blood flowing through vessels with animated red cells moving',
    compiler: 'svg'
  };
  
  const testTopic = 'Blood Circulation System';
  
  console.log('\n📋 Input:');
  console.log('  Step ID:', testStep.id);
  console.log('  Description:', testStep.desc);
  console.log('  Topic:', testTopic);
  
  console.log('\n⏳ Generating visual...\n');
  
  try {
    const startTime = Date.now();
    const result = await codegenV3(testStep, testTopic);
    const duration = Date.now() - startTime;
    
    console.log('\n✅ STAGE 1 PASSED');
    console.log('─'.repeat(80));
    console.log('⏱️  Duration:', duration + 'ms');
    console.log('📦 Result Type:', result?.type);
    console.log('🎬 Actions Count:', result?.actions?.length || 0);
    
    if (result?.actions?.[0]) {
      const action = result.actions[0];
      console.log('🎨 Operation:', action.op);
      console.log('📏 SVG Length:', action.svgCode?.length || 0, 'chars');
      
      // Verify SVG structure
      const svg = action.svgCode || '';
      const hasXMLDeclaration = svg.includes('<?xml');
      const hasSvgTag = svg.includes('<svg');
      const hasClosingSvg = svg.includes('</svg>');
      const animateCount = (svg.match(/<animate/g) || []).length;
      const textCount = (svg.match(/<text/g) || []).length;
      
      console.log('\n🔍 Quality Checks:');
      console.log('  ✓ XML Declaration:', hasXMLDeclaration ? 'YES' : 'NO');
      console.log('  ✓ SVG Tags:', hasSvgTag && hasClosingSvg ? 'YES' : 'NO');
      console.log('  ✓ Animations:', animateCount, 'found');
      console.log('  ✓ Labels:', textCount, 'found');
      
      if (animateCount === 0) {
        throw new Error('❌ NO ANIMATIONS GENERATED - Quality check failed');
      }
      
      console.log('\n✅ All quality checks passed');
    }
    
    return { success: true, result, duration };
    
  } catch (error) {
    console.error('\n❌ STAGE 1 FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// STAGE 2: Test transcriptGenerator (Narration Generation)
// ============================================================================
async function testStage2_TranscriptGenerator() {
  console.log('\n' + '═'.repeat(80));
  console.log('STAGE 2: Testing transcriptGenerator (Narration Generator)');
  console.log('═'.repeat(80));
  
  const { generateTranscript } = require('./app/backend/dist/agents/transcriptGenerator');
  
  const testStep = {
    id: 1,
    tag: 'intuition',
    desc: 'Blood vessels act like highways for your blood cells, carrying oxygen to every part of your body',
    compiler: 'svg'
  };
  
  const testTopic = 'Blood Circulation System';
  
  const testVisuals = [
    { visualNumber: 1, description: 'Animated diagram showing blood vessels with flowing cells' },
    { visualNumber: 2, description: 'Graph showing oxygen levels in different parts of circulation' },
    { visualNumber: 3, description: 'Comparison of arteries and veins structure' },
    { visualNumber: 4, description: 'Interactive simulation of heart pumping blood' }
  ];
  
  console.log('\n📋 Input:');
  console.log('  Step:', testStep.desc.substring(0, 80) + '...');
  console.log('  Topic:', testTopic);
  console.log('  Visuals:', testVisuals.length);
  
  console.log('\n⏳ Generating transcript...\n');
  
  try {
    const startTime = Date.now();
    const transcript = await generateTranscript(testStep, testTopic, testVisuals);
    const duration = Date.now() - startTime;
    
    console.log('\n✅ STAGE 2 PASSED');
    console.log('─'.repeat(80));
    console.log('⏱️  Duration:', duration + 'ms');
    console.log('📏 Length:', transcript?.length || 0, 'chars');
    
    console.log('\n📝 Transcript Preview:');
    console.log('─'.repeat(80));
    console.log(transcript?.substring(0, 300) + '...');
    console.log('─'.repeat(80));
    
    // Quality checks
    const isLongEnough = transcript.length > 150;
    const isConversational = transcript.toLowerCase().includes('you') || 
                           transcript.toLowerCase().includes('we') ||
                           transcript.toLowerCase().includes('your');
    const isEducational = transcript.toLowerCase().includes('understand') ||
                        transcript.toLowerCase().includes('see') ||
                        transcript.toLowerCase().includes('learn');
    
    console.log('\n🔍 Quality Checks:');
    console.log('  ✓ Length adequate (>150):', isLongEnough ? 'YES' : 'NO');
    console.log('  ✓ Conversational tone:', isConversational ? 'YES' : 'NO');
    console.log('  ✓ Educational content:', isEducational ? 'YES' : 'NO');
    
    if (!isLongEnough || !isConversational) {
      throw new Error('❌ Transcript quality check failed');
    }
    
    console.log('\n✅ All quality checks passed');
    
    return { success: true, transcript, duration };
    
  } catch (error) {
    console.error('\n❌ STAGE 2 FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// STAGE 3: Test codegenV3WithRetry (Retry Logic)
// ============================================================================
async function testStage3_RetryLogic() {
  console.log('\n' + '═'.repeat(80));
  console.log('STAGE 3: Testing codegenV3WithRetry (Retry Wrapper)');
  console.log('═'.repeat(80));
  
  const { codegenV3WithRetry } = require('./app/backend/dist/agents/codegenV3WithRetry');
  
  const testStep = {
    id: 1,
    tag: 'test',
    desc: 'Show a sine wave oscillating with smooth animation',
    compiler: 'svg'
  };
  
  const testTopic = 'Wave Motion';
  
  console.log('\n📋 Input:');
  console.log('  Step ID:', testStep.id);
  console.log('  Description:', testStep.desc);
  
  console.log('\n⏳ Generating with retry logic...\n');
  
  try {
    const startTime = Date.now();
    const result = await codegenV3WithRetry(testStep, testTopic);
    const duration = Date.now() - startTime;
    
    console.log('\n✅ STAGE 3 PASSED');
    console.log('─'.repeat(80));
    console.log('⏱️  Duration:', duration + 'ms');
    console.log('📦 Result Type:', result?.type);
    console.log('🎬 Actions:', result?.actions?.length || 0);
    
    if (!result || !result.actions || result.actions.length === 0) {
      throw new Error('❌ Retry logic returned empty result');
    }
    
    console.log('✅ Retry logic working correctly');
    
    return { success: true, result, duration };
    
  } catch (error) {
    console.error('\n❌ STAGE 3 FAILED');
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runAllStageTests() {
  console.log('\n' + '█'.repeat(80));
  console.log('🧪 UNIT TESTING - INDIVIDUAL STAGES');
  console.log('█'.repeat(80));
  console.log('Testing each component in isolation');
  console.log('');
  
  const results = {
    stage1: null,
    stage2: null,
    stage3: null
  };
  
  // Stage 1: codegenV3
  results.stage1 = await testStage1_CodegenV3();
  
  // Small delay between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Stage 2: transcriptGenerator
  results.stage2 = await testStage2_TranscriptGenerator();
  
  // Small delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Stage 3: codegenV3WithRetry
  results.stage3 = await testStage3_RetryLogic();
  
  // Summary
  console.log('\n\n' + '█'.repeat(80));
  console.log('📊 STAGE TESTS SUMMARY');
  console.log('█'.repeat(80));
  
  const stage1Pass = results.stage1?.success || false;
  const stage2Pass = results.stage2?.success || false;
  const stage3Pass = results.stage3?.success || false;
  
  console.log(`\nStage 1 (codegenV3):          ${stage1Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Stage 2 (transcriptGenerator): ${stage2Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Stage 3 (codegenV3WithRetry):  ${stage3Pass ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = stage1Pass && stage2Pass && stage3Pass;
  
  console.log('\n' + '─'.repeat(80));
  if (allPassed) {
    console.log('✅ ALL STAGE TESTS PASSED - Ready for integration testing');
    console.log('─'.repeat(80));
    return true;
  } else {
    console.log('❌ SOME STAGE TESTS FAILED - Fix issues before integration');
    console.log('─'.repeat(80));
    
    if (!stage1Pass) console.log('\n⚠️  Fix Stage 1 (codegenV3) first');
    if (!stage2Pass) console.log('⚠️  Fix Stage 2 (transcriptGenerator) next');
    if (!stage3Pass) console.log('⚠️  Fix Stage 3 (codegenV3WithRetry) last');
    
    return false;
  }
}

// Run tests
runAllStageTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
