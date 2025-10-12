/**
 * REAL PRODUCTION ANALYZER
 * Checks if NEW implementation (4 visuals + transcript) is working
 */

const fs = require('fs');

console.log('█'.repeat(80));
console.log('🔥 REAL PRODUCTION ANALYSIS - NEW IMPLEMENTATION');
console.log('█'.repeat(80));
console.log('');

const logPath = '/home/komail/LEAF/Learn-X/REAL_PRODUCTION_LOG.txt';

if (!fs.existsSync(logPath)) {
  console.error('❌ Log file not found:', logPath);
  process.exit(1);
}

const log = fs.readFileSync(logPath, 'utf8');
const lines = log.split('\n');

console.log('📊 Analyzing', lines.length, 'lines...\n');

// Check if NEW implementation ran
const newImpl = {
  generateStepVisuals: log.includes('[stepVisuals]'),
  multipleVisuals: log.includes('Generating 4 visuals'),
  transcriptGen: log.includes('[transcript]'),
  visualsInParallel: log.includes('Starting visual')
};

console.log('═'.repeat(80));
console.log('🆕 NEW IMPLEMENTATION DETECTION');
console.log('═'.repeat(80));
console.log('generateStepVisuals called:', newImpl.generateStepVisuals ? '✅ YES' : '❌ NO');
console.log('4 visuals requested:', newImpl.multipleVisuals ? '✅ YES' : '❌ NO');
console.log('Transcript generation:', newImpl.transcriptGen ? '✅ YES' : '❌ NO');
console.log('Parallel visual generation:', newImpl.visualsInParallel ? '✅ YES' : '❌ NO');

if (!Object.values(newImpl).some(v => v)) {
  console.log('\n❌ CRITICAL: NEW IMPLEMENTATION NOT RUNNING!');
  console.log('System is using OLD code path');
  console.log('\n🔍 Check orchestrator.ts - is generateStepVisuals being called?');
} else {
  console.log('\n✅ NEW implementation IS running');
}

// Count actual visuals generated
console.log('\n' + '═'.repeat(80));
console.log('🎨 VISUAL GENERATION ANALYSIS');
console.log('═'.repeat(80));

const codegenCalls = (log.match(/\[codegenV3\] Generating step/g) || []).length;
const svgGenerated = (log.match(/Generated SVG in/g) || []).length;
const animations = (log.match(/ANIMATIONS: (\d+) total/g) || []).map(m => {
  const num = m.match(/(\d+) total/)[1];
  return parseInt(num);
});

console.log('codegenV3 calls:', codegenCalls);
console.log('SVGs generated:', svgGenerated);
console.log('Animation counts:', animations.length > 0 ? animations.join(', ') : 'none');

const avgAnimations = animations.length > 0 
  ? (animations.reduce((a,b) => a+b, 0) / animations.length).toFixed(1)
  : 0;

console.log('Average animations per visual:', avgAnimations);

if (avgAnimations === 0) {
  console.log('\n❌ ZERO ANIMATIONS - Fallback/template generation!');
} else if (avgAnimations < 3) {
  console.log('\n⚠️  Low animation count - quality issue');
} else {
  console.log('\n✅ Good animation quality');
}

// Transcript analysis
console.log('\n' + '═'.repeat(80));
console.log('🎙️  TRANSCRIPT GENERATION');
console.log('═'.repeat(80));

const transcriptAttempts = (log.match(/\[transcript\] Generating/g) || []).length;
const transcriptSuccess = (log.match(/\[transcript\] ✅ Generated/g) || []).length;
const transcriptLengths = [];

lines.forEach(line => {
  const match = line.match(/\[transcript\] ✅ Generated (\d+) chars/);
  if (match) {
    transcriptLengths.push(parseInt(match[1]));
  }
});

console.log('Transcript attempts:', transcriptAttempts);
console.log('Successful transcripts:', transcriptSuccess);
console.log('Transcript lengths:', transcriptLengths.join(', ') || 'none');

const avgTranscript = transcriptLengths.length > 0
  ? (transcriptLengths.reduce((a,b) => a+b, 0) / transcriptLengths.length).toFixed(0)
  : 0;

console.log('Average transcript length:', avgTranscript, 'chars');

if (transcriptSuccess === 0) {
  console.log('\n❌ NO TRANSCRIPTS GENERATED');
} else if (avgTranscript < 150) {
  console.log('\n⚠️  Transcripts too short');
} else {
  console.log('\n✅ Transcripts generated successfully');
}

// Steps and emissions
console.log('\n' + '═'.repeat(80));
console.log('📡 STEP EMISSION ANALYSIS');
console.log('═'.repeat(80));

const stepsEmitted = (log.match(/🚀 ABOUT TO EMIT STEP/g) || []).length;
const emissionBlocks = log.split('🚀 ABOUT TO EMIT STEP');

console.log('Steps emitted:', stepsEmitted);

emissionBlocks.forEach((block, idx) => {
  if (idx === 0) return;
  
  const stepMatch = block.match(/StepId:\s*(\d+)/);
  const actionsMatch = block.match(/Actions:\s*(\d+)/);
  
  if (stepMatch && actionsMatch) {
    console.log(`  Step ${stepMatch[1]}: ${actionsMatch[1]} actions`);
  }
});

// Performance
console.log('\n' + '═'.repeat(80));
console.log('⏱️  PERFORMANCE METRICS');
console.log('═'.repeat(80));

const genTimes = [];
lines.forEach(line => {
  const match = line.match(/Generated SVG in ([\d.]+)s/);
  if (match) {
    genTimes.push(parseFloat(match[1]));
  }
});

if (genTimes.length > 0) {
  const avg = (genTimes.reduce((a,b) => a+b, 0) / genTimes.length).toFixed(1);
  const min = Math.min(...genTimes).toFixed(1);
  const max = Math.max(...genTimes).toFixed(1);
  
  console.log('Visual generations:', genTimes.length);
  console.log('Average time:', avg + 's');
  console.log('Range:', min + 's -', max + 's');
} else {
  console.log('No timing data');
}

// Errors
console.log('\n' + '═'.repeat(80));
console.log('❌ ERROR ANALYSIS');
console.log('═'.repeat(80));

const errors = lines.filter(l => 
  l.includes('[error]') || 
  l.includes('❌') ||
  l.includes('FAILED')
);

console.log('Errors found:', errors.length);
if (errors.length > 0) {
  console.log('\nFirst 5 errors:');
  errors.slice(0, 5).forEach(e => console.log('  ', e.trim().substring(0, 100)));
}

// Final verdict
console.log('\n\n' + '█'.repeat(80));
console.log('🎯 FINAL VERDICT');
console.log('█'.repeat(80));

const verdict = {
  newCodeRunning: Object.values(newImpl).some(v => v),
  visualsGenerated: svgGenerated >= 9, // 3 steps × 3+ visuals
  animationsPresent: avgAnimations >= 3,
  transcriptsWorking: transcriptSuccess >= 3,
  performanceOk: genTimes.length > 0 && genTimes.every(t => t < 30),
  noErrors: errors.length < 10
};

const score = Object.values(verdict).filter(Boolean).length;
const total = Object.keys(verdict).length;

console.log('\n📊 Score:', score + '/' + total);

console.log('\n✅ WORKING:');
Object.entries(verdict).forEach(([k, v]) => {
  if (v) console.log('  ✓', k);
});

console.log('\n❌ NOT WORKING:');
Object.entries(verdict).forEach(([k, v]) => {
  if (!v) console.log('  ✗', k);
});

console.log('\n' + '═'.repeat(80));
if (score === total) {
  console.log('🎉 PERFECT - New implementation working flawlessly!');
} else if (score >= total * 0.7) {
  console.log('✅ GOOD - New implementation mostly working');
} else if (score >= total * 0.5) {
  console.log('⚠️  PARTIAL - New implementation partially working');
} else {
  console.log('❌ BROKEN - New implementation not working');
}
console.log('═'.repeat(80));
console.log('');
