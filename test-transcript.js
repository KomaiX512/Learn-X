/**
 * Quick Test: Transcript Generator
 * Tests the new transcript generation functionality
 */

const { generateTranscript } = require('./app/backend/dist/agents/transcriptGenerator');

async function testTranscriptGeneration() {
  console.log('═'.repeat(70));
  console.log('🧪 TESTING TRANSCRIPT GENERATOR');
  console.log('═'.repeat(70));
  
  const testStep = {
    id: 1,
    tag: 'intuition',
    desc: "Imagine you're trying to untangle a super knotty rope (a complex differential equation) that changes over time. It's almost impossible by hand! The Laplace Transform is like a magical 'rope straightener' or a 'mathematical translator.' It takes that complex problem from the 'time domain' (where things are changing and derivatives are everywhere) and transforms it into a much simpler, algebraic problem in the 'frequency domain.' Think of it as changing a calculus puzzle into a simple algebra equation. Much easier to solve!",
    compiler: 'svg'
  };
  
  const testTopic = "Laplace Transforms in Mathematics";
  
  const testVisuals = [
    { visualNumber: 1, description: "Animated diagram showing time-domain function being transformed" },
    { visualNumber: 2, description: "Graph comparing complex derivatives to simple algebra" },
    { visualNumber: 3, description: "Visual metaphor of tangled rope straightening out" },
    { visualNumber: 4, description: "Interactive simulation of transform process" }
  ];
  
  console.log('\n📋 Test Input:');
  console.log('Topic:', testTopic);
  console.log('Step:', testStep.desc.substring(0, 100) + '...');
  console.log('Visuals:', testVisuals.length);
  
  console.log('\n⏳ Generating transcript...\n');
  
  try {
    const startTime = Date.now();
    const transcript = await generateTranscript(testStep, testTopic, testVisuals);
    const duration = Date.now() - startTime;
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ TRANSCRIPT GENERATED SUCCESSFULLY');
    console.log('═'.repeat(70));
    console.log(`Time: ${duration}ms`);
    console.log(`Length: ${transcript?.length || 0} characters`);
    console.log('\n📝 Result:');
    console.log('─'.repeat(70));
    console.log(transcript);
    console.log('─'.repeat(70));
    
    // Quality checks
    console.log('\n🔍 Quality Checks:');
    console.log(`✅ Length adequate: ${transcript.length > 200 ? 'YES' : 'NO'}`);
    console.log(`✅ Conversational: ${transcript.toLowerCase().includes('you') ? 'YES' : 'NO'}`);
    console.log(`✅ Educational: ${transcript.toLowerCase().includes('understand') || transcript.toLowerCase().includes('see') ? 'YES' : 'NO'}`);
    
    console.log('\n✅ TEST PASSED\n');
    return true;
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run test
testTranscriptGeneration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
