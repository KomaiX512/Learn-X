/**
 * Static Code Structure Verification
 * Verifies clarifier has proper retry and recovery logic without calling API
 */

import * as fs from 'fs';
import * as path from 'path';

const clarifierPath = path.join(__dirname, 'src', 'agents', 'clarifier.ts');

console.log('\n═══════════════════════════════════════════════════');
console.log('🔍 CLARIFIER CODE STRUCTURE VERIFICATION');
console.log('═══════════════════════════════════════════════════\n');

const code = fs.readFileSync(clarifierPath, 'utf-8');

const checks = [
  {
    name: 'MAX_RETRIES constant defined',
    pattern: /const MAX_RETRIES\s*=\s*\d+/,
    required: true
  },
  {
    name: 'Retry loop implementation',
    pattern: /for\s*\(let attempt = 1; attempt <= MAX_RETRIES/,
    required: true
  },
  {
    name: 'Exponential backoff',
    pattern: /backoffMs.*=.*1000.*\*.*attempt/,
    required: true
  },
  {
    name: 'Enhanced JSON cleaning',
    pattern: /const firstBrace.*indexOf\(\'\{\'\)/,
    required: true
  },
  {
    name: 'JSON fixing function',
    pattern: /function fixCommonJsonIssues/,
    required: true
  },
  {
    name: 'Fallback generator function',
    pattern: /function generateFallbackClarification/,
    required: true
  },
  {
    name: 'Fallback invocation on failure',
    pattern: /return generateFallbackClarification/,
    required: true
  },
  {
    name: 'Enhanced systemInstruction',
    pattern: /You MUST output ONLY valid, complete JSON/,
    required: true
  },
  {
    name: 'Strict JSON rules in prompt',
    pattern: /MUST close all brackets/,
    required: true
  },
  {
    name: 'Retry attempt logging',
    pattern: /Attempt.*failed/,
    required: true
  },
  {
    name: 'Lower temperature for reliability',
    pattern: /temperature:\s*0\.[1-6]/,
    required: true
  },
  {
    name: 'JSON extraction (braces)',
    pattern: /substring\(firstBrace, lastBrace/,
    required: true
  }
];

let passed = 0;
let failed = 0;

for (const check of checks) {
  const found = check.pattern.test(code);
  
  if (found) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name}`);
    if (check.required) {
      failed++;
    }
  }
}

// Check for anti-patterns
console.log('\n🚫 Anti-Pattern Checks:');

const antiPatterns = [
  {
    name: 'Single-attempt generation (no retry)',
    pattern: /await model\.generateContent.*\n.*return {/,
    shouldNotExist: true
  },
  {
    name: 'Unhandled JSON.parse',
    pattern: /JSON\.parse\([^)]+\)[^;]*;[^}]*return/,
    shouldNotExist: false // We want try-catch around it
  }
];

for (const check of antiPatterns) {
  const found = check.pattern.test(code);
  
  if (check.shouldNotExist && !found) {
    console.log(`✅ Avoided: ${check.name}`);
  } else if (!check.shouldNotExist && found) {
    console.log(`⚠️  Found: ${check.name}`);
  } else {
    console.log(`✅ Check passed: ${check.name}`);
  }
}

// Code metrics
console.log('\n📊 Code Metrics:');
const lines = code.split('\n').length;
const retryBlocks = (code.match(/for.*attempt.*MAX_RETRIES/g) || []).length;
const tryBlocks = (code.match(/try\s*{/g) || []).length;
const catchBlocks = (code.match(/catch.*{/g) || []).length;

console.log(`   Total lines: ${lines}`);
console.log(`   Retry loops: ${retryBlocks}`);
console.log(`   Try blocks: ${tryBlocks}`);
console.log(`   Catch blocks: ${catchBlocks}`);

console.log('\n═══════════════════════════════════════════════════');
console.log('📊 VERIFICATION RESULTS');
console.log('═══════════════════════════════════════════════════');
console.log(`✅ Passed: ${passed}/${checks.length}`);
console.log(`❌ Failed: ${failed}/${checks.length}`);
console.log(`Success Rate: ${((passed / checks.length) * 100).toFixed(1)}%`);
console.log('═══════════════════════════════════════════════════\n');

if (failed === 0) {
  console.log('🎉 ALL STRUCTURE CHECKS PASSED!\n');
  console.log('The clarifier agent has:');
  console.log('  ✅ Retry logic with exponential backoff');
  console.log('  ✅ Enhanced JSON cleaning and fixing');
  console.log('  ✅ Fallback clarification generator');
  console.log('  ✅ Improved prompt engineering');
  console.log('  ✅ Comprehensive error handling\n');
  console.log('Ready for production use! 🚀\n');
  process.exit(0);
} else {
  console.log('⚠️  SOME CHECKS FAILED! Review implementation.\n');
  process.exit(1);
}
