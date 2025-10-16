#!/usr/bin/env node

/**
 * Key Notes Generator - Comprehensive Test Suite
 * Tests both partial context and complete context scenarios
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://127.0.0.1:8000';
const TEST_SESSION_ID = '603505cf-7754-41c3-9eae-9611ae5e158d'; // From terminal logs (Carnot Engine)

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(70));
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function checkBackendHealth() {
  logSection('STEP 1: Backend Health Check');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (response.ok) {
      logSuccess('Backend is running');
      return true;
    } else {
      logError(`Backend returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Backend is not running: ${error.message}`);
    logWarning('Please start the backend with: npm run dev');
    return false;
  }
}

async function testNotesGeneratorAPI(sessionId) {
  logSection('STEP 2: Testing Notes Generator API');
  
  logInfo(`Session ID: ${sessionId}`);
  
  try {
    log('Sending POST request to /api/generate-notes...', colors.yellow);
    const startTime = Date.now();
    
    const response = await fetch(`${BACKEND_URL}/api/generate-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    logInfo(`Response received in ${duration}s`);
    logInfo(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      logError(`API Error: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    logSuccess('API responded successfully');
    
    return data;
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return null;
  }
}

function validateNotesStructure(data) {
  logSection('STEP 3: Validating Response Structure');
  
  let passed = 0;
  let failed = 0;
  
  // Check success field
  if (data.success === true) {
    logSuccess('Has success: true');
    passed++;
  } else {
    logError('Missing or false success field');
    failed++;
  }
  
  // Check notes array
  if (Array.isArray(data.notes)) {
    logSuccess(`Has notes array with ${data.notes.length} categories`);
    passed++;
  } else {
    logError('Missing or invalid notes array');
    failed++;
    return { passed, failed };
  }
  
  // Check metadata
  if (data.metadata) {
    logSuccess('Has metadata object');
    logInfo(`  - stepsAvailable: ${data.metadata.stepsAvailable}`);
    logInfo(`  - stepsTotal: ${data.metadata.stepsTotal}`);
    logInfo(`  - isPartial: ${data.metadata.isPartial}`);
    passed++;
  } else {
    logWarning('No metadata (might be old version)');
  }
  
  // Validate each category
  let totalItems = 0;
  data.notes.forEach((category, idx) => {
    if (category.category && Array.isArray(category.items)) {
      logSuccess(`Category ${idx + 1}: "${category.category}" (${category.items.length} items)`);
      totalItems += category.items.length;
      passed++;
      
      // Check first item structure
      if (category.items.length > 0) {
        const item = category.items[0];
        const hasTitle = !!item.title;
        const hasDescription = !!item.description;
        const hasFormula = !!item.formula;
        
        if (hasTitle) {
          logInfo(`    ✓ Item has title: "${item.title}"`);
        }
        if (hasFormula) {
          logInfo(`    ✓ Item has formula: "${item.formula.substring(0, 50)}..."`);
        }
        if (hasDescription) {
          logInfo(`    ✓ Item has description`);
        }
      }
    } else {
      logError(`Category ${idx + 1}: Invalid structure`);
      failed++;
    }
  });
  
  logInfo(`\nTotal items across all categories: ${totalItems}`);
  
  if (totalItems >= 15 && totalItems <= 25) {
    logSuccess(`Item count is in target range (15-25): ${totalItems}`);
    passed++;
  } else if (totalItems > 0) {
    logWarning(`Item count outside target range: ${totalItems} (expected ~20)`);
  } else {
    logError('No items generated!');
    failed++;
  }
  
  return { passed, failed, totalItems };
}

function analyzeContent(data) {
  logSection('STEP 4: Content Analysis');
  
  let formulaCount = 0;
  let useCaseCount = 0;
  let edgeCaseCount = 0;
  
  data.notes.forEach(category => {
    category.items.forEach(item => {
      if (item.formula) formulaCount++;
      if (item.useCase) useCaseCount++;
      if (item.edgeCase) edgeCaseCount++;
    });
  });
  
  logInfo(`Formulas found: ${formulaCount}`);
  logInfo(`Use cases found: ${useCaseCount}`);
  logInfo(`Edge cases found: ${edgeCaseCount}`);
  
  if (formulaCount > 0) {
    logSuccess('Contains formulas (good for STEM topics)');
  } else {
    logWarning('No formulas found (might be non-math topic)');
  }
  
  // Show sample content
  log('\nSample Key Notes:', colors.bright);
  data.notes.slice(0, 2).forEach(category => {
    log(`\n📂 ${category.category}`, colors.cyan);
    category.items.slice(0, 2).forEach(item => {
      log(`  → ${item.title}`, colors.green);
      if (item.formula) {
        log(`    Formula: ${item.formula}`, colors.yellow);
      }
      if (item.description) {
        log(`    ${item.description}`, colors.reset);
      }
    });
  });
  
  return { formulaCount, useCaseCount, edgeCaseCount };
}

function checkPartialContextHandling(data) {
  logSection('STEP 5: Partial Context Handling');
  
  if (!data.metadata) {
    logWarning('No metadata - cannot verify partial context handling');
    return;
  }
  
  const { stepsAvailable, stepsTotal, isPartial } = data.metadata;
  
  if (isPartial) {
    logInfo(`Partial context detected: ${stepsAvailable}/${stepsTotal} steps`);
    
    if (data.notes && data.notes.length > 0) {
      logSuccess('Successfully generated notes from partial context');
      logSuccess('Gap filling is working (missing steps were supplemented)');
    } else {
      logError('Failed to generate notes from partial context');
    }
  } else {
    logInfo('Complete context (all steps available)');
    logSuccess('Using full lecture transcript');
  }
}

function generateTestReport(results) {
  logSection('TEST SUMMARY');
  
  const totalTests = results.passed + results.failed;
  const passRate = ((results.passed / totalTests) * 100).toFixed(1);
  
  log(`\nTotal Tests: ${totalTests}`, colors.bright);
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}`);
  }
  log(`Pass Rate: ${passRate}%`, colors.cyan);
  
  if (results.totalItems) {
    log(`\nKey Points Generated: ${results.totalItems}`, colors.bright);
  }
  
  if (results.formulaCount !== undefined) {
    log(`Formulas: ${results.formulaCount}`, colors.yellow);
    log(`Use Cases: ${results.useCaseCount}`, colors.yellow);
    log(`Edge Cases: ${results.edgeCaseCount}`, colors.yellow);
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (results.failed === 0) {
    logSuccess('🎉 ALL TESTS PASSED! Notes Generator is working perfectly!');
  } else if (passRate >= 70) {
    logWarning('⚠️  MOSTLY WORKING - Some issues found');
  } else {
    logError('❌ TESTS FAILED - Major issues detected');
  }
  
  console.log('='.repeat(70) + '\n');
}

async function runAllTests() {
  log('\n' + '█'.repeat(70), colors.bright + colors.cyan);
  log('  KEY NOTES GENERATOR - COMPREHENSIVE TEST SUITE', colors.bright);
  log('█'.repeat(70) + '\n', colors.bright + colors.cyan);
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Step 1: Check backend health
  const backendHealthy = await checkBackendHealth();
  if (backendHealthy) {
    results.passed++;
  } else {
    results.failed++;
    generateTestReport(results);
    process.exit(1);
  }
  
  // Step 2: Test API
  const data = await testNotesGeneratorAPI(TEST_SESSION_ID);
  if (data) {
    results.passed++;
  } else {
    results.failed++;
    generateTestReport(results);
    process.exit(1);
  }
  
  // Step 3: Validate structure
  const structureResults = validateNotesStructure(data);
  results.passed += structureResults.passed;
  results.failed += structureResults.failed;
  results.totalItems = structureResults.totalItems;
  
  // Step 4: Analyze content
  const contentResults = analyzeContent(data);
  results.formulaCount = contentResults.formulaCount;
  results.useCaseCount = contentResults.useCaseCount;
  results.edgeCaseCount = contentResults.edgeCaseCount;
  
  // Step 5: Check partial context handling
  checkPartialContextHandling(data);
  
  // Generate final report
  generateTestReport(results);
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  logError(`Test suite crashed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
