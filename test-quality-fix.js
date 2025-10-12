/**
 * TEST: Verify quality improvements after fixes
 */

const { generateInsaneVisuals } = require('./app/backend/dist/agents/svgMasterGenerator.js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'app/backend/.env') });

async function testQualityFix() {
  console.log('═══════════════════════════════════════════════');
  console.log('TESTING: Quality Fix - Protein Structure');
  console.log('═══════════════════════════════════════════════\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ No API key');
    process.exit(1);
  }

  try {
    console.log('📤 Generating: Protein Structure Visual\n');
    console.log('Expected:');
    console.log('  - 40-80 operations (rich detail)');
    console.log('  - Complex SVG paths (NOT basic shapes)');
    console.log('  - All visualGroup="main"');
    console.log('  - Comprehensive labeling\n');
    
    const start = Date.now();
    
    const operations = await generateInsaneVisuals(
      'Protein Structure',
      'Show the 3D structure of a protein with alpha helices, beta sheets, and amino acid chains. Label the secondary structures and show hydrogen bonds.',
      apiKey,
      2
    );
    
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    
    console.log(`\n✅ Generated ${operations.length} operations in ${elapsed}s\n`);

    // Analyze quality
    console.log('═══════════════════════════════════════════════');
    console.log('QUALITY ANALYSIS');
    console.log('═══════════════════════════════════════════════\n');

    // Test 1: Operation count
    console.log(`TEST 1: Operation Count`);
    console.log(`  Generated: ${operations.length} operations`);
    if (operations.length >= 40) {
      console.log(`  ✅ PASS: Meets 40-80 target\n`);
    } else if (operations.length >= 30) {
      console.log(`  ⚠️  WARN: Below target but acceptable\n`);
    } else {
      console.log(`  ❌ FAIL: Too few operations\n`);
    }

    // Test 2: visualGroup simplification
    console.log(`TEST 2: Visual Group Simplification`);
    const groupCounts = {};
    operations.forEach(op => {
      const group = op.visualGroup || 'none';
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });
    
    console.log(`  Groups found:`, Object.keys(groupCounts));
    if (Object.keys(groupCounts).length <= 2 && groupCounts['main']) {
      console.log(`  ✅ PASS: Using simplified "main" group (${groupCounts['main']} ops)\n`);
    } else {
      console.log(`  ⚠️  WARN: Multiple groups found:`, groupCounts, '\n');
    }

    // Test 3: Complex SVG paths
    console.log(`TEST 3: Complex SVG Paths`);
    const customPaths = operations.filter(op => op.op === 'customPath');
    console.log(`  customPath operations: ${customPaths.length}`);
    
    if (customPaths.length > 0) {
      const pathComplexities = customPaths.map(op => {
        const path = op.path || '';
        const commands = (path.match(/[MLCQAZ]/gi) || []).length;
        return commands;
      });
      
      const avgComplexity = pathComplexities.reduce((a, b) => a + b, 0) / pathComplexities.length;
      console.log(`  Average path complexity: ${avgComplexity.toFixed(1)} commands`);
      console.log(`  Sample path (first 100 chars): ${customPaths[0].path.substring(0, 100)}...`);
      
      if (avgComplexity >= 8) {
        console.log(`  ✅ PASS: Complex paths with curves\n`);
      } else if (avgComplexity >= 5) {
        console.log(`  ⚠️  WARN: Paths could be more complex\n`);
      } else {
        console.log(`  ❌ FAIL: Paths too simple\n`);
      }
    } else {
      console.log(`  ❌ FAIL: No customPath operations (using basic shapes only)\n`);
    }

    // Test 4: Labeling
    console.log(`TEST 4: Comprehensive Labeling`);
    const labels = operations.filter(op => op.op === 'drawLabel');
    console.log(`  Labels: ${labels.length}`);
    
    if (labels.length > 0) {
      console.log(`  Sample labels:`);
      labels.slice(0, 5).forEach(label => {
        console.log(`    - "${label.text}"`);
      });
      
      // Check for placeholder text
      const placeholders = labels.filter(l => 
        /label \d|part \d|component \d|visual \d|concept \d/i.test(l.text)
      );
      
      if (placeholders.length === 0 && labels.length >= 10) {
        console.log(`  ✅ PASS: Comprehensive labeling with real terms\n`);
      } else if (labels.length >= 8) {
        console.log(`  ⚠️  WARN: Good labeling but could be better\n`);
      } else {
        console.log(`  ❌ FAIL: Insufficient labeling\n`);
      }
    }

    // Test 5: Check for basic shapes domination
    console.log(`TEST 5: Avoiding Basic Shapes`);
    const basicShapes = operations.filter(op => 
      op.op === 'drawRect' || op.op === 'drawCircle'
    ).length;
    const advancedOps = operations.filter(op => 
      op.op === 'customPath' || op.op === 'addParticle' || op.op === 'drawWave'
    ).length;
    
    console.log(`  Basic shapes (rect/circle): ${basicShapes}`);
    console.log(`  Advanced operations: ${advancedOps}`);
    const ratio = advancedOps / (operations.length || 1);
    console.log(`  Advanced ratio: ${(ratio * 100).toFixed(1)}%`);
    
    if (ratio >= 0.5) {
      console.log(`  ✅ PASS: Using advanced SVG operations\n`);
    } else if (ratio >= 0.3) {
      console.log(`  ⚠️  WARN: Some advanced ops but could improve\n`);
    } else {
      console.log(`  ❌ FAIL: Dominated by basic shapes\n`);
    }

    // Save output
    fs.writeFileSync(
      '/home/komail/LEAF/Learn-X/test-quality-output.json',
      JSON.stringify(operations, null, 2)
    );
    console.log('📁 Saved to test-quality-output.json\n');

    console.log('═══════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`Operations: ${operations.length}`);
    console.log(`customPath: ${customPaths.length}`);
    console.log(`Labels: ${labels.length}`);
    console.log(`Generation time: ${elapsed}s`);
    console.log('═══════════════════════════════════════════════\n');

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    return false;
  }
}

testQualityFix().then(success => {
  process.exit(success ? 0 : 1);
});
