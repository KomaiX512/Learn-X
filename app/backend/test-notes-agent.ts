/**
 * Direct Unit Test for Notes Generator Agent
 * Tests the agent logic without HTTP server
 */

import 'dotenv/config';
import { generateKeyNotes } from './src/agents/notesGenerator';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(70));
}

async function testCompleteContext() {
  logSection('TEST 1: Complete Context (All Steps Available)');
  
  const topic = "Carnot Engine";
  const summary = "Understanding the theoretical maximum efficiency of heat engines";
  const steps = [
    { title: "The Intuition", desc: "Why Carnot engine is the theoretical benchmark" },
    { title: "Mathematical Formulation", desc: "Deriving the efficiency formula" },
    { title: "Real-World Applications", desc: "Comparing real engines to Carnot limit" }
  ];
  
  const stepContents = [
    {
      stepId: 1,
      title: "The Intuition",
      transcript: "Imagine you're an engineer trying to build the most perfect, ideal heat engine imaginable—one that squeezes every last bit of useful work out of a temperature difference, like a turbine powered by steam going from a super-hot boiler to a cold condenser. The Carnot engine is that theoretical blueprint. It's not a real engine you can build, but a mental model that tells us no matter how clever your design, your engine can never be more efficient than a certain limit. This ultimate 'speed limit' for converting heat into work is dictated only by the temperature of the hot source (like the boiler) and the cold sink (like the surrounding air or a cooling system). It's the benchmark against which all real engines, from car engines to power plants, are measured.",
      actions: [],
      complexity: 3,
      isAvailable: true
    },
    {
      stepId: 2,
      title: "Mathematical Formulation",
      transcript: "The efficiency of a Carnot engine is given by η = 1 - (T_cold / T_hot), where temperatures must be in absolute scale (Kelvin). This means that to maximize efficiency, you need the hottest possible heat source and the coldest possible heat sink. For example, a steam turbine operating between 600K and 300K would have a maximum efficiency of 50%. This is the theoretical maximum - no real engine can exceed this.",
      actions: [],
      complexity: 4,
      isAvailable: true
    },
    {
      stepId: 3,
      title: "Real-World Applications",
      transcript: "Modern power plants typically achieve 35-45% efficiency, compared to the Carnot limit of ~60% for their operating temperatures. The gap exists due to friction, heat loss, and irreversible processes. Understanding this limit helps engineers identify where improvements are possible.",
      actions: [],
      complexity: 3,
      isAvailable: true
    }
  ];
  
  try {
    log('📝 Generating notes with complete context...', colors.yellow);
    const startTime = Date.now();
    
    const result = await generateKeyNotes(topic, summary, steps, stepContents, false);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`✅ Generated in ${duration}s`, colors.green);
    log(`   Categories: ${result.notes.length}`, colors.cyan);
    log(`   Total items: ${result.notes.reduce((sum, cat) => sum + cat.items.length, 0)}`, colors.cyan);
    
    // Show sample
    result.notes.slice(0, 2).forEach(cat => {
      log(`\n📂 ${cat.category} (${cat.items.length} items)`, colors.bright);
      cat.items.slice(0, 2).forEach(item => {
        log(`  → ${item.title}`, colors.green);
        if (item.formula) log(`    Formula: ${item.formula}`, colors.yellow);
      });
    });
    
    return result;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`, colors.red);
    throw error;
  }
}

async function testPartialContext() {
  logSection('TEST 2: Partial Context (Only 1 of 3 Steps Available)');
  
  const topic = "Carnot Engine";
  const summary = "Understanding the theoretical maximum efficiency of heat engines";
  const steps = [
    { title: "The Intuition", desc: "Why Carnot engine is the theoretical benchmark" },
    { title: "Mathematical Formulation", desc: "Deriving the efficiency formula" },
    { title: "Real-World Applications", desc: "Comparing real engines to Carnot limit" }
  ];
  
  const stepContents = [
    {
      stepId: 1,
      title: "The Intuition",
      transcript: "Imagine you're an engineer trying to build the most perfect, ideal heat engine imaginable—one that squeezes every last bit of useful work out of a temperature difference. The Carnot engine is that theoretical blueprint. It's the benchmark against which all real engines are measured.",
      actions: [],
      complexity: 3,
      isAvailable: true
    },
    {
      stepId: 2,
      title: "Mathematical Formulation",
      transcript: "",  // Not rendered yet
      actions: [],
      complexity: 4,
      isAvailable: false  // Missing
    },
    {
      stepId: 3,
      title: "Real-World Applications",
      transcript: "",  // Not rendered yet
      actions: [],
      complexity: 3,
      isAvailable: false  // Missing
    }
  ];
  
  try {
    log('📝 Generating notes with PARTIAL context (1/3 steps)...', colors.yellow);
    log('⚠️  Should fill in missing formulas and concepts', colors.yellow);
    const startTime = Date.now();
    
    const result = await generateKeyNotes(topic, summary, steps, stepContents, true);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`✅ Generated in ${duration}s`, colors.green);
    log(`   Categories: ${result.notes.length}`, colors.cyan);
    log(`   Total items: ${result.notes.reduce((sum, cat) => sum + cat.items.length, 0)}`, colors.cyan);
    
    // Check if formulas were filled in despite missing steps
    const hasFormulas = result.notes.some(cat => 
      cat.items.some(item => item.formula && item.formula.length > 0)
    );
    
    if (hasFormulas) {
      log('✅ GAP FILLING WORKING: Formulas generated despite missing steps!', colors.green);
    } else {
      log('⚠️  No formulas found - gap filling may not be working', colors.yellow);
    }
    
    // Show sample
    result.notes.slice(0, 2).forEach(cat => {
      log(`\n📂 ${cat.category} (${cat.items.length} items)`, colors.bright);
      cat.items.slice(0, 2).forEach(item => {
        log(`  → ${item.title}`, colors.green);
        if (item.formula) log(`    Formula: ${item.formula}`, colors.yellow);
      });
    });
    
    return result;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`, colors.red);
    throw error;
  }
}

async function runTests() {
  log('\n' + '█'.repeat(70), colors.bright + colors.cyan);
  log('  NOTES GENERATOR AGENT - DIRECT UNIT TEST', colors.bright);
  log('█'.repeat(70) + '\n', colors.bright + colors.cyan);
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Test 1: Complete Context
  try {
    await testCompleteContext();
    results.passed++;
  } catch (error) {
    results.failed++;
  }
  
  // Test 2: Partial Context
  try {
    await testPartialContext();
    results.passed++;
  } catch (error) {
    results.failed++;
  }
  
  // Summary
  logSection('TEST SUMMARY');
  log(`\nTotal Tests: ${results.passed + results.failed}`, colors.bright);
  log(`✅ Passed: ${results.passed}`, colors.green);
  if (results.failed > 0) {
    log(`❌ Failed: ${results.failed}`, colors.red);
  }
  
  const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  log(`Pass Rate: ${passRate}%\n`, colors.cyan);
  
  if (results.failed === 0) {
    log('🎉 ALL TESTS PASSED! Notes Generator is working perfectly!\n', colors.green + colors.bright);
  } else {
    log('❌ SOME TESTS FAILED\n', colors.red + colors.bright);
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`\n❌ Test suite crashed: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
