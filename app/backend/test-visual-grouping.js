/**
 * TEST 1: Backend Visual Grouping
 * Verify svgMasterGenerator produces operations with visualGroup tags
 */

const { generateInsaneVisuals } = require('./dist/agents/svgMasterGenerator.js');
const dotenv = require('dotenv');

dotenv.config();

async function testBackendGeneration() {
  console.log('═══════════════════════════════════════════════');
  console.log('TEST 1: Backend Visual Grouping');
  console.log('═══════════════════════════════════════════════\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ FATAL: GEMINI_API_KEY not found in environment');
    process.exit(1);
  }

  try {
    console.log('📤 Generating visuals for "DNA Replication"...\n');
    
    const operations = await generateInsaneVisuals(
      'DNA Replication',
      'Explain how DNA replicates with helicase and polymerase enzymes',
      apiKey,
      2 // maxRetries
    );

    console.log(`✅ Generated ${operations.length} operations\n`);

    // Test 1.1: Check all operations have visualGroup
    console.log('TEST 1.1: Checking visualGroup presence...');
    let missingCount = 0;
    operations.forEach((op, idx) => {
      if (!op.visualGroup) {
        console.error(`  ❌ Operation ${idx} missing visualGroup:`, op.op);
        missingCount++;
      }
    });
    
    if (missingCount === 0) {
      console.log(`  ✅ PASS: All ${operations.length} operations have visualGroup\n`);
    } else {
      console.error(`  ❌ FAIL: ${missingCount}/${operations.length} operations missing visualGroup\n`);
      return false;
    }

    // Test 1.2: Check visualGroup structure
    console.log('TEST 1.2: Checking visualGroup structure...');
    const groupCounts = {};
    operations.forEach(op => {
      const group = op.visualGroup;
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });

    console.log('  Visual group distribution:');
    Object.entries(groupCounts).forEach(([group, count]) => {
      console.log(`    ${group}: ${count} operations`);
    });

    const hasTitle = groupCounts['title'] > 0;
    const diagramGroups = Object.keys(groupCounts).filter(k => k.startsWith('diagram-')).length;
    const headingGroups = Object.keys(groupCounts).filter(k => k.startsWith('heading-')).length;
    const descriptionGroups = Object.keys(groupCounts).filter(k => k.startsWith('description-')).length;

    console.log('\n  Structure validation:');
    console.log(`    ${hasTitle ? '✅' : '❌'} Has title group`);
    console.log(`    ${diagramGroups >= 3 ? '✅' : '❌'} Has 3+ diagram groups (found ${diagramGroups})`);
    console.log(`    ${headingGroups >= 3 ? '✅' : '❌'} Has 3+ heading groups (found ${headingGroups})`);
    console.log(`    ${descriptionGroups >= 3 ? '✅' : '❌'} Has 3+ description groups (found ${descriptionGroups})`);

    if (!hasTitle || diagramGroups < 3 || headingGroups < 3 || descriptionGroups < 3) {
      console.error('\n  ❌ FAIL: Insufficient visual group structure\n');
      return false;
    }

    console.log('\n  ✅ PASS: Proper visual group structure\n');

    // Test 1.3: Check coordinates are 0-1
    console.log('TEST 1.3: Checking coordinate ranges...');
    let badCoords = 0;
    operations.forEach((op, idx) => {
      if (op.x !== undefined && (op.x < 0 || op.x > 1)) {
        console.error(`  ❌ Operation ${idx} has x=${op.x} (should be 0-1)`);
        badCoords++;
      }
      if (op.y !== undefined && (op.y < 0 || op.y > 1)) {
        console.error(`  ❌ Operation ${idx} has y=${op.y} (should be 0-1)`);
        badCoords++;
      }
    });

    if (badCoords === 0) {
      console.log('  ✅ PASS: All coordinates in 0-1 range\n');
    } else {
      console.error(`  ❌ FAIL: ${badCoords} operations with bad coordinates\n`);
      return false;
    }

    // Test 1.4: Check delays exist
    console.log('TEST 1.4: Checking delays between visuals...');
    const delays = operations.filter(op => op.op === 'delay');
    console.log(`  Found ${delays.length} delay operations`);
    
    if (delays.length >= 2) {
      console.log('  ✅ PASS: Sufficient delays for pacing\n');
    } else {
      console.warn('  ⚠️  WARNING: Few delays, might be too fast\n');
    }

    // Save output for inspection
    const fs = require('fs');
    fs.writeFileSync(
      '/home/komail/LEAF/Learn-X/test-backend-output.json',
      JSON.stringify(operations, null, 2)
    );
    console.log('📁 Saved output to test-backend-output.json\n');

    console.log('═══════════════════════════════════════════════');
    console.log('✅ TEST 1: BACKEND GENERATION - PASSED');
    console.log('═══════════════════════════════════════════════\n');
    
    return true;

  } catch (error) {
    console.error('\n❌ TEST 1 FAILED WITH ERROR:');
    console.error(error.message);
    console.error(error.stack);
    return false;
  }
}

// Run test
testBackendGeneration().then(success => {
  process.exit(success ? 0 : 1);
});
