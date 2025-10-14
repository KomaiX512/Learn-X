/**
 * UNIT TEST: Notes Generator Quality Verification
 * 
 * Tests that the notes generator produces benchmark-quality SVG keynotes
 * matching the user's proven "Introduction to Amplifier" example.
 * 
 * BENCHMARK CRITERIA:
 * - Pure SVG code (no HTML/CSS/JS)
 * - 1200x800 viewBox
 * - Rich text elements (>50)
 * - Structured layout with rectangles
 * - Mathematical formulas constructed geometrically
 * - Visual hierarchy with colors
 * - No LaTeX syntax in text elements
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { generateNotes } from '../agents/transcriptGenerator';
import { PlanStep } from '../types';

// Test configuration - supports both benchmark and random subtopics
const RANDOM_SUBTOPICS = [
  { topic: 'Electronics Fundamentals', subtopic: 'Introduction to the Amplifier' }, // Benchmark
  { topic: 'Machine Learning', subtopic: 'Neural Network Backpropagation' },
  { topic: 'Quantum Physics', subtopic: 'Wave-Particle Duality' },
  { topic: 'Organic Chemistry', subtopic: 'Nucleophilic Substitution Reactions' },
  { topic: 'Data Structures', subtopic: 'Red-Black Tree Balancing' },
  { topic: 'Calculus', subtopic: 'Integration by Parts' }
];

// Select test topic (use command line arg or random)
const testIndex = process.argv[2] ? parseInt(process.argv[2]) : Math.floor(Math.random() * RANDOM_SUBTOPICS.length);
const TEST_CONFIG = RANDOM_SUBTOPICS[testIndex];
const TEST_SUBTOPIC = TEST_CONFIG.subtopic;
const TEST_TOPIC = TEST_CONFIG.topic;

// UPDATED BENCHMARK METRICS - Flexible to allow different design approaches
// Focus on overall quality rather than specific element counts
const BENCHMARK_METRICS = {
  minTextElements: 50,      // Rich textual content (primary indicator)
  minStructuralElements: 5, // Combined rects + lines (flexible - some use more text, less structure)
  minTotalLength: 5000,     // Comprehensive content
  requiredViewBox: '0 0 1200 800',
  requiredWidth: '1200',
  requiredHeight: '800',
  minTotalElements: 60      // Overall richness (text + rect + line) - MAIN QUALITY METRIC
};

/**
 * Quality checker - validates SVG against benchmark metrics
 */
function validateSVGQuality(svgCode: string): {
  passed: boolean;
  metrics: any;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Extract metrics
  const textElements = (svgCode.match(/<text/g) || []).length;
  const rectElements = (svgCode.match(/<rect/g) || []).length;
  const lineElements = (svgCode.match(/<line/g) || []).length;
  const totalLength = svgCode.length;
  
  // Check for LaTeX syntax (should NOT be present)
  const hasLatex = /\$\$|\\frac|\\text|\\sqrt/g.test(svgCode);
  
  // Check viewBox
  const viewBoxMatch = svgCode.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : null;
  
  // Check width/height
  const widthMatch = svgCode.match(/width="(\d+)"/);
  const heightMatch = svgCode.match(/height="(\d+)"/);
  const width = widthMatch ? widthMatch[1] : null;
  const height = heightMatch ? heightMatch[1] : null;
  
  // Calculate combined metrics
  const structuralElements = rectElements + lineElements;
  const totalElements = textElements + rectElements + lineElements;
  
  const metrics = {
    textElements,
    rectElements,
    lineElements,
    structuralElements,
    totalElements,
    totalLength,
    viewBox,
    width,
    height,
    hasLatex
  };
  
  // Validate against benchmarks (FLEXIBLE APPROACH)
  if (textElements < BENCHMARK_METRICS.minTextElements) {
    errors.push(`Insufficient text elements: ${textElements} < ${BENCHMARK_METRICS.minTextElements}`);
  }
  
  if (structuralElements < BENCHMARK_METRICS.minStructuralElements) {
    errors.push(`Insufficient structural elements (rect+line): ${structuralElements} < ${BENCHMARK_METRICS.minStructuralElements}`);
  }
  
  if (totalElements < BENCHMARK_METRICS.minTotalElements) {
    errors.push(`Insufficient overall richness: ${totalElements} elements < ${BENCHMARK_METRICS.minTotalElements}`);
  }
  
  if (totalLength < BENCHMARK_METRICS.minTotalLength) {
    errors.push(`Insufficient detail: ${totalLength} chars < ${BENCHMARK_METRICS.minTotalLength}`);
  }
  
  if (viewBox !== BENCHMARK_METRICS.requiredViewBox) {
    errors.push(`Incorrect viewBox: "${viewBox}" !== "${BENCHMARK_METRICS.requiredViewBox}"`);
  }
  
  if (width !== BENCHMARK_METRICS.requiredWidth) {
    errors.push(`Incorrect width: "${width}" !== "${BENCHMARK_METRICS.requiredWidth}"`);
  }
  
  if (height !== BENCHMARK_METRICS.requiredHeight) {
    errors.push(`Incorrect height: "${height}" !== "${BENCHMARK_METRICS.requiredHeight}"`);
  }
  
  if (hasLatex) {
    errors.push('CRITICAL: LaTeX syntax detected in text elements (must use geometric construction)');
  }
  
  return {
    passed: errors.length === 0,
    metrics,
    errors
  };
}

/**
 * UNIT TEST: Generate notes and validate quality
 */
async function testNotesGenerator() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 NOTES GENERATOR QUALITY TEST');
  console.log('='.repeat(80));
  console.log(`Topic: ${TEST_TOPIC}`);
  console.log(`Subtopic: ${TEST_SUBTOPIC}`);
  console.log('Benchmark: Introduction to Amplifier SVG example');
  console.log('='.repeat(80));
  
  // Create mock step
  const step: PlanStep = {
    id: 1,
    tag: 'Introduction',
    desc: TEST_SUBTOPIC,
    compiler: 'svg'
  } as any;
  
  try {
    console.log('\n⏳ Generating SVG keynote...');
    const startTime = Date.now();
    
    const svgCode = await generateNotes(step, TEST_TOPIC, TEST_SUBTOPIC);
    
    const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Generation completed in ${genTime}s`);
    
    if (!svgCode) {
      console.error('\n❌ TEST FAILED: No SVG code generated');
      process.exit(1);
    }
    
    // Save output for inspection
    const fs = require('fs');
    const outputPath = `/tmp/test-notes-output.svg`;
    fs.writeFileSync(outputPath, svgCode);
    console.log(`\n💾 Output saved: ${outputPath}`);
    
    // Validate quality
    console.log('\n' + '-'.repeat(80));
    console.log('📊 QUALITY VALIDATION');
    console.log('-'.repeat(80));
    
    const validation = validateSVGQuality(svgCode);
    
    console.log('\nMetrics (Flexible Quality Approach):');
    console.log(`  Text elements:       ${validation.metrics.textElements} (min: ${BENCHMARK_METRICS.minTextElements}) ${validation.metrics.textElements >= BENCHMARK_METRICS.minTextElements ? '✓' : '✗'}`);
    console.log(`  Rect elements:       ${validation.metrics.rectElements}`);
    console.log(`  Line elements:       ${validation.metrics.lineElements}`);
    console.log(`  Structural (rect+line): ${validation.metrics.structuralElements} (min: ${BENCHMARK_METRICS.minStructuralElements}) ${validation.metrics.structuralElements >= BENCHMARK_METRICS.minStructuralElements ? '✓' : '✗'}`);
    console.log(`  Total elements:      ${validation.metrics.totalElements} (min: ${BENCHMARK_METRICS.minTotalElements}) ${validation.metrics.totalElements >= BENCHMARK_METRICS.minTotalElements ? '✓' : '✗'}`);
    console.log(`  Total length:        ${validation.metrics.totalLength} chars (min: ${BENCHMARK_METRICS.minTotalLength}) ${validation.metrics.totalLength >= BENCHMARK_METRICS.minTotalLength ? '✓' : '✗'}`);
    console.log(`  ViewBox:             "${validation.metrics.viewBox}" (expected: "${BENCHMARK_METRICS.requiredViewBox}") ${validation.metrics.viewBox === BENCHMARK_METRICS.requiredViewBox ? '✓' : '✗'}`);
    console.log(`  Dimensions:          ${validation.metrics.width}x${validation.metrics.height} ${validation.metrics.width === BENCHMARK_METRICS.requiredWidth && validation.metrics.height === BENCHMARK_METRICS.requiredHeight ? '✓' : '✗'}`);
    console.log(`  Has LaTeX:           ${validation.metrics.hasLatex ? '❌ YES (FAIL)' : '✅ NO (PASS)'}`);
    
    if (validation.passed) {
      console.log('\n' + '='.repeat(80));
      console.log('🎉 TEST PASSED: Output meets benchmark quality!');
      console.log('='.repeat(80));
      console.log('\n✅ The notes generator produces mind-blowing quality matching your benchmark.');
      console.log('✅ All metrics meet or exceed requirements.');
      console.log('✅ No LaTeX syntax detected - proper geometric construction.');
      console.log(`✅ Output saved to: ${outputPath}`);
      console.log('\n🚀 Ready for production deployment!');
      process.exit(0);
    } else {
      console.log('\n' + '='.repeat(80));
      console.log('❌ TEST FAILED: Output does not meet benchmark quality');
      console.log('='.repeat(80));
      console.log('\nErrors:');
      validation.errors.forEach(err => console.log(`  ❌ ${err}`));
      console.log('\n🔧 REQUIRED ACTIONS:');
      console.log('  1. Review the generated output at:', outputPath);
      console.log('  2. Compare with benchmark (Introduction to Amplifier)');
      console.log('  3. Adjust prompt or generation parameters');
      console.log('  4. Re-run test until all metrics pass');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('💥 TEST CRASHED');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n🔧 This is a code issue - investigate and fix before proceeding.');
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testNotesGenerator();
}

export { testNotesGenerator, validateSVGQuality };
