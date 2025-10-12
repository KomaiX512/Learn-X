/**
 * UNIT TEST: SVG Quality Verification
 * 
 * Tests the complete SVG generation pipeline to verify:
 * 1. Generates 200-250 lines of detailed SVG code
 * 2. Matches blood vessel example quality
 * 3. Includes proper structure, labels, animations
 */

import { generateCompleteSVG, validateCompleteSVG } from './app/backend/src/agents/svgCompleteGenerator';
import { planVisualsEnhanced } from './app/backend/src/agents/codegenV3';
import { PlanStep } from './app/backend/src/types';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const TEST_TOPIC = 'Blood circulation in the human body';
const TEST_STEP: PlanStep = {
  id: 1,
  tag: 'hook',
  desc: 'Understanding how blood flows through vessels carrying oxygen and nutrients',
  compiler: 'js',
  complexity: 5
};

const BLOOD_VESSEL_REFERENCE_QUALITY = {
  minLines: 200,
  maxLines: 300,
  minLabels: 10,
  minAnimations: 2,
  requiresDefs: true,
  requiresStyle: true,
  requiresTransform: true
};

// Color formatting for console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function analyzesvgCode(svgCode: string) {
  const lines = svgCode.split('\n').filter(line => line.trim().length > 0);
  const lineCount = lines.length;
  
  const hasDefs = svgCode.includes('<defs>');
  const hasStyle = svgCode.includes('<style>');
  const hasTransform = svgCode.includes('transform=');
  
  const textCount = (svgCode.match(/<text/g) || []).length;
  const animateCount = (svgCode.match(/<animate/g) || []).length;
  const animateMotionCount = (svgCode.match(/<animateMotion/g) || []).length;
  const animateTransformCount = (svgCode.match(/<animateTransform/g) || []).length;
  const totalAnimations = animateCount + animateMotionCount + animateTransformCount;
  
  const pathCount = (svgCode.match(/<path/g) || []).length;
  const circleCount = (svgCode.match(/<circle/g) || []).length;
  const rectCount = (svgCode.match(/<rect/g) || []).length;
  const visualElements = pathCount + circleCount + rectCount;
  
  const useCount = (svgCode.match(/<use/g) || []).length;
  const gCount = (svgCode.match(/<g /g) || []).length;
  
  return {
    lineCount,
    hasDefs,
    hasStyle,
    hasTransform,
    textCount,
    totalAnimations,
    visualElements,
    useCount,
    gCount,
    pathCount,
    circleCount,
    rectCount
  };
}

function compareWithReference(analysis: ReturnType<typeof analyzesvgCode>) {
  const results: Array<{ test: string; passed: boolean; details: string }> = [];
  
  // Test 1: Line count
  const lineCountPass = analysis.lineCount >= BLOOD_VESSEL_REFERENCE_QUALITY.minLines && 
                        analysis.lineCount <= BLOOD_VESSEL_REFERENCE_QUALITY.maxLines;
  results.push({
    test: 'Code Length',
    passed: lineCountPass,
    details: `${analysis.lineCount} lines (target: ${BLOOD_VESSEL_REFERENCE_QUALITY.minLines}-${BLOOD_VESSEL_REFERENCE_QUALITY.maxLines})`
  });
  
  // Test 2: Labels
  const labelsPass = analysis.textCount >= BLOOD_VESSEL_REFERENCE_QUALITY.minLabels;
  results.push({
    test: 'Educational Labels',
    passed: labelsPass,
    details: `${analysis.textCount} labels (minimum: ${BLOOD_VESSEL_REFERENCE_QUALITY.minLabels})`
  });
  
  // Test 3: Animations
  const animPass = analysis.totalAnimations >= BLOOD_VESSEL_REFERENCE_QUALITY.minAnimations;
  results.push({
    test: 'SMIL Animations',
    passed: animPass,
    details: `${analysis.totalAnimations} animations (minimum: ${BLOOD_VESSEL_REFERENCE_QUALITY.minAnimations})`
  });
  
  // Test 4: Structure
  results.push({
    test: 'Has <defs>',
    passed: analysis.hasDefs,
    details: analysis.hasDefs ? 'Present' : 'Missing'
  });
  
  results.push({
    test: 'Has <style>',
    passed: analysis.hasStyle,
    details: analysis.hasStyle ? 'Present' : 'Missing'
  });
  
  results.push({
    test: 'Has transform',
    passed: analysis.hasTransform,
    details: analysis.hasTransform ? 'Present' : 'Missing'
  });
  
  // Test 5: Visual complexity
  const complexityPass = analysis.visualElements >= 15;
  results.push({
    test: 'Visual Complexity',
    passed: complexityPass,
    details: `${analysis.visualElements} visual elements (minimum: 15)`
  });
  
  return results;
}

async function runTest() {
  log('\n' + '='.repeat(80), colors.bold);
  log('SVG QUALITY VERIFICATION TEST', colors.bold + colors.cyan);
  log('Testing against blood vessel animation quality standard', colors.cyan);
  log('='.repeat(80) + '\n', colors.bold);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log('❌ GEMINI_API_KEY not set in environment', colors.red);
    process.exit(1);
  }
  
  try {
    // STEP 1: Generate visual specifications
    log('📋 STEP 1: Generating visual specifications...', colors.blue);
    log(`Topic: "${TEST_TOPIC}"`, colors.cyan);
    log(`Description: "${TEST_STEP.desc}"`, colors.cyan);
    
    const specs = await planVisualsEnhanced(TEST_STEP, TEST_TOPIC, apiKey);
    
    if (!specs || specs.length === 0) {
      log('❌ Failed to generate specifications', colors.red);
      process.exit(1);
    }
    
    log(`✅ Generated ${specs.length} specifications`, colors.green);
    specs.forEach((spec, i) => {
      const icon = spec.type === 'animation' ? '🎬' : '📐';
      log(`  ${icon} Spec ${i+1} [${spec.type}]: ${spec.description.substring(0, 100)}...`, colors.reset);
    });
    
    // STEP 2: Generate complete SVG for first spec
    log('\n🎨 STEP 2: Generating complete SVG document...', colors.blue);
    const testSpec = specs[0];
    log(`Using: ${testSpec.description}`, colors.cyan);
    
    const startTime = Date.now();
    const svgCode = await generateCompleteSVG(TEST_TOPIC, testSpec.description, 0, apiKey);
    const genTime = Date.now() - startTime;
    
    log(`✅ Generated in ${(genTime/1000).toFixed(2)}s`, colors.green);
    log(`   Code size: ${svgCode.length} characters`, colors.green);
    
    // STEP 3: Analyze quality
    log('\n📊 STEP 3: Analyzing SVG quality...', colors.blue);
    const analysis = analyzesvgCode(svgCode);
    
    log(`\nStructure Analysis:`, colors.bold);
    log(`  Lines of code: ${analysis.lineCount}`);
    log(`  Has <defs>: ${analysis.hasDefs ? '✅' : '❌'}`);
    log(`  Has <style>: ${analysis.hasStyle ? '✅' : '❌'}`);
    log(`  Has transforms: ${analysis.hasTransform ? '✅' : '❌'}`);
    log(`  Groups (<g>): ${analysis.gCount}`);
    
    log(`\nContent Analysis:`, colors.bold);
    log(`  Text labels: ${analysis.textCount}`);
    log(`  Visual elements: ${analysis.visualElements} (${analysis.pathCount} paths, ${analysis.circleCount} circles, ${analysis.rectCount} rects)`);
    log(`  Reusable elements (<use>): ${analysis.useCount}`);
    log(`  SMIL animations: ${analysis.totalAnimations}`);
    
    // STEP 4: Validate against reference
    log('\n🎯 STEP 4: Comparing with blood vessel quality standard...', colors.blue);
    const validation = validateCompleteSVG(svgCode);
    log(`Internal quality score: ${validation.score}/100`, colors.cyan);
    
    const comparison = compareWithReference(analysis);
    
    log('\nQuality Test Results:', colors.bold);
    let passCount = 0;
    comparison.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const color = result.passed ? colors.green : colors.red;
      log(`  ${icon} ${result.test}: ${result.details}`, color);
      if (result.passed) passCount++;
    });
    
    const overallPass = passCount >= comparison.length * 0.8; // 80% pass rate
    
    log('\n' + '='.repeat(80), colors.bold);
    if (overallPass) {
      log(`✅ PASSED: ${passCount}/${comparison.length} tests (${((passCount/comparison.length)*100).toFixed(0)}%)`, colors.bold + colors.green);
      log('SVG quality matches blood vessel standard!', colors.green);
    } else {
      log(`❌ FAILED: ${passCount}/${comparison.length} tests (${((passCount/comparison.length)*100).toFixed(0)}%)`, colors.bold + colors.red);
      log('SVG quality does NOT match blood vessel standard', colors.red);
    }
    log('='.repeat(80) + '\n', colors.bold);
    
    // STEP 5: Save output for inspection
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'test-svg-output.svg');
    fs.writeFileSync(outputPath, svgCode, 'utf-8');
    log(`📁 SVG saved to: ${outputPath}`, colors.cyan);
    log(`   You can open this file in a browser to view the visual\n`, colors.cyan);
    
    // Also save analysis report
    const reportPath = path.join(outputDir, 'quality-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      topic: TEST_TOPIC,
      specification: testSpec,
      generationTime: genTime,
      analysis,
      validation,
      comparison,
      overallPassed: overallPass,
      passRate: `${((passCount/comparison.length)*100).toFixed(0)}%`
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    log(`📊 Quality report saved to: ${reportPath}`, colors.cyan);
    
    // Print first 50 lines of SVG to console for quick inspection
    log('\n📝 SVG CODE PREVIEW (first 50 lines):', colors.bold);
    log('─'.repeat(80), colors.cyan);
    const previewLines = svgCode.split('\n').slice(0, 50);
    previewLines.forEach((line, i) => {
      log(`${(i+1).toString().padStart(3, ' ')} │ ${line}`, colors.reset);
    });
    if (analysis.lineCount > 50) {
      log(`... (${analysis.lineCount - 50} more lines)`, colors.yellow);
    }
    log('─'.repeat(80) + '\n', colors.cyan);
    
    process.exit(overallPass ? 0 : 1);
    
  } catch (error: any) {
    log(`\n❌ TEST FAILED WITH ERROR:`, colors.bold + colors.red);
    log(error.message, colors.red);
    log(error.stack, colors.red);
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
