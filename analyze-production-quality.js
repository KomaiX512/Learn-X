/**
 * BRUTAL HONESTY ANALYZER
 * No sugar coating - analyzes what ACTUALLY happened
 */

const fs = require('fs');
const path = require('path');

console.log('█'.repeat(80));
console.log('🔍 BRUTAL HONESTY ANALYSIS - PRODUCTION QUALITY');
console.log('█'.repeat(80));
console.log('');

// Read the debug log
const logPath = '/home/komail/LEAF/Learn-X/PRODUCTION_DEBUG_LOG.txt';

if (!fs.existsSync(logPath)) {
  console.error('❌ No debug log found - test did not complete');
  console.error('Expected:', logPath);
  process.exit(1);
}

const log = fs.readFileSync(logPath, 'utf8');
const lines = log.split('\n');

console.log('📊 ANALYZING', lines.length, 'lines of logs...\n');

// ============================================================================
// ANALYSIS 1: Did it even work?
// ============================================================================
console.log('═'.repeat(80));
console.log('1️⃣  BASIC FUNCTIONALITY - Did it work?');
console.log('═'.repeat(80));

const serverStarted = log.includes('SERVER READY') || log.includes('listening on port');
const planGenerated = log.includes('NEW STRUCTURED PLAN') || log.includes('plan received');
const stepsEmitted = log.includes('🚀 ABOUT TO EMIT STEP') || log.includes('EMITTED SUCCESSFULLY');

console.log('Server Started:', serverStarted ? '✅ YES' : '❌ NO');
console.log('Plan Generated:', planGenerated ? '✅ YES' : '❌ NO');
console.log('Steps Emitted:', stepsEmitted ? '✅ YES' : '❌ NO');

if (!serverStarted || !planGenerated || !stepsEmitted) {
  console.log('\n❌ CRITICAL FAILURE: Basic functionality broken');
  process.exit(1);
}

// ============================================================================
// ANALYSIS 2: How many visuals per step? (BRUTAL TRUTH)
// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('2️⃣  VISUAL COUNT - Are we getting 4 visuals per step?');
console.log('═'.repeat(80));

const emissionBlocks = log.split('🚀 ABOUT TO EMIT STEP');
const stepAnalysis = [];

emissionBlocks.forEach((block, idx) => {
  if (idx === 0) return; // Skip first split
  
  const stepMatch = block.match(/StepId:\s*(\d+)/);
  const actionsMatch = block.match(/Actions:\s*(\d+)/);
  
  if (stepMatch && actionsMatch) {
    const stepId = stepMatch[1];
    const actionCount = parseInt(actionsMatch[1]);
    stepAnalysis.push({ stepId, actionCount });
    
    const status = actionCount === 4 ? '✅' : actionCount >= 3 ? '⚠️ ' : '❌';
    console.log(`Step ${stepId}: ${actionCount} visual(s) ${status}`);
  }
});

const avgVisuals = stepAnalysis.length > 0 
  ? (stepAnalysis.reduce((sum, s) => sum + s.actionCount, 0) / stepAnalysis.length).toFixed(1)
  : 0;

console.log('\n📊 Average visuals per step:', avgVisuals);

if (avgVisuals < 3) {
  console.log('❌ FAILURE: Not meeting 4-visual target');
} else if (avgVisuals < 4) {
  console.log('⚠️  WARNING: Below target but acceptable (75%+)');
} else {
  console.log('✅ SUCCESS: Meeting 4-visual target');
}

// ============================================================================
// ANALYSIS 3: Animation Quality (NO FALLBACKS?)
// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('3️⃣  ANIMATION QUALITY - Are visuals truly dynamic?');
console.log('═'.repeat(80));

const animationLines = lines.filter(l => l.includes('ANIMATIONS:'));
const zeroAnimations = animationLines.filter(l => l.includes('ANIMATIONS: 0'));

console.log('Total visuals checked:', animationLines.length);
console.log('Visuals WITH animations:', animationLines.length - zeroAnimations.length);
console.log('Visuals WITHOUT animations:', zeroAnimations.length);

if (zeroAnimations.length > 0) {
  console.log('\n❌ CRITICAL: Some visuals have ZERO animations');
  console.log('This means fallback/template generation is happening!');
  zeroAnimations.forEach(line => console.log('  -', line.trim()));
} else {
  console.log('\n✅ All visuals have animations - TRUE GENERATION confirmed');
}

// ============================================================================
// ANALYSIS 4: Transcript Generation
// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('4️⃣  TRANSCRIPT GENERATION - Are transcripts being created?');
console.log('═'.repeat(80));

const transcriptGenerated = log.includes('[transcript] Generating') || log.includes('Transcript generated');
const transcriptSuccess = log.includes('[transcript] ✅');
const transcriptCount = (log.match(/\[transcript\] ✅/g) || []).length;

console.log('Transcript generation attempted:', transcriptGenerated ? '✅ YES' : '❌ NO');
console.log('Successful transcripts:', transcriptCount);

if (!transcriptGenerated) {
  console.log('\n❌ FAILURE: Transcript generation not happening');
} else if (transcriptCount < stepAnalysis.length) {
  console.log('\n⚠️  WARNING: Not all steps have transcripts');
} else {
  console.log('\n✅ SUCCESS: All steps have transcripts');
}

// ============================================================================
// ANALYSIS 5: Performance & Timing
// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('5️⃣  PERFORMANCE - How long did it take?');
console.log('═'.repeat(80));

const generationTimes = [];
lines.forEach(line => {
  const match = line.match(/Generated SVG in ([\d.]+)s/);
  if (match) {
    generationTimes.push(parseFloat(match[1]));
  }
});

if (generationTimes.length > 0) {
  const avgTime = (generationTimes.reduce((a,b) => a+b, 0) / generationTimes.length).toFixed(1);
  const minTime = Math.min(...generationTimes).toFixed(1);
  const maxTime = Math.max(...generationTimes).toFixed(1);
  
  console.log('Visual generations:', generationTimes.length);
  console.log('Average time:', avgTime + 's');
  console.log('Fastest:', minTime + 's');
  console.log('Slowest:', maxTime + 's');
  
  if (avgTime > 25) {
    console.log('\n⚠️  WARNING: Average time >25s (may hit timeouts)');
  } else {
    console.log('\n✅ Performance acceptable');
  }
} else {
  console.log('❌ No timing data found');
}

// ============================================================================
// ANALYSIS 6: Errors & Failures (BRUTAL TRUTH)
// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('6️⃣  ERRORS & FAILURES - What went wrong?');
console.log('═'.repeat(80));

const errorLines = lines.filter(l => 
  l.includes('[error]') || 
  l.includes('❌') || 
  l.includes('FAILED') ||
  l.includes('failed') && !l.includes('failed:')
);

if (errorLines.length === 0) {
  console.log('✅ NO ERRORS - Clean execution');
} else {
  console.log(`❌ Found ${errorLines.length} error(s):\n`);
  errorLines.slice(0, 10).forEach(line => {
    console.log('  ', line.trim().substring(0, 120));
  });
  if (errorLines.length > 10) {
    console.log(`\n  ... and ${errorLines.length - 10} more errors`);
  }
}

// ============================================================================
// ANALYSIS 7: Fallback Detection (CRITICAL)
// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('7️⃣  FALLBACK DETECTION - Is this TRUE generation?');
console.log('═'.repeat(80));

const fallbackIndicators = [
  { pattern: /fallback/i, name: 'Explicit fallback' },
  { pattern: /template/i, name: 'Template usage' },
  { pattern: /hardcoded/i, name: 'Hardcoded content' },
  { pattern: /default visual/i, name: 'Default visuals' },
  { pattern: /Using cached.*visual/i, name: 'Cached visuals' }
];

let fallbacksDetected = false;
fallbackIndicators.forEach(({ pattern, name }) => {
  const matches = lines.filter(l => pattern.test(l));
  if (matches.length > 0) {
    console.log(`❌ ${name}: ${matches.length} occurrences`);
    fallbacksDetected = true;
  }
});

if (!fallbacksDetected) {
  console.log('✅ NO FALLBACKS DETECTED - True dynamic generation');
} else {
  console.log('\n❌ FALLBACKS DETECTED - Not fully dynamic!');
}

// ============================================================================
// FINAL VERDICT
// ============================================================================
console.log('\n\n' + '█'.repeat(80));
console.log('🎯 FINAL VERDICT - BRUTAL HONESTY');
console.log('█'.repeat(80));

const scores = {
  functionality: serverStarted && planGenerated && stepsEmitted,
  visualCount: avgVisuals >= 3,
  animations: zeroAnimations.length === 0,
  transcripts: transcriptCount >= stepAnalysis.length,
  performance: generationTimes.length > 0 && generationTimes.every(t => t < 30),
  noErrors: errorLines.length < 5,
  noFallbacks: !fallbacksDetected
};

const passedChecks = Object.values(scores).filter(Boolean).length;
const totalChecks = Object.keys(scores).length;
const qualityScore = ((passedChecks / totalChecks) * 100).toFixed(0);

console.log('\n📊 QUALITY SCORE:', qualityScore + '%', `(${passedChecks}/${totalChecks} checks passed)`);

console.log('\n✅ PASSED:');
Object.entries(scores).forEach(([key, passed]) => {
  if (passed) console.log(`   ✓ ${key}`);
});

console.log('\n❌ FAILED:');
Object.entries(scores).forEach(([key, passed]) => {
  if (!passed) console.log(`   ✗ ${key}`);
});

console.log('\n' + '═'.repeat(80));
if (qualityScore >= 85) {
  console.log('🎉 PRODUCTION READY - System meets quality standards');
} else if (qualityScore >= 70) {
  console.log('⚠️  USABLE BUT NEEDS IMPROVEMENT - Some issues detected');
} else {
  console.log('❌ NOT PRODUCTION READY - Significant issues found');
}
console.log('═'.repeat(80));

console.log('\n📄 Full log available at: PRODUCTION_DEBUG_LOG.txt');
console.log('');

process.exit(qualityScore >= 70 ? 0 : 1);
